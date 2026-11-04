import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ graphql: vi.fn(), lifecycle: vi.fn(), amendments: vi.fn() }));
vi.mock("aws-amplify/api", () => ({ generateClient: () => ({ graphql: mocks.graphql }) }));
vi.mock("./api", async (original) => ({
  ...await original<typeof import("./api")>(),
  api: () => ({ models: {
    CustomerLifecycleEvent: { listCustomerLifecycleEventByCustomerIdAndOccurredAt: mocks.lifecycle },
    ServiceReportAmendment: { listServiceReportAmendmentByOriginalReportId: mocks.amendments },
  } }),
}));
import { readCustomerDocuments, readCustomerEssentials, readCustomerPage, readCustomerRecord, readLifecyclePage, readReportAmendments } from "./customerRecordReads";
const page = (items: unknown[], nextToken: string | null = null) => ({ data: { getCustomer: { jobs: { items, nextToken } } } });
beforeEach(() => vi.clearAllMocks());
describe("customer-partition record reads", () => {
  it("keeps initial customer facts separate from documents and relation payloads", async () => {
    mocks.graphql.mockResolvedValue({ data: { getCustomer: { id: "one", displayName: "Home" } } });
    expect(await readCustomerRecord("one")).toMatchObject({ id: "one" });
    const request = mocks.graphql.mock.calls[0][0];
    expect(request).toMatchObject({ variables: { id: "one" }, authMode: "userPool" });
    expect(request.query).not.toMatch(/\b(documents|jobs|invoices|serviceReports|servicePlans)\b/);
    await readCustomerDocuments("one");
    expect(mocks.graphql.mock.calls[1][0].query).toContain("id documents");
  });
  it("completes narrow customer metadata, including empty intermediate pages", async () => {
    mocks.graphql.mockResolvedValueOnce(page([{ id: "one" }], "a"))
      .mockResolvedValueOnce(page([], "b")).mockResolvedValueOnce(page([{ id: "two" }]));
    expect(await readCustomerEssentials("customer", "jobs")).toEqual([{ id: "one" }, { id: "two" }]);
    expect(mocks.graphql.mock.calls.map(([request]) => request.variables)).toEqual([
      { id: "customer", limit: 100, nextToken: undefined },
      { id: "customer", limit: 100, nextToken: "a" },
      { id: "customer", limit: 100, nextToken: "b" },
    ]);
    expect(mocks.graphql.mock.calls[0][0].query).toContain("getCustomer(id: $id) { jobs(limit:");
  });
  it.each([
    { data: { getCustomer: null } },
    { data: { getCustomer: { jobs: { items: null } } } },
    page([null]),
    { ...page([]), errors: [{ message: "Permission denied" }] },
  ])("rejects unreadable/partial connections instead of declaring financial absence", async (response) => {
    mocks.graphql.mockResolvedValue(response);
    await expect(readCustomerEssentials("customer", "jobs")).rejects.toThrow();
  });
  it("rejects immediate and cyclic cursors instead of looping forever", async () => {
    mocks.graphql.mockResolvedValue(page([], "a"));
    await expect(readCustomerPage("customer", "jobs", "a")).rejects.toThrow(/advance/);
    mocks.graphql.mockReset().mockResolvedValueOnce(page([], "a")).mockResolvedValueOnce(page([], "b")).mockResolvedValueOnce(page([], "a"));
    await expect(readCustomerEssentials("customer", "jobs")).rejects.toThrow(/repeated/);
    expect(mocks.graphql).toHaveBeenCalledTimes(3);
  });
  it("uses the existing immutable-history indexes and surfaces page errors", async () => {
    mocks.lifecycle.mockResolvedValue({ data: [{ id: "event" }], nextToken: "more" });
    expect(await readLifecyclePage("customer")).toMatchObject({ items: [{ id: "event" }], nextToken: "more" });
    expect(mocks.lifecycle).toHaveBeenCalledWith({ customerId: "customer" }, { limit: 50, nextToken: undefined, sortDirection: "DESC" });
    mocks.amendments.mockResolvedValueOnce({ data: [{ id: "first" }], nextToken: "more" }).mockResolvedValueOnce({ data: [], errors: [{ message: "Amendment history unavailable" }] });
    await expect(readReportAmendments("report")).rejects.toThrow("Amendment history unavailable");
    expect(mocks.amendments).toHaveBeenLastCalledWith({ originalReportId: "report" }, { limit: 100, nextToken: "more" });
  });
  it("preserves complete immutable amendment history in issuance order across indexed pages", async () => {
    mocks.amendments.mockResolvedValueOnce({ data: [{ id: "new", issuedAt: "2026-10-02T00:00:00Z" }], nextToken: "more" })
      .mockResolvedValueOnce({ data: [{ id: "old", issuedAt: "2026-10-01T00:00:00Z" }], nextToken: null });
    expect((await readReportAmendments("report")).map((row) => row.id)).toEqual(["old", "new"]);
  });
});
