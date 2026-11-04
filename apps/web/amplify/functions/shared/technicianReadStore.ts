import { BatchGetItemCommand, DynamoDBClient, GetItemCommand, QueryCommand, type AttributeValue } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { _resolveTableSuffix } from "./atomicLock";
import { listAll, type PageResult } from "./pagination";
import type { LinkedTechnician } from "./jobAssignment";

export type FieldRow = Record<string, unknown> & { id: string };
export const TECHNICIAN_JOB_FIELDS = [
  "id", "customerId", "servicePlanId", "type", "serviceType", "serviceCode", "catalogVersion", "description", "status",
  "scheduledDate", "scheduledStartTime", "scheduledEndTime", "routeId", "routeOrder", "etaMinutes", "technicianId",
  "startedAt", "applicationEndAt", "completedAt", "paidAt", "noAccessReason", "noAccessAt", "noAccessNote", "noAccessPhotoKey",
  "rebookedFromJobId", "notPerformedReason", "cancelDisposition", "cancelDispositionCents", "capacityMinutes",
  "paymentPendingIntentId", "capacityTechnicianId", "notPerformedAt", "notPerformedNote", "notPerformedPhotoKey", "propertyClass",
  "dispatchDriveMinutes", "dispatchRouteCheckedAt", "enRouteAt", "trackToken", "trackLat", "trackLng", "trackAt", "trackEndsAt",
  "packetVersion", "packetChangedAt", "packetAckVersion", "packetAckAt", "notes", "accessInstructions", "hazardNotes",
  "prepInstructions", "prepConfirmed", "paymentExpectation", "accessGroups", "createdAt", "updatedAt",
] as const;
export const TECHNICIAN_HISTORY_FIELDS = ["id", "customerId", "technicianId", "status", "serviceType", "scheduledDate", "noAccessReason", "notPerformedReason", "rebookedFromJobId"] as const;
const TECH_FIELDS = ["id", "name", "active", "userSub", "licenseNumber", "licenseExpiresOn"] as const;
const REPORT_FIELDS = ["id", "jobId", "customerId", "technicianId", "serviceDate", "applicationStartAt", "applicationEndAt", "reEntryIntervalHours", "inspectionOnly", "servicesPerformed", "productsUsed", "targetPests", "areasTreated", "recommendations", "techNotes", "geoLat", "geoLng", "geoAccuracyM", "geoCapturedAt", "status", "pdfKey", "photoKeys", "emailedAt", "deliveryStatus", "presenceReviewStatus", "accessGroups", "createdAt", "updatedAt"] as const;
export type HistoryKey = { id: string; customerId: string };
type DbRecord = Record<string, AttributeValue>;
type QueryPage = { Items?: DbRecord[]; LastEvaluatedKey?: DbRecord };
type BatchResult = { Responses?: Record<string, DbRecord[]>; UnprocessedKeys?: Record<string, { Keys?: DbRecord[] }> };
export type TechnicianReadStore = {
  job(id: string): Promise<FieldRow | null>;
  report(id: string): Promise<FieldRow | null>;
  reports(jobId: string): Promise<FieldRow[]>;
  technician(sub: string): Promise<LinkedTechnician | null>;
  routeJobs(routeId: string): Promise<FieldRow[]>;
  customerJobs(customerId: string): Promise<FieldRow[]>;
  historyPage(customerId: string, key: HistoryKey | null, limit: number): Promise<{ rows: FieldRow[]; key: HistoryKey | null }>;
};
const client = new DynamoDBClient({ maxAttempts: 1 });
let suffix: Promise<string> | null = null;
async function table(model: string) {
  if (!suffix) suffix = _resolveTableSuffix().then((value) => {
    if (!value) throw new Error("Technician read configuration is unavailable");
    return value;
  }).catch(() => { suffix = null; throw new Error("Technician read configuration is unavailable"); });
  return `${model}${await suffix}`;
}
function projection(fields: readonly string[]) {
  return { ProjectionExpression: fields.map((_, i) => `#f${i}`).join(","), ExpressionAttributeNames: Object.fromEntries(fields.map((field, i) => [`#f${i}`, field])) };
}
/** Existing generated hasMany GSIs are queried explicitly; lazy SDK hasMany would call a filtered list. */
export function technicianReadStore(ddb = client): TechnicianReadStore {
  const send = async <T>(command: object): Promise<T> => {
    try { return await ddb.send(command as never) as T; }
    catch { throw new Error("Technician records could not be read. Please retry."); }
  };
  const current = async (model: string, input: string[], fields: readonly string[]): Promise<FieldRow[]> => {
    const ids = [...new Set(input)]; if (!ids.length) return [];
    if (ids.length > 100) throw new Error("Technician record page exceeded its budget");
    const name = await table(model); let keys = ids.map((id) => marshall({ id })); const rows = new Map<string, FieldRow>();
    for (let attempt = 0; keys.length && attempt < 3; attempt++) {
      const result = await send<BatchResult>(new BatchGetItemCommand({ RequestItems: { [name]: { Keys: keys, ConsistentRead: true, ...projection(fields) } } }));
      for (const raw of result.Responses?.[name] ?? []) {
        const row = unmarshall(raw) as FieldRow;
        if (!ids.includes(row.id)) throw new Error("Technician record validation returned an unexpected row");
        rows.set(row.id, row);
      }
      keys = result.UnprocessedKeys?.[name]?.Keys ?? [];
      if (keys.some((key: Record<string, AttributeValue>) => !ids.includes(unmarshall(key).id))) throw new Error("Technician record validation returned invalid retry keys");
    }
    if (keys.length) throw new Error("Technician records could not all be verified. Please retry.");
    return ids.flatMap((id) => rows.has(id) ? [rows.get(id)!] : []);
  };
  const keyedPage = async (model: string, index: string, field: string, value: string, token: string | undefined, limit: number) => {
    const result = await send<QueryPage>(new QueryCommand({ TableName: await table(model), IndexName: index, Limit: limit,
      KeyConditionExpression: "#key = :value", ExpressionAttributeNames: { "#key": field, "#id": "id" },
      ExpressionAttributeValues: marshall({ ":value": value }), ProjectionExpression: "#id",
      ExclusiveStartKey: token ? JSON.parse(Buffer.from(token, "base64url").toString()) : undefined,
    }));
    const ids = (result.Items ?? []).map((raw: Record<string, AttributeValue>) => unmarshall(raw).id);
    if (ids.length > limit || ids.some((id: unknown) => typeof id !== "string" || !id)) throw new Error("Technician record page is invalid");
    const nextToken = result.LastEvaluatedKey ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString("base64url") : null;
    if (nextToken && nextToken === token) throw new Error("Technician record pagination did not advance");
    return { ids: ids as string[], nextToken, rawKey: result.LastEvaluatedKey ? unmarshall(result.LastEvaluatedKey) : null };
  };
  const related = (field: "routeId" | "customerId", value: string, fields: readonly string[]) => listAll(async (token): Promise<PageResult<FieldRow>> => {
    const page = await keyedPage("Job", field === "routeId" ? "gsi-Route.jobs" : "gsi-Customer.jobs", field, value, token, 100);
    const rows = await current("Job", page.ids, fields);
    return { data: rows.filter((row) => row[field] === value), nextToken: page.nextToken };
  });
  const get = async (model: string, id: string, fields: readonly string[]) => {
    const result = await send<{ Item?: DbRecord }>(new GetItemCommand({ TableName: await table(model), Key: marshall({ id }), ConsistentRead: true, ...projection(fields) }));
    const row = result.Item ? unmarshall(result.Item) as FieldRow : null;
    if (row && row.id !== id) throw new Error("Technician record validation returned an unexpected row");
    return row;
  };
  return {
    job: (id) => get("Job", id, TECHNICIAN_JOB_FIELDS),
    report: (id) => get("ServiceReport", id, REPORT_FIELDS),
    reports: (jobId) => listAll(async (token): Promise<PageResult<FieldRow>> => {
      const page = await keyedPage("ServiceReport", "serviceReportsByJobId", "jobId", jobId, token, 100);
      return { data: (await current("ServiceReport", page.ids, REPORT_FIELDS)).filter((row) => row.jobId === jobId), nextToken: page.nextToken };
    }),
    async technician(sub) {
      const rows = await listAll(async (token): Promise<PageResult<FieldRow>> => {
        const page = await keyedPage("Technician", "techniciansByUserSub", "userSub", sub, token, 100);
        return { data: (await current("Technician", page.ids, TECH_FIELDS)).filter((row) => row.userSub === sub), nextToken: page.nextToken };
      });
      // An ambiguous account linkage never grants a choice between two applicators.
      const unique = [...new Map(rows.map((row) => [row.id, row])).values()];
      return unique.length === 1 ? unique[0] as LinkedTechnician : null;
    },
    routeJobs: (id) => related("routeId", id, TECHNICIAN_JOB_FIELDS),
    customerJobs: (id) => related("customerId", id, TECHNICIAN_HISTORY_FIELDS),
    async historyPage(customerId, key, limit) {
      const token = key ? Buffer.from(JSON.stringify(marshall(key))).toString("base64url") : undefined;
      const page = await keyedPage("Job", "gsi-Customer.jobs", "customerId", customerId, token, limit);
      const raw = page.rawKey;
      if (raw && (Object.keys(raw).sort().join(",") !== "customerId,id" || typeof raw.id !== "string" || !raw.id || raw.customerId !== customerId)) throw new Error("Technician history continuation is invalid");
      return { rows: (await current("Job", page.ids, TECHNICIAN_HISTORY_FIELDS)).filter((row) => row.customerId === customerId), key: raw as HistoryKey | null };
    },
  };
}

export async function mapConcurrent<T, R>(items: readonly T[], concurrency: number, visit: (item: T) => Promise<R>): Promise<R[]> {
  let next = 0; const result = new Array<R>(items.length);
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) { const index = next++; result[index] = await visit(items[index]); }
  }));
  return result;
}
