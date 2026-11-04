import { randomUUID } from "node:crypto";
import { GetItemCommand, TransactWriteItemsCommand, type AttributeValue, type TransactWriteItem } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { customerSearchDynamoClient, customerSourceTable, searchProjection } from "./customerSearchStore";
import { INDEX_MAX_ENTRIES, INDEX_SOURCE_FIELDS, indexEntries, keyId, manifestKey, manifestKeys, type IndexManifest, type IndexSource } from "./customerSearchIndex";

export type IndexSnapshot = { source: IndexSource | null; manifest: IndexManifest | null };
export type IndexWriter = {
  snapshot: (id: string) => Promise<IndexSnapshot>;
  commit: (id: string, snapshot: IndexSnapshot) => Promise<boolean>;
};

/** Actual facts are fenced as well as updatedAt: imported/direct writers need not advance a timestamp. */
type Fence = { ConditionExpression: string; ExpressionAttributeNames: Record<string, string>; ExpressionAttributeValues?: Record<string, AttributeValue> };
export function sourceFence(source: IndexSource | null): Fence {
  if (!source) return { ConditionExpression: "attribute_not_exists(#id)", ExpressionAttributeNames: { "#id": "id" } };
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = {};
  const conditions = INDEX_SOURCE_FIELDS.map((field, i) => {
    const name = `#s${i}`;
    names[name] = field;
    if (source[field] === undefined) return `attribute_not_exists(${name})`;
    values[`:s${i}`] = source[field];
    return `${name} = :s${i}`;
  });
  return { ConditionExpression: conditions.join(" AND "), ExpressionAttributeNames: names, ExpressionAttributeValues: marshall(values) };
}

export function indexTransaction(id: string, snapshot: IndexSnapshot, customerTable: string, indexTable: string): TransactWriteItem[] {
  const key = manifestKey(id);
  const oldKeys = manifestKeys(snapshot.manifest?.keys, id);
  if (snapshot.manifest && (snapshot.manifest.customerId !== id || typeof snapshot.manifest.revision !== "string" ||
      !snapshot.manifest.revision || snapshot.manifest.revision.length > 100)) throw new Error("Customer search manifest is invalid");
  if (snapshot.source && snapshot.source.id !== id) throw new Error("Customer search source identity is invalid");
  const entries = indexEntries(snapshot.source);
  const current = new Set(entries.map(keyId));
  const transaction: TransactWriteItem[] = [{ ConditionCheck: {
    TableName: customerTable, Key: marshall({ id }), ...sourceFence(snapshot.source),
  } }];
  for (const old of oldKeys) if (!current.has(keyId(old))) transaction.push({ Delete: { TableName: indexTable, Key: marshall(old) } });
  for (const entry of entries) transaction.push({ Put: { TableName: indexTable, Item: marshall(entry) } });
  const condition: Fence = snapshot.manifest
    ? { ConditionExpression: "#revision = :revision", ExpressionAttributeNames: { "#revision": "revision" }, ExpressionAttributeValues: marshall({ ":revision": snapshot.manifest.revision }) }
    : { ConditionExpression: "attribute_not_exists(#pk)", ExpressionAttributeNames: { "#pk": "pk" } };
  if (entries.length) transaction.push({ Put: {
    TableName: indexTable,
    Item: marshall({ ...key, kind: "manifest", customerId: id, revision: randomUUID(), keys: entries.map(({ pk, sk }) => ({ pk, sk })) }),
    ...condition,
  } });
  else transaction.push({ Delete: { TableName: indexTable, Key: marshall(key), ...condition } });
  // At most old34 + new34 + manifest + source check. No transaction touches a key twice.
  if (transaction.length > INDEX_MAX_ENTRIES * 2 + 2 || transaction.length > 100) throw new Error("Customer search transaction exceeded its budget");
  const touched = transaction.map((item) => {
    if (item.Put) return JSON.stringify([item.Put.TableName, { pk: item.Put.Item!.pk, sk: item.Put.Item!.sk }]);
    const value = item.Delete ?? item.ConditionCheck!;
    return JSON.stringify([value.TableName, value.Key]);
  });
  if (new Set(touched).size !== touched.length) throw new Error("Customer search transaction contains duplicate keys");
  return transaction;
}

/** A failed CAS rereads both rows; duplicate, delayed and backfill work always converges on current facts. */
export async function synchronizeCustomer(id: string, writer: IndexWriter): Promise<void> {
  if (!id || Buffer.byteLength(id) > 2048) throw new Error("Customer search source identity is invalid");
  for (let attempt = 0; attempt < 3; attempt++) {
    const snapshot = await writer.snapshot(id);
    if (await writer.commit(id, snapshot)) return;
  }
  throw new Error("Customer search maintenance conflicted; retry is required");
}

export function indexWriter(indexTable = process.env.CUSTOMER_SEARCH_TABLE_NAME, client = customerSearchDynamoClient): IndexWriter {
  if (!indexTable || !/^[A-Za-z0-9_.-]{3,255}$/.test(indexTable)) throw new Error("Customer search index configuration is unavailable");
  return {
    async snapshot(id) {
      const customerTable = await customerSourceTable();
      const [source, manifest] = await Promise.all([
        client.send(new GetItemCommand({ TableName: customerTable, Key: marshall({ id }), ConsistentRead: true, ...searchProjection(INDEX_SOURCE_FIELDS) })),
        client.send(new GetItemCommand({ TableName: indexTable, Key: marshall(manifestKey(id)), ConsistentRead: true })),
      ]);
      return {
        source: source.Item ? unmarshall(source.Item) as IndexSource : null,
        manifest: manifest.Item ? unmarshall(manifest.Item) as IndexManifest : null,
      };
    },
    async commit(id, snapshot) {
      try {
        await client.send(new TransactWriteItemsCommand({ TransactItems: indexTransaction(id, snapshot, await customerSourceTable(), indexTable) }));
        return true;
      } catch (error) {
        const canceled = error as { name?: string; CancellationReasons?: { Code?: string }[] };
        if (canceled.name === "TransactionCanceledException" && canceled.CancellationReasons?.some((reason) => reason.Code === "ConditionalCheckFailed")) return false;
        // Never propagate provider details containing lookup keys or source facts into Lambda logs.
        throw new Error("Customer search index write failed");
      }
    },
  };
}
