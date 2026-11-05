import { beforeEach, describe, expect, it, vi } from "vitest";

/** Sentry and independent SNS-to-Slack delivery retain CRM recovery and retries. */
const guardedTransitions: Record<string, unknown>[] = [];
let ignoreTransition = false;
let transitionGuardFails = false;
vi.mock("../shared/infraAlarmTransition", () => ({
  withInfraAlarmTransition: async (message: Record<string, unknown>, action: () => Promise<void>) => {
    guardedTransitions.push(message);
    if (transitionGuardFails) throw new Error("Transition lease unavailable");
    if (!ignoreTransition) await action();
  },
}));

const workOpened: Record<string, unknown>[] = [];
const workResolved: Record<string, unknown>[] = [];
let openFails = false;
let openReturnsNull = false;
vi.mock("../shared/ownedWork", () => ({
  openOwnedWork: async (o: Record<string, unknown>) => {
    if (openFails) throw new Error("dynamo down");
    if (openReturnsNull) return null;
    workOpened.push(o);
    return "w1";
  },
  resolveOwnedWork: async (o: Record<string, unknown>) => {
    workResolved.push(o);
    return true;
  },
}));

const sentryReports: Record<string, unknown>[] = [];
let sentryFails = false;
vi.mock("../shared/infraSentry", () => ({
  reportInfraAlarmToSentry: async (message: Record<string, unknown>) => {
    sentryReports.push(message);
    if (sentryFails) throw new Error("Sentry unavailable");
    return { eventId: "0123456789abcdef0123456789abcdef", cloudWatchUrl: "https://example.test/alarm" };
  },
}));

const slackReports: Record<string, unknown>[] = [];
let slackFails = false;
vi.mock("../shared/infraSlack", () => ({
  reportInfraAlarmToSlack: async (message: Record<string, unknown>) => {
    slackReports.push(message);
    if (slackFails) throw new Error("SNS publication unavailable");
  },
}));

const { handler, handleAlarm, parseAlarmName } = await import("./handler");
const branch = "codex-buzzkill-account-migration";
const name = `buzzkill-${branch}-stripe-webhook-errors`;
const snsEvent = (message: Record<string, unknown>) =>
  ({ Records: [{ Sns: { Message: JSON.stringify(message), MessageId: "m1" } }] }) as never;
const alarm = (over: Record<string, unknown> = {}) => ({
  AlarmName: name,
  AlarmDescription: "The stripe-webhook function is failing.",
  AlarmArn: `arn:aws:cloudwatch:us-east-1:123456789012:alarm:${name}`,
  NewStateValue: "ALARM",
  NewStateReason: "1 error in 5 minutes",
  StateChangeTime: "2026-08-15T14:03:00.000+0000",
  Trigger: { MetricName: "Errors", Namespace: "AWS/Lambda",
    Dimensions: [{ name: "FunctionName", value: "amplify-stripe-webhook-x1" }] },
  ...over,
});

beforeEach(() => {
  guardedTransitions.length = 0;
  ignoreTransition = false;
  transitionGuardFails = false;
  workOpened.length = 0;
  workResolved.length = 0;
  openFails = false;
  openReturnsNull = false;
  sentryReports.length = 0;
  sentryFails = false;
  slackReports.length = 0;
  slackFails = false;
  delete process.env.SENTRY_ORG;
  delete process.env.SENTRY_INFRA_DSN;
  delete process.env.OPS_EMAIL_MUTED;
  process.env.SENTRY_ENVIRONMENT = "production";
  process.env.SENTRY_INFRA_ALARM_BRANCH = branch;
});

describe("ops-alerts", () => {
  it("uses independent Slack when Sentry is not configured and preserves the deduplicated CRM incident", async () => {
    await handler(snsEvent(alarm()));
    expect(slackReports).toHaveLength(1);
    expect(sentryReports).toHaveLength(0);
    expect(workOpened).toHaveLength(1);
    expect(workOpened[0]).toMatchObject({ kind: "INFRA_ALERT", dedupeKey: `alarm:${name}` });
    expect(workOpened[0].detail).toContain("1 error in 5 minutes");
  });

  it("routes configured alarms to Sentry without duplicating them on the fallback topic", async () => {
    process.env.SENTRY_INFRA_DSN = "https://configured.example/1";
    await handler(snsEvent(alarm()));
    expect(sentryReports).toHaveLength(1);
    expect(slackReports).toHaveLength(0);
    expect(workOpened[0].detail).toContain("https://buzzkill.sentry.io/issues/?query=0123456789abcdef0123456789abcdef");
    expect(workOpened[0].resolutionAction).toContain("Investigate in Sentry");
  });

  it.each(["master-planning", "a", "business-123"])("links accepted events to the configured %s organization", async (org) => {
    process.env.SENTRY_INFRA_DSN = "https://configured.example/1";
    process.env.SENTRY_ORG = org;
    await handler(snsEvent(alarm()));
    const link = `https://${org}.sentry.io/issues/?query=0123456789abcdef0123456789abcdef`;
    expect(sentryReports).toHaveLength(1);
    expect(workOpened[0].detail).toContain(link);
    expect(workOpened[0].resolutionAction).toContain(link);
    expect(slackReports).toHaveLength(0);
  });

  it.each(["", "MasterPlanning", "master.planning", "master-planning/evil", "master-planning?target=x", "evil@example.com", "-master", "master-", "a".repeat(64)])(
    "still ingests but uses Slack and retries for invalid organization slug %j", async (org) => {
      process.env.SENTRY_INFRA_DSN = "https://configured.example/1";
      process.env.SENTRY_ORG = org;
      await expect(handler(snsEvent(alarm()))).rejects.toThrow(/alarm record\(s\) failed/);
      expect(sentryReports).toHaveLength(1);
      expect(workOpened[0].detail).not.toContain("Sentry:");
      expect(workOpened[0].resolutionAction).not.toContain("https://");
      expect(slackReports).toHaveLength(1);
    },
  );

  it("publishes the Slack fallback before surfacing a Sentry delivery failure for retry", async () => {
    process.env.SENTRY_INFRA_DSN = "https://configured.example/1";
    sentryFails = true;
    await expect(handleAlarm(alarm())).rejects.toBeInstanceOf(AggregateError);
    expect(sentryReports).toHaveLength(1);
    expect(workOpened).toHaveLength(1);
    expect(slackReports).toHaveLength(1);
  });

  it("retries through SNS when independent Slack publication fails", async () => {
    slackFails = true;
    await expect(handler(snsEvent(alarm()))).rejects.toThrow(/alarm record\(s\) failed/);
    expect(workOpened).toHaveLength(1);
    expect(slackReports).toHaveLength(1);
  });

  it("retains both failures when Sentry and Slack publication are unavailable", async () => {
    process.env.SENTRY_INFRA_DSN = "https://configured.example/1";
    sentryFails = true;
    slackFails = true;
    const failure = await handleAlarm(alarm()).catch((error: AggregateError) => error);
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toHaveLength(2);
  });

  it.each(["throw", "null"])("reports to Sentry and retries when CRM persistence fails with %s", async (failure) => {
    process.env.SENTRY_INFRA_DSN = "https://configured.example/1";
    openFails = failure === "throw";
    openReturnsNull = failure === "null";
    await expect(handler(snsEvent(alarm()))).rejects.toThrow(/alarm record\(s\) failed/);
    expect(sentryReports).toHaveLength(1);
    expect(slackReports).toHaveLength(0);
  });

  it("still uses independent Slack if CRM persistence fails before Sentry is configured", async () => {
    openFails = true;
    await expect(handler(snsEvent(alarm()))).rejects.toThrow(/alarm record\(s\) failed/);
    expect(slackReports).toHaveLength(1);
  });

  it("resolves recovery without sending another error notification", async () => {
    process.env.SENTRY_INFRA_DSN = "https://configured.example/1";
    await handler(snsEvent(alarm({ NewStateValue: "OK" })));
    expect(workResolved).toHaveLength(1);
    expect(workResolved[0]).toMatchObject({ kind: "INFRA_ALERT", dedupeKey: `alarm:${name}` });
    expect(sentryReports).toHaveLength(0);
    expect(slackReports).toHaveLength(0);
  });

  it.each(["legacy mute", "staging"])("keeps %s notifications quiet while retaining CRM work", async (mode) => {
    process.env.SENTRY_INFRA_DSN = "https://configured.example/1";
    if (mode === "legacy mute") process.env.OPS_EMAIL_MUTED = "1";
    else process.env.SENTRY_ENVIRONMENT = "staging";
    await handler(snsEvent(alarm()));
    expect(workOpened).toHaveLength(1);
    expect(sentryReports).toHaveLength(0);
    expect(slackReports).toHaveLength(0);
  });

  it("runs ALARM/OK effects through the durable guard and skips insufficient data", async () => {
    await handler(snsEvent(alarm()));
    await handler(snsEvent(alarm({ NewStateValue: "OK" })));
    await handler(snsEvent(alarm({ NewStateValue: "INSUFFICIENT_DATA" })));
    expect(guardedTransitions.map((message) => message.NewStateValue)).toEqual(["ALARM", "OK"]);
  });

  it("does not send or reopen work when the guard suppresses a stale transition", async () => {
    ignoreTransition = true;
    await handler(snsEvent(alarm()));
    expect(guardedTransitions).toHaveLength(1);
    expect(sentryReports).toHaveLength(0);
    expect(workOpened).toHaveLength(0);
    expect(slackReports).toHaveLength(0);
  });

  it("retries without side effects when transition storage is unavailable", async () => {
    transitionGuardFails = true;
    await expect(handler(snsEvent(alarm()))).rejects.toThrow(/alarm record\(s\) failed/);
    expect(workOpened).toHaveLength(0);
    expect(slackReports).toHaveLength(0);
  });

  it("parses retained namespaces and customer-indexer signal suffixes", () => {
    expect(parseAlarmName(name)).toEqual({ logicalFunction: "stripe-webhook", kind: "errors" });
    expect(parseAlarmName(`buzzkill-${branch}-customer-search-indexer-record-failures`)).toEqual({ logicalFunction: "customer-search-indexer", kind: "record-failures" });
    expect(parseAlarmName(`buzzkill-${branch}-customer-search-indexer-backlog`)).toEqual({ logicalFunction: "customer-search-indexer", kind: "backlog" });
  });
});
