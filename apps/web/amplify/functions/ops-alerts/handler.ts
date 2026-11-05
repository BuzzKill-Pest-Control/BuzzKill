import { assertBusinessActionsEnabled } from "../shared/migrationPreview";
import type { SNSEvent } from "aws-lambda";
import { openOwnedWork, resolveOwnedWork } from "../shared/ownedWork";
import { reportInfraAlarmToSentry, type InfraAlarmMessage } from "../shared/infraSentry";
import { withInfraAlarmTransition } from "../shared/infraAlarmTransition";
import { reportInfraAlarmToSlack } from "../shared/infraSlack";

/**
 * GL-22 — CloudWatch alarm state changes become deduplicated, owned
 * shared-Office work. ALARM opens (or re-occurs) one INFRA_ALERT item per
 * alarm name; OK auto-resolves it with the recovery note. The item carries
 * the one common one-business-day response deadline and the queue's normal
 * claim/escalation behavior — no critical/high/routine classes, no
 * permanently named primary.
 *
 * Configured alarms go to Sentry with sanitized infrastructure context.
 * A managed SNS-to-Slack route remains independent of Sentry for rollback
 * and delivery failures. No raw logs or customer data leave AWS through
 * either route. The office queue retains its owned work and recovery.
 */

type AlarmMessage = InfraAlarmMessage;

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
  const muted = Boolean(process.env.OPS_EMAIL_MUTED) || process.env.SENTRY_ENVIRONMENT === "staging";
  let sentryUrl: string | undefined;
  // Delivery is independent of the business database: a database outage must
  // still reach Sentry. The reporter awaits ingestion and deduplicates retries.
  if (process.env.SENTRY_INFRA_DSN && !muted) {
    try {
      const report = await reportInfraAlarmToSentry(message);
      if (!report) throw new Error("Sentry did not accept the alarm event");
      // Ingestion follows the DSN even if the separate UI-link configuration
      // is invalid. Never interpolate an arbitrary host or path into work.
      const org = process.env.SENTRY_ORG ?? "buzzkill";
      if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(org)) {
        throw new Error("SENTRY_ORG must be a lowercase organization slug");
      }
      sentryUrl = `https://${org}.sentry.io/issues/?query=${encodeURIComponent(report.eventId)}`;
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

  // Missing DSN uses the independent managed Slack route. A failed Sentry
  // delivery also uses it AND retries through SNS/DLQ/watchdog, never email.
  if (!muted && !sentryUrl) {
    try {
      await reportInfraAlarmToSlack(message);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw new AggregateError(failures, "Infrastructure incident processing failed");
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
