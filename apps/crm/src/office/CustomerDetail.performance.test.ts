// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CustomerDetail from "./CustomerDetail";
import PortalBilling from "../portal/Billing";
import { queryCache } from "../lib/queryCache";
const mocks = vi.hoisted(() => ({
  record: vi.fn(), essentials: vi.fn(), page: vi.fn(), documents: vi.fn(), history: vi.fn(), amendments: vi.fn(),
  summary: vi.fn(), repair: vi.fn(), contact: vi.fn(), charge: vi.fn(), delivery: vi.fn(), roster: vi.fn(), group: vi.fn(), commands: vi.fn(), leadHistory: vi.fn(),
  params: { id: "customer" },
  customer: { id: "customer", displayName: "Example Home", status: "ACTIVE", paymentMethodLabel: "Visa ••1111" },
  roles: { sub: "owner", owner: true, office: true, finance: true, loading: false, groups: ["OWNER"] },
}));
vi.mock("../lib/auth", () => ({ useRoles: () => mocks.roles }));
vi.mock("react-router-dom", async (original) => ({ ...await original<typeof import("react-router-dom")>(), useParams: () => mocks.params }));
vi.mock("../components/CollectPaymentSheet", () => ({ default: ({ open, onSaved }: { open: boolean; onSaved: () => void }) => open ? createElement("button", { onClick: onSaved }, "Confirm payment setup") : null }));
vi.mock("../portal/portalData", () => ({ loadMyCustomers: async () => [mocks.customer] }));
vi.mock("../lib/customerRecordReads", () => ({
  readCustomerRecord: mocks.record, readCustomerEssentials: mocks.essentials, readCustomerPage: mocks.page,
  readCustomerDocuments: mocks.documents, readLifecyclePage: mocks.history, readReportAmendments: mocks.amendments,
}));
vi.mock("../lib/api", async (original) => {
  const actual = await original<typeof import("../lib/api")>();
  const list = async () => ({ data: [], nextToken: null });
  return { ...actual, api: () => ({
    models: { Customer: { get: async () => ({ data: mocks.customer }) }, Invoice: { list },
      CustomerGroup: { list: mocks.roster, get: mocks.group }, CustomerLifecycleCommand: { listCustomerLifecycleCommandByCustomerIdAndRequestedAt: mocks.commands },
      BookingRequest: { listBookingRequestByLeadCustomerId: list } },
    queries: { getPaymentMethodSummary: mocks.summary },
    mutations: { createSetupIntent: mocks.repair, updateCustomerContact: mocks.contact, chargeOneTimeJob: mocks.charge, recordReportDelivery: mocks.delivery },
  }), listLeadActivity: mocks.leadHistory };
});
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (reason: unknown) => void; const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
const key = ["customers", "ACTIVE"] as const;
let container: HTMLDivElement, root: Root;
async function mount(portal = false) { await act(async () => root.render(createElement(MemoryRouter, null, createElement(portal ? PortalBilling : CustomerDetail)))); }
function button(text: string, scope: ParentNode = container) {
  const result = [...scope.querySelectorAll("button")].find((row) => row.textContent?.trim() === text);
  if (!result) throw new Error(`Missing ${text}`); return result;
}
async function open(title: string, value = true) {
  const element = [...container.querySelectorAll("details")].find((row) => row.querySelector("summary")?.textContent?.startsWith(title));
  if (!element) throw new Error(`Missing ${title}`);
  await act(async () => { element.open = value; element.dispatchEvent(new Event("toggle", { bubbles: false })); });
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  vi.spyOn(window, "confirm").mockReturnValue(true); HTMLElement.prototype.scrollIntoView = vi.fn();
  for (const value of Object.values(mocks)) if (typeof value === "function") value.mockReset();
  mocks.params.id = "customer"; mocks.roles.owner = true; mocks.roles.groups = ["OWNER"]; mocks.customer.status = "ACTIVE";
  mocks.record.mockImplementation(async (id) => ({ ...mocks.customer, id })); mocks.essentials.mockResolvedValue([]);
  mocks.page.mockResolvedValue({ items: [], nextToken: null }); mocks.documents.mockResolvedValue([]);
  mocks.history.mockResolvedValue({ items: [], nextToken: null }); mocks.amendments.mockResolvedValue([]);
  mocks.roster.mockResolvedValue({ data: [], nextToken: null }); mocks.commands.mockResolvedValue({ data: [], nextToken: null });
  mocks.group.mockImplementation(async ({ id }) => ({ data: { id, name: `Group ${id}` } }));
  mocks.leadHistory.mockResolvedValue({ data: [] }); mocks.contact.mockResolvedValue({ data: "{}" });
  mocks.delivery.mockResolvedValue({ data: "{}" });
  mocks.summary.mockResolvedValue({ data: JSON.stringify({ hasPaymentMethod: true, label: "Visa ••4242" }) });
  queryCache.activate(null); queryCache.activate("owner", ["OWNER"]);
  await queryCache.request(key, async () => [{ ...mocks.customer }]).promise;
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); queryCache.activate(null); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("independent customer essentials and explicit history", () => {
  it("renders customer/payment facts while jobs wait; heavy history and the group roster stay idle", async () => {
    const pending = deferred<unknown[]>(); mocks.essentials.mockImplementation((_id, type) => type === "jobs" ? pending.promise : Promise.resolve([]));
    await mount(); expect(container.querySelector("h1")?.textContent).toBe("Example Home"); expect(container.textContent).toContain("Visa ••4242");
    expect(container.textContent).not.toContain("no plan or upcoming job");
    expect(button("Charge the card").disabled).toBe(true); expect(mocks.page).not.toHaveBeenCalled(); expect(mocks.documents).not.toHaveBeenCalled();
    expect(mocks.history).not.toHaveBeenCalled(); expect(mocks.amendments).not.toHaveBeenCalled(); expect(mocks.roster).not.toHaveBeenCalled();
    await act(async () => pending.resolve([])); expect(button("Charge the card").disabled).toBe(false);
  });
  it("keeps one failed section independent and does not turn unreadable essentials into absence", async () => {
    mocks.essentials.mockImplementation(async (_id, type) => { if (type === "invoices") throw new Error("Invoice page unavailable"); return []; });
    await mount(); expect(container.textContent).toContain("No jobs yet."); expect(container.textContent).toContain("Invoice page unavailable");
    expect(container.textContent).not.toContain("No invoices yet."); expect(container.textContent).not.toContain("no plan or upcoming job"); expect(button("Charge the card").disabled).toBe(true);
    mocks.essentials.mockResolvedValue([]); await act(async () => button("Retry invoices").click()); expect(button("Charge the card").disabled).toBe(false);
  });
  it("loads reports/documents/lifecycle only when opened, and retains an explicit continuation after a history error", async () => {
    mocks.history.mockResolvedValueOnce({ items: [], nextToken: "next" }).mockRejectedValueOnce(new Error("history offline"))
      .mockResolvedValueOnce({ items: [], nextToken: null });
    await mount(); await open("Service reports"); expect(mocks.page).toHaveBeenCalledExactlyOnceWith("customer", "serviceReports", undefined);
    await open("Documents"); expect(mocks.documents).toHaveBeenCalledExactlyOnceWith("customer");
    await open("Lifecycle history"); expect(container.textContent).not.toContain("No lifecycle changes.");
    await act(async () => button("Load more lifecycle history").click());
    expect(container.textContent).toContain("history offline"); await act(async () => button("Load more lifecycle history").click());
    expect(mocks.history).toHaveBeenNthCalledWith(3, "customer", "next");
  });
  it("renders essential rows in explicit pages while retaining all metadata for financial decisions", async () => {
    mocks.essentials.mockImplementation(async (_id, type) => type === "jobs" ? Array.from({ length: 26 }, (_, index) => ({ id: `j${index}`, serviceType: `Visit ${index}`, status: "COMPLETED", type: "ONE_TIME", priceCents: 1000 })) : []);
    await mount(); expect(container.textContent).not.toContain("Visit 25"); await act(async () => button("Show more jobs").click()); expect(container.textContent).toContain("Visit 25");
  });
  it("verifies transition recovery independently and resolves only the group names referenced by opened history", async () => {
    const pending = deferred<{ data: unknown[]; nextToken: null }>(); mocks.commands.mockReturnValue(pending.promise);
    mocks.history.mockResolvedValue({ items: [{ id: "event", action: "GROUP_CHANGE", effects: "group: old → new", occurredAt: "2026-10-01T12:00:00Z" }], nextToken: null });
    await mount(); expect(button("Mark inactive").disabled).toBe(true); expect(mocks.group).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ data: [], nextToken: null })); expect(button("Mark inactive").disabled).toBe(false);
    await open("Lifecycle history"); expect(mocks.group.mock.calls.map(([value]) => value.id).sort()).toEqual(["new", "old"]);
    expect(mocks.roster).not.toHaveBeenCalled(); expect(container.textContent).toContain("Changed from Group old to Group new");
    await act(async () => button("Add group").click()); expect(mocks.roster).toHaveBeenCalledExactlyOnceWith({ limit: 100, nextToken: undefined });
  });
  it("does not mistake an empty indexed agreement page for the end of history", async () => {
    mocks.page.mockResolvedValueOnce({ items: [], nextToken: "later" }).mockResolvedValueOnce({ items: [{ id: "a", title: "Signed agreement", status: "SIGNED" }], nextToken: null });
    await mount(); await open("Agreements"); expect(container.textContent).toContain("More records are available."); expect(container.textContent).not.toContain("No agreements.");
    await act(async () => button("Load more agreements").click()); expect(container.textContent).toContain("Signed agreement");
  });
  it("opens a report page without reading amendments, then loads only one explicitly opened complete history with retry", async () => {
    mocks.page.mockResolvedValue({ items: Array.from({ length: 25 }, (_, index) => ({ id: `report-${index}`, status: "FINALIZED", serviceDate: "2026-10-01", servicesPerformed: `Service ${index}` })), nextToken: null });
    const pending = deferred<unknown[]>(); mocks.amendments.mockReturnValueOnce(pending.promise).mockResolvedValueOnce([
      { id: "first", reason: "First immutable correction", issuedAt: "2026-10-02T12:00:00Z" },
      { id: "last", reason: "Last immutable correction", issuedAt: "2026-10-03T12:00:00Z" },
    ]);
    await mount(); await open("Service reports"); expect(mocks.amendments).not.toHaveBeenCalled();
    await open("Service reports", false); await open("Service reports"); expect(mocks.amendments).not.toHaveBeenCalled();
    await open("Amendment history"); expect(mocks.amendments).toHaveBeenCalledExactlyOnceWith("report-0");
    expect(container.textContent).toContain("Checking amendments…"); expect(container.textContent).not.toContain("No amendments.");
    await act(async () => pending.reject(new Error("Amendment page unavailable")));
    expect(container.textContent).toContain("Amendment page unavailable"); expect(container.textContent).not.toContain("No amendments.");
    await act(async () => button("Retry amendments").click()); expect(mocks.amendments).toHaveBeenCalledTimes(2);
    expect(mocks.amendments).toHaveBeenLastCalledWith("report-0"); expect(container.textContent).toContain("First immutable correction"); expect(container.textContent).toContain("Last immutable correction");
  });
  it("does not reuse an empty amendment result as proof of absence during a revision refresh or failure", async () => {
    mocks.page.mockResolvedValue({ items: [{ id: "report", status: "FINALIZED", serviceDate: "2026-10-01", deliveryStatus: "FAILED" }], nextToken: null });
    const pending = deferred<unknown[]>(); mocks.amendments.mockResolvedValueOnce([]).mockReturnValueOnce(pending.promise);
    await mount(); await open("Service reports"); await open("Amendment history"); expect(container.textContent).toContain("No amendments.");
    await act(async () => button("Re-send report").click()); expect(mocks.amendments).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Checking amendments…"); expect(container.textContent).not.toContain("No amendments.");
    await act(async () => pending.reject(new Error("Amendment refresh unavailable")));
    expect(container.textContent).toContain("Amendment refresh unavailable"); expect(container.textContent).not.toContain("No amendments.");
  });
  it("reuses verified names on reopen without transiently classifying groups as archived", async () => {
    const summaries = vi.spyOn(await import("../lib/customerPresentation"), "groupChangeSummary");
    mocks.history.mockResolvedValue({ items: [{ id: "event", action: "GROUP_CHANGE", effects: "group: old → new", occurredAt: "2026-10-01T12:00:00Z" }], nextToken: null });
    await mount(); await open("Lifecycle history"); expect(container.textContent).toContain("Changed from Group old to Group new");
    await open("Lifecycle history", false); summaries.mockClear();
    mocks.group.mockRejectedValue(new Error("Verified names should be reused"));
    await open("Lifecycle history"); expect(container.textContent).toContain("Changed from Group old to Group new");
    // Observe every attempted summary, including the first commit before passive effects.
    expect(summaries.mock.results.some((result) => String(result.value).includes("archived"))).toBe(false);
    expect(mocks.group).toHaveBeenCalledTimes(2);
  });
  it.each(["route", "login"])("fetches only new history group IDs and scopes verified results to the %s", async (transition) => {
    const event = (id: string, from: string, to: string) => ({ id, action: "GROUP_CHANGE", effects: `group: ${from} → ${to}`, occurredAt: "2026-10-01T12:00:00Z" });
    mocks.history.mockImplementation(async (_customer, token) => token ? { items: [event("later", "new", "third")], nextToken: null } : { items: [event("first", "old", "new")], nextToken: "later" });
    await mount(); await open("Lifecycle history"); expect(mocks.group).toHaveBeenCalledTimes(2);
    await act(async () => button("Load more lifecycle history").click());
    expect(mocks.group.mock.calls.map(([value]) => value.id).sort()).toEqual(["new", "old", "third"]);
    expect(container.textContent).toContain("Changed from Group new to Group third");
    await open("Lifecycle history", false); await open("Lifecycle history"); expect(mocks.group).toHaveBeenCalledTimes(3);
    if (transition === "route") { mocks.params.id = "other"; await mount(); }
    else { await act(async () => { queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); }); }
    expect(mocks.group).toHaveBeenCalledTimes(3); await open("Lifecycle history");
    expect(mocks.group).toHaveBeenCalledTimes(5);
  });
  it("caches verified nulls while failed group IDs remain unverified and retry only the missing lookup", async () => {
    mocks.history.mockResolvedValue({ items: [{ id: "event", action: "GROUP_CHANGE", effects: "group: good → missing", occurredAt: "2026-10-01T12:00:00Z" }], nextToken: null });
    mocks.group.mockImplementation(async ({ id }) => id === "good" ? { data: { id, name: "Verified group" } } : { data: null, errors: [{ message: "Group lookup unavailable" }] });
    await mount(); await open("Lifecycle history"); expect(container.textContent).toContain("Group lookup unavailable");
    expect(container.textContent).toContain("Group names are not yet verified."); expect(container.textContent).not.toContain("archived group");
    mocks.group.mockResolvedValue({ data: null }); await act(async () => button("Retry historical group names").click());
    expect(mocks.group.mock.calls.map(([value]) => value.id)).toEqual(["good", "missing", "missing"]);
    expect(container.textContent).toContain("Changed from Verified group to an archived group");
    await open("Lifecycle history", false); await open("Lifecycle history"); expect(mocks.group).toHaveBeenCalledTimes(3);
  });
  it("bounds overlapping history-page lookups to four and deduplicates IDs already pending", async () => {
    const events = (start: number) => Array.from({ length: 6 }, (_, index) => ({ id: `event-${start + index}`, action: "GROUP_CHANGE", effects: `group: none → g${start + index}`, occurredAt: "2026-10-01T12:00:00Z" }));
    mocks.history.mockImplementation(async (_customer, token) => ({ items: events(token ? 6 : 0), nextToken: token ? null : "later" }));
    let active = 0, maximum = 0;
    const waiting: { id: string; done: ReturnType<typeof deferred<{ data: { id: string; name: string } }>> }[] = [];
    mocks.group.mockImplementation(({ id }) => {
      active++; maximum = Math.max(maximum, active); const done = deferred<{ data: { id: string; name: string } }>();
      waiting.push({ id, done }); return done.promise.finally(() => { active--; });
    });
    await mount(); await open("Lifecycle history"); expect(mocks.group).toHaveBeenCalledTimes(4);
    await act(async () => button("Load more lifecycle history").click()); expect(mocks.group).toHaveBeenCalledTimes(4);
    for (let batch = 0; batch < 3; batch++) await act(async () => {
      for (const { id, done } of waiting.splice(0)) done.resolve({ data: { id, name: `Group ${id}` } });
    });
    expect(mocks.group).toHaveBeenCalledTimes(12); expect(new Set(mocks.group.mock.calls.map(([value]) => value.id)).size).toBe(12);
    expect(maximum).toBe(4); expect(active).toBe(0); expect(container.textContent).not.toContain("Group names are not yet verified.");
  });
  it("does not start queued group lookups after the login ends or reuse old completions in a new login", async () => {
    mocks.history.mockResolvedValue({ items: Array.from({ length: 8 }, (_, index) => ({ id: `event-${index}`, action: "GROUP_CHANGE", effects: `group: none → g${index}`, occurredAt: "2026-10-01T12:00:00Z" })), nextToken: null });
    const pending = deferred<{ data: null }>(); mocks.group.mockReturnValue(pending.promise);
    await mount(); await open("Lifecycle history"); expect(mocks.group).toHaveBeenCalledTimes(4);
    await act(async () => { queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); });
    await act(async () => pending.resolve({ data: null })); expect(mocks.group).toHaveBeenCalledTimes(4);
    mocks.group.mockImplementation(async ({ id }) => ({ data: { id, name: `New login ${id}` } }));
    await open("Lifecycle history"); expect(mocks.group).toHaveBeenCalledTimes(12); expect(container.textContent).not.toContain("archived group");
  });
  it("does not infer an unassigned group while its independent reference is pending or unreadable", async () => {
    const pending = deferred<{ data: unknown; errors?: { message: string }[] }>();
    mocks.record.mockResolvedValue({ ...mocks.customer, groupId: "assigned" }); mocks.group.mockReturnValue(pending.promise);
    await mount(); expect(container.textContent).toContain("Checking group…"); expect(container.textContent).not.toContain("No group assigned");
    await act(async () => pending.resolve({ data: null, errors: [{ message: "Group read unavailable" }] }));
    expect(container.textContent).toContain("Group unavailable"); expect(container.textContent).toContain("Retry group");
    expect(container.textContent).not.toContain("No group assigned");
  });
  it("refreshes only customer contact after an edit, without re-reading provider/financial/history data", async () => {
    await mount(); const before = queryCache.read(key); await act(async () => button("Edit").click());
    await act(async () => button("Save changes").click());
    expect(mocks.contact).toHaveBeenCalledTimes(1); expect(mocks.record).toHaveBeenCalledTimes(2); expect(mocks.essentials).toHaveBeenCalledTimes(3);
    expect(mocks.summary).toHaveBeenCalledTimes(1); expect(mocks.page).not.toHaveBeenCalled(); expect(before).not.toBeNull(); expect(queryCache.read(key)).toBeNull();
  });
  it("refreshes only financial essentials after a charge and disables duplicate/absence actions when that reload fails", async () => {
    const job = { id: "j", serviceType: "Wasp", status: "COMPLETED", type: "ONE_TIME", priceCents: 1000 };
    let fail = false; mocks.essentials.mockImplementation(async (_id, type) => { if (type === "invoices" && fail) throw new Error("Invoice reload unavailable"); return type === "jobs" ? [job] : []; });
    mocks.charge.mockResolvedValue({ data: JSON.stringify({ status: "PAID" }) });
    await mount(); fail = true; await act(async () => button("Charge $10.00").click());
    expect(mocks.charge).toHaveBeenCalledExactlyOnceWith({ jobId: "j" }); expect(mocks.essentials).toHaveBeenCalledTimes(6);
    expect(mocks.record).toHaveBeenCalledTimes(1); expect(mocks.summary).toHaveBeenCalledTimes(1); expect(mocks.history).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Invoice reload unavailable"); expect(container.textContent).not.toContain("Charge $10.00"); expect(button("Charge the card").disabled).toBe(true);
  });
  it("defers lead audit history until opened, preserving its complete-history action", async () => {
    mocks.customer.status = "LEAD"; await mount(); expect(mocks.leadHistory).not.toHaveBeenCalled();
    await open("Audit history"); expect(mocks.leadHistory).toHaveBeenCalledExactlyOnceWith("customer"); expect(container.textContent).toContain("Export CSV");
  });
});
describe("read-only payment display and explicit owner recovery", () => {
  it("refreshes subscribed plans, immediate invoices and directory facts after a confirmed payment setup", async () => {
    vi.useFakeTimers(); let saved = false;
    mocks.essentials.mockImplementation(async (_id, connection) => connection === "servicePlans" ? [{
      id: "plan", planName: "Monthly protection", status: "ACTIVE", priceCents: 5000, serviceFrequency: "MONTHLY", stripeSubscriptionId: saved ? "subscription" : null,
    }] : connection === "invoices" && saved ? [{ id: "first-invoice", amountCents: 5000, status: "PAID", issuedAt: "2026-10-01T12:00:00Z", description: "First subscription invoice" }] : []);
    const before = queryCache.read(key); await mount(); expect(container.textContent).toContain("Start billing"); expect(queryCache.read(key)).toEqual(before);
    await act(async () => button("Update card / bank").click()); saved = true;
    await act(async () => button("Confirm payment setup").click()); expect(queryCache.read(key)).toEqual(before);
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(container.textContent).not.toContain("Start billing"); expect(button("Cancel")).toBeDefined();
    expect(container.textContent).toContain("First subscription invoice"); expect(queryCache.read(key)).toBeNull();
    expect(mocks.essentials).toHaveBeenCalledTimes(5); expect(mocks.essentials.mock.calls.slice(3).map((call) => call[1])).toEqual(["servicePlans", "invoices"]);
    expect(mocks.record).toHaveBeenCalledTimes(2); expect(mocks.summary).toHaveBeenCalledTimes(2); expect(mocks.page).not.toHaveBeenCalled();
  });
  it("does not let a previous login's delayed payment-save refresh invalidate the new same-user login", async () => {
    vi.useFakeTimers(); await mount(); await act(async () => button("Update card / bank").click());
    await act(async () => button("Confirm payment setup").click());
    await act(async () => { queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); });
    await queryCache.request(key, async () => [{ id: "new-login" }]).promise; const current = queryCache.read(key);
    const calls = mocks.record.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(1500); });
    expect(queryCache.read(key)).toEqual(current); expect(mocks.record).toHaveBeenCalledTimes(calls);
  });
  it.each([false, true])("does not invalidate cached customer facts for different display labels or failed reads (portal=%s)", async (portal) => {
    const before = queryCache.read(key); await mount(portal); expect(queryCache.read(key)).toEqual(before); expect(container.textContent).toContain("Visa ••4242");
    await act(async () => root.unmount()); root = createRoot(container);
    mocks.summary.mockResolvedValue({ data: null, errors: [{ message: "Summary unavailable" }] }); await mount(portal); expect(queryCache.read(key)).toEqual(before);
    expect(container.textContent).toContain(portal ? "Summary unavailable" : "Payment details are unavailable");
  });
  it("tells the truth about attached-but-unselected methods and repairs only after the owner's confirmed action", async () => {
    mocks.summary.mockResolvedValue({ data: JSON.stringify({ hasPaymentMethod: true, label: "Old", needsRepair: true }) });
    const pending = deferred<{ data: string }>(); mocks.repair.mockReturnValue(pending.promise); const before = queryCache.read(key);
    await mount(); expect(container.textContent).toContain("No default is ready to charge"); expect(container.textContent).not.toContain("Old");
    expect(mocks.repair).not.toHaveBeenCalled(); await act(async () => button("Use saved payment method").click()); expect(queryCache.read(key)).toEqual(before);
    await act(async () => pending.resolve({ data: JSON.stringify({ hasPaymentMethod: true, label: "Visa ••9999" }) }));
    expect(mocks.repair).toHaveBeenCalledExactlyOnceWith({ customerId: "customer", action: "REPAIR_PAYMENT_DEFAULT" });
    expect(container.textContent).toContain("Visa ••9999"); expect(queryCache.read(key)).toBeNull(); expect(mocks.essentials).toHaveBeenCalledTimes(3); expect(mocks.summary).toHaveBeenCalledTimes(1);
  });
  it("exposes explicit recovery to owners on leads and preserves a refusal without claiming readiness", async () => {
    mocks.customer.status = "LEAD"; mocks.summary.mockResolvedValue({ data: JSON.stringify({ hasPaymentMethod: false, label: null, needsRepair: true }) });
    mocks.repair.mockResolvedValue({ data: JSON.stringify({ refused: "Payment account changed" }) });
    await mount(); await act(async () => button("Use saved payment method").click()); expect(container.textContent).toContain("Payment account changed");
    expect(container.textContent).toContain("No default is ready to charge");
  });
  it.each(["route", "same-user-login"])("ignores a previous record/login's late repair response after %s changes", async (transition) => {
    const pending = deferred<{ data: string }>(); mocks.summary.mockResolvedValueOnce({ data: JSON.stringify({ hasPaymentMethod: false, label: null, needsRepair: true }) }); mocks.repair.mockReturnValue(pending.promise);
    await mount(); await act(async () => button("Use saved payment method").click());
    if (transition === "route") { mocks.params.id = "other"; await mount(); }
    else { await act(async () => { queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); }); }
    await queryCache.request(key, async () => [{ id: "new-login" }]).promise; const current = queryCache.read(key);
    await act(async () => pending.resolve({ data: JSON.stringify({ hasPaymentMethod: true, label: "Previous login card" }) }));
    expect(container.textContent).not.toContain("Previous login card");
    if (transition === "same-user-login") expect(queryCache.read(key)).toEqual(current);
  });
});
