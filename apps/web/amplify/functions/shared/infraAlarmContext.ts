import { createHash } from "node:crypto";

/** CloudWatch's SNS payload. Only allowlisted infrastructure facts may leave AWS. */
export type InfraAlarmMessage = {
  AlarmName?: string;
  AlarmDescription?: string | null;
  AlarmArn?: string;
  NewStateValue?: string;
  NewStateReason?: string;
  StateChangeTime?: string;
  Region?: string;
  Trigger?: {
    MetricName?: string;
    Namespace?: string;
    Dimensions?: { name?: string; value?: string }[];
    Period?: number;
    EvaluationPeriods?: number;
    Threshold?: number;
    ComparisonOperator?: string;
    Statistic?: string;
  };
};

const FUNCTIONS = new Set([
  "booking-public", "stripe-webhook", "daily-reminders", "pricing-refresh",
  "crm-docs", "crm-billing", "crm-admin", "crm-pricing", "lead-intake",
  "lead-sweep", "ses-events", "customer-search-indexer", "ops-alerts",
]);
const SIGNALS = {
  errors: { metric: "Errors", namespace: "AWS/Lambda" },
  throttles: { metric: "Throttles", namespace: "AWS/Lambda" },
  "did-not-run": { metric: "Invocations", namespace: "AWS/Lambda" },
  "dead-letter": { metric: "ApproximateNumberOfMessagesVisible", namespace: "AWS/SQS" },
  "record-failures": { metric: "RecordFailures", namespace: "BuzzKill/CustomerSearch" },
  backlog: { metric: "IteratorAge", namespace: "AWS/Lambda" },
} as const;
type Signal = keyof typeof SIGNALS;
const COMPARISONS = new Set([
  "GreaterThanOrEqualToThreshold", "GreaterThanThreshold",
  "LessThanOrEqualToThreshold", "LessThanThreshold",
]);
const STATISTICS = new Set(["Sum", "Maximum", "Minimum", "Average", "SampleCount"]);

function stateTimestamp(value: unknown): string {
  if (typeof value !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+0000|\+00:00)$/.test(value)) {
    throw new Error("CloudWatch alarm state timestamp is invalid");
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 19) !== value.slice(0, 19)) {
    throw new Error("CloudWatch alarm state timestamp is invalid");
  }
  return new Date(timestamp).toISOString();
}

/** Shared Sentry/Slack allowlist, independent of either delivery credential. */
export function infraAlarmContext(message: InfraAlarmMessage) {
  const environment = process.env.SENTRY_ENVIRONMENT;
  if (environment !== "production" && environment !== "staging") {
    throw new Error("Infrastructure alarm environment must be production or staging");
  }
  const branch = process.env.SENTRY_INFRA_ALARM_BRANCH;
  if (!branch || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(branch)) {
    throw new Error("Infrastructure alarm branch is invalid");
  }
  const account = process.env.SENTRY_INFRA_ACCOUNT_ID;
  if (!account || !/^[0-9]{12}$/.test(account)) {
    throw new Error("Infrastructure alarm account is invalid");
  }
  const prefix = `buzzkill-${branch}-`;
  const name = message.AlarmName;
  const parsed = typeof name === "string" && name.startsWith(prefix)
    ? name.slice(prefix.length).match(/^([a-z0-9]+(?:-[a-z0-9]+)*)-(errors|throttles|did-not-run|dead-letter|record-failures|backlog)$/)
    : null;
  if (!parsed || !FUNCTIONS.has(parsed[1])) throw new Error("CloudWatch alarm name is not allowed");
  const logicalFunction = parsed[1];
  const signal = parsed[2] as Signal;
  const metric = SIGNALS[signal];
  if (message.Trigger?.MetricName !== metric.metric || message.Trigger.Namespace !== metric.namespace) {
    throw new Error("CloudWatch alarm metric is not allowed");
  }
  const arn = typeof message.AlarmArn === "string"
    ? message.AlarmArn.match(/^arn:aws:cloudwatch:([a-z]{2}(?:-[a-z]+)+-[0-9]):([0-9]{12}):alarm:(.+)$/)
    : null;
  if (!arn || arn[3] !== name || arn[2] !== account ||
      (process.env.AWS_REGION && arn[1] !== process.env.AWS_REGION)) {
    throw new Error("CloudWatch alarm ARN does not match the configured infrastructure");
  }
  if (message.NewStateValue !== "ALARM") throw new Error("CloudWatch alarm state is not ALARM");
  const timestamp = stateTimestamp(message.StateChangeTime);
  const eventId = createHash("sha256")
    .update(JSON.stringify(["buzzkill.infra.alarm", environment, message.AlarmArn, timestamp]))
    .digest("hex").slice(0, 32);
  const cloudWatchUrl = `https://${arn[1]}.console.aws.amazon.com/cloudwatch/home?region=${arn[1]}#alarmsV2:alarm/${encodeURIComponent(name!)}`;
  const trigger = message.Trigger;
  // Never forward reasons, descriptions, dimensions, raw logs, or arbitrary state.
  const infrastructure = {
    alarm: name!, state: "ALARM" as const, state_changed_at: timestamp, region: arn[1],
    metric: metric.metric, namespace: metric.namespace,
    ...(typeof trigger.Period === "number" && Number.isSafeInteger(trigger.Period) && trigger.Period > 0 ? { period_seconds: trigger.Period } : {}),
    ...(typeof trigger.EvaluationPeriods === "number" && Number.isSafeInteger(trigger.EvaluationPeriods) && trigger.EvaluationPeriods > 0 ? { evaluation_periods: trigger.EvaluationPeriods } : {}),
    ...(typeof trigger.Threshold === "number" && Number.isFinite(trigger.Threshold) ? { threshold: trigger.Threshold } : {}),
    ...(typeof trigger.ComparisonOperator === "string" && COMPARISONS.has(trigger.ComparisonOperator) ? { comparison: trigger.ComparisonOperator } : {}),
    ...(typeof trigger.Statistic === "string" && STATISTICS.has(trigger.Statistic) ? { statistic: trigger.Statistic } : {}),
    repository_path: `apps/web/amplify/functions/${logicalFunction}/handler.ts`,
    cloudwatch_url: cloudWatchUrl,
  };
  return { environment, account, eventId, logicalFunction, signal, timestamp, cloudWatchUrl, infrastructure };
}
