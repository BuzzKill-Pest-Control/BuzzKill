import * as Sentry from "@sentry/react";
import {
  enabledMonitoring, scrubMonitoringEvent,
  type EnabledMonitoring, type MonitoringOperation, type MonitoringPolicy,
} from "./monitoringPrivacy";

let active: EnabledMonitoring | null = null;

/** Reusable across apps/businesses: each wrapper supplies its own identity, canonical hosts and routes. */
export function initializeBrowserMonitoring(policy: MonitoringPolicy): boolean {
  if (active) return true;
  if (typeof window === "undefined") return false;
  const config = enabledMonitoring(policy, window.location);
  if (!config) return false;
  try {
    Sentry.init({
      dsn: config.dsn,
      release: config.release,
      environment: "production",
      defaultIntegrations: false,
      integrations: [Sentry.eventFiltersIntegration(), Sentry.globalHandlersIntegration(), Sentry.browserApiErrorsIntegration(), Sentry.dedupeIntegration()],
      dataCollection: {
        userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false,
        graphQL: { document: false, variables: false }, genAI: { inputs: false, outputs: false },
        mcp: { inputs: false, outputs: false }, databaseQueryData: false, queues: false,
        stackFrameVariables: false, frameContextLines: 0,
      },
      maxBreadcrumbs: 0,
      beforeBreadcrumb: () => null,
      sendClientReports: false,
      tracePropagationTargets: [],
      propagateTraceparent: false,
      beforeSendLog: () => null,
      beforeSendMetric: () => null,
      transportOptions: { fetchOptions: { credentials: "omit", referrerPolicy: "no-referrer" } },
      transport(options) {
        const transport = Sentry.makeFetchTransport(options);
        return {
          send(envelope) {
            // The SDK has independent envelope paths for sessions, logs, metrics, replay and streamed spans.
            const errors: [{ type: "event" }, Sentry.Event][] = [];
            for (const [header, payload] of envelope[1]) {
              if (header.type === "event" && payload !== null && typeof payload === "object" &&
                  !(payload instanceof Uint8Array) && !Array.isArray(payload) &&
                  !("type" in payload && payload.type !== undefined)) {
                // SDK-internal exceptions bypass beforeSend. The final outbound boundary must enforce the same policy.
                try {
                  const error = scrubMonitoringEvent(payload, config, window.location.href);
                  if (error) errors.push([{ type: "event" }, error]);
                } catch { /* Invalid telemetry is dropped without interrupting the app. */ }
              }
            }
            return errors.length ? transport.send([{
              event_id: errors[0][1].event_id ?? "", sent_at: new Date().toISOString(),
            }, errors]) : Promise.resolve({ statusCode: 200 });
          },
          flush: (timeout) => transport.flush(timeout),
        };
      },
      beforeSend(event, hint) {
        // Attachments are separate envelope items, so dropping event fields is not sufficient.
        hint.attachments = [];
        try { return scrubMonitoringEvent(event, config, window.location.href); }
        catch { return null; }
      },
    });
    active = config;
    return true;
  } catch {
    // Monitoring must never become an application startup dependency.
    return false;
  }
}

/** Existing React 18 boundaries swallow render failures; capture them explicitly without form/context data. */
export function captureRenderFailure(error: unknown, operation: MonitoringOperation): void {
  if (!active) return;
  try {
    Sentry.captureException(error, { tags: { monitoring_operation: operation } });
  } catch { /* Reporting cannot interrupt a working error fallback. */ }
}
