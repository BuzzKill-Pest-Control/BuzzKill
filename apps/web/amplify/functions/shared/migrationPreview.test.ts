import { afterEach, describe, expect, it, vi } from "vitest";
import { assertBusinessActionsEnabled, MIGRATION_PREVIEW_MESSAGE } from "./migrationPreview";
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
const handlers = [
  () => import("../lead-intake/handler"), () => import("../crm-admin/handler"),
  () => import("../crm-billing/handler"), () => import("../crm-docs/handler"),
  () => import("../crm-pricing/handler"), () => import("../booking-public/handler"),
  () => import("../stripe-webhook/handler"), () => import("../thumbtack-webhook/handler"),
  () => import("../daily-reminders/handler"), () => import("../lead-sweep/handler"),
  () => import("../pricing-refresh/handler"), () => import("../ses-events/handler"),
  () => import("../ops-alerts/handler"), () => import("../auth-challenge/verify"),
];
describe("dormant migration backend", () => {
  it("refuses every real business entrypoint before request inspection or network", async () => {
    vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", "true");
    const fetch = vi.fn(() => { throw new Error("Network must not be reached"); });
    vi.stubGlobal("fetch", fetch);
    const event = new Proxy({}, { get() { throw new Error("Request must not be inspected"); } });
    for (const load of handlers) {
      const { handler } = await load();
      const invoke = handler as unknown as (event: object) => Promise<unknown>;
      await expect(invoke(event)).rejects.toThrow(MIGRATION_PREVIEW_MESSAGE);
    }
    expect(fetch).not.toHaveBeenCalled();
  }, 20_000);
  it("guards shared data, Stripe and email boundaries without a handler", async () => {
    vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", "true");
    const { dataClient } = await import("./dataClient");
    const { stripeClient } = await import("./stripeClient");
    const { sendEmail } = await import("./email");
    expect(() => dataClient()).toThrow(MIGRATION_PREVIEW_MESSAGE);
    expect(() => stripeClient()).toThrow(MIGRATION_PREVIEW_MESSAGE);
    await expect(sendEmail({ to: "nobody@example.invalid", subject: "test", html: "", template: "test" })).rejects.toThrow(MIGRATION_PREVIEW_MESSAGE);
  });
  it("refuses every native Cognito mail kind", async () => {
    const { handler } = await import("../preview-auth-message/handler");
    const invoke = handler as unknown as (event: object) => Promise<unknown>;
    for (const triggerSource of ["CustomMessage_ForgotPassword", "CustomMessage_AdminCreateUser", "CustomMessage_UpdateUserAttribute", "CustomMessage_Authentication"]) {
      await expect(invoke({ triggerSource })).rejects.toThrow("authentication messages are disabled");
    }
  });
  it("does not refuse when the explicit flag is absent", () => {
    vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", undefined);
    expect(() => assertBusinessActionsEnabled()).not.toThrow();
  });
});
