import { beforeEach, expect, it, vi } from "vitest";
import { BatchGetItemCommand, DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { technicianReadStore, TECHNICIAN_JOB_FIELDS, TECHNICIAN_HISTORY_FIELDS } from "./technicianReadStore";
vi.mock("./atomicLock", () => ({ _resolveTableSuffix: async () => "-testapi-NONE" }));
const db = (send: ReturnType<typeof vi.fn>) => ({ send } as unknown as DynamoDBClient);
beforeEach(() => vi.clearAllMocks());
it("queries the existing route index and verifies current membership, without any Scan or directory download", async () => {
  const send = vi.fn().mockResolvedValueOnce({ Items: [marshall({ id: "kept" }), marshall({ id: "moved" })] })
    .mockResolvedValueOnce({ Responses: { "Job-testapi-NONE": [marshall({ id: "moved", routeId: "different", technicianId: "other" }), marshall({ id: "kept", routeId: "route", technicianId: "mine" })] } });
  const rows = await technicianReadStore(db(send)).routeJobs("route");
  expect(rows.map((row) => row.id)).toEqual(["kept"]);
  expect(send.mock.calls[0][0]).toBeInstanceOf(QueryCommand);
  expect(send.mock.calls[0][0].input).toMatchObject({ TableName: "Job-testapi-NONE", IndexName: "gsi-Route.jobs", Limit: 100, ProjectionExpression: "#id" });
  const request = send.mock.calls[1][0].input.RequestItems["Job-testapi-NONE"];
  expect(send.mock.calls[1][0]).toBeInstanceOf(BatchGetItemCommand); expect(request.ConsistentRead).toBe(true);
  expect(Object.values(request.ExpressionAttributeNames)).toEqual(TECHNICIAN_JOB_FIELDS);
  expect(Object.values(request.ExpressionAttributeNames)).not.toContain("priceCents");
});
it("fully pages narrow customer metadata through empty source pages and revalidates moved customer rows", async () => {
  const key = marshall({ id: "examined", customerId: "customer" });
  const send = vi.fn().mockResolvedValueOnce({ Items: [], LastEvaluatedKey: key })
    .mockResolvedValueOnce({ Items: [marshall({ id: "own" }), marshall({ id: "moved" })] })
    .mockResolvedValueOnce({ Responses: { "Job-testapi-NONE": [marshall({ id: "own", customerId: "customer" }), marshall({ id: "moved", customerId: "elsewhere" })] } });
  expect((await technicianReadStore(db(send)).customerJobs("customer")).map((row) => row.id)).toEqual(["own"]);
  expect(send.mock.calls[1][0].input).toMatchObject({ IndexName: "gsi-Customer.jobs", ExclusiveStartKey: key });
  expect(Object.values(send.mock.calls[2][0].input.RequestItems["Job-testapi-NONE"].ExpressionAttributeNames)).toEqual(TECHNICIAN_HISTORY_FIELDS);
});
it("retries unprocessed source rows at most three times and never advances an unverified page", async () => {
  const send = vi.fn().mockResolvedValueOnce({ Items: [marshall({ id: "unverified" })], LastEvaluatedKey: marshall({ id: "unverified", customerId: "c" }) })
    .mockResolvedValue({ UnprocessedKeys: { "Job-testapi-NONE": { Keys: [marshall({ id: "unverified" })] } } });
  await expect(technicianReadStore(db(send)).historyPage("c", null, 20)).rejects.toThrow(/could not all be verified/);
  expect(send).toHaveBeenCalledTimes(4);
});
it("uses the existing userSub index and current identity facts; stale link rows and ambiguous links grant no identity", async () => {
  const send = vi.fn().mockResolvedValueOnce({ Items: [marshall({ id: "stale" }), marshall({ id: "actual" })] })
    .mockResolvedValueOnce({ Responses: { "Technician-testapi-NONE": [marshall({ id: "stale", userSub: "former" }), marshall({ id: "actual", userSub: "caller", active: false })] } });
  expect(await technicianReadStore(db(send)).technician("caller")).toMatchObject({ id: "actual", active: false });
  expect(send.mock.calls[0][0].input.IndexName).toBe("techniciansByUserSub");
  expect(send.mock.calls[1][0].input.RequestItems["Technician-testapi-NONE"].ConsistentRead).toBe(true);
  send.mockReset().mockResolvedValueOnce({ Items: [marshall({ id: "one" }), marshall({ id: "two" })] })
    .mockResolvedValueOnce({ Responses: { "Technician-testapi-NONE": [marshall({ id: "one", userSub: "caller" }), marshall({ id: "two", userSub: "caller" })] } });
  expect(await technicianReadStore(db(send)).technician("caller")).toBeNull();
});
it("serves authoritative job packet fields, excludes money fields, and sanitizes provider failures", async () => {
  const send = vi.fn().mockResolvedValueOnce({ Item: marshall({ id: "job", packetVersion: 3, packetAckVersion: 1, rebookedFromJobId: "prior", applicationEndAt: "stamp" }) });
  expect(await technicianReadStore(db(send)).job("job")).toMatchObject({ id: "job", packetVersion: 3, rebookedFromJobId: "prior" });
  expect(send.mock.calls[0][0]).toBeInstanceOf(GetItemCommand);
  expect(send.mock.calls[0][0].input.ConsistentRead).toBe(true);
  expect(unmarshall(send.mock.calls[0][0].input.Key)).toEqual({ id: "job" });
  send.mockRejectedValueOnce(new Error("private row data"));
  await expect(technicianReadStore(db(send)).job("job")).rejects.toThrow("Technician records could not be read. Please retry.");
});
