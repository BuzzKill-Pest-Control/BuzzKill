import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ write: vi.fn(), read: vi.fn() }));
vi.mock("aws-amplify/data", () => ({ generateClient: () => ({
  mutations: { payInvoice: mocks.write, setLeadDisposition: mocks.write, changeStaffRoles: mocks.write },
  queries: { staffRoster: mocks.read },
}) }));
import { changeStaffRoles, payInvoice, searchCustomers, setLeadDisposition, staffRoster } from "./api";
import { queryCache } from "./queryCache";
const seed = () => queryCache.request(["dashboard"], async () => "unpaid server rows").promise;
beforeEach(async () => {
  queryCache.activate(null); queryCache.activate("owner", ["OWNER"]); await seed(); mocks.write.mockReset(); mocks.read.mockReset();
});
describe("CRM operation cache boundaries", () => {
  it("invalidates financial, customer-disposition and permission writes only after their response", async () => {
    const operations = [
      () => payInvoice({ invoiceId: "invoice" }),
      () => setLeadDisposition({ customerId: "customer", disposition: "CONVERT", idempotencyKey: "conversion" }),
      () => changeStaffRoles({ email: "staff@example.com", roles: ["TECH"], reasonCode: "ROLE_CHANGE" }),
    ];
    for (const operation of operations) {
      await seed(); let resolve!: (result: { data: string }) => void;
      mocks.write.mockReturnValueOnce(new Promise<{ data: string }>((yes) => { resolve = yes; }));
      const result = operation(); expect(queryCache.read(["dashboard"])?.data).toBe("unpaid server rows");
      resolve({ data: JSON.stringify({ ok: true }) }); await result; expect(queryCache.read(["dashboard"])).toBeNull();
    }
  });
  it("preserves business refusal payloads and propagates partial GraphQL failures", async () => {
    const refused = { data: JSON.stringify({ refused: "invoice_not_payable" }) };
    mocks.write.mockResolvedValueOnce(refused); expect(await payInvoice({ invoiceId: "invoice" })).toBe(refused);
    expect(queryCache.read(["dashboard"])?.data).toBe("unpaid server rows");
    mocks.write.mockResolvedValueOnce({ data: JSON.stringify({ ok: false }), errors: [{ message: "provider unavailable" }] });
    await expect(payInvoice({ invoiceId: "invoice" })).rejects.toThrow("provider unavailable");
    expect(queryCache.read(["dashboard"])).toBeNull();
  });
  it("does not invalidate cached lists for staff-directory or customer-search reads", async () => {
    mocks.read.mockResolvedValue({ data: "[]" }); await staffRoster(); await searchCustomers({ query: "example" });
    expect(queryCache.read(["dashboard"])?.data).toBe("unpaid server rows");
    expect(mocks.read).toHaveBeenNthCalledWith(1, {});
    expect(mocks.read).toHaveBeenNthCalledWith(2, { lookup: "CUSTOMERS", query: "example", limit: undefined, nextToken: undefined });
  });
});
