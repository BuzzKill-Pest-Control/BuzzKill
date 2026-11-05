import { assertBusinessActionsEnabled } from "../shared/migrationPreview";
import type { SNSEvent } from "aws-lambda";
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { emailShell, sendEmail } from "../shared/email";
import { openOwnedWork, resolveOwnedWork } from "../shared/ownedWork";
import { reportInfraAlarmToSentry, type InfraAlarmMessage } from "../shared/infraSentry";
import { withInfraAlarmTransition } from "../shared/infraAlarmTransition";

/**
 * GL-22 — CloudWatch alarm state changes become deduplicated, owned
 * shared-Office work. ALARM opens (or re-occurs) one INFRA_ALERT item per
 * alarm name; OK auto-resolves it with the recovery note. The item carries
 * the one common one-business-day response deadline and the queue's normal
 * claim/escalation behavior — no critical/high/routine classes, no
 * permanently named primary.
 *
 * Configured alarms go to Sentry with sanitized infrastructure context.
 * The previous diagnostic email remains a rollback and delivery-failure
 * fallback addressed to INFRA_ALERT_EMAIL. Raw log excerpts never go to
 * Sentry. The office queue retains its owned work and automatic recovery.
 */

type AlarmMessage = InfraAlarmMessage;

const logsClient = new CloudWatchLogsClient();

/** How far back to pull error logs when an alarm fires. */
const LOG_LOOKBACK_MS = 45 * 60 * 1000;
/** Hard caps so a log storm cannot balloon the email. */
const MAX_LOG_EVENTS = 20;
const MAX_EXCERPT_CHARS = 12_000;
/** FilterLogEvents scans ~1MB per call and may return an EMPTY page with a
 *  nextToken on a chatty group — a bounded token walk, never one page. */
const MAX_LOG_PAGES = 5;

const escHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The branch may be a retained Amplify namespace containing hyphens. */
export function parseAlarmName(name: string): {
  logicalFunction: string | null;
  kind: string | null;
} {
  const branch = process.env.SENTRY_INFRA_ALARM_BRANCH;
  const prefix = branch ? `buzzkill-${branch}-` : name.match(/^buzzkill-(?:main|staging)-/)?.[0];
  const suffix = prefix && name.startsWith(prefix) ? name.slice(prefix.length) : "";
  const match = suffix.match(
    /^(.+?)-(errors|throttles|did-not-run|dead-letter|record-failures|backlog)$/
  );
  return match
    ? { logicalFunction: match[1], kind: match[2] }
    : { logicalFunction: null, kind: null };
}

function alarmRegion(message: AlarmMessage): string {
  const fromArn = message.AlarmArn?.split(":")[3];
  return fromArn || process.env.AWS_REGION || "us-east-1";
}

/** The Lambda physical name the alarm measured, when it measured one. */
function functionDimension(message: AlarmMessage): string | null {
  const dim = message.Trigger?.Dimensions?.find(
    (d) => d.name === "FunctionName"
  );
  return dim?.value ?? null;
}

/**
 * Recent error-ish output from the failing function's log group. Best
 * effort: an unreadable log group must never block the alert itself, so
 * failures come back as a note instead of a throw.
 */
async function recentErrorLogs(
  logGroupName: string,
  alarmTime: number
): Promise<{ excerpt: string; note?: string }> {
  try {
    const events: { timestamp?: number; message?: string }[] = [];
    let nextToken: string | undefined;
    let scanIncomplete = false;
    for (let page = 0; page < MAX_LOG_PAGES; page++) {
      const res = await logsClient.send(
        new FilterLogEventsCommand({
          logGroupName,
          startTime: alarmTime - LOG_LOOKBACK_MS,
          endTime: alarmTime + 60_000,
          filterPattern: '?ERROR ?Exception ?"Task timed out"',
          limit: MAX_LOG_EVENTS,
          nextToken,
        })
      );
      // Runtime chatter that prints via stderr (the AWS SDK's node-version
      // warning, trace-warnings hints) matches the ERROR filter but tells
      // the reader nothing about the failure — it drowned the one real
      // stack in the Aug 18 alert. Drop it before it reaches the excerpt.
      events.push(
        ...(res.events ?? []).filter(
          (e) =>
            !/NodeVersionSupportWarning|node --trace-warnings|https:\/\/a\.co\//.test(
              e.message ?? ""
            )
        )
      );
      nextToken = res.nextToken;
      if (!nextToken) break;
      if (page === MAX_LOG_PAGES - 1) scanIncomplete = true;
    }
    if (events.length === 0) {
      return {
        excerpt: "",
        note: scanIncomplete
          ? "The 45-minute log scan hit its page budget before finding matches — the group is chatty; check it directly."
          : "No matching ERROR/Exception/timeout log events in the last 45 minutes — check the log group directly.",
      };
    }
    // The events nearest the alarm are the ones that tripped it — keep the
    // LATEST matches when the window holds more than the cap.
    let excerpt = events
      .slice(-MAX_LOG_EVENTS)
      .map(
        (e) =>
          `[${e.timestamp ? new Date(e.timestamp).toISOString() : "?"}] ${(e.message ?? "").trim()}`
      )
      .join("\n");
    if (excerpt.length > MAX_EXCERPT_CHARS) {
      excerpt = `${excerpt.slice(0, MAX_EXCERPT_CHARS)}\n… (truncated)`;
    }
    if (scanIncomplete) {
      excerpt += "\n… (scan incomplete — the window holds more log data than the page budget)";
    }
    return { excerpt };
  } catch (err) {
    return {
      excerpt: "",
      note: `Could not read ${logGroupName}: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/** Sentry owns delivery; the CRM retains the durable incident and recovery state. */
export async function handleAlarm(message: AlarmMessage): Promise<void> {
  const state = (message.NewStateValue ?? "").toUpperCase();
  if (state !== "ALARM" && state !== "OK") return;
  // The durable guard serializes alarm transitions and rejects older retries.
  // An ALARM that failed delivery cannot reopen an incident after a newer OK.
  await withInfraAlarmTransition(message, () => handleCurrentAlarmTransition(message));
}

async function handleCurrentAlarmTransition(message: AlarmMessage): Promise<void> {
  const name = message.AlarmName ?? "unknown-alarm";
  const state = (message.NewStateValue ?? "").toUpperCase();
  if (state === "OK") {
    await resolveOwnedWork({
      kind: "INFRA_ALERT",
      dedupeKey: `alarm:${name}`,
      note: `CloudWatch reports the alarm recovered: ${message.NewStateReason ?? "back to OK"}.`,
    });
    return;
  }
  if (state !== "ALARM") return;

  const failures: unknown[] = [];
  const muted = Boolean(process.env.OPS_EMAIL_MUTED);
  let sentryUrl: string | undefined;
  // Delivery is independent of the business database: a database outage must
  // still reach Sentry. The reporter awaits ingestion and deduplicates retries.
  if (process.env.SENTRY_INFRA_DSN && !muted) {
    try {
      const report = await reportInfraAlarmToSentry(message);
      if (!report) throw new Error("Sentry did not accept the alarm event");
      sentryUrl = `https://buzzkill.sentry.io/issues/?query=${encodeURIComponent(report.eventId)}`;
    } catch (error) {
      failures.push(error);
    }
  }

  const detailLines = [
    message.AlarmDescription?.trim(),
    `CloudWatch reason: ${message.NewStateReason ?? "n/a"}`,
    `State change: ${message.StateChangeTime ?? "n/a"} (${message.Region ?? ""})`,
    sentryUrl ? `Sentry: ${sentryUrl}` : undefined,
  ].filter(Boolean);
  try {
    const workId = await openOwnedWork({
      kind: "INFRA_ALERT",
      dedupeKey: `alarm:${name}`,
      title: `Infrastructure alert: ${name}`,
      detail: detailLines.join("\n"),
      relatedId: name,
      resolutionAction: sentryUrl
        ? `Investigate in Sentry: ${sentryUrl}. Confirm the underlying AWS alarm is healthy before closing; the CRM incident resolves when CloudWatch reports recovery.`
        : "Open CloudWatch for this alarm, fix or escalate the underlying failure, and close only when the system fact is verified healthy.",
      ownerTeam: "OPS",
    });
    // openOwnedWork logs and returns null on storage failures rather than
    // throwing. This bridge must retry instead of acknowledging lost work.
    if (!workId) throw new Error("Could not persist the infrastructure incident");
  } catch (error) {
    failures.push(error);
  }

  // An absent DSN preserves the previous route for rollback. A failed Sentry
  // delivery uses it as a fallback AND retries through SNS/DLQ/watchdog.
  if (!muted && !sentryUrl) {
    try {
      await sendDiagnosticEmail(message);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw new AggregateError(failures, "Infrastructure incident processing failed");
}

async function sendDiagnosticEmail(message: AlarmMessage): Promise<void> {
  const name = message.AlarmName ?? "unknown-alarm";
  // ---- the diagnostic email --------------------------------------------
  const region = alarmRegion(message);
  const { logicalFunction, kind } = parseAlarmName(name);
  const physicalFunction = functionDimension(message);
  const logGroup = physicalFunction ? `/aws/lambda/${physicalFunction}` : null;
  const alarmTime = message.StateChangeTime
    ? Date.parse(message.StateChangeTime)
    : Date.now();

  const logs = logGroup
    ? await recentErrorLogs(logGroup, alarmTime)
    : {
        excerpt: "",
        note: "This alarm does not measure a Lambda function (no FunctionName dimension), so there are no function logs to pull.",
      };

  const alarmUrl = `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:alarm/${encodeURIComponent(name)}`;
  const logsUrl = logGroup
    ? `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${logGroup.replace(/\//g, "$252F")}`
    : null;

  const repoPath = logicalFunction
    ? `apps/web/amplify/functions/${logicalFunction}/handler.ts`
    : null;

  // Everything a debugging session needs, in one copyable block. Plain text
  // on purpose — it is pasted, not read.
  const promptBlock = [
    "Investigate and fix this alarm in the BuzzKill repo.",
    "",
    `Alarm: ${name}${kind ? ` (${kind})` : ""}`,
    `Fired: ${message.StateChangeTime ?? "unknown"} (${region})`,
    repoPath ? `Function: ${repoPath}` : null,
    logGroup ? `Log group: ${logGroup}` : null,
    `CloudWatch reason: ${message.NewStateReason ?? "n/a"}`,
    "",
    logs.excerpt ? `Recent error output:\n${logs.excerpt}` : (logs.note ?? ""),
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  const preStyle =
    "background:#f4f4f2;border:1px solid #e2e2de;border-radius:6px;padding:12px;font-size:12px;line-height:1.5;overflow-x:auto;white-space:pre-wrap;word-break:break-word;";
  const bodyHtml = `<p><strong>${escHtml(name)}</strong> is in ALARM.</p>
<p>${escHtml((message.AlarmDescription ?? "").trim() || "No description recorded.")}</p>
<p style="color:#666;font-size:13px;">${escHtml(message.NewStateReason ?? "")}<br>${escHtml(`${message.StateChangeTime ?? ""} (${region})`)}</p>
${repoPath ? `<p>Code: <strong>${escHtml(repoPath)}</strong></p>` : ""}
<p><a href="${alarmUrl}">Open the alarm in CloudWatch</a>${logsUrl ? ` &middot; <a href="${logsUrl}">Open the log group</a>` : ""}</p>
${
  logs.excerpt
    ? `<p style="margin-bottom:6px;"><strong>Recent error output</strong> (last 45 min):</p><pre style="${preStyle}">${escHtml(logs.excerpt)}</pre>`
    : `<p style="color:#666;">${escHtml(logs.note ?? "")}</p>`
}
<p style="margin-bottom:6px;"><strong>Paste into a Claude Code session:</strong></p>
<pre style="${preStyle}">${escHtml(promptBlock)}</pre>
<p>An owned work item is on the shared queue with the one-business-day clock.</p>`;

  const delivered = await sendEmail({
    to: process.env.INFRA_ALERT_EMAIL ?? "jake@pestbuzzkill.com",
    subject: `INFRA ALERT: ${name}`,
    template: "ops-infra-alert",
    relatedId: name,
    html: emailShell("A background system failure needs attention", bodyHtml),
  });
  if (!delivered) throw new Error("Infrastructure diagnostic email was not delivered");
}

export const handler = async (event: SNSEvent): Promise<void> => {
  assertBusinessActionsEnabled();
  const failures: unknown[] = [];
  for (const record of event.Records) {
    try {
      await handleAlarm(JSON.parse(record.Sns.Message) as AlarmMessage);
    } catch (err) {
      console.error("ops-alerts: failed to process alarm", err);
      failures.push(err);
    }
  }
  // A failed alert-processing run must not be silently acknowledged — throw
  // so the delivery retries and, if it keeps failing, dead-letters visibly.
  if (failures.length) {
    throw new Error(`ops-alerts: ${failures.length} alarm record(s) failed`);
  }
};
