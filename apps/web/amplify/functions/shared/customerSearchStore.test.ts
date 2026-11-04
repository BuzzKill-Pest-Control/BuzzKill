import { beforeEach, expect, it, vi } from "vitest";
import { BatchGetItemCommand, DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { directoryStore, SEARCH_MAX_DDB_REQUESTS } from "./customerSearchStore";
import { CUSTOMER_SEARCH_FIELDS } from "./customerSearchRecords";
vi.mock("./atomicLock", () => ({ _resolveTableSuffix: async () => "-testapi-NONE" }));
beforeEach(() => { process.env.CUSTOMER_SEARCH_TABLE_NAME = "CustomerSearch-test"; });
const client = (send = vi.fn()) => ({ send } as unknown as DynamoDBClient);
const raw = (id: string) => marshall({ id, displayName: "Shared", status: "ACTIVE" });

it("queries selected native index keys and validates current selected facts strongly in requested order", async () => {
  const send = vi.fn().mockResolvedValueOnce({ Items: [marshall({ customerId: "b" }), marshall({ customerId: "a" })] })
    .mockResolvedValueOnce({ Responses: { "Customer-testapi-NONE": [raw("a"), raw("b")] } });
  const store = directoryStore(client(send));
  expect(await store.lookup({ pk: "N#hash", prefix: "sha" }, 2)).toEqual(["b", "a"]);
  expect(send.mock.calls[0][0]).toBeInstanceOf(QueryCommand);
  expect(send.mock.calls[0][0].input).toMatchObject({ TableName: "CustomerSearch-test", ConsistentRead: true, Limit: 2, ProjectionExpression: "#id" });
  expect((await store.current(["b", "a"])).map((row) => row.id)).toEqual(["b", "a"]);
  const command = send.mock.calls[1][0] as BatchGetItemCommand;
  expect(command).toBeInstanceOf(BatchGetItemCommand);
  const request = command.input.RequestItems!["Customer-testapi-NONE"];
  expect(request.ConsistentRead).toBe(true);
  expect(Object.values(request.ExpressionAttributeNames!)).toEqual(CUSTOMER_SEARCH_FIELDS);
  expect(Object.values(request.ExpressionAttributeNames!)).not.toContain("notes");
  expect(Object.values(request.ExpressionAttributeNames!)).not.toContain("stripeCustomerId");
});
it("uses the existing status GSI and serializes only its three cursor attributes", async () => {
  const next = { id: "one", status: "ACTIVE", displayName: "Shared" };
  const send = vi.fn().mockResolvedValue({ Items: [marshall({ id: "one" })], LastEvaluatedKey: marshall(next) });
  const page = await directoryStore(client(send)).page("ACTIVE", next, 4);
  expect(page).toEqual({ ids: ["one"], nextKey: next });
  expect(send.mock.calls[0][0].input).toMatchObject({ IndexName: "customersByStatusAndDisplayName", Limit: 4, ProjectionExpression: "#id", ExclusiveStartKey: marshall(next) });
});
it("retries only unprocessed keys, preserves successful rows, and refuses exhausted validation", async () => {
  const table = "Customer-testapi-NONE", unprocessed = { [table]: { Keys: [marshall({ id: "b" })] } };
  const send = vi.fn().mockResolvedValueOnce({ Responses: { [table]: [raw("a")] }, UnprocessedKeys: unprocessed })
    .mockResolvedValueOnce({ UnprocessedKeys: unprocessed }).mockResolvedValueOnce({ Responses: { [table]: [raw("b")] } });
  expect((await directoryStore(client(send)).current(["a", "b"])).map((row) => row.id)).toEqual(["a", "b"]);
  expect(send.mock.calls[1][0].input.RequestItems[table].Keys).toEqual([marshall({ id: "b" })]);
  const failed = vi.fn().mockResolvedValue({ UnprocessedKeys: unprocessed });
  await expect(directoryStore(client(failed)).current(["b"])).rejects.toThrow(/verify every/);
  expect(failed).toHaveBeenCalledTimes(3);
});
it("enforces the exact native request cap including lookup, page reads and validation retries", async () => {
  const table = "Customer-testapi-NONE"; let attempt = 0;
  const send = vi.fn(async (command) => {
    if (command instanceof QueryCommand) return { Items: [] };
    attempt++;
    return attempt % 3 ? { UnprocessedKeys: { [table]: { Keys: [marshall({ id: "one" })] } } } : { Responses: { [table]: [raw("one")] } };
  });
  const store = directoryStore(client(send));
  await store.lookup({ pk: "P#hash" }, 25); await store.current(["one"]);
  for (let n = 0; n < 6; n++) { await store.page("ACTIVE", null, 25); await store.current(["one"]); }
  expect(send).toHaveBeenCalledTimes(SEARCH_MAX_DDB_REQUESTS);
  await expect(store.page("ACTIVE", null, 1)).rejects.toThrow(/budget/);
  expect(send).toHaveBeenCalledTimes(28);
});
it("refuses over-limit and foreign validation results rather than silently discarding them", async () => {
  const send = vi.fn().mockResolvedValue({ Responses: { "Customer-testapi-NONE": [raw("foreign")] } });
  const store = directoryStore(client(send));
  await expect(store.current(Array.from({ length: 51 }, (_, n) => String(n)))).rejects.toThrow(/budget/);
  expect(send).not.toHaveBeenCalled();
  await expect(store.current(["one"])).rejects.toThrow(/unexpected record/);
});
