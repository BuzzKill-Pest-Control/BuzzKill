import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InfraAlarmMessage } from "./infraAlarmContext";

const { send, initialize } = vi.hoisted(() => ({ send: vi.fn(), initialize: vi.fn() }));
vi.mock("@aws-sdk/client-sns", () => ({
  SNSClient: class {
    constructor(options: unknown) { initialize(options); }
    send(...arguments_: unknown[]) { return send(...arguments_); }
  },
  PublishCommand: class {
    constructor(public input: Record<string, unknown>) {}
  },
}));
import { infraSlackNotification, reportInfraAlarmToSlack } from "./infraSlack";

const branch = "codex-buzzkill-account-migration";
const topic = "arn:aws:sns:us-east-1:123456789012:buzzkill-ops-watchdog";
function alarm(overrides: Partial<InfraAlarmMessage> = {}): InfraAlarmMessage {
  const name = `buzzkill-${branch}-stripe-webhook-errors`;
  return {
    AlarmName: name, AlarmArn: `arn:aws:cloudwatch:us-east-1:123456789012:alarm:${name}`,
    NewStateValue: "ALARM", StateChangeTime: "2026-08-15T14:03:00.000+0000",
    Trigger: { MetricName: "Errors", Namespace: "AWS/Lambda", Period: 300,
      EvaluationPeriods: 1, Threshold: 1, ComparisonOperator: "GreaterThanOrEqualToThreshold", Statistic: "Sum" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("SENTRY_INFRA_DSN", undefined);
  vi.stubEnv("SENTRY_INFRA_ALARM_BRANCH", branch);
  vi.stubEnv("SENTRY_INFRA_ACCOUNT_ID", "123456789012");
  vi.stubEnv("SENTRY_ENVIRONMENT", "production");
  vi.stubEnv("AWS_REGION", "us-east-1");
  vi.stubEnv("OPS_SLACK_TOPIC_ARN", topic);
  vi.stubEnv("OPS_EMAIL_MUTED", undefined);
  send.mockReset().mockResolvedValue({ MessageId: "11111111-2222-3333-4444-555555555555" });
});
afterEach(() => vi.unstubAllEnvs());

describe("independent infrastructure Slack fallback", () => {
  it("publishes the supported Amazon Q schema to the exact SNS topic without Sentry configuration", async () => {
    await reportInfraAlarmToSlack(alarm());
    const [command, options] = send.mock.calls[0];
    expect(command.input).toEqual({ TopicArn: topic, Message: expect.any(String) });
    expect(options.abortSignal).toBeInstanceOf(AbortSignal);
    expect(initialize).toHaveBeenCalledWith({ maxAttempts: 2 });
    const notification = JSON.parse(command.input.Message);
    expect(notification).toMatchObject({
      version: "1.0", source: "custom", id: expect.stringMatching(/^[a-f0-9]{32}$/),
      content: {
        textType: "client-markdown", title: "BuzzKill infrastructure fallback: stripe-webhook errors",
        description: expect.stringContaining("*Environment:* production"),
      },
      metadata: { enableCustomActions: false, threadId: expect.stringMatching(/^buzzkill-infra-[a-f0-9]{32}$/) },
    });
    expect(notification.content.description).toContain("2026-08-15T14:03:00.000Z");
    expect(notification.content.description).toContain("AWS/Lambda/Errors");
    expect(notification.content.description).toContain("GreaterThanOrEqualToThreshold 1 over 300s");
    expect(notification.content.description).toContain("apps/web/amplify/functions/stripe-webhook/handler.ts");
    expect(notification.content.description).toContain("console.aws.amazon.com/cloudwatch");
    expect(notification.content.title.length).toBeLessThanOrEqual(250);
    expect(notification.content.description.length).toBeLessThanOrEqual(8_000);
    for (const step of notification.content.nextSteps) expect(step.length).toBeLessThanOrEqual(350);
    for (const keyword of notification.content.keywords) expect(keyword.length).toBeLessThanOrEqual(75);
  });

  it("never copies private reasons, descriptions, dimensions, logs, identity, or credentials", async () => {
    const input = {
      ...alarm(), AlarmDescription: "PRIVATE_CUSTOMER_NAME jane@example.com 123 Main St",
      NewStateReason: "PRIVATE_PAYMENT card4242 auth-secret", Region: "PRIVATE_REGION",
      logs: "PRIVATE_LOGS", request: { authorization: "Bearer PRIVATE_TOKEN" },
      user: { email: "PRIVATE_IDENTITY" },
      Trigger: { ...alarm().Trigger, Dimensions: [{ name: "FunctionName", value: "PRIVATE_PHYSICAL_NAME" }],
        Statistic: "PRIVATE_STATISTIC", ComparisonOperator: "PRIVATE_COMPARISON", Threshold: Infinity },
    };
    await reportInfraAlarmToSlack(input);
    const message = send.mock.calls[0][0].input.Message;
    expect(message).not.toMatch(/PRIVATE|jane|Main St|4242|auth-secret|123456789012/);
    expect(message).toContain("stripe-webhook");
  });

  it("uses a stable transition ID and alarm thread without promising provider deduplication", () => {
    const original = infraSlackNotification(alarm());
    const retry = infraSlackNotification(alarm({ StateChangeTime: "2026-08-15T14:03:00Z" }));
    const recurrence = infraSlackNotification(alarm({ StateChangeTime: "2026-08-16T14:03:00Z" }));
    expect(retry.id).toBe(original.id);
    expect(recurrence.id).not.toBe(original.id);
    expect(recurrence.metadata.threadId).toBe(original.metadata.threadId);
  });

  it("waits for SNS acceptance before completing", async () => {
    let finish!: (result: { MessageId: string }) => void;
    send.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    let complete = false;
    const pending = reportInfraAlarmToSlack(alarm()).then(() => { complete = true; });
    await Promise.resolve();
    expect(complete).toBe(false);
    finish({ MessageId: "confirmed-message" });
    await pending;
    expect(complete).toBe(true);
  });

  it("sanitizes SDK rejection details while propagating failure for retry", async () => {
    send.mockRejectedValue(new Error("PRIVATE_TOKEN jane@example.com provider response"));
    await expect(reportInfraAlarmToSlack(alarm())).rejects.toThrow(/^Infrastructure Slack fallback publication failed$/);
  });

  it.each([undefined, "", "invalid message id", "@private"])("rejects unconfirmed SNS receipt %j", async (messageId) => {
    send.mockResolvedValue({ MessageId: messageId });
    await expect(reportInfraAlarmToSlack(alarm())).rejects.toThrow(/publication was not confirmed/);
  });

  it.each(["OK", "INSUFFICIENT_DATA", undefined])("does not publish %s transitions", async (state) => {
    await reportInfraAlarmToSlack({ NewStateValue: state });
    expect(send).not.toHaveBeenCalled();
  });

  it.each(["staging", "legacy mute"])("keeps %s quiet even if a production topic was inherited", async (mode) => {
    if (mode === "staging") vi.stubEnv("SENTRY_ENVIRONMENT", "staging");
    else vi.stubEnv("OPS_EMAIL_MUTED", "1");
    await reportInfraAlarmToSlack(alarm());
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    undefined, "", "https://example.com", `${topic}.fifo`,
    topic.replace("123456789012", "999999999999"), topic.replace("us-east-1", "us-west-2"),
    `${topic}?secret=PRIVATE_TOKEN`,
  ])("rejects an unsafe or foreign topic %j", async (value) => {
    vi.stubEnv("OPS_SLACK_TOPIC_ARN", value);
    await expect(reportInfraAlarmToSlack(alarm())).rejects.toThrow(/Slack topic does not match/);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ["SENTRY_ENVIRONMENT", undefined], ["SENTRY_ENVIRONMENT", "private"],
    ["SENTRY_INFRA_ACCOUNT_ID", undefined], ["SENTRY_INFRA_ACCOUNT_ID", "private"],
    ["SENTRY_INFRA_ALARM_BRANCH", undefined], ["SENTRY_INFRA_ALARM_BRANCH", "private@example.com"],
  ])("requires valid %s even when no Sentry DSN exists", async (name, value) => {
    vi.stubEnv(name, value);
    await expect(reportInfraAlarmToSlack(alarm())).rejects.toThrow(/Infrastructure alarm/);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    { AlarmName: "buzzkill-other-stripe-webhook-errors" },
    { AlarmName: `buzzkill-${branch}-private-customer-errors` },
    { AlarmArn: undefined }, { AlarmArn: alarm().AlarmArn!.replace("123456789012", "999999999999") },
    { AlarmArn: alarm().AlarmArn!.replace("us-east-1", "us-west-2") },
    { Trigger: { MetricName: "Errors", Namespace: "Private/Customer" } },
    { Trigger: { MetricName: "Throttles", Namespace: "AWS/Lambda" } },
    { StateChangeTime: undefined }, { StateChangeTime: "2026-02-30T14:03:00Z" },
  ])("rejects foreign or malformed infrastructure input %o", async (overrides) => {
    await expect(reportInfraAlarmToSlack(alarm(overrides))).rejects.toThrow(/CloudWatch alarm/);
    expect(send).not.toHaveBeenCalled();
  });
});
