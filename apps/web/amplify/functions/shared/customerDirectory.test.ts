import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSyncIdentityCognito } from "aws-lambda";
import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { searchCustomers, SEARCH_MAX_EVALUATED, SEARCH_MAX_REQUESTS } from "./customerDirectory";
import type { DirectoryStore, SourceKey } from "./customerSearchStore";
import type { SearchRow } from "./customerSearchRecords";

const mocks = vi.hoisted(() => ({ factory: vi.fn() }));
vi.mock("./customerSearchStore", () => ({ directoryStore: mocks.factory }));
vi.mock("./dataClient", () => ({ dataClient: async () => ({ models: {} }) }));
const identity = (sub = "alice", groups = ["OWNER"]) => ({ sub, groups } as AppSyncIdentityCognito);
const row = (id: string, status = "ACTIVE") => ({
  id, status, displayName: `Shared ${id}`, email: `${id}@example.com`, phone: "+1 (508) 258-9294",
  serviceStreet: "420 Lakeside Ave", serviceUnit: "104", serviceCity: "Marlborough", serviceState: "MA", serviceZip: "01752",
  lostReason: status === "LEAD" ? "PRICE" : null, notes: "private notes", stripeCustomerId: "cus_private", billingStreet: "private billing",
} as SearchRow);
const key = (status: string, id: string): SourceKey => ({ status, id, displayName: `Shared ${id}` });
function store(rows: SearchRow[] = []): DirectoryStore {
  return { lookup: vi.fn(async () => []), page: vi.fn(async (status) => ({ ids: rows.filter((row) => row.status === status).map((row) => row.id), nextKey: null })),
    current: vi.fn(async (ids) => rows.filter((row) => ids.includes(row.id))) };
}
beforeEach(() => mocks.factory.mockReset());
afterEach(() => vi.restoreAllMocks());

describe("indexed first chunk and complete bounded fallback", () => {
  it("returns exact phone/name indexed hits immediately, verified against current facts", async () => {
    const io = store([row("one")]);
    vi.mocked(io.lookup).mockResolvedValue(["one", "one", "deleted"]);
    const result = await searchCustomers({ query: "+1 (508) 258-9294" }, identity(), io);
    expect(result.items.map((hit) => hit.id)).toEqual(["one"]);
    expect(io.page).not.toHaveBeenCalled();
    expect(result.nextToken).toBeTruthy();
    expect(io.current).toHaveBeenCalledWith(["one", "deleted"]);
    expect(JSON.stringify(result.items)).not.toMatch(/private notes|private billing|cus_private|lostReason/);
  });
  it("validates changed/deleted/merged index candidates and preserves DNC's current stage", async () => {
    const io = store([{ ...row("changed"), phone: "9999999999" }, { ...row("merged"), mergedIntoId: "winner" }, { ...row("dnc", "LEAD"), doNotContact: true }]);
    vi.mocked(io.lookup).mockResolvedValue(["changed", "merged", "deleted", "dnc"]);
    const result = await searchCustomers({ query: "5082589294" }, identity(), io);
    expect(result.items.map((item) => [item.id, item.leadStage])).toEqual([["dnc", "DNC"]]);
    expect(io.page).not.toHaveBeenCalled();
  });
  it("finds every lifecycle and full address match even with an empty/not-yet-backfilled index", async () => {
    const io = store([row("active"), row("inactive", "INACTIVE"), row("lost", "LEAD")]);
    const result = await searchCustomers({ query: "420 lakeside 104 marlborough 01752", limit: 10 }, identity(), io);
    expect(result.items.map((item) => item.status)).toEqual(["ACTIVE", "INACTIVE", "LEAD"]);
    expect(result.items[2].leadStage).toBe("LOST");
    expect(result.nextToken).toBeNull();
  });
  it.each(["ResourceNotFoundException", "ProvisionedThroughputExceededException"])("degrades derived lookup %s to bounded source search", async (reason) => {
    const io = store([row("one")]); let n = 0;
    vi.mocked(io.lookup).mockRejectedValue(new Error(reason));
    vi.mocked(io.page).mockImplementation(async (status) => ({ ids: status === "ACTIVE" ? ["one"] : [], nextKey: key(status, String(++n)) }));
    const result = await searchCustomers({ query: "Shared" }, identity(), io);
    expect(result.items.map((hit) => hit.id)).toEqual(["one"]);
    expect(result.nextToken).toBeTruthy(); expect(io.page).toHaveBeenCalledTimes(6);
    expect(io.current).toHaveBeenCalledWith(["one"]);
  });
  it("keeps fast seed exclusions throughout multiple fallback cursors without dropping unsearched index candidates", async () => {
    const io = store([row("seed"), row("second"), row("third")]);
    vi.mocked(io.lookup).mockResolvedValue(["seed"]);
    vi.mocked(io.page).mockImplementation(async (status, after, limit) => {
      if (status !== "ACTIVE") return { ids: [], nextKey: null };
      const ids = after?.id === "seed" ? ["second"] : after?.id === "second" ? ["seed"] : after?.id === "third" ? [] : ["seed"];
      if (after?.id === "seed-again") return { ids: ["third"], nextKey: null };
      const next = ids[0] === "seed" ? key(status, after?.id === "second" ? "seed-again" : "seed") : key(status, "second");
      expect(ids.length).toBeLessThanOrEqual(limit);
      return { ids, nextKey: next };
    });
    const first = await searchCustomers({ query: "Shared", limit: 1 }, identity(), io);
    const second = await searchCustomers({ query: "Shared", limit: 1, nextToken: first.nextToken }, identity(), io);
    const third = await searchCustomers({ query: "Shared", limit: 1, nextToken: second.nextToken }, identity(), io);
    expect([first, second, third].flatMap((page) => page.items.map((item) => item.id))).toEqual(["seed", "second", "third"]);
    expect(io.lookup).toHaveBeenCalledOnce();
    const decoded = JSON.parse(Buffer.from(second.nextToken!, "base64url").toString());
    expect(decoded.seeds).toEqual(["seed"]);
  });
  it("bounds empty intermediate pages and returns continuation rather than false exhaustion", async () => {
    const io = store();
    let page = 0;
    vi.mocked(io.page).mockImplementation(async (status) => ({ ids: [], nextKey: key(status, `page-${++page}`) }));
    const result = await searchCustomers({ query: "Nobody", limit: 25 }, identity(), io);
    expect(result.items).toEqual([]); expect(result.nextToken).toBeTruthy();
    expect(io.page).toHaveBeenCalledTimes(SEARCH_MAX_REQUESTS);
    expect(vi.mocked(io.page).mock.calls.reduce((sum, call) => sum + call[2], 0)).toBe(SEARCH_MAX_EVALUATED);
    await searchCustomers({ query: "Nobody", nextToken: result.nextToken }, identity(), io);
    expect(io.lookup).toHaveBeenCalledOnce();
    expect(io.page).toHaveBeenCalledTimes(12);
  });
  it("separately bounds evaluated source rows for larger result limits", async () => {
    const io = store(); let n = 0;
    vi.mocked(io.page).mockImplementation(async (status) => ({ ids: [], nextKey: key(status, String(++n)) }));
    await searchCustomers({ query: "Nobody", limit: 50 }, identity(), io);
    expect(io.page).toHaveBeenCalledTimes(3);
    expect(vi.mocked(io.page).mock.calls.reduce((sum, call) => sum + call[2], 0)).toBe(150);
  });
  it("does not lose source matches where result limits cut across pages", async () => {
    const rows = ["ACTIVE", "INACTIVE", "LEAD"].flatMap((status) => Array.from({ length: 5 }, (_, n) => row(`${status}-${n}`, status)));
    const io = store(rows);
    vi.mocked(io.page).mockImplementation(async (status, after, limit) => {
      const partition = rows.filter((row) => row.status === status);
      const offset = after ? partition.findIndex((row) => row.id === after.id) + 1 : 0;
      const selected = partition.slice(offset, offset + limit);
      return { ids: selected.map((row) => row.id), nextKey: offset + limit < partition.length ? key(status, selected.at(-1)!.id) : null };
    });
    let token: string | null = null; const ids: string[] = [];
    do { const result = await searchCustomers({ query: "Shared", limit: 2, nextToken: token }, identity(), io); ids.push(...result.items.map((row) => row.id)); token = result.nextToken; } while (token);
    expect(ids).toHaveLength(15); expect(new Set(ids).size).toBe(15);
  });
  it("rejects unverified/failed source work instead of advancing a caller's cursor", async () => {
    const io = store([row("one")]);
    vi.mocked(io.current).mockRejectedValue(new Error("Could not verify all results"));
    await expect(searchCustomers({ query: "Shared" }, identity(), io)).rejects.toThrow(/verify/);
  });
  it.each([{groups:["TECH"]}, {groups:["CUSTOMER"]}, {groups:["TECH", "CUSTOMER"]}, {groups:[]}])("refuses nonowners %o before any reads", async ({groups}) => {
    const io = store(); await expect(searchCustomers({ query: "Shared" }, identity("outsider", groups), io)).rejects.toThrow(/Owner role required/);
    expect(io.lookup).not.toHaveBeenCalled(); expect(io.page).not.toHaveBeenCalled();
  });
  it.each([{ query: "" }, { query: "---" }, { query: "x".repeat(201) }, { query: "Shared", limit: 0 }, { query: "Shared", limit: 51 }, { query: "Shared", limit: 1.5 }, { query: "Shared", nextToken: "not valid" }])("rejects bad input before reads %o", async (args) => {
    const io = store(); await expect(searchCustomers(args, identity(), io)).rejects.toThrow(); expect(io.page).not.toHaveBeenCalled();
  });
  it("binds versioned cursor to caller and query and validates source key/seed metadata", async () => {
    const io = store(); let n = 0;
    vi.mocked(io.page).mockImplementation(async (status) => ({ ids: [], nextKey: key(status, String(++n)) }));
    const first = await searchCustomers({ query: "Shared" }, identity(), io);
    vi.mocked(io.page).mockClear();
    await expect(searchCustomers({ query: "Other", nextToken: first.nextToken }, identity(), io)).rejects.toThrow(/continuation is invalid/);
    await expect(searchCustomers({ query: "Shared", nextToken: first.nextToken }, identity("bob"), io)).rejects.toThrow(/continuation is invalid/);
    const saved = JSON.parse(Buffer.from(first.nextToken!, "base64url").toString());
    for (const mutate of [(c: typeof saved) => c.v = 1, (c: typeof saved) => c.seeds = ["x", "x"], (c: typeof saved) => c.partitions[0].key = { id: "x", status: "ACTIVE", displayName: "x".repeat(1025) }, (c: typeof saved) => c.partitions[0].key.extra = "private"]) {
      const corrupted = structuredClone(saved); mutate(corrupted);
      await expect(searchCustomers({ query: "Shared", nextToken: Buffer.from(JSON.stringify(corrupted)).toString("base64url") }, identity(), io)).rejects.toThrow(/continuation is invalid/);
    }
    expect(io.page).not.toHaveBeenCalled();
  });
});

describe("existing owner-only staffRoster query contract", () => {
  it.each([undefined, {}, { lookup: null, query: null, limit: null, nextToken: null }])("preserves legacy roster arguments %o", async (args) => {
    const send = vi.spyOn(CognitoIdentityProviderClient.prototype, "send").mockResolvedValue({ Users: [] } as never);
    const { handler } = await import("../crm-admin/handler");
    expect(await handler({ fieldName: "staffRoster", arguments: args, identity: identity() } as never)).toMatchObject({ staff: [], generatedAt: expect.any(String) });
    expect(send).toHaveBeenCalled(); expect(mocks.factory).not.toHaveBeenCalled();
  });
  it("dispatches explicit customer mode only, keeping technician access forbidden", async () => {
    const io = store([row("one")]); mocks.factory.mockReturnValue(io);
    const { handler } = await import("../crm-admin/handler");
    expect(await handler({ fieldName: "staffRoster", arguments: { lookup: "CUSTOMERS", query: "Shared" }, identity: identity() } as never)).toMatchObject({ items: [expect.objectContaining({ id: "one" })] });
    await expect(handler({ fieldName: "staffRoster", arguments: { lookup: "CUSTOMERS", query: "Shared" }, identity: identity("tech", ["TECH"]) } as never)).rejects.toThrow(/Owner role required/);
  });
  it.each([{ lookup: "OTHER" }, { query: "Shared" }, { nextToken: "cursor" }, { limit: 25 }, { lookup: "CUSTOMERS" }])("rejects mixed/invalid arguments %o", async (args) => {
    const { handler } = await import("../crm-admin/handler");
    await expect(handler({ fieldName: "staffRoster", arguments: args, identity: identity() } as never)).rejects.toThrow();
  });
});
