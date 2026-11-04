/** Pure, reusable browser monitoring policy. App-specific hosts/routes live in each app's wrapper. */
export type MonitoringPolicy = {
  appId: string;
  allowedHosts: readonly string[];
  routePatterns: readonly string[];
  dsn?: string;
  release?: string;
  productionBuild: boolean;
  preview: boolean;
};

export type MonitoringLocation = { hostname: string; protocol: string; origin: string; href: string };
export type EnabledMonitoring = MonitoringPolicy & { dsn: string; release: string; origin: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EVENT_ID = /^[0-9a-f]{32}$/i;
const RELEASE = /^[a-z0-9][a-z0-9._-]{0,79}@[0-9a-f]{40}$/;
const ERROR_TYPES = new Set([
  "Error", "TypeError", "RangeError", "ReferenceError", "SyntaxError", "URIError", "EvalError",
  "AggregateError", "UnhandledRejection", "ChunkLoadError", "NetworkError", "AbortError",
  "SecurityError", "InvalidStateError", "NotFoundError", "QuotaExceededError",
]);
export const MONITORING_OPERATIONS = [
  "browser.unhandled_error", "browser.unhandled_rejection", "browser.callback_error",
  "render.crm_screen", "render.web_page",
] as const;
export type MonitoringOperation = typeof MONITORING_OPERATIONS[number];

type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue => value && typeof value === "object" && !Array.isArray(value)
  ? value as RecordValue : {};

/** Unknown hosts, preview builds, missing/invalid config and non-HTTPS pages never initialize the SDK. */
export function enabledMonitoring(policy: MonitoringPolicy, location: MonitoringLocation): EnabledMonitoring | null {
  if (!policy.productionBuild || policy.preview || location.protocol !== "https:" ||
      !policy.allowedHosts.includes(location.hostname.toLowerCase()) ||
      !/^[a-z0-9][a-z0-9._-]{0,79}$/.test(policy.appId) || !policy.release || !RELEASE.test(policy.release) || !policy.dsn) return null;
  try {
    const origin = new URL(location.origin);
    const dsn = new URL(policy.dsn);
    if (origin.protocol !== "https:" || origin.hostname.toLowerCase() !== location.hostname.toLowerCase() || origin.port ||
        dsn.protocol !== "https:" || !/^[a-f0-9]{16,64}$/i.test(dsn.username) || dsn.password ||
        !/^\/[0-9]+$/.test(dsn.pathname) || dsn.search || dsn.hash) return null;
    return { ...policy, dsn: policy.dsn, release: policy.release, origin: origin.origin };
  } catch { return null; }
}

/** Return only a code-defined route template, never an identifier supplied in the URL. */
export function monitoringRoute(value: unknown, policy: Pick<EnabledMonitoring, "origin" | "routePatterns">): string {
  if (typeof value !== "string") return "/[redacted]";
  try {
    const url = new URL(value, policy.origin);
    if (url.origin !== policy.origin) return "/[redacted]";
    const segments = url.pathname.replace(/\/$/, "").split("/");
    for (const pattern of policy.routePatterns) {
      // Templates come from source, but reject malformed caller configuration too.
      if (!/^\/(?:[a-z0-9-]+|:[a-zA-Z][a-zA-Z0-9]*)(?:\/(?:[a-z0-9-]+|:[a-zA-Z][a-zA-Z0-9]*))*$/.test(pattern) && pattern !== "/") continue;
      const parts = pattern.replace(/\/$/, "").split("/");
      if (parts.length === segments.length && parts.every((part, i) => part.startsWith(":") ? Boolean(segments[i]) : part === segments[i])) return pattern;
    }
  } catch { /* Malformed URLs have no safe route context. */ }
  return "/[redacted]";
}

/** Keep immutable, same-origin Vite script assets so private source maps can resolve their debug IDs. */
export function monitoringAsset(value: unknown, origin: string): string | undefined {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value, origin);
    if (url.origin === origin && /^\/assets\/[a-zA-Z0-9_-]+-[a-zA-Z0-9_-]{8,}\.m?js$/.test(url.pathname)) {
      return `${origin}${url.pathname}`;
    }
  } catch { /* Non-asset frames keep numeric locations only. */ }
  return undefined;
}

function positiveInteger(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function cleanFrame(value: unknown, origin: string) {
  const frame = object(value);
  const filename = monitoringAsset(frame.filename, origin) ?? monitoringAsset(frame.abs_path, origin);
  return {
    ...(filename ? { filename } : {}),
    ...(positiveInteger(frame.lineno) !== undefined ? { lineno: frame.lineno as number } : {}),
    ...(positiveInteger(frame.colno) !== undefined ? { colno: frame.colno as number } : {}),
    ...(typeof frame.in_app === "boolean" ? { in_app: frame.in_app } : {}),
    ...(typeof frame.debug_id === "string" && UUID.test(frame.debug_id) ? { debug_id: frame.debug_id } : {}),
  };
}

function operationFor(event: RecordValue): MonitoringOperation {
  const operation = object(event.tags).monitoring_operation;
  if (MONITORING_OPERATIONS.includes(operation as MonitoringOperation)) return operation as MonitoringOperation;
  const values = object(event.exception).values;
  const mechanisms = Array.isArray(values) ? values.map((value) => object(object(value).mechanism).type) : [];
  if (mechanisms.some((type) => type === "onunhandledrejection" || type === "auto.browser.global_handlers.onunhandledrejection")) return "browser.unhandled_rejection";
  if (mechanisms.some((type) => type === "instrument" ||
      (typeof type === "string" && type.startsWith("auto.browser.browserapierrors.")))) return "browser.callback_error";
  return "browser.unhandled_error";
}

/** Rebuild from an allowlist, rather than trying to find every place SDK/context data may contain PII. */
export function scrubMonitoringEvent(input: unknown, policy: EnabledMonitoring, pageUrl: string) {
  const event = object(input);
  if (event.type !== undefined) return null; // Errors only: never transactions, feedback or replay.
  const operation = operationFor(event);
  const values = object(event.exception).values;
  const exceptions = (Array.isArray(values) && values.length ? values : [{}]).slice(-5).map((value) => {
    const error = object(value);
    const type = typeof error.type === "string" && ERROR_TYPES.has(error.type) ? error.type : "Error";
    const frames = object(error.stacktrace).frames;
    const mechanism = object(error.mechanism);
    return {
      type,
      value: `${operation} (${type})`,
      ...(Array.isArray(frames) ? { stacktrace: { frames: frames.slice(-100).map((frame) => cleanFrame(frame, policy.origin)) } } : {}),
      mechanism: { type: "generic", handled: typeof mechanism.handled === "boolean" ? mechanism.handled : !operation.startsWith("browser.") },
    };
  });
  const images = object(event.debug_meta).images;
  const debugImages = Array.isArray(images) ? images.slice(0, 100).flatMap((value) => {
    const image = object(value);
    const codeFile = monitoringAsset(image.code_file, policy.origin);
    return image.type === "sourcemap" && codeFile && typeof image.debug_id === "string" && UUID.test(image.debug_id)
      ? [{ type: "sourcemap" as const, code_file: codeFile, debug_id: image.debug_id }] : [];
  }) : [];
  const route = monitoringRoute(pageUrl, policy);
  return {
    type: undefined,
    ...(typeof event.event_id === "string" && EVENT_ID.test(event.event_id) ? { event_id: event.event_id } : {}),
    ...(typeof event.timestamp === "number" && Number.isFinite(event.timestamp) ? { timestamp: event.timestamp } : {}),
    platform: "javascript", level: "error" as const,
    release: policy.release, environment: "production",
    exception: { values: exceptions },
    tags: { app: policy.appId, monitoring_operation: operation, route },
    request: { url: `${policy.origin}${route}` },
    ...(debugImages.length ? { debug_meta: { images: debugImages } } : {}),
  };
}
