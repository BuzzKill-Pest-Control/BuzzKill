import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactWriteItemsCommand, type TransactWriteItemsCommandInput } from "@aws-sdk/client-dynamodb";
import { GetParameterCommand } from "@aws-sdk/client-ssm";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { LockCheck, LockCondition, LockStore } from "./atomicLock";

const mocks = vi.hoisted(() => ({ dynamo: vi.fn(), parameter: vi.fn() }));
vi.mock("@aws-sdk/client-dynamodb", async (importOriginal) => ({
  ...await importOriginal<typeof import("@aws-sdk/client-dynamodb")>(),
  DynamoDBClient: class { send = mocks.dynamo; },
}));
vi.mock("@aws-sdk/client-ssm", async (importOriginal) => ({
  ...await importOriginal<typeof import("@aws-sdk/client-ssm")>(),
  SSMClient: class { send = mocks.parameter; },
}));

let locks: typeof import("./atomicLock");
const now = "2026-10-05T18:00:00.000Z";
const guards: LockCondition[] = [
  { kind: "fieldEquals", field: "status", value: "LEAD" },
  { kind: "fieldMissingOrNull", field: "mergeCounterpartId" },
];
const jobChecks: LockCheck[] = [{
  model: "Job", id: "job-1", conditions: [
    { kind: "fieldEquals", field: "customerId", value: "customer-1" },
    { kind: "fieldNotIn", field: "status", values: ["CANCELED"] },
  ],
}];
const sets = { status: "ACTIVE", convertedAt: now, nextAction: null, nextActionAt: null };
const convert = (checks = jobChecks) =>
  locks.casTransactionalUpdate("Customer", "customer-1", sets, guards, checks);

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(now));
  vi.stubEnv("AMPLIFY_DATA_API_ID_PARAM", "/buzzkill/destination/data-api-id");
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mocks.dynamo.mockReset().mockResolvedValue({});
  mocks.parameter.mockReset().mockResolvedValue({ Parameter: { Value: "realapi123" } });
  locks = await import("./atomicLock");
  locks._setLockStoreForTests(null);
});
afterEach(() => {
  locks._setLockStoreForTests(null);
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function transaction(): NonNullable<TransactWriteItemsCommandInput["TransactItems"]> {
  expect(mocks.dynamo).toHaveBeenCalledTimes(1);
  const command = mocks.dynamo.mock.calls[0][0];
  expect(command).toBeInstanceOf(TransactWriteItemsCommand);
  return command.input.TransactItems;
}

/** Compare the actual DynamoDB expression's meaning, independently of the
 * placeholder names chosen by the implementation. */
function expandExpression(
  expression: string | undefined,
  names: Record<string, string> | undefined,
  values: Parameters<typeof unmarshall>[0] | undefined
): string {
  const decoded = values ? unmarshall(values) : {};
  return String(expression)
    .replace(/#[A-Za-z0-9_]+/g, (alias) => {
      expect(names).toHaveProperty(alias);
      return names![alias];
    })
    .replace(/:[A-Za-z0-9_]+/g, (alias) => {
      expect(decoded).toHaveProperty(alias);
      return JSON.stringify(decoded[alias]);
    });
}

describe("production transactional updates", () => {
  it("sends one atomic customer Update plus the linked job ConditionCheck", async () => {
    expect(await convert()).toEqual({ ok: true, prior: {} });
    expect(mocks.parameter).toHaveBeenCalledTimes(1);
    expect(mocks.parameter.mock.calls[0][0]).toBeInstanceOf(GetParameterCommand);
    expect(mocks.parameter.mock.calls[0][0].input).toEqual({ Name: "/buzzkill/destination/data-api-id" });
    const items = transaction();
    expect(items).toHaveLength(2);
    const update = items[0].Update!;
    const check = items[1].ConditionCheck!;
    expect(update.TableName).toBe("Customer-realapi123-NONE");
    expect(check.TableName).toBe("Job-realapi123-NONE");
    expect(unmarshall(update.Key!)).toEqual({ id: "customer-1" });
    expect(unmarshall(check.Key!)).toEqual({ id: "job-1" });
    expect(expandExpression(update.ConditionExpression, update.ExpressionAttributeNames, update.ExpressionAttributeValues))
      .toBe('attribute_exists(id) AND status = "LEAD" AND (attribute_not_exists(mergeCounterpartId) OR mergeCounterpartId = null)');
    expect(expandExpression(check.ConditionExpression, check.ExpressionAttributeNames, check.ExpressionAttributeValues))
      .toBe('attribute_exists(id) AND customerId = "customer-1" AND (attribute_not_exists(status) OR (status <> "CANCELED"))');
    const write = expandExpression(update.UpdateExpression, update.ExpressionAttributeNames, update.ExpressionAttributeValues);
    expect(write).toContain('status = "ACTIVE"');
    expect(write).toContain(`convertedAt = "${now}"`);
    expect(write).toContain(`updatedAt = "${now}"`);
    expect(write).toContain("REMOVE nextAction, nextActionAt");
    expect(items[1]).not.toHaveProperty("Update");
    expect(update).not.toHaveProperty("ReturnValues");
  });

  it("requires an existing cross-row item even when it has no additional conditions", async () => {
    await convert([{ model: "Job", id: "job-1", conditions: [] }]);
    const check = transaction()[1].ConditionCheck!;
    expect(check.ConditionExpression).toBe("attribute_exists(#pk)");
    expect(check.ExpressionAttributeNames).toEqual({ "#pk": "id" });
    expect(check).not.toHaveProperty("ExpressionAttributeValues");
  });

  it("keeps separate condition bindings for each checked table", async () => {
    await convert([...jobChecks, {
      model: "LeadLifecycleClaim", id: "claim-1", conditions: [
        { kind: "fieldEquals", field: "holder", value: "worker-1" },
      ],
    }]);
    const items = transaction();
    expect(items).toHaveLength(3);
    const claim = items[2].ConditionCheck!;
    expect(claim.TableName).toBe("LeadLifecycleClaim-realapi123-NONE");
    expect(expandExpression(claim.ConditionExpression, claim.ExpressionAttributeNames, claim.ExpressionAttributeValues))
      .toBe('attribute_exists(id) AND holder = "worker-1"');
  });

  it.each([0, 1])("reports a failed condition on item %s without issuing a separate update", async (failedIndex) => {
    mocks.dynamo.mockRejectedValue({
      name: "TransactionCanceledException",
      CancellationReasons: [0, 1].map((index) => ({ Code: index === failedIndex ? "ConditionalCheckFailed" : "None" })),
    });
    expect(await convert()).toEqual({ ok: false, reason: "LOST" });
    expect(transaction()).toHaveLength(2);
  });

  it.each(["ResourceNotFoundException", "AccessDeniedException", "UnrecognizedClientException", "ValidationException", "ServiceUnavailable"])(
    "fails closed on %s without a nontransactional fallback", async (name) => {
      mocks.dynamo.mockRejectedValue({ name });
      expect(await convert()).toEqual({ ok: false, reason: "UNSUPPORTED" });
      expect(transaction()).toHaveLength(2);
    }
  );

  it.each([
    { name: "TransactionConflictException" },
    { name: "TransactionCanceledException", CancellationReasons: [{ Code: "None" }, { Code: "TransactionConflict" }] },
  ])("reports a transaction conflict as a lost race: %j", async (error) => {
    mocks.dynamo.mockRejectedValue(error);
    expect(await convert()).toEqual({ ok: false, reason: "LOST" });
    expect(transaction()).toHaveLength(2);
  });

  it.each([
    { CancellationReasons: [{ Code: "None" }, { Code: "ValidationError" }] },
    { CancellationReasons: [{ Code: "ConditionalCheckFailed" }, { Code: "ThrottlingError" }] },
    { CancellationReasons: [{ Code: "ProvisionedThroughputExceeded" }, { Code: "None" }] },
    { CancellationReasons: [{ Code: "None" }, { Code: "None" }] },
    { CancellationReasons: [] },
    { CancellationReasons: undefined },
  ])("distinguishes transaction infrastructure failure from a condition race: %j", async ({ CancellationReasons }) => {
    mocks.dynamo.mockRejectedValue({ name: "TransactionCanceledException", CancellationReasons });
    expect(await convert()).toEqual({ ok: false, reason: "UNSUPPORTED" });
    expect(transaction()).toHaveLength(2);
  });

  it("does not contact DynamoDB without verified table wiring", async () => {
    vi.stubEnv("AMPLIFY_DATA_API_ID_PARAM", undefined);
    expect(await convert()).toEqual({ ok: false, reason: "UNSUPPORTED" });
    expect(mocks.parameter).not.toHaveBeenCalled();
    expect(mocks.dynamo).not.toHaveBeenCalled();
  });

  it("retries transient SSM lookup failure rather than caching unavailable wiring", async () => {
    mocks.parameter.mockRejectedValueOnce(new Error("SSM unavailable"));
    expect(await convert()).toEqual({ ok: false, reason: "UNSUPPORTED" });
    expect(mocks.dynamo).not.toHaveBeenCalled();
    expect(await convert()).toEqual({ ok: true, prior: {} });
    expect(mocks.parameter).toHaveBeenCalledTimes(2);
    expect(transaction()).toHaveLength(2);
  });

  it("does not emulate a transaction with older stores that only support single-row writes", async () => {
    const conditionalUpdate = vi.fn();
    const legacy: LockStore = { conditionalUpdate, conditionalDelete: vi.fn() };
    locks._setLockStoreForTests(legacy);
    expect(await convert()).toEqual({ ok: false, reason: "UNSUPPORTED" });
    expect(conditionalUpdate).not.toHaveBeenCalled();
    expect(mocks.dynamo).not.toHaveBeenCalled();
  });
});
