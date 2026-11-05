import { infraAlarmContext, type InfraAlarmMessage } from "./infraAlarmContext";
export type { InfraAlarmMessage } from "./infraAlarmContext";

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
  const release = process.env.SENTRY_RELEASE;
  if (release !== undefined && !/^[a-z0-9][a-z0-9._-]{0,79}@[a-f0-9]{40}$/.test(release)) {
    throw new Error("Sentry infrastructure release is invalid");
  }
  return {
    endpoint: `${dsn.origin}/api${dsn.pathname}/envelope/`, publicKey: dsn.username,
    release,
  };
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
  const context = infraAlarmContext(message);
  const { environment, eventId, timestamp, logicalFunction, signal, cloudWatchUrl } = context;
  const name = context.infrastructure.alarm;
  const event = {
    event_id: eventId, timestamp, platform: "other", level: "error",
    environment, ...(config.release ? { release: config.release } : {}),
    logger: "buzzkill.infrastructure",
    message: `Infrastructure alarm: ${logicalFunction} ${signal}`,
    fingerprint: ["buzzkill.infrastructure", environment, name],
    tags: { app: "buzzkill-backend", monitoring_operation: "infra.cloudwatch_alarm", function: logicalFunction, signal },
    contexts: { infrastructure: context.infrastructure },
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
