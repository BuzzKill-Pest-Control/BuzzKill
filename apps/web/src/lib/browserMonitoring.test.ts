// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BrowserOptions, EventHint, ErrorEvent } from "@sentry/react";

const sentry = vi.hoisted(() => ({ init: vi.fn(), captureException: vi.fn() }));
vi.mock("@sentry/react", () => ({
  ...sentry,
  eventFiltersIntegration: () => ({ name: "EventFilters" }),
  globalHandlersIntegration: () => ({ name: "GlobalHandlers" }),
  browserApiErrorsIntegration: () => ({ name: "BrowserApiErrors" }),
  dedupeIntegration: () => ({ name: "Dedupe" }),
}));
const policy = {
  appId: "example-web", allowedHosts: ["www.example.com"], routePatterns: ["/", "/track/:token"],
  dsn: `https://${"a".repeat(32)}@o123.ingest.us.sentry.io/456`,
  release: `example-web@${"b".repeat(40)}`, productionBuild: true, preview: false,
};

beforeEach(() => {
  vi.resetModules();
  sentry.init.mockReset(); sentry.captureException.mockReset();
  vi.stubGlobal("window", { location: new URL("https://www.example.com/track/secret?email=jane@example.com#token") });
});

describe("errors-only browser SDK", () => {
  it("initializes once with explicit privacy controls and sanitizes the actual SDK beforeSend hook", async () => {
    const runtime = await import("./browserMonitoring");
    expect(runtime.initializeBrowserMonitoring(policy)).toBe(true);
    expect(runtime.initializeBrowserMonitoring(policy)).toBe(true);
    expect(sentry.init).toHaveBeenCalledOnce();
    const options = sentry.init.mock.calls[0][0] as BrowserOptions;
    expect(options.defaultIntegrations).toBe(false);
    expect(options.integrations).toEqual([{ name: "EventFilters" }, { name: "GlobalHandlers" }, { name: "BrowserApiErrors" }, { name: "Dedupe" }]);
    expect(options).not.toHaveProperty("tracesSampleRate");
    expect(options).not.toHaveProperty("replaysSessionSampleRate");
    expect(options.dataCollection).toMatchObject({ userInfo: false, cookies: false, httpHeaders: false, httpBodies: [], urlQueryParams: false, stackFrameVariables: false });
    expect(options.maxBreadcrumbs).toBe(0);
    expect(options.tracePropagationTargets).toEqual([]);
    expect(options.transportOptions?.fetchOptions).toEqual({ credentials: "omit", referrerPolicy: "no-referrer" });
    const hint: EventHint = { attachments: [{ filename: "customer.csv", data: "jane@example.com" }] };
    const event: ErrorEvent = { type: undefined, user: { email: "jane@example.com" }, message: "private", request: { url: window.location.href } };
    const result = await options.beforeSend!(event, hint);
    expect(hint.attachments).toEqual([]);
    expect(result?.request?.url).toBe("https://www.example.com/track/:token");
    expect(result?.user).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain("jane@example.com");
    expect(options.beforeBreadcrumb!({ message: "private" }, {})).toBeNull();
    expect(options.beforeSendLog!({} as never)).toBeNull();
    expect(options.beforeSendMetric!({} as never)).toBeNull();
  });

  it("never initializes or captures in a preview/staging/local or unconfigured app", async () => {
    const runtime = await import("./browserMonitoring");
    expect(runtime.initializeBrowserMonitoring({ ...policy, preview: true })).toBe(false);
    expect(runtime.initializeBrowserMonitoring({ ...policy, dsn: undefined })).toBe(false);
    vi.stubGlobal("window", { location: new URL("https://staging.example.com/") });
    expect(runtime.initializeBrowserMonitoring(policy)).toBe(false);
    runtime.captureRenderFailure(new Error("private"), "render.web_page");
    expect(sentry.init).not.toHaveBeenCalled();
    expect(sentry.captureException).not.toHaveBeenCalled();
  });

  it("captures swallowed React failures with a fixed operation code", async () => {
    const runtime = await import("./browserMonitoring");
    runtime.initializeBrowserMonitoring(policy);
    const failure = new TypeError("jane@example.com");
    runtime.captureRenderFailure(failure, "render.web_page");
    expect(sentry.captureException).toHaveBeenCalledWith(failure, { tags: { monitoring_operation: "render.web_page" } });
  });

  it("fails open when SDK initialization or capture throws", async () => {
    const runtime = await import("./browserMonitoring");
    sentry.init.mockImplementationOnce(() => { throw new Error("SDK unavailable"); });
    expect(runtime.initializeBrowserMonitoring(policy)).toBe(false);
    expect(runtime.initializeBrowserMonitoring(policy)).toBe(true);
    sentry.captureException.mockImplementation(() => { throw new Error("SDK unavailable"); });
    expect(() => runtime.captureRenderFailure(new Error("private"), "render.crm_screen")).not.toThrow();
  });
});
