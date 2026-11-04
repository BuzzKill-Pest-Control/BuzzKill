import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSyncIdentityCognito } from "aws-lambda";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import {
  CUSTOMER_SEARCH_FIELDS, SEARCH_MAX_EVALUATED, SEARCH_MAX_REQUESTS,
  searchCustomers,
} from "./customerDirectory";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("./dataClient", () => ({ dataClient: async () => ({
  models: { Customer: { listCustomerByStatusAndDisplayName: mocks.list } },
}) }));

const identity = (sub = "alice", groups = ["OWNER"]) => ({ sub, groups } as AppSyncIdentityCognito);
const row = (id: string, status = "ACTIVE") => ({
  id, status, displayName: `Shared ${id}`, email: `${id}@example.com`, phone: "+1 (508) 258-9294",
  serviceStreet: "420 Lakeside Ave", serviceUnit: "104", serviceCity: "Marlborough",
  serviceState: "MA", serviceZip: "01752", lostReason: status === "LEAD" ? "PRICE" : null,
  notes: "private office notes", stripeCustomerId: "cus_private", billingStreet: "private billing",
});

beforeEach(() => { mocks.list.mockReset(); });
afterEach(() => { vi.restoreAllMocks(); });

describe("bounded office customer search", () => {
  it("searches lifecycle partitions and returns only contact/address facts and derived stage", async () => {
    mocks.list.mockImplementation(async ({ status }) => ({ data: [row(status, status)], nextToken: null }));
    const result = await searchCustomers({ query: "5082589294", limit: 10 }, identity());
    expect(result.items.map((item) => item.status)).toEqual(["ACTIVE", "INACTIVE", "LEAD"]);
    expect(result.items[2].leadStage).toBe("LOST");
    expect(result.nextToken).toBeNull();
    expect(Object.keys(result.items[0]).sort()).toEqual([
      "id", "displayName", "status", "contactName", "email", "phone", "serviceStreet",
      "serviceUnit", "serviceCity", "serviceState", "serviceZip", "leadStage",
    ].sort());
    expect(JSON.stringify(result)).not.toMatch(/private office|cus_private|private billing|lostReason/);
    for (const call of mocks.list.mock.calls) {
      expect(call[1].selectionSet).toEqual(CUSTOMER_SEARCH_FIELDS);
      expect(call[1].selectionSet).not.toContain("notes");
      expect(call[1].selectionSet).not.toContain("stripeCustomerId");
    }
  });

  it("does bounded work even through empty pages and keeps an explicit continuation", async () => {
    let next = 0;
    const read = vi.fn(async (_status: string, _token: string | undefined, _limit: number) => ({ data: [], nextToken: `page-${++next}` }));
    const first = await searchCustomers({ query: "Nobody", limit: 25 }, identity(), read);
    expect(first.items).toEqual([]);
    expect(first.nextToken).toBeTruthy();
    expect(read).toHaveBeenCalledTimes(SEARCH_MAX_REQUESTS);
    expect(read.mock.calls.reduce((total, call) => total + Number(call[2]), 0)).toBeLessThanOrEqual(SEARCH_MAX_EVALUATED);
    const priorTokens = read.mock.calls.slice(-3).map((call) => call[1]);
    await searchCustomers({ query: "Nobody", limit: 25, nextToken: first.nextToken }, identity(), read);
    expect(read).toHaveBeenCalledTimes(SEARCH_MAX_REQUESTS * 2);
    expect(read.mock.calls.slice(SEARCH_MAX_REQUESTS, SEARCH_MAX_REQUESTS + 3).map((call) => call[1]))
      .not.toEqual(priorTokens);
  });

  it("bounds evaluated rows separately from request count for larger result limits", async () => {
    let next = 0;
    const read = vi.fn(async (_status: string, _token: string | undefined, _limit: number) => ({ data: [], nextToken: `page-${++next}` }));
    const result = await searchCustomers({ query: "Nobody", limit: 50 }, identity(), read);
    expect(result.nextToken).toBeTruthy();
    expect(read.mock.calls.reduce((total, call) => total + Number(call[2]), 0)).toBe(150);
    expect(read.mock.calls.length).toBeLessThan(SEARCH_MAX_REQUESTS);
  });

  it("never drops matches when a result limit cuts across source pages", async () => {
    const groups = Object.fromEntries(["ACTIVE", "INACTIVE", "LEAD"].map((status) => [
      status, Array.from({ length: 5 }, (_, i) => row(`${status}-${i}`, status)),
    ]));
    const read = vi.fn(async (status: string, token: string | undefined, limit: number) => {
      const offset = Number(token ?? 0);
      return {
        data: groups[status].slice(offset, offset + limit),
        nextToken: offset + limit < groups[status].length ? String(offset + limit) : null,
      };
    });
    let token: string | null = null;
    const ids: string[] = [];
    do {
      const page = await searchCustomers({ query: "Shared", limit: 2, nextToken: token }, identity(), read);
      expect(page.items.length).toBeLessThanOrEqual(2);
      ids.push(...page.items.map((item) => item.id));
      token = page.nextToken;
    } while (token);
    expect(ids).toHaveLength(15);
    expect(new Set(ids).size).toBe(15);
    expect(read.mock.calls.every((call) => call[2] <= 2)).toBe(true);
  });

  it("binds continuation to the lookup and caller before reading any rows", async () => {
    let next = 0;
    const read = vi.fn(async () => ({ data: [], nextToken: `page-${++next}` }));
    const first = await searchCustomers({ query: "First lookup" }, identity(), read);
    read.mockClear();
    await expect(searchCustomers({ query: "Another lookup", nextToken: first.nextToken }, identity(), read)).rejects.toThrow(/continuation is invalid/);
    await expect(searchCustomers({ query: "First lookup", nextToken: first.nextToken }, identity("bob"), read)).rejects.toThrow(/continuation is invalid/);
    expect(read).not.toHaveBeenCalled();
  });

  it.each([{ groups: ["TECH"] }, { groups: ["CUSTOMER"] }, { groups: ["TECH", "CUSTOMER"] }, { groups: [] }])("refuses non-office callers %o before data access", async ({ groups }) => {
    const read = vi.fn();
    await expect(searchCustomers({ query: "Shared" }, identity("outsider", groups), read)).rejects.toThrow(/Owner role required/);
    expect(read).not.toHaveBeenCalled();
  });

  it.each([
    { query: "" }, { query: "---" }, { query: "x".repeat(201) },
    { query: "Shared", limit: 0 }, { query: "Shared", limit: 51 },
    { query: "Shared", limit: 1.5 }, { query: "Shared", nextToken: "not a token" },
  ])("rejects invalid input %o before data access", async (args) => {
    const read = vi.fn();
    await expect(searchCustomers(args, identity(), read)).rejects.toThrow();
    expect(read).not.toHaveBeenCalled();
  });

  it("does not turn a failed page into partial success or advance the caller's token", async () => {
    const read = vi.fn(async () => ({ data: [row("match")], errors: [{ message: "Unavailable" }], nextToken: "next" }));
    await expect(searchCustomers({ query: "Shared" }, identity(), read)).rejects.toThrow("Unavailable");
    expect(read).toHaveBeenCalledOnce();
  });

  it("enforces the office boundary through the real resolver handler", async () => {
    const { handler } = await import("../crm-admin/handler");
    await expect(handler({
      fieldName: "staffRoster", arguments: { lookup: "CUSTOMERS", query: "Shared" }, identity: identity("tech", ["TECH"]),
    } as never)).rejects.toThrow(/Owner role required/);
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it.each([undefined, {}, { lookup: null, query: null, limit: null, nextToken: null }])("preserves the no-argument staff roster contract %o", async (args) => {
    const send = vi.spyOn(CognitoIdentityProviderClient.prototype, "send").mockResolvedValue({ Users: [] } as never);
    const { handler } = await import("../crm-admin/handler");
    const result = await handler({ fieldName: "staffRoster", arguments: args, identity: identity() } as never);
    expect(result).toMatchObject({ staff: [], generatedAt: expect.any(String) });
    expect(send).toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("only the explicit customer discriminator dispatches bounded lookup", async () => {
    const send = vi.spyOn(CognitoIdentityProviderClient.prototype, "send");
    mocks.list.mockImplementation(async ({ status }) => ({ data: [row(status, status)], nextToken: null }));
    const { handler } = await import("../crm-admin/handler");
    const result = await handler({
      fieldName: "staffRoster", arguments: { lookup: "CUSTOMERS", query: "Shared", limit: 5 }, identity: identity(),
    } as never);
    expect(result).toMatchObject({ items: expect.any(Array), nextToken: null });
    expect(send).not.toHaveBeenCalled();
    expect(mocks.list).toHaveBeenCalledTimes(3);
  });

  it.each([
    { lookup: "OTHER" }, { lookup: "STAFF", query: "Shared" }, { query: "Shared" },
    { nextToken: "cursor" }, { limit: 25 }, { lookup: "CUSTOMERS" },
  ])("refuses invalid or mixed lookup args %o instead of returning staff", async (args) => {
    const send = vi.spyOn(CognitoIdentityProviderClient.prototype, "send");
    const { handler } = await import("../crm-admin/handler");
    await expect(handler({ fieldName: "staffRoster", arguments: args, identity: identity() } as never)).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
    expect(mocks.list).not.toHaveBeenCalled();
  });
});
