import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
type Config = { name: string; schedule?: string; environment?: Record<string, unknown> };
const mocks = vi.hoisted(() => ({ configs: [] as Config[], secret: vi.fn((name: string) => ({ secret: name })), auth: vi.fn() }));
vi.mock("@aws-amplify/backend", () => ({ defineFunction: (config: Config) => { mocks.configs.push(config); return config; }, secret: mocks.secret, defineAuth: mocks.auth }));
async function load() {
  await Promise.all([
    import("../lead-intake/resource"), import("../crm-admin/resource"), import("../crm-billing/resource"),
    import("../crm-docs/resource"), import("../crm-pricing/resource"), import("../booking-public/resource"),
    import("../stripe-webhook/resource"), import("../thumbtack-webhook/resource"), import("../daily-reminders/resource"),
    import("../lead-sweep/resource"), import("../pricing-refresh/resource"), import("../ses-events/resource"),
    import("../ops-alerts/resource"), import("../auth-challenge/resource"), import("../post-auth/resource"), import("../../auth/resource"),
  ]);
  return mocks.configs.filter((c) => c.name !== "preview-auth-message");
}
beforeEach(() => { vi.resetModules(); mocks.configs.length = 0; mocks.secret.mockClear(); mocks.auth.mockClear(); });
afterEach(() => vi.unstubAllEnvs());
describe("migration resource configuration", () => {
  it("omits all business schedules/secrets and propagates every guard", async () => {
    vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", "true");
    const configs = await load();
    expect(configs).toHaveLength(17);
    for (const config of configs) { expect(config).not.toHaveProperty("schedule"); expect(config.environment?.BUZZKILL_MIGRATION_PREVIEW).toBe("true"); }
    expect(mocks.secret).not.toHaveBeenCalled();
    expect(mocks.auth.mock.calls[0][0].triggers.customMessage.name).toBe("preview-auth-message");
  });
  it("preserves normal schedules, secrets and auth triggers without the flag", async () => {
    vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", undefined);
    const configs = await load();
    expect(configs.filter((c) => c.schedule).map((c) => c.name).sort()).toEqual(["daily-reminders", "lead-sweep", "pricing-refresh"]);
    expect(mocks.secret.mock.calls.map(([name]) => name).sort()).toEqual([...Array(6).fill("STRIPE_SECRET_KEY"), "STRIPE_WEBHOOK_SECRET", "THUMBTACK_WEBHOOK_SECRET"].sort());
    expect(mocks.auth.mock.calls[0][0].triggers).not.toHaveProperty("customMessage");
  });
});
