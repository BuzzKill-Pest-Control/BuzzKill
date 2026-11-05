import { createHash } from "node:crypto";

/** CloudWatch's SNS payload. Only the explicitly selected infrastructure fields leave AWS. */
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
const TIMEOUT_MS = 5_000;
const rateLimits = new Map<string, number>();

function configuration() {
  const raw = process.env.SENTRY_INFRA_DSN;
  if (!raw) throw new Error("Sentry infrastructure DSN is not configured");
  let dsn: URL;
  try { dsn = new URL(raw); } catch { throw new Error("Sentry infrastructure DSN is invalid"); }
  if (dsn.protocol !== "https:" || dsn.port || dsn.password ||
      !/^[a-f0-9]{16,64}$/i.test(dsn.username) ||
      !/^o[0-9]+\.ingest(?:\.(?:us|de))?\.sentry\.io$/.test(dsn.hostname) ||
      !/^\/[0-9]{1,32}$/.test(dsn.pathname) || dsn.search || dsn.hash) {
    throw new Error("Sentry infrastructure DSN is invalid");
  }
  const environment = process.env.SENTRY_ENVIRONMENT;
  if (environment !== "production" && environment !== "staging") {
    throw new Error("Sentry infrastructure environment must be production or staging");
  }
  // The retained Amplify namespace can differ from the logical production/staging environment.
  const branch = process.env.SENTRY_INFRA_ALARM_BRANCH;
  if (!branch || !/^[a-z0-9][a-z0-9-]{0,127}$/.test(branch)) {
    throw new Error("Sentry infrastructure alarm branch is invalid");
  }
  const account = process.env.SENTRY_INFRA_ACCOUNT_ID;
  if (account !== undefined && !/^[0-9]{12}$/.test(account)) {
    throw new Error("Sentry infrastructure account is invalid");
  }
  const release = process.env.SENTRY_RELEASE;
  if (release !== undefined && !/^[a-z0-9][a-z0-9._-]{0,79}@[a-f0-9]{40}$/.test(release)) {
    throw new Error("Sentry infrastructure release is invalid");
  }
  return {
    endpoint: `${dsn.origin}/api${dsn.pathname}/envelope/`, publicKey: dsn.username,
    environment, branch, account, release,
  };
}

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

/** Relevant quotas can be returned with HTTP 200; unrelated tracing quotas do not block errors. */
function rateLimitSeconds(response: Response): number {
  let seconds = 0;
  for (const limit of (response.headers.get("x-sentry-rate-limits") ?? "").split(",")) {
    const [duration, rawCategories] = limit.trim().split(":");
    if (rawCategories === undefined) continue;
    const categories = rawCategories.split(";");
    const parsed = Number(duration);
    if (Number.isFinite(parsed) && parsed > 0 &&
        (rawCategories === "" || categories.includes("error") || categories.includes("default"))) {
      seconds = Math.max(seconds, parsed);
    }
  }
  if (response.status === 429 && seconds === 0) {
    const retry = response.headers.get("retry-after");
    const numeric = retry === null ? NaN : Number(retry);
    const dated = retry === null ? NaN : (Date.parse(retry) - Date.now()) / 1000;
    seconds = Number.isFinite(numeric) && numeric > 0 ? numeric
      : Number.isFinite(dated) && dated > 0 ? dated : 60;
  }
  return Math.min(seconds, 7 * 24 * 60 * 60);
}

/**
 * Report an ALARM transition through Sentry's envelope protocol, with no SDK auto-collection.
 * The caller retains owned-work recovery and an independent delivery-failure fallback.
 * A stable event ID makes retries of the same transition identifiable without new occurrences.
 * A stable fingerprint groups later transitions into the same environment-specific issue.
 */
export async function reportInfraAlarmToSentry(message: InfraAlarmMessage): Promise<{
  eventId: string;
  cloudWatchUrl: string;
} | null> {
  if (message.NewStateValue !== "ALARM") return null;
  const config = configuration();
  const prefix = `buzzkill-${config.branch}-`;
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
  if (!arn || arn[3] !== name || (config.account && arn[2] !== config.account) ||
      (process.env.AWS_REGION && arn[1] !== process.env.AWS_REGION)) {
    throw new Error("CloudWatch alarm ARN does not match the configured infrastructure");
  }
  const timestamp = stateTimestamp(message.StateChangeTime);
  const eventId = createHash("sha256")
    .update(JSON.stringify(["buzzkill.infra.alarm", config.environment, message.AlarmArn, timestamp]))
    .digest("hex").slice(0, 32);
  const cloudWatchUrl = `https://${arn[1]}.console.aws.amazon.com/cloudwatch/home?region=${arn[1]}#alarmsV2:alarm/${encodeURIComponent(name!)}`;
  const trigger = message.Trigger;
  // Numeric metric policy is useful context; never forward raw reasons, descriptions or dimensions.
  const policy = {
    ...(typeof trigger.Period === "number" && Number.isSafeInteger(trigger.Period) && trigger.Period > 0 ? { period_seconds: trigger.Period } : {}),
    ...(typeof trigger.EvaluationPeriods === "number" && Number.isSafeInteger(trigger.EvaluationPeriods) && trigger.EvaluationPeriods > 0 ? { evaluation_periods: trigger.EvaluationPeriods } : {}),
    ...(typeof trigger.Threshold === "number" && Number.isFinite(trigger.Threshold) ? { threshold: trigger.Threshold } : {}),
    ...(typeof trigger.ComparisonOperator === "string" && COMPARISONS.has(trigger.ComparisonOperator) ? { comparison: trigger.ComparisonOperator } : {}),
    ...(typeof trigger.Statistic === "string" && STATISTICS.has(trigger.Statistic) ? { statistic: trigger.Statistic } : {}),
  };
  const event = {
    event_id: eventId, timestamp, platform: "other", level: "error",
    environment: config.environment, ...(config.release ? { release: config.release } : {}),
    logger: "buzzkill.infrastructure",
    message: `Infrastructure alarm: ${logicalFunction} ${signal}`,
    fingerprint: ["buzzkill.infrastructure", config.environment, name],
    tags: { app: "buzzkill-backend", monitoring_operation: "infra.cloudwatch_alarm", function: logicalFunction, signal },
    contexts: { infrastructure: {
      alarm: name, state: "ALARM", state_changed_at: timestamp, region: arn[1],
      metric: metric.metric, namespace: metric.namespace, ...policy,
      repository_path: `apps/web/amplify/functions/${logicalFunction}/handler.ts`,
      cloudwatch_url: cloudWatchUrl,
    } },
  };
  const payload = JSON.stringify(event);
  const envelope = `${JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event", length: Buffer.byteLength(payload, "utf8") })}\n${payload}\n`;
  const transportKey = `${config.endpoint}:${config.publicKey}`;
  if ((rateLimits.get(transportKey) ?? 0) > Date.now()) {
    throw new Error("Sentry infrastructure event delivery is rate limited");
  }
  let response: Response;
  try {
    response = await fetch(config.endpoint, {
      method: "POST", redirect: "error", credentials: "omit",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "Content-Type": "application/x-sentry-envelope",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${config.publicKey}, sentry_client=buzzkill-infra/1.0`,
      },
      body: envelope,
    });
  } catch {
    // Network exception text can contain URLs or provider response details. Keep the failure fixed.
    throw new Error("Sentry infrastructure event delivery failed");
  }
  const limitedFor = rateLimitSeconds(response);
  if (limitedFor > 0) rateLimits.set(transportKey, Date.now() + limitedFor * 1000);
  // Response content is neither needed nor safe diagnostic context; do not log or forward it.
  await response.body?.cancel().catch(() => undefined);
  if (!response.ok) throw new Error(`Sentry infrastructure event rejected (HTTP ${response.status})`);
  if (limitedFor > 0) throw new Error("Sentry infrastructure event delivery is rate limited");
  return { eventId, cloudWatchUrl };
}
