import { describe, expect, it } from "vitest";
import {
  enabledMonitoring, monitoringAsset, monitoringRoute, scrubMonitoringEvent,
  type MonitoringLocation, type MonitoringPolicy,
} from "./monitoringPrivacy";

const origin = "https://app.pestbuzzkill.com";
const release = `buzzkill-crm@${"a".repeat(40)}`;
const policy: MonitoringPolicy = {
  appId: "buzzkill-crm", allowedHosts: ["app.pestbuzzkill.com"],
  routePatterns: ["/", "/customers", "/customers/:id", "/tech/job/:jobId", "/welcome", "/track/:token"],
  dsn: `https://${"1".repeat(32)}@o123.ingest.us.sentry.io/456`,
  release, productionBuild: true, preview: false,
};
const location: MonitoringLocation = {
  protocol: "https:", hostname: "app.pestbuzzkill.com", origin,
  href: `${origin}/customers/customer-secret-id?email=jane@example.com#password`,
};
const config = enabledMonitoring(policy, location)!;
const asset = `${origin}/assets/CustomerDetail-aBcD1234.js`;
const debugId = "80ff0184-bd1d-45dd-8fbc-972e302ba72e";

describe("production browser monitoring gate", () => {
  it("accepts a canonical production host and attributable release", () => {
    expect(config).toMatchObject({ origin, release, appId: "buzzkill-crm" });
  });

  it.each([
    { productionBuild: false }, { preview: true }, { dsn: undefined }, { dsn: "" },
    { dsn: "not a DSN" }, { dsn: policy.dsn!.replace("https:", "http:") },
    { dsn: policy.dsn!.replace("@", ":private-key@") }, { dsn: `${policy.dsn}?secret=hidden` },
    { dsn: `${policy.dsn}#token` }, { release: undefined }, { release: "jane@example.com" },
    { appId: "jane@example.com" },
  ])("does not enable on incomplete, unsafe or non-production config %o", (change) => {
    expect(enabledMonitoring({ ...policy, ...change }, location)).toBeNull();
  });

  it.each([
    "localhost", "127.0.0.1", "staging.pestbuzzkill.com", "staging-app.pestbuzzkill.com",
    "main.d3example.amplifyapp.com", "app.pestbuzzkill.com.evil.example", "evilapp.pestbuzzkill.com",
  ])("rejects unallowlisted host %s", (hostname) => {
    expect(enabledMonitoring(policy, { ...location, hostname, origin: `https://${hostname}` })).toBeNull();
  });

  it("rejects HTTP and mismatched/ported page origins", () => {
    expect(enabledMonitoring(policy, { ...location, protocol: "http:" })).toBeNull();
    expect(enabledMonitoring(policy, { ...location, origin: "https://evil.example" })).toBeNull();
    expect(enabledMonitoring(policy, { ...location, origin: `${origin}:8443` })).toBeNull();
  });

  it("supports another business with its own explicit configuration", () => {
    expect(enabledMonitoring({
      ...policy, appId: "other-portal", allowedHosts: ["portal.example.org"], release: `other-portal@${"b".repeat(40)}`,
    }, { ...location, hostname: "portal.example.org", origin: "https://portal.example.org" }))
      .toMatchObject({ appId: "other-portal", origin: "https://portal.example.org" });
  });
});

describe("monitoring URL privacy", () => {
  it.each([
    [`${origin}/customers/customer-secret-id?email=jane@example.com#token`, "/customers/:id"],
    ["/tech/job/job-secret-token?key=123", "/tech/job/:jobId"],
    ["/welcome?username=jane@example.com&token=signup-secret#password", "/welcome"],
    ["/track/opaque-signed-token?lat=42.3&lng=-71.4", "/track/:token"],
    ["/customers/Jane%20Doe%20508-555-1234", "/customers/:id"],
    ["/customers/", "/customers"], ["/?email=jane@example.com", "/"],
    ["/signed-link/customer-secret-id", "/[redacted]"],
    ["https://evil.example/customers/id?token=secret", "/[redacted]"],
    ["https://[malformed", "/[redacted]"],
  ])("reduces %s to code-defined template %s", (input, expected) => {
    expect(monitoringRoute(input, config)).toBe(expected);
  });

  it("preserves only canonical hashed JS assets and removes their query/hash", () => {
    expect(monitoringAsset(`${asset}?customer=jane@example.com#private`, origin)).toBe(asset);
    expect(monitoringAsset("/assets/index-aBcD1234.js", origin)).toBe(`${origin}/assets/index-aBcD1234.js`);
    for (const input of ["/customers/secret", "/assets/customer.json", "blob:private", "https://third.example/assets/index-aBcD1234.js", "/src/customer-private.tsx"]) {
      expect(monitoringAsset(input, origin)).toBeUndefined();
    }
  });
});

describe("Sentry event allowlist", () => {
  it("removes realistic customer/payment/auth data while preserving actionable source-map locations", () => {
    const input = {
      event_id: "b".repeat(32), timestamp: 1_700_000_000, level: "fatal", release: "private", environment: "staging",
      message: "Customer Jane Doe jane@example.com at 123 Main St could not pay card 4242",
      logentry: { message: "Bearer auth-secret", params: ["508-555-1234"] },
      user: { id: "cognito-sub", email: "jane@example.com", ip_address: "1.2.3.4" },
      request: { url: location.href, headers: { Authorization: "Bearer auth-secret" }, cookies: "session-secret", data: { card: "4242" } },
      breadcrumbs: [
        { category: "console", message: "Jane Doe 508-555-1234" },
        { category: "fetch", data: { url: "/api?token=auth-secret", body: "123 Main St" } },
        { category: "navigation", data: { to: "/track/tracking-secret" } },
      ],
      contexts: { react: { componentStack: "Jane Doe" }, trace: { data: { token: "auth-secret" } } },
      extra: { form: { name: "Jane Doe" }, originalException: "payment-secret" },
      tags: { monitoring_operation: "render.crm_screen", customerId: "customer-secret-id", email: "jane@example.com" },
      transaction: "/customers/customer-secret-id", server_name: "private-computer", logger: "private", fingerprint: ["jane@example.com"],
      sdkProcessingMetadata: { private: "auth-secret" }, threads: { values: [{ stacktrace: "Jane Doe" }] },
      exception: { values: [{
        type: "TypeError", value: "Jane Doe's invoice 1234 failed at 123 Main St",
        mechanism: { type: "instrument", handled: true, data: { target: "jane@example.com" } },
        stacktrace: { frames: [{
          filename: `${asset}?email=jane@example.com#secret`, abs_path: location.href,
          lineno: 182, colno: 44, in_app: true, debug_id: debugId,
          function: "JaneDoe", vars: { email: "jane@example.com" }, context_line: "const password = 'auth-secret'",
          pre_context: ["private"], post_context: ["private"], module_metadata: { auth: "auth-secret" },
        }] },
      }] },
      debug_meta: { images: [
        { type: "sourcemap", code_file: `${asset}?token=auth-secret#secret`, debug_id: debugId },
        { type: "sourcemap", code_file: location.href, debug_id: debugId },
        { type: "sourcemap", code_file: asset, debug_id: "auth-secret" },
        { type: "macho", code_file: "private", debug_id: debugId },
      ] },
    };
    const result = scrubMonitoringEvent(input, config, location.href)!;
    expect(result).toEqual({
      type: undefined, event_id: "b".repeat(32), timestamp: 1_700_000_000,
      platform: "javascript", level: "error", release, environment: "production",
      exception: { values: [{
        type: "TypeError", value: "render.crm_screen (TypeError)", mechanism: { type: "generic", handled: true },
        stacktrace: { frames: [{ filename: asset, lineno: 182, colno: 44, in_app: true, debug_id: debugId }] },
      }] },
      tags: { app: "buzzkill-crm", monitoring_operation: "render.crm_screen", monitoring_source_category: "app_asset", route: "/customers/:id" },
      request: { url: `${origin}/customers/:id` },
      debug_meta: { images: [{ type: "sourcemap", code_file: asset, debug_id: debugId }] },
    });
    expect(JSON.stringify(result)).not.toMatch(/Jane|jane|508|Main St|4242|customer-secret|auth-secret|payment-secret|tracking-secret|private-computer|cognito-sub/);
    expect(input.request.headers.Authorization).toBe("Bearer auth-secret"); // No mutation of application objects.
  });

  it.each([
    ["onunhandledrejection", "browser.unhandled_rejection"], ["instrument", "browser.callback_error"], ["onerror", "browser.unhandled_error"],
    ["auto.browser.global_handlers.onunhandledrejection", "browser.unhandled_rejection"],
    ["auto.browser.global_handlers.onerror", "browser.unhandled_error"],
    ["auto.browser.browserapierrors.setTimeout", "browser.callback_error"],
    ["auto.browser.browserapierrors.addEventListener", "browser.callback_error"],
    ["auto.browser.browserapierrors.xhr.onload", "browser.callback_error"],
  ])("classifies %s without retaining its raw rejection or mechanism data", (mechanism, operation) => {
    const result = scrubMonitoringEvent({ exception: { values: [{
      type: "jane@example.com", value: "password-secret", mechanism: { type: mechanism, data: { url: location.href } },
    }] } }, config, location.href)!;
    expect(result.exception.values[0]).toEqual({ type: "Error", value: `${operation} (Error)`, mechanism: { type: "generic", handled: false } });
  });

  it("bounds nested payloads and rejects every non-error event type", () => {
    const result = scrubMonitoringEvent({ exception: { values: Array.from({ length: 10 }, () => ({
      type: "Error", stacktrace: { frames: Array.from({ length: 120 }, () => ({ filename: location.href, debug_id: "invalid", lineno: NaN })) },
    })) } }, config, location.href)!;
    expect(result.exception.values).toHaveLength(5);
    expect(result.exception.values[0].stacktrace!.frames).toHaveLength(100);
    expect(result.exception.values[0].stacktrace!.frames[0]).toEqual({});
    for (const type of ["transaction", "profile", "replay_event", "feedback"]) expect(scrubMonitoringEvent({ type }, config, location.href)).toBeNull();
  });

  it("handles message-only errors with safe fixed diagnostics", () => {
    const result = scrubMonitoringEvent({ message: "Jane Doe auth-secret", event_id: "bad", timestamp: Infinity }, config, "/unknown/secret")!;
    expect(result.event_id).toBeUndefined();
    expect(result.timestamp).toBeUndefined();
    expect(result.exception.values[0].value).toBe("browser.unhandled_error (Error)");
    expect(result.request.url).toBe(`${origin}/[redacted]`);
  });
});

describe("bounded source-category diagnostics", () => {
  const cases = [
    [asset, "app_asset"],
    [`${asset}?private=${"auth-secret".repeat(500)}`, "app_asset"],
    [location.href, "inline"],
    [`${origin}/customers/customer-secret-id?other=auth-secret#private`, "inline"],
    ["https://vendor.example/private-jane@example.com.js?token=auth-secret", "external"],
    ["https://app.pestbuzzkill.com.evil.example/private.js", "external"],
    ["chrome-extension://extension-secret-id/private.js", "extension"],
    ["moz-extension://extension-secret-id/private.js", "extension"],
    ["safari-web-extension://extension-secret-id/private.js", "extension"],
    ["eval", "eval"],
    ["debugger eval code", "eval"],
    ["blob:https://app.pestbuzzkill.com/customer-secret-id", "eval"],
    ["data:text/javascript,jane@example.com", "eval"],
    ["javascript:privateCustomer()", "eval"],
    ["<anonymous>", "unknown"],
    ["[native code]", "unknown"],
    ["https://[malformed", "unknown"],
    [`${origin}/private-source.ts`, "unknown"],
  ];

  it.each(cases)("classifies %s as the fixed %s hint without retaining its location", (filename, category) => {
    const raw = { tags: { customer: "jane@example.com" }, exception: { values: [{
      type: "ReferenceError", value: "Jane Doe auth-secret", stacktrace: { frames: [
        { filename: asset, lineno: 10, function: "outerPrivateWrapper" },
        { filename, lineno: 20, colno: 3, function: "privateCustomerFunction" },
      ] },
    }] } };
    const clean = scrubMonitoringEvent(raw, config, location.href)!;
    expect(clean.tags.monitoring_source_category).toBe(category);
    expect(clean.exception.values[0].stacktrace!.frames[0].filename).toBe(asset);
    expect(scrubMonitoringEvent(clean, config, location.href)).toEqual(clean);
    expect(JSON.stringify(clean)).not.toMatch(/Jane|jane|auth-secret|customer-secret|extension-secret|vendor\.example|privateCustomer|private-source|outerPrivate/);
  });

  it("handles stackless errors and rejects unbounded or forged metadata", () => {
    const raw = { tags: { monitoring_source_category: "jane@example.com", monitoring_source_host: "customer-secret-id" },
      exception: { values: [{ type: "ReferenceError", stacktrace: { frames: [{}] } }] } };
    const clean = scrubMonitoringEvent(raw, config, location.href)!;
    expect(clean.tags.monitoring_source_category).toBe("unknown");
    expect(clean.tags).not.toHaveProperty("monitoring_source_host");
    expect(scrubMonitoringEvent(clean, config, location.href)).toEqual(clean);
    expect(JSON.stringify(clean)).not.toMatch(/jane|customer-secret/);
  });

  it("prefers an observed raw location to a conflicting category hint", () => {
    const clean = scrubMonitoringEvent({ tags: { monitoring_source_category: "inline" }, exception: { values: [{
      stacktrace: { frames: [{ abs_path: asset }] },
    }] } }, config, location.href)!;
    expect(clean.tags.monitoring_source_category).toBe("app_asset");
  });

  it("inspects only the primary exception's innermost retained frame", () => {
    const clean = scrubMonitoringEvent({ exception: { values: [
      { stacktrace: { frames: [{ filename: "chrome-extension://private/id.js" }] } },
      { stacktrace: { frames: [{ filename: asset }, {}] } },
    ] } }, config, location.href)!;
    expect(clean.tags.monitoring_source_category).toBe("unknown");
  });
});
