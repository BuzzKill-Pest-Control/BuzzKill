import { BatchGetItemCommand, DynamoDBClient, QueryCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { _resolveTableSuffix } from "./atomicLock";
import { CUSTOMER_SEARCH_FIELDS, type SearchRow } from "./customerSearchRecords";
import type { Lookup } from "./customerSearchIndex";

export const SEARCH_MAX_DDB_REQUESTS = 28;
// Keep the HTTP pool across warm invocations; budgets stay local to directoryStore().
export const customerSearchDynamoClient = new DynamoDBClient({ maxAttempts: 1 });
export type SourceKey = { id: string; status: string; displayName: string };
export type DirectoryStore = {
  lookup: (lookup: Lookup, limit: number) => Promise<string[]>;
  page: (status: string, key: SourceKey | null, limit: number) => Promise<{ ids: string[]; nextKey: SourceKey | null }>;
  current: (ids: string[]) => Promise<SearchRow[]>;
};

let suffix: Promise<string | null> | null = null;
export async function customerSourceTable(): Promise<string> {
  if (!suffix) suffix = _resolveTableSuffix().then((value) => { if (!value) suffix = null; return value; }, () => { suffix = null; return null; });
  const value = await suffix;
  if (!value) throw new Error("Customer search table configuration is unavailable");
  return `Customer${value}`;
}

function projection(fields: readonly string[]) {
  return {
    ProjectionExpression: fields.map((_, i) => `#f${i}`).join(","),
    ExpressionAttributeNames: Object.fromEntries(fields.map((field, i) => [`#f${i}`, field])),
  };
}
export const searchProjection = projection;

/** Native DynamoDB avoids an AppSync/IAM GraphQL round trip for each source page. */
export function directoryStore(client = customerSearchDynamoClient): DirectoryStore {
  let requests = 0;
  const send = async <T>(command: object): Promise<T> => {
    if (++requests > SEARCH_MAX_DDB_REQUESTS) throw new Error("Customer search request budget was exhausted");
    return await client.send(command as never) as T;
  };
  const indexTable = () => {
    const name = process.env.CUSTOMER_SEARCH_TABLE_NAME;
    if (!name || !/^[A-Za-z0-9_.-]{3,255}$/.test(name)) throw new Error("Customer search index configuration is unavailable");
    return name;
  };
  return {
    async lookup(lookup, limit) {
      const result = await send<{ Items?: Record<string, AttributeValue>[] }>(new QueryCommand({
        TableName: indexTable(), ConsistentRead: true, Limit: limit,
        KeyConditionExpression: lookup.prefix ? "#pk = :pk AND begins_with(#sk, :prefix)" : "#pk = :pk",
        ExpressionAttributeNames: { "#pk": "pk", ...(lookup.prefix ? { "#sk": "sk" } : {}), "#id": "customerId" },
        ExpressionAttributeValues: marshall({ ":pk": lookup.pk, ...(lookup.prefix ? { ":prefix": lookup.prefix } : {}) }),
        ProjectionExpression: "#id",
      }));
      if ((result.Items?.length ?? 0) > limit) throw new Error("Customer search index exceeded its requested page");
      return [...new Set((result.Items ?? []).map((item) => unmarshall(item).customerId).filter((id): id is string => typeof id === "string" && Boolean(id) && Buffer.byteLength(id) <= 256))];
    },
    async page(status, key, limit) {
      const result = await send<{ Items?: Record<string, AttributeValue>[]; LastEvaluatedKey?: Record<string, AttributeValue> }>(new QueryCommand({
        TableName: await customerSourceTable(), IndexName: "customersByStatusAndDisplayName", Limit: limit,
        KeyConditionExpression: "#status = :status", ExpressionAttributeNames: { "#status": "status", "#id": "id" },
        ExpressionAttributeValues: marshall({ ":status": status }), ProjectionExpression: "#id",
        ExclusiveStartKey: key ? marshall(key) : undefined,
      }));
      const ids = (result.Items ?? []).map((item) => unmarshall(item).id);
      if (ids.length > limit || ids.some((id) => typeof id !== "string" || !id)) throw new Error("Customer search source returned an invalid page");
      const next = result.LastEvaluatedKey ? unmarshall(result.LastEvaluatedKey) : null;
      if (next && (typeof next.id !== "string" || typeof next.status !== "string" || typeof next.displayName !== "string" || next.status !== status)) {
        throw new Error("Customer search source returned an invalid continuation");
      }
      return { ids: ids as string[], nextKey: next as SourceKey | null };
    },
    async current(input) {
      const ids = [...new Set(input)];
      if (!ids.length) return [];
      if (ids.length > 50) throw new Error("Customer search validation exceeded its budget");
      const table = await customerSourceTable();
      let keys = ids.map((id) => marshall({ id }));
      const rows = new Map<string, SearchRow>();
      for (let attempt = 0; keys.length && attempt < 3; attempt++) {
        const result = await send<{ Responses?: Record<string, Record<string, AttributeValue>[]>; UnprocessedKeys?: Record<string, { Keys?: Record<string, AttributeValue>[] }> }>(new BatchGetItemCommand({
          RequestItems: { [table]: { Keys: keys, ConsistentRead: true, ...projection(CUSTOMER_SEARCH_FIELDS) } },
        }));
        for (const raw of result.Responses?.[table] ?? []) {
          const row = unmarshall(raw) as SearchRow;
          if (!ids.includes(row.id)) throw new Error("Customer search validation returned an unexpected record");
          rows.set(row.id, row);
        }
        keys = result.UnprocessedKeys?.[table]?.Keys ?? [];
        if (keys.some((key) => !ids.includes(unmarshall(key).id))) throw new Error("Customer search validation returned invalid retry keys");
      }
      if (keys.length) throw new Error("Customer search could not verify every result. Please try again.");
      return ids.flatMap((id) => rows.has(id) ? [rows.get(id)!] : []);
    },
  };
}
