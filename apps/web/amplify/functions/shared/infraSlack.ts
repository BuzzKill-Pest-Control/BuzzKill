import { createHash } from "node:crypto";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { infraAlarmContext, type InfraAlarmMessage } from "./infraAlarmContext";

const client = new SNSClient({ maxAttempts: 2 });
const TIMEOUT_MS = 5_000;

/** Amazon Q custom-notification schema; no credentials or raw provider content. */
export function infraSlackNotification(message: InfraAlarmMessage) {
  const context = infraAlarmContext(message);
  const infrastructure = context.infrastructure;
  const policy = [
    infrastructure.statistic,
    infrastructure.comparison,
    infrastructure.threshold === undefined ? undefined : String(infrastructure.threshold),
    infrastructure.period_seconds === undefined ? undefined : `over ${infrastructure.period_seconds}s`,
    infrastructure.evaluation_periods === undefined ? undefined : `for ${infrastructure.evaluation_periods} evaluation(s)`,
  ].filter((value) => value !== undefined).join(" ");
  return {
    version: "1.0",
    source: "custom",
    id: context.eventId,
    content: {
      textType: "client-markdown",
      title: `BuzzKill infrastructure fallback: ${context.logicalFunction} ${context.signal}`,
      description: [
        "This alarm is using the independent AWS-to-Slack notification route.",
        `*Environment:* ${context.environment}`,
        `*Function:* ${context.logicalFunction}`,
        `*Signal:* ${context.signal} (${infrastructure.namespace}/${infrastructure.metric})`,
        `*State changed:* ${context.timestamp}`,
        ...(policy ? [`*Alarm policy:* ${policy}`] : []),
        `*Code:* ${infrastructure.repository_path}`,
        `<${context.cloudWatchUrl}|Open the AWS alarm>`,
      ].join("\n"),
      nextSteps: [
        "Check the AWS alarm and function logs, then repair or escalate the underlying failure.",
        "Confirm AWS reports recovery before closing the CRM incident.",
      ],
      keywords: ["BuzzKill", "infrastructure", "delivery-fallback", context.signal],
    },
    metadata: {
      threadId: `buzzkill-infra-${createHash("sha256").update(JSON.stringify([context.environment, infrastructure.alarm])).digest("hex").slice(0, 32)}`,
      summary: `Infrastructure alarm: ${context.logicalFunction} ${context.signal}`,
      enableCustomActions: false,
    },
  };
}

/** Publish to the independent watchdog topic; SNS acceptance is not Slack delivery proof. */
export async function reportInfraAlarmToSlack(message: InfraAlarmMessage): Promise<void> {
  if (message.NewStateValue !== "ALARM" || process.env.OPS_EMAIL_MUTED || process.env.SENTRY_ENVIRONMENT === "staging") return;
  const context = infraAlarmContext(message);
  const topic = process.env.OPS_SLACK_TOPIC_ARN;
  const arn = typeof topic === "string"
    ? topic.match(/^arn:aws:sns:([a-z]{2}(?:-[a-z]+)+-[0-9]):([0-9]{12}):([A-Za-z0-9_-]{1,256})$/)
    : null;
  if (!arn || arn[1] !== context.infrastructure.region || arn[2] !== context.account) {
    throw new Error("Infrastructure Slack topic does not match the configured infrastructure");
  }
  const notification = infraSlackNotification(message);
  let messageId: string | undefined;
  try {
    const result = await client.send(new PublishCommand({
      TopicArn: topic,
      Message: JSON.stringify(notification),
    }), { abortSignal: AbortSignal.timeout(TIMEOUT_MS) });
    messageId = result.MessageId;
  } catch {
    // SDK errors can contain credentials, provider text, or request details.
    throw new Error("Infrastructure Slack fallback publication failed");
  }
  if (!messageId || !/^[A-Za-z0-9-]{1,128}$/.test(messageId)) {
    throw new Error("Infrastructure Slack fallback publication was not confirmed");
  }
}
