// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.pestbuzzkill.com/track/private-track-token?email=jane@example.com#auth-secret"}
import { afterEach, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/react";
import { initializeBrowserMonitoring } from "./browserMonitoring";

const dsn = `https://${"a".repeat(32)}@o123.ingest.us.sentry.io/456`;
const release = `buzzkill-web@${"b".repeat(40)}`;
const asset = "https://www.pestbuzzkill.com/assets/index-aBcD1234.js";
const debugId = "80ff0184-bd1d-45dd-8fbc-972e302ba72e";

afterEach(async () => {
  await Sentry.close(1000);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it("runs the real SDK global handlers through its fetch transport, scrubs PII, preserves debug IDs and sends errors only", async () => {
  const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetch);
  const disabled = {
    appId: "buzzkill-web", allowedHosts: ["www.pestbuzzkill.com"], routePatterns: ["/track/:token"],
    dsn, release, productionBuild: true, preview: true,
  };
  expect(initializeBrowserMonitoring(disabled)).toBe(false);
  expect(initializeBrowserMonitoring({ ...disabled, preview: false, dsn: undefined })).toBe(false);
  expect(fetch).not.toHaveBeenCalled();

  vi.stubEnv("PROD", true);
  vi.stubEnv("VITE_BUZZKILL_MIGRATION_PREVIEW", "false");
  vi.stubEnv("VITE_SENTRY_DSN", dsn);
  vi.stubEnv("VITE_SENTRY_RELEASE", release);
  // Real build-plugin debug-ID payload, using the same browser stack format as emitted bundles.
  vi.stubGlobal("_sentryDebugIds", { [`Error\n    at ${asset}:1:1`]: debugId });
  await import("./monitoringBootstrap");
  expect(Sentry.getClient()).toBeDefined();
  expect(Sentry.getClient()!.getOptions().release).toBe(release);

  Sentry.setUser({ email: "jane@example.com", id: "private-customer-id" });
  Sentry.setExtra("customer", { name: "Jane Doe", address: "123 Main St" });
  Sentry.addBreadcrumb({ category: "console", message: "Jane Doe at 123 Main St" });
  Sentry.getCurrentScope().addAttachment({ filename: "customers.csv", data: "jane@example.com" });

  const makeError = (line: number) => {
    const error = new TypeError("Jane Doe jane@example.com 508-555-1234 at 123 Main St token=auth-secret");
    error.stack = `TypeError: ${error.message}\n    at checkout (${asset}:${line}:4)`;
    return error;
  };
  // Vitest's globals proxy Window properties; bridge DOM events to the SDK's actual installed global handlers.
  window.addEventListener("error", (event) => {
    globalThis.onerror?.(event.message, event.filename, event.lineno, event.colno, event.error);
    event.preventDefault();
  });
  window.addEventListener("unhandledrejection", (event) => {
    globalThis.onunhandledrejection?.call(window, event);
    event.preventDefault();
  });
  window.dispatchEvent(new ErrorEvent("error", { message: "Jane Doe", error: makeError(20), filename: asset, lineno: 20, colno: 4, cancelable: true }));
  const rejection = new Event("unhandledrejection", { cancelable: true });
  Object.defineProperty(rejection, "reason", { value: makeError(30) });
  window.dispatchEvent(rejection);
  expect(await Sentry.flush(1000)).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(2);

  const bodies = fetch.mock.calls.map((call) => String((call as unknown as [unknown, RequestInit])[1].body));
  const events = bodies.map((body) => {
    const lines = body.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[1]).type).toBe("event");
    expect(body).not.toMatch(/jane@example|Jane Doe|123 Main|508-555|private-customer|private-track|auth-secret|customers.csv/);
    return JSON.parse(lines[2]);
  });
  expect(events.map((event) => event.tags.monitoring_operation)).toEqual(["browser.unhandled_error", "browser.unhandled_rejection"]);
  for (const event of events) {
    expect(event.request.url).toBe("https://www.pestbuzzkill.com/track/:token");
    expect(event.exception.values[0].stacktrace.frames[0]).toMatchObject({ filename: asset, colno: 4 });
    expect(event.debug_meta.images).toEqual([{ type: "sourcemap", code_file: asset, debug_id: debugId }]);
    expect(event).not.toHaveProperty("user");
    expect(event).not.toHaveProperty("extra");
    expect(event).not.toHaveProperty("breadcrumbs");
  }
  for (const call of fetch.mock.calls) expect((call as unknown as [unknown, RequestInit])[1])
    .toMatchObject({ credentials: "omit", referrerPolicy: "no-referrer" });

  // SDK-internal errors deliberately skip beforeSend: the transport still enforces the full privacy allowlist.
  Sentry.captureException(makeError(40), { data: { __sentry__: true } });
  expect(await Sentry.flush(1000)).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(3);
  const internalBody = String((fetch.mock.calls[2] as unknown as [unknown, RequestInit])[1].body);
  expect(internalBody).not.toMatch(/jane@example|Jane Doe|123 Main|508-555|private-customer|private-track|auth-secret|customers.csv/);
  const internal = JSON.parse(internalBody.trim().split("\n")[2]);
  expect(internal.exception.values[0]).toMatchObject({ type: "TypeError", value: "browser.unhandled_error (TypeError)" });
  expect(internal.debug_meta.images).toEqual([{ type: "sourcemap", code_file: asset, debug_id: debugId }]);
  expect(internal.request.url).toBe("https://www.pestbuzzkill.com/track/:token");
  expect(internal).not.toHaveProperty("user");
  expect(internal).not.toHaveProperty("extra");

  // The built-in filter runs on the original event before our scrubber replaces its message.
  Sentry.captureException(new Error("ResizeObserver loop completed with undelivered notifications."));
  Sentry.captureMessage("Script error.");
  Sentry.logger.error("private console details", { email: "jane@example.com" });
  Sentry.metrics.count("private-metric", 1, { attributes: { email: "jane@example.com" } });
  Sentry.startSession();
  Sentry.captureSession();
  Sentry.captureEvent({ type: "replay_event", message: "private replay" });
  await Sentry.startSpan({ name: "private trace", op: "test" }, async () => {});
  expect(await Sentry.flush(1000)).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(3);
});
