import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InfraAlarmMessage } from "./infraSentry";

const key = "1".repeat(32);
const branch = "codex-buzzkill-account-migration";
const dsn = `https://${key}@o123.ingest.us.sentry.io/456`;
let report: typeof import("./infraSentry").reportInfraAlarmToSentry;
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;

function alarm(overrides: Partial<InfraAlarmMessage> = {}): InfraAlarmMessage {
  const name = `buzzkill-${branch}-stripe-webhook-errors`;
  return {
    AlarmName: name, AlarmArn: `arn:aws:cloudwatch:us-east-1:123456789012:alarm:${name}`,
    NewStateValue: "ALARM", StateChangeTime: "2026-08-15T14:03:00.000+0000",
    Trigger: { MetricName: "Errors", Namespace: "AWS/Lambda", Period: 300,
      EvaluationPeriods: 1, Threshold: 1, ComparisonOperator: "GreaterThanOrEqualToThreshold", Statistic: "Sum",
      Dimensions: [{ name: "FunctionName", value: "amplify-stripe-webhook-x1" }] },
    ...overrides,
  };
}

function sent() {
  const [url, options] = fetchMock.mock.calls.at(-1)!;
  const lines = String(options?.body).trimEnd().split("\n");
  return {
    url, options, header: JSON.parse(lines[0]), item: JSON.parse(lines[1]), event: JSON.parse(lines[2]),
  };
}

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("SENTRY_INFRA_DSN", dsn);
  vi.stubEnv("SENTRY_INFRA_ALARM_BRANCH", branch);
  vi.stubEnv("SENTRY_INFRA_ACCOUNT_ID", "123456789012");
  vi.stubEnv("SENTRY_ENVIRONMENT", "production");
  vi.stubEnv("SENTRY_RELEASE", undefined);
  vi.stubEnv("AWS_REGION", "us-east-1");
  fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  ({ reportInfraAlarmToSentry: report } = await import("./infraSentry"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("infrastructure Sentry event allowlist", () => {
  it("sends an awaited error envelope with infrastructure context and a stable grouping key", async () => {
    vi.stubEnv("SENTRY_RELEASE", `buzzkill-backend@${"a".repeat(40)}`);
    const result = await report(alarm());
    const { url, options, header, item, event } = sent();
    expect(url).toBe("https://o123.ingest.us.sentry.io/api/456/envelope/");
    expect(options).toMatchObject({
      method: "POST", redirect: "error", credentials: "omit",
      headers: { "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=buzzkill-infra/1.0` },
    });
    expect(options?.signal).toBeInstanceOf(AbortSignal);
    expect(header.event_id).toMatch(/^[a-f0-9]{32}$/);
    expect(header.sent_at).toMatch(/Z$/);
    expect(item).toEqual({ type: "event", length: Buffer.byteLength(JSON.stringify(event), "utf8") });
    expect(event).toMatchObject({
      event_id: header.event_id, timestamp: "2026-08-15T14:03:00.000Z", level: "error", platform: "other",
      environment: "production", release: `buzzkill-backend@${"a".repeat(40)}`,
      message: "Infrastructure alarm: stripe-webhook errors",
      fingerprint: ["buzzkill.infrastructure", "production", alarm().AlarmName],
      tags: { app: "buzzkill-backend", monitoring_operation: "infra.cloudwatch_alarm", function: "stripe-webhook", signal: "errors" },
      contexts: { infrastructure: { metric: "Errors", namespace: "AWS/Lambda", period_seconds: 300,
        evaluation_periods: 1, threshold: 1, comparison: "GreaterThanOrEqualToThreshold", statistic: "Sum",
        repository_path: "apps/web/amplify/functions/stripe-webhook/handler.ts" } },
    });
    expect(result).toEqual({ eventId: header.event_id, cloudWatchUrl: event.contexts.infrastructure.cloudwatch_url });
    expect(result!.cloudWatchUrl).toContain(encodeURIComponent(alarm().AlarmName!));
  });

  it("discards arbitrary reasons, descriptions, dimensions, identity, request and log content", async () => {
    const input = {
      ...alarm(), AlarmDescription: "Jane Doe jane@example.com 123 Main St", NewStateReason: "card4242 failed auth-secret",
      Region: "arbitrary-customer-secret", user: { email: "jane@example.com" }, logs: "private stack and payment-secret",
      request: { headers: { authorization: "Bearer auth-secret" } },
      Trigger: { ...alarm().Trigger, Dimensions: [
        { name: "FunctionName", value: "jane@example.com" }, { name: "customerId", value: "customer-secret" },
      ], Statistic: "private-statistic", ComparisonOperator: "private-comparison", Threshold: Infinity },
    };
    await report(input);
    const { event, options } = sent();
    expect(String(options?.body)).not.toMatch(/Jane|jane|Main St|4242|auth-secret|payment-secret|customer-secret|private|123456789012|amplify-/);
    expect(event.contexts.infrastructure).not.toHaveProperty("threshold");
    expect(event.contexts.infrastructure).not.toHaveProperty("statistic");
    expect(event.contexts.infrastructure).not.toHaveProperty("comparison");
    expect(Object.keys(event).sort()).toEqual([
      "contexts", "environment", "event_id", "fingerprint", "level", "logger", "message", "platform", "tags", "timestamp",
    ]);
  });

  it.each([
    ["booking-public", "errors", "Errors", "AWS/Lambda"],
    ["crm-billing", "throttles", "Throttles", "AWS/Lambda"],
    ["daily-reminders", "did-not-run", "Invocations", "AWS/Lambda"],
    ["ses-events", "dead-letter", "ApproximateNumberOfMessagesVisible", "AWS/SQS"],
    ["customer-search-indexer", "record-failures", "RecordFailures", "BuzzKill/CustomerSearch"],
    ["customer-search-indexer", "backlog", "IteratorAge", "AWS/Lambda"],
  ])("accepts the deployed %s %s signal", async (fn, signal, metric, namespace) => {
    const name = `buzzkill-${branch}-${fn}-${signal}`;
    await report(alarm({ AlarmName: name, AlarmArn: `arn:aws:cloudwatch:us-east-1:123456789012:alarm:${name}`,
      Trigger: { MetricName: metric, Namespace: namespace } }));
    expect(sent().event.tags).toMatchObject({ function: fn, signal });
  });

  it("gives retries the same event ID and later recurrences the same fingerprint", async () => {
    await report(alarm());
    const original = sent().event;
    await report(alarm({ StateChangeTime: "2026-08-15T14:03:00Z" }));
    expect(sent().event.event_id).toBe(original.event_id);
    await report(alarm({ StateChangeTime: "2026-08-16T14:03:00Z" }));
    expect(sent().event.event_id).not.toBe(original.event_id);
    expect(sent().event.fingerprint).toEqual(original.fingerprint);
  });

  it("isolates logical environments independently of retained backend namespace", async () => {
    await report(alarm());
    const production = sent().event;
    vi.stubEnv("SENTRY_ENVIRONMENT", "staging");
    await report(alarm());
    expect(sent().event.event_id).not.toBe(production.event_id);
    expect(sent().event.fingerprint).not.toEqual(production.fingerprint);
    expect(sent().event.environment).toBe("staging");
    vi.stubEnv("SENTRY_INFRA_ALARM_BRANCH", "staging");
    const name = "buzzkill-staging-stripe-webhook-errors";
    await report(alarm({ AlarmName: name, AlarmArn: `arn:aws:cloudwatch:us-east-1:123456789012:alarm:${name}` }));
    expect(sent().event.contexts.infrastructure.alarm).toBe(name);
  });

  it.each(["OK", "INSUFFICIENT_DATA", undefined])("does not send %s states or require Sentry config for them", async (state) => {
    vi.stubEnv("SENTRY_INFRA_DSN", undefined);
    expect(await report({ NewStateValue: state })).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("infrastructure configuration and input validation", () => {
  it.each([
    undefined, "", "invalid", dsn.replace("https:", "http:"), dsn.replace("@", ":secret@"),
    dsn.replace("o123.ingest.us.sentry.io", "evil.example"),
    dsn.replace("o123.ingest.us.sentry.io", "o123.ingest.us.sentry.io.evil.example"),
    dsn.replace("/456", "/prefix/456"), `${dsn}?token=secret`, `${dsn}#secret`,
    dsn.replace(".io/", ".io:8443/"), dsn.replace(key, "not-a-public-key"),
  ])("refuses missing or unsafe DSN without echoing its value", async (value) => {
    vi.stubEnv("SENTRY_INFRA_DSN", value);
    await expect(report(alarm())).rejects.toThrow(/DSN is (?:not configured|invalid)$/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["o123.ingest.sentry.io", "o123.ingest.de.sentry.io"])('supports Sentry SaaS host %s', async (host) => {
    vi.stubEnv("SENTRY_INFRA_DSN", `https://${key}@${host}/456`);
    await report(alarm());
    expect(sent().url).toBe(`https://${host}/api/456/envelope/`);
  });

  it.each([
    ["SENTRY_ENVIRONMENT", undefined], ["SENTRY_ENVIRONMENT", "dev"],
    ["SENTRY_INFRA_ALARM_BRANCH", undefined], ["SENTRY_INFRA_ALARM_BRANCH", "private@example.com"],
    ["SENTRY_INFRA_ACCOUNT_ID", "private"], ["SENTRY_RELEASE", "jane@example.com"],
  ])("refuses invalid %s configuration", async (name, value) => {
    vi.stubEnv(name, value);
    await expect(report(alarm())).rejects.toThrow(/Sentry infrastructure/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    { AlarmName: "buzzkill-other-stripe-webhook-errors" },
    { AlarmName: `buzzkill-${branch}-jane-doe-errors` },
    { AlarmName: `buzzkill-${branch}-stripe-webhook-errors?email=jane@example.com` },
    { AlarmArn: undefined },
    { AlarmArn: alarm().AlarmArn!.replace("123456789012", "999999999999") },
    { AlarmArn: alarm().AlarmArn!.replace("us-east-1", "us-west-2") },
    { AlarmArn: alarm().AlarmArn!.replace("stripe-webhook", "crm-billing") },
    { Trigger: { MetricName: "Errors", Namespace: "Private/Customer" } },
    { Trigger: { MetricName: "Throttles", Namespace: "AWS/Lambda" } },
    { StateChangeTime: undefined }, { StateChangeTime: "2026-02-30T14:03:00Z" },
    { StateChangeTime: "2026-08-15T14:03:00" }, { StateChangeTime: "2026-08-15T14:03:00+04:00" },
  ])("rejects malformed or cross-environment alarm input %o", async (overrides) => {
    await expect(report(alarm(overrides))).rejects.toThrow(/CloudWatch alarm/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("infrastructure event delivery", () => {
  it("does not finish before the ingestion request completes", async () => {
    let complete!: (response: Response) => void;
    fetchMock.mockImplementation(() => new Promise((resolve) => { complete = resolve; }));
    let finished = false;
    const pending = report(alarm()).then((result) => { finished = true; return result; });
    await Promise.resolve();
    expect(finished).toBe(false);
    complete(new Response("{}", { status: 200 }));
    expect(await pending).toHaveProperty("eventId");
  });

  it.each([400, 401, 403, 429, 500, 503])("fails visibly on HTTP %s", async (status) => {
    fetchMock.mockResolvedValue(new Response("jane@example.com auth-secret", { status }));
    await expect(report(alarm())).rejects.toThrow(`Sentry infrastructure event rejected (HTTP ${status})`);
  });

  it("sanitizes network/timeout exception details and never leaks provider text", async () => {
    fetchMock.mockRejectedValue(new Error("timeout for jane@example.com auth-secret"));
    await expect(report(alarm())).rejects.toThrow(/^Sentry infrastructure event delivery failed$/);
  });

  it("detects HTTP200 error quotas and honors them across warm invocations", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T14:04:00Z"));
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 200,
      headers: { "X-Sentry-Rate-Limits": "60:transaction:key, 120:error:organization:quota_exceeded" } }));
    await expect(report(alarm())).rejects.toThrow(/rate limited/);
    await expect(report(alarm())).rejects.toThrow(/rate limited/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-08-15T14:06:01Z"));
    await expect(report(alarm())).resolves.toHaveProperty("eventId");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each(["60::organization", "60:default;error:key"])('detects applicable quota %s', async (limit) => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200, headers: { "X-Sentry-Rate-Limits": limit } }));
    await expect(report(alarm())).rejects.toThrow(/rate limited/);
  });

  it("does not reject an error because unrelated categories are limited", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 200,
      headers: { "X-Sentry-Rate-Limits": "60:transaction;profile:organization, 60:future_category:key" } }));
    await expect(report(alarm())).resolves.toHaveProperty("eventId");
  });
});
