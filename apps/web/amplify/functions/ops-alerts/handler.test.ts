import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * GL-22 — the alarm-to-owned-work bridge. An ALARM state change becomes ONE
 * deduplicated shared-Office INFRA_ALERT item plus a diagnostic email to the
 * owner (INFRA_ALERT_EMAIL); OK auto-resolves the item silently; a processing
 * failure THROWS so the delivery retries and dead-letters visibly instead of
 * being silently acknowledged.
 *
 * Owner rule (2026-08-15): the email must carry enough to hand straight to a
 * debugging session — repo path, log group, recent error log excerpts, and a
 * ready-to-paste prompt block.
 */

const workOpened: Record<string, unknown>[] = [];
const workResolved: Record<string, unknown>[] = [];
let openFails = false;
vi.mock("../shared/ownedWork", () => ({
  openOwnedWork: async (o: Record<string, unknown>) => {
    if (openFails) throw new Error("dynamo down");
    workOpened.push(o);
    return "w1";
  },
  resolveOwnedWork: async (o: Record<string, unknown>) => {
    workResolved.push(o);
    return true;
  },
}));

const sentEmails: { to: string; subject: string; html: string }[] = [];
vi.mock("../shared/email", () => ({
  emailShell: (heading: string, body: string) => `${heading}${body}`,
  sendEmail: async (o: { to: string; subject: string; html: string }) => {
    sentEmails.push(o);
    return true;
  },
}));

const logQueries: {
  logGroupName?: string;
  filterPattern?: string;
  startTime?: number;
  endTime?: number;
  nextToken?: string;
}[] = [];
// One entry per page the fake returns; the handler must walk nextToken.
let logPages: {
  events: { timestamp: number; message: string }[];
  nextToken?: string;
}[] = [];
let logsFail = false;
vi.mock("@aws-sdk/client-cloudwatch-logs", () => ({
  CloudWatchLogsClient: class {
    async send(cmd: { input: Record<string, unknown> }) {
      logQueries.push(cmd.input as never);
      if (logsFail) throw new Error("AccessDeniedException");
      return logPages[logQueries.length - 1] ?? { events: [] };
    }
  },
  FilterLogEventsCommand: class {
    input: Record<string, unknown>;
    constructor(input: Record<string, unknown>) {
      this.input = input;
    }
  },
}));

const { handler } = await import("./handler");

const snsEvent = (message: Record<string, unknown>) =>
  ({
    Records: [{ Sns: { Message: JSON.stringify(message), MessageId: "m1" } }],
  }) as never;

const alarm = (over: Record<string, unknown> = {}) => ({
  AlarmName: "buzzkill-staging-stripe-webhook-errors",
  AlarmDescription: "The stripe-webhook function is failing.",
  AlarmArn:
    "arn:aws:cloudwatch:us-east-1:123456789012:alarm:buzzkill-staging-stripe-webhook-errors",
  NewStateValue: "ALARM",
  NewStateReason: "1 error in 5 minutes",
  StateChangeTime: "2026-08-15T14:03:00.000+0000",
  Trigger: {
    MetricName: "Errors",
    Namespace: "AWS/Lambda",
    Dimensions: [{ name: "FunctionName", value: "amplify-stripe-webhook-x1" }],
  },
  ...over,
});

beforeEach(() => {
  workOpened.length = 0;
  workResolved.length = 0;
  sentEmails.length = 0;
  logQueries.length = 0;
  logPages = [
    {
      events: [
        {
          timestamp: Date.parse("2026-08-15T13:58:00.000Z"),
          message:
            "ERROR Invoke Error {\"errorType\":\"TypeError\",\"stack\":\"at handler.ts:42\"}",
        },
      ],
    },
  ];
  logsFail = false;
  openFails = false;
  delete process.env.INFRA_ALERT_EMAIL;
  delete process.env.OPS_EMAIL_MUTED;
});

describe("ops-alerts", () => {
  it("an ALARM becomes one deduplicated owned item and a diagnostic email to the owner", async () => {
    await handler(snsEvent(alarm()));

    expect(workOpened).toHaveLength(1);
    expect(workOpened[0]).toMatchObject({
      kind: "INFRA_ALERT",
      dedupeKey: "alarm:buzzkill-staging-stripe-webhook-errors",
    });
    expect(String(workOpened[0].detail)).toContain("1 error in 5 minutes");

    expect(sentEmails).toHaveLength(1);
    const email = sentEmails[0];
    // Owner rule: infra alerts go to the owner, never the office inbox.
    expect(email.to).toBe("jake@pestbuzzkill.com");
    expect(email.subject).toBe(
      "INFRA ALERT: buzzkill-staging-stripe-webhook-errors"
    );
  });

  it("the email carries the debugging context: repo path, log group, log excerpt, prompt block", async () => {
    await handler(snsEvent(alarm()));

    const html = sentEmails[0].html;
    expect(html).toContain("apps/web/amplify/functions/stripe-webhook/handler.ts");
    expect(html).toContain("/aws/lambda/amplify-stripe-webhook-x1");
    expect(html).toContain("at handler.ts:42");
    expect(html).toContain("Paste into a Claude Code session:");
    expect(html).toContain("Investigate and fix this alarm in the BuzzKill repo.");
    expect(html).toContain("console.aws.amazon.com/cloudwatch");
    // The log query hit the right group with an error-shaped filter, over
    // the 45 minutes leading up to the alarm — never an unbounded scan.
    expect(logQueries[0].logGroupName).toBe(
      "/aws/lambda/amplify-stripe-webhook-x1"
    );
    expect(logQueries[0].filterPattern).toContain("ERROR");
    const fired = Date.parse("2026-08-15T14:03:00.000+0000");
    expect(logQueries[0].startTime).toBe(fired - 45 * 60 * 1000);
    expect(logQueries[0].endTime).toBe(fired + 60_000);
  });

  it("an empty first page with a nextToken is NOT 'no errors' — the scan walks pages", async () => {
    logPages = [
      { events: [], nextToken: "page2" },
      {
        events: [
          {
            timestamp: Date.parse("2026-08-15T14:02:00.000Z"),
            message: "ERROR the real failure",
          },
        ],
      },
    ];

    await handler(snsEvent(alarm()));

    expect(logQueries).toHaveLength(2);
    expect(logQueries[1].nextToken).toBe("page2");
    expect(sentEmails[0].html).toContain("ERROR the real failure");
    expect(sentEmails[0].html).not.toContain("No matching ERROR");
  });

  it("OPS_EMAIL_MUTED silences the email but the owned work item still opens", async () => {
    process.env.OPS_EMAIL_MUTED = "1";
    await handler(snsEvent(alarm()));

    expect(workOpened).toHaveLength(1);
    expect(sentEmails).toHaveLength(0);
  });

  it("INFRA_ALERT_EMAIL overrides the default recipient", async () => {
    process.env.INFRA_ALERT_EMAIL = "someone@example.com";
    await handler(snsEvent(alarm()));
    expect(sentEmails[0].to).toBe("someone@example.com");
  });

  it("SDK runtime chatter never reaches the excerpt — only real failures do", async () => {
    logPages = [
      {
        events: [
          {
            timestamp: 1,
            message:
              "ERROR (node:2) Warning: NodeVersionSupportWarning: The AWS SDK for JavaScript (v3) will require node >=22",
          },
          { timestamp: 2, message: "ERROR Invoke Error real failure here" },
        ],
      },
    ];
    await handler(snsEvent(alarm()));
    const html = sentEmails[0].html;
    expect(html).toContain("real failure here");
    expect(html).not.toContain("NodeVersionSupportWarning");
  });

  it("an unreadable log group never blocks the alert — the email says so instead", async () => {
    logsFail = true;
    await handler(snsEvent(alarm()));

    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].html).toContain("Could not read /aws/lambda/amplify-stripe-webhook-x1");
  });

  it("a non-Lambda alarm (no FunctionName dimension) sends without a log fetch", async () => {
    await handler(
      snsEvent(
        alarm({
          AlarmName: "buzzkill-staging-ses-events-dead-letter",
          Trigger: {
            MetricName: "ApproximateNumberOfMessagesVisible",
            Namespace: "AWS/SQS",
            Dimensions: [{ name: "QueueName", value: "SesEventsDlq" }],
          },
        })
      )
    );

    expect(logQueries).toHaveLength(0);
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].html).toContain("no function logs to pull");
  });

  it("OK auto-resolves the same item and emails nobody — the queue never shows a recovered ghost", async () => {
    await handler(
      snsEvent({
        AlarmName: "buzzkill-staging-stripe-webhook-errors",
        NewStateValue: "OK",
        NewStateReason: "back under threshold",
      })
    );

    expect(workResolved).toHaveLength(1);
    expect(workResolved[0]).toMatchObject({
      kind: "INFRA_ALERT",
      dedupeKey: "alarm:buzzkill-staging-stripe-webhook-errors",
    });
    expect(workOpened).toHaveLength(0);
    expect(sentEmails).toHaveLength(0);
  });

  it("a failed alert-processing run THROWS — never a silent acknowledgment", async () => {
    openFails = true;
    await expect(
      handler(
        snsEvent({ AlarmName: "x", NewStateValue: "ALARM", NewStateReason: "r" })
      )
    ).rejects.toThrow(/alarm record\(s\) failed/);
  });
});
