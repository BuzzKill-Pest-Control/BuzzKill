// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CustomerDetail from "./CustomerDetail";
import PortalBilling from "../portal/Billing";
import { queryCache } from "../lib/queryCache";

const mocks = vi.hoisted(() => ({
  summary: vi.fn(),
  customer: { id: "customer", displayName: "Example Home", status: "ACTIVE", paymentMethodLabel: "Visa ••1111" },
  roles: { sub: "owner", owner: true, office: true, finance: true, loading: false, groups: ["OWNER"] },
}));
vi.mock("../lib/auth", () => ({ useRoles: () => mocks.roles }));
vi.mock("react-router-dom", async (original) => ({ ...await original<typeof import("react-router-dom")>(), useParams: () => ({ id: "customer" }) }));
vi.mock("../components/CollectPaymentSheet", () => ({ default: () => null }));
vi.mock("../portal/portalData", () => ({ loadMyCustomers: async () => [mocks.customer] }));
vi.mock("../lib/api", async (original) => {
  const actual = await original<typeof import("../lib/api")>();
  const list = async () => ({ data: [], nextToken: null });
  const models = Object.fromEntries([
    "ServicePlan", "Job", "Agreement", "ServiceReport", "ServiceReportAmendment", "Invoice", "CustomerGroup",
  ].map((name) => [name, { list }]));
  return {
    ...actual,
    api: () => ({
      models: { ...models, Customer: { get: async () => ({ data: mocks.customer }) }, BookingRequest: { listBookingRequestByLeadCustomerId: list } },
      queries: { getPaymentMethodSummary: mocks.summary },
    }),
    listCustomerLifecycleEvents: async () => ({ data: [], readFailed: false }),
    listLifecycleCommands: async () => [], listLeadActivity: list,
  };
});
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }
const key = ["customers", "ACTIVE"] as const;
let container: HTMLDivElement, root: Root;
const screens = ["CustomerDetail", "PortalBilling"] as const;
async function mount(screen: typeof screens[number]) {
  await act(async () => root.render(createElement(MemoryRouter, null, createElement(screen === "CustomerDetail" ? CustomerDetail : PortalBilling))));
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  HTMLElement.prototype.scrollIntoView = vi.fn(); mocks.summary.mockReset();
  queryCache.activate(null); queryCache.activate("owner", ["OWNER"]);
  await queryCache.request(key, async () => [{ ...mocks.customer }]).promise;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); queryCache.activate(null); vi.unstubAllGlobals(); });

describe.each(screens)("%s payment-summary repair plumbing", (screen) => {
  it("compares the summary with the loaded Customer's label before invalidating directory rows", async () => {
    const pending = deferred<{ data: string }>(); mocks.summary.mockReturnValue(pending.promise);
    const before = queryCache.read(key); await mount(screen);
    expect(mocks.summary).toHaveBeenCalledExactlyOnceWith({ customerId: "customer" }); expect(queryCache.read(key)).toEqual(before);
    await act(async () => pending.resolve({ data: JSON.stringify({ hasPaymentMethod: true, label: "Visa ••4242" }) }));
    expect(queryCache.read(key)).toBeNull(); expect(container.textContent).toContain("Visa ••4242");
  });
  it.each([
    { hasPaymentMethod: true, label: "Visa ••1111" },
    { hasPaymentMethod: false, label: null },
  ])("keeps Back-navigation data fresh for an ordinary/no-method summary: %o", async (summary) => {
    mocks.summary.mockResolvedValue({ data: JSON.stringify(summary) }); const before = queryCache.read(key);
    await mount(screen); expect(mocks.summary).toHaveBeenCalledExactlyOnceWith({ customerId: "customer" }); expect(queryCache.read(key)).toEqual(before);
  });
  it("invalidates partial failures while preserving the screen's existing error handling", async () => {
    mocks.summary.mockResolvedValue({ data: JSON.stringify({ hasPaymentMethod: true, label: "Visa ••4242" }), errors: [{ message: "Summary unavailable" }] });
    await mount(screen); expect(queryCache.read(key)).toBeNull();
    expect(container.textContent).not.toContain("Visa ••4242");
    if (screen === "PortalBilling") expect(container.textContent).toContain("Summary unavailable");
    else expect(container.textContent).not.toContain("Summary unavailable");
  });
});
