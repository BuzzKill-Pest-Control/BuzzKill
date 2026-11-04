import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn(), retrieve: vi.fn(), attached: vi.fn(), setDefault: vi.fn(), cas: vi.fn() }));
vi.mock("../shared/dataClient", () => ({ dataClient: async () => ({ models: { Customer: { get: mocks.get, update: mocks.update } } }) }));
vi.mock("../shared/stripeClient", () => ({
  stripeClient: () => ({ customers: { retrieve: mocks.retrieve, listPaymentMethods: mocks.attached, update: mocks.setDefault } }),
  paymentMethodLabel: (pm: { id: string }) => ({ label: `Card ${pm.id}`, kind: "CARD" }),
}));
vi.mock("../shared/atomicLock", () => ({ casGuardedUpdate: mocks.cas }));
// Only the pure marker check is needed; avoid importing merge's unrelated commands.
vi.mock("../shared/customerMerge", () => ({ isMidMerge: (row: { mergeCounterpartId?: string }) => Boolean(row.mergeCounterpartId) }));
import { handler } from "./handler";
let customer: Record<string, unknown>, defaultMethod: { id: string } | null;
const event = (repair = false, groups = ["OWNER"]) => ({
  info: { fieldName: repair ? "createSetupIntent" : "getPaymentMethodSummary" },
  arguments: { customerId: "one", ...(repair ? { action: "REPAIR_PAYMENT_DEFAULT" } : {}) },
  identity: { sub: "owner", groups, claims: { email: "owner@example.test" } },
}) as never;
beforeEach(() => {
  vi.clearAllMocks();
  customer = { id: "one", status: "ACTIVE", stripeCustomerId: "cus-one", paymentMethodLabel: "Old label" };
  defaultMethod = null;
  mocks.get.mockImplementation(async () => ({ data: { ...customer } }));
  mocks.retrieve.mockImplementation(async () => ({ invoice_settings: { default_payment_method: defaultMethod } }));
  mocks.attached.mockResolvedValue({ data: [{ id: "old", created: 1 }, { id: "new", created: 2 }] });
  mocks.setDefault.mockImplementation(async (_id, value) => { defaultMethod = { id: value.invoice_settings.default_payment_method }; return {}; });
  mocks.cas.mockResolvedValue({ ok: true, prior: {} });
});
describe("payment display and explicit owner recovery", () => {
  it("does not write or claim billing readiness for attached methods without a default", async () => {
    expect(await handler(event())).toEqual({ hasPaymentMethod: false, label: null, kind: null, needsRepair: true });
    expect(mocks.update).not.toHaveBeenCalled(); expect(mocks.setDefault).not.toHaveBeenCalled(); expect(mocks.cas).not.toHaveBeenCalled();
  });
  it("returns the actual default and names stale display metadata without repairing it", async () => {
    defaultMethod = { id: "current" };
    expect(await handler(event())).toMatchObject({ hasPaymentMethod: true, label: "Card current", needsRepair: false, needsLabelSync: true });
    expect(mocks.attached).not.toHaveBeenCalled(); expect(mocks.cas).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("restores the newest attached default only after an owner action, verifies it, and fences metadata writes", async () => {
    expect(await handler(event(true))).toMatchObject({ hasPaymentMethod: true, label: "Card new", needsRepair: false });
    expect(mocks.setDefault).toHaveBeenCalledExactlyOnceWith("cus-one", { invoice_settings: { default_payment_method: "new" } });
    expect(mocks.cas).toHaveBeenCalledWith("Customer", "one", { paymentMethodLabel: "Card new", paymentMethodKind: "CARD" }, expect.arrayContaining([
      { kind: "fieldEquals", field: "stripeCustomerId", value: "cus-one" },
      { kind: "fieldMissingOrNull", field: "mergeCounterpartId" },
    ]));
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it("honors a concurrently established default rather than overwriting it with its attached candidate", async () => {
    mocks.retrieve.mockResolvedValueOnce({ invoice_settings: {} }).mockResolvedValueOnce({ invoice_settings: { default_payment_method: { id: "webhook" } } });
    expect(await handler(event(true))).toMatchObject({ label: "Card webhook", hasPaymentMethod: true });
    expect(mocks.setDefault).not.toHaveBeenCalled();
  });
  it.each(["MERGED", "MID_MERGE", "POINTER_CHANGED"])("refuses a customer/account transition: %s", async (change) => {
    if (change === "MERGED") customer.status = "MERGED";
    if (change === "MID_MERGE") customer.mergeCounterpartId = "other";
    if (change === "POINTER_CHANGED") mocks.get.mockResolvedValueOnce({ data: { ...customer } }).mockResolvedValue({ data: { ...customer, stripeCustomerId: "different" } });
    await expect(handler(event(true))).rejects.toThrow(/changed|merge|account/);
    expect(mocks.setDefault).not.toHaveBeenCalled(); expect(mocks.cas).not.toHaveBeenCalled();
  });
  it("does not let a portal customer invoke the owner repair", async () => {
    await expect(handler(event(true, ["CUSTOMER", "cus-one"]))).rejects.toThrow(/Owner/);
    expect(mocks.retrieve).not.toHaveBeenCalled(); expect(mocks.setDefault).not.toHaveBeenCalled();
  });
  it("refuses incomplete customer reads and missing provider associations without creating or changing billing", async () => {
    mocks.get.mockResolvedValueOnce({ data: { ...customer }, errors: [{ message: "partial customer" }] });
    await expect(handler(event())).rejects.toThrow(/verified/);
    expect(mocks.retrieve).not.toHaveBeenCalled(); expect(mocks.setDefault).not.toHaveBeenCalled();
    delete customer.stripeCustomerId;
    expect(await handler(event(true))).toHaveProperty("refused"); expect(mocks.retrieve).not.toHaveBeenCalled(); expect(mocks.cas).not.toHaveBeenCalled();
  });
  it("surfaces uncertain provider or metadata outcomes without claiming success", async () => {
    mocks.setDefault.mockRejectedValueOnce(new Error("provider unavailable"));
    await expect(handler(event(true))).rejects.toThrow("provider unavailable"); expect(mocks.cas).not.toHaveBeenCalled();
    mocks.cas.mockResolvedValue({ ok: false, reason: "UNSUPPORTED" });
    await expect(handler(event(true))).rejects.toThrow(/another check/);
  });
  it("does not turn a failed verification or missing method into success", async () => {
    mocks.setDefault.mockResolvedValue({}); // Provider acknowledged but never established a default.
    await expect(handler(event(true))).rejects.toThrow(/not confirmed/); expect(mocks.cas).not.toHaveBeenCalled();
    mocks.attached.mockResolvedValue({ data: [] });
    expect(await handler(event(true))).toHaveProperty("refused");
  });
});
