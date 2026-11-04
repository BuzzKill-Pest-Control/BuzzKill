import { beforeEach, describe, expect, it, vi } from "vitest";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { DynamoDBStreamEvent } from "aws-lambda";
import { backfillPage, handler } from "./handler";
const mocks = vi.hoisted(() => ({ source: vi.fn(), snapshot: vi.fn(), commit: vi.fn() }));
vi.mock("../shared/customerSearchStore", async (original) => ({ ...await original<typeof import("../shared/customerSearchStore")>(), customerSourceTable: mocks.source }));
vi.mock("../shared/customerIndexWriter", async (original) => ({ ...await original<typeof import("../shared/customerIndexWriter")>(), indexWriter: () => ({ snapshot: mocks.snapshot, commit: mocks.commit }) }));
beforeEach(() => {
  vi.clearAllMocks(); process.env.CUSTOMER_SEARCH_TABLE_NAME = "CustomerSearch-test";
  process.env.CUSTOMER_SEARCH_WORKER_ENABLED = "true"; process.env.BUZZKILL_MIGRATION_PREVIEW = "false";
  mocks.source.mockResolvedValue("Customer-test-NONE");
  mocks.snapshot.mockResolvedValue({ source: null, manifest: null }); mocks.commit.mockResolvedValue(true);
});
const writer = () => ({ snapshot: mocks.snapshot, commit: mocks.commit });
const client = (send: ReturnType<typeof vi.fn>) => ({ send } as unknown as DynamoDBClient);
describe("existing Customer stream maintenance", () => {
  it("uses current facts rather than delivery images and reports only failed sequence checkpoints", async () => {
    mocks.snapshot.mockImplementation(async (id: string) => { if (id === "bad") throw new Error("private provider data"); return { source: { id, displayName: "Current" }, manifest: null }; });
    const result = await handler({ Records: [
      { dynamodb: { Keys: { id: { S: "good" } }, SequenceNumber: "1", NewImage: { displayName: { S: "Stale private image" } } } },
      { dynamodb: { Keys: { id: { S: "bad" } }, SequenceNumber: "2" } },
      { dynamodb: { Keys: { id: { S: "next" } }, SequenceNumber: "3" } },
    ] } as DynamoDBStreamEvent);
    expect(result).toEqual({ batchItemFailures: [{ itemIdentifier: "2" }] });
    expect(mocks.commit).toHaveBeenCalledWith("good", { source: { id: "good", displayName: "Current" }, manifest: null });
    expect(mocks.snapshot).toHaveBeenCalledWith("next");
    expect(JSON.stringify(result)).not.toMatch(/private|bad|Current/);
  });
  it("refuses preview/disabled work before reads and bounds stream batches", async () => {
    process.env.BUZZKILL_MIGRATION_PREVIEW = "true";
    await expect(handler({ Records: [] })).rejects.toThrow(/paused/);
    process.env.BUZZKILL_MIGRATION_PREVIEW = "false"; process.env.CUSTOMER_SEARCH_WORKER_ENABLED = "false";
    await expect(handler({ kind: "BACKFILL" })).rejects.toThrow(/paused/);
    expect(mocks.source).not.toHaveBeenCalled(); expect(mocks.snapshot).not.toHaveBeenCalled();
    process.env.CUSTOMER_SEARCH_WORKER_ENABLED = "true";
    await expect(handler({ Records: Array.from({ length: 11 }, () => ({})) } as DynamoDBStreamEvent)).rejects.toThrow(/invalid/);
  });
});
describe("bounded resumable source and orphan-manifest backfill", () => {
  it("walks customers then orphan manifests, preserving empty filtered continuation", async () => {
    const send = vi.fn().mockResolvedValueOnce({ Items: [marshall({ id: "current" })], ScannedCount: 1 })
      .mockResolvedValueOnce({ Items: [], ScannedCount: 25, LastEvaluatedKey: marshall({ pk: "N#x", sk: "name#id" }) })
      .mockResolvedValueOnce({ Items: [marshall({ customerId: "deleted" })], ScannedCount: 1 });
    const ddb = client(send);
    const first = await backfillPage({ kind: "BACKFILL" }, writer(), ddb);
    expect(first).toMatchObject({ processed: 1, complete: false });
    const second = await backfillPage({ kind: "BACKFILL", cursor: first.cursor }, writer(), ddb);
    expect(second).toMatchObject({ processed: 0, evaluated: 25, complete: false }); expect(second.cursor).toBeTruthy();
    const third = await backfillPage({ kind: "BACKFILL", cursor: second.cursor }, writer(), ddb);
    expect(third).toEqual({ processed: 1, evaluated: 1, complete: true, cursor: null });
    expect(mocks.snapshot.mock.calls.map(([id]) => id)).toEqual(["current", "deleted"]);
    const commands = send.mock.calls.map(([command]) => command.input);
    expect(commands[0]).toMatchObject({ TableName: "Customer-test-NONE", Limit: 25, ConsistentRead: true });
    expect(commands[1]).toMatchObject({ TableName: "CustomerSearch-test", Limit: 25, FilterExpression: "#kind = :kind", ProjectionExpression: "customerId" });
    expect(unmarshall(commands[2].ExclusiveStartKey)).toEqual({ pk: "N#x", sk: "name#id" });
  });
  it("binds checkpoints to source and index tables and rejects malformed or nonadvancing pages", async () => {
    const send = vi.fn().mockResolvedValue({ Items: [], ScannedCount: 0, LastEvaluatedKey: marshall({ id: "last" }) });
    const first = await backfillPage({ kind: "BACKFILL" }, writer(), client(send));
    mocks.source.mockResolvedValue("Customer-other-NONE");
    await expect(backfillPage({ kind: "BACKFILL", cursor: first.cursor }, writer(), client(send))).rejects.toThrow(/continuation/);
    mocks.source.mockResolvedValue("Customer-test-NONE"); process.env.CUSTOMER_SEARCH_TABLE_NAME = "CustomerSearch-other";
    await expect(backfillPage({ kind: "BACKFILL", cursor: first.cursor }, writer(), client(send))).rejects.toThrow(/continuation/);
    process.env.CUSTOMER_SEARCH_TABLE_NAME = "CustomerSearch-test";
    await expect(backfillPage({ kind: "BACKFILL", cursor: first.cursor }, writer(), client(send))).rejects.toThrow(/advance/);
    expect(send).toHaveBeenCalledTimes(2);
    const invalid = JSON.parse(Buffer.from(first.cursor!, "base64url").toString()); invalid.key.extra = "private";
    await expect(backfillPage({ kind: "BACKFILL", cursor: Buffer.from(JSON.stringify(invalid)).toString("base64url") }, writer(), client(send))).rejects.toThrow(/continuation/);
  });
  it("does not advance a failing page and bounds evaluated work even on filtered scans", async () => {
    const send = vi.fn().mockResolvedValue({ Items: [], ScannedCount: 26 });
    await expect(backfillPage({ kind: "BACKFILL" }, writer(), client(send))).rejects.toThrow(/budget/);
    send.mockResolvedValue({ Items: [marshall({ id: "conflicted" })], ScannedCount: 1 }); mocks.commit.mockResolvedValue(false);
    await expect(backfillPage({ kind: "BACKFILL" }, writer(), client(send))).rejects.toThrow(/conflicted/);
    expect(mocks.commit).toHaveBeenCalledTimes(3);
  });
});
