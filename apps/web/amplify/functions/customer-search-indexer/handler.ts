import { ScanCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { DynamoDBStreamEvent, DynamoDBBatchResponse } from "aws-lambda";
import { hash, INDEX_SOURCE_FIELDS } from "../shared/customerSearchIndex";
import { indexWriter, synchronizeCustomer, type IndexWriter } from "../shared/customerIndexWriter";
import { customerSearchDynamoClient as client, customerSourceTable, searchProjection } from "../shared/customerSearchStore";
import { emitCustomerSearchRecordFailures } from "../shared/customerSearchMetrics";

type BackfillCursor = { v: 1; binding: string; phase: "customers" | "manifests"; key: Record<string, string> | null };
type BackfillEvent = { kind: "BACKFILL"; cursor?: string | null };

function readCursor(binding: string, value?: string | null): BackfillCursor {
  if (!value) return { v: 1, binding, phase: "customers", key: null };
  try {
    if (value.length > 12000 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error();
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as BackfillCursor;
    const fields = cursor.phase === "customers" ? ["id"] : ["pk", "sk"];
    if (cursor.v !== 1 || cursor.binding !== binding || !["customers", "manifests"].includes(cursor.phase) || (cursor.key !== null &&
      (!cursor.key || typeof cursor.key !== "object" || Array.isArray(cursor.key) || Object.keys(cursor.key).sort().join(",") !== fields.sort().join(",") ||
       Object.values(cursor.key).some((entry) => typeof entry !== "string" || !entry || Buffer.byteLength(entry) > 2048)))) throw new Error();
    return { v: 1, binding, phase: cursor.phase, key: cursor.key };
  } catch { throw new Error("Customer search backfill continuation is invalid"); }
}

export async function backfillPage(event: BackfillEvent, writer: IndexWriter = indexWriter(), ddb = client) {
  const sourceTable = await customerSourceTable();
  const indexTable = process.env.CUSTOMER_SEARCH_TABLE_NAME;
  if (!indexTable) throw new Error("Customer search index configuration is unavailable");
  const cursor = readCursor(hash(JSON.stringify([sourceTable, indexTable])), event.cursor);
  const table = cursor.phase === "customers" ? sourceTable : indexTable;
  // Limit means evaluated entries, including empty filtered manifest pages. Each invocation handles at most25 customers.
  const page = await ddb.send(new ScanCommand({
    TableName: table, Limit: 25, ConsistentRead: true,
    ExclusiveStartKey: cursor.key ? marshall(cursor.key) : undefined,
    ...(cursor.phase === "customers" ? searchProjection(INDEX_SOURCE_FIELDS) : {
      ProjectionExpression: "customerId", FilterExpression: "#kind = :kind",
      ExpressionAttributeNames: { "#kind": "kind" }, ExpressionAttributeValues: marshall({ ":kind": "manifest" }),
    }),
  }));
  const rows = page.Items ?? [];
  if (rows.length > 25 || (page.ScannedCount ?? rows.length) > 25) throw new Error("Customer search backfill exceeded its page budget");
  let processed = 0;
  for (const raw of rows) {
    const row = unmarshall(raw);
    const id = cursor.phase === "customers" ? row.id : row.customerId;
    if (typeof id !== "string" || !id) throw new Error("Customer search backfill encountered invalid derived metadata");
    await synchronizeCustomer(id, writer);
    processed++;
  }
  if (page.LastEvaluatedKey) cursor.key = unmarshall(page.LastEvaluatedKey) as Record<string, string>;
  else if (cursor.phase === "customers") { cursor.phase = "manifests"; cursor.key = null; }
  else return { processed, evaluated: page.ScannedCount ?? rows.length, complete: true, cursor: null };
  const next = Buffer.from(JSON.stringify(cursor)).toString("base64url");
  if (next === event.cursor) throw new Error("Customer search backfill did not advance");
  return { processed, evaluated: page.ScannedCount ?? rows.length, complete: false, cursor: next };
}

export async function handler(event: DynamoDBStreamEvent | BackfillEvent): Promise<DynamoDBBatchResponse | Awaited<ReturnType<typeof backfillPage>>> {
  if (process.env.BUZZKILL_MIGRATION_PREVIEW === "true" || process.env.CUSTOMER_SEARCH_WORKER_ENABLED !== "true") {
    throw new Error("Customer search maintenance is paused");
  }
  if ("kind" in event && event.kind === "BACKFILL") {
    try { return await backfillPage(event); } catch { throw new Error("Customer search backfill failed; retry the saved page"); }
  }
  if (!("Records" in event) || !Array.isArray(event.Records) || event.Records.length > 10) throw new Error("Customer search stream batch is invalid");
  const failures: { itemIdentifier: string }[] = [];
  const writer = indexWriter();
  for (const record of event.Records) {
    const id = record.dynamodb?.Keys?.id?.S;
    const sequence = record.dynamodb?.SequenceNumber;
    if (!sequence) throw new Error("Customer search stream sequence is missing");
    try {
      if (!id) throw new Error("Customer search stream key is missing");
      // Never use NewImage/OldImage: both may be stale when delivery retries or backfill races a change.
      await synchronizeCustomer(id, writer);
    } catch { failures.push({ itemIdentifier: sequence }); }
  }
  // Partial retries do not increment Lambda Errors. Emit only an aggregate, including healthy zeroes.
  emitCustomerSearchRecordFailures(failures.length);
  return { batchItemFailures: failures };
}
