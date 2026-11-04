import { createHash } from "node:crypto";
import type { AppSyncIdentity } from "aws-lambda";
import { callerGroups, callerIsOffice, callerSub } from "./authz";
import { licenseFactsFor, type LicenseFacts } from "./licenses";
import { dataClient } from "./dataClient";
import { assertCanReadJob, type LinkedTechnician } from "./jobAssignment";
import { openOwnedWork } from "./ownedWork";
import { onsiteMinutesFor } from "./dispatchReadiness";
import { listAll } from "./pagination";
import { mapConcurrent, technicianReadStore, type FieldRow, type HistoryKey, type TechnicianReadStore } from "./technicianReadStore";

// The TECH model API still grants no directory access. Every request re-proves
// current employment, assignment and licence before any customer context is served.
type AnyRecord = Record<string, unknown>;
const CUSTOMER_VISIT_FIELDS = ["id", "displayName", "contactName", "email", "phone", "serviceStreet", "serviceUnit", "serviceCity", "serviceState", "serviceZip"] as const;
function pickCustomer(row: AnyRecord | null | undefined): AnyRecord | null {
  return row ? Object.fromEntries(CUSTOMER_VISIT_FIELDS.map((field) => [field, row[field] ?? null])) : null;
}
function pickJob(row: AnyRecord) { const out = { ...row }; delete out.priceCents; delete out.paidPaymentIntentId; return out; }
function assertReader(identity: AppSyncIdentity | null | undefined) {
  if (!callerIsOffice(identity) && !callerGroups(identity).includes("TECH")) throw new Error("Not authorized for technician records");
}
function readScope(identity: AppSyncIdentity | null | undefined, store: TechnicianReadStore) {
  let tech: Promise<LinkedTechnician | null> | undefined;
  let license: Promise<LicenseFacts> | undefined;
  return {
    technician: () => tech ??= callerSub(identity) ? store.technician(callerSub(identity)!) : Promise.resolve(null),
    license: (row: LinkedTechnician) => license ??= licenseFactsFor(row),
  };
}

export type TechnicianDayResult = {
  unlinked?: boolean; accessEnded?: boolean; licenseLapsed?: boolean;
  technicianId: string | null; technicianName: string | null; canPickTechnician: boolean;
  technicians: { id: string; name: string }[];
  route: { id: string; date: string | null; status: string | null; notes: string | null } | null;
  jobs: AnyRecord[]; customers: Record<string, AnyRecord>;
};
function emptyDay(opts: Partial<TechnicianDayResult> = {}): TechnicianDayResult {
  return { technicianId: null, technicianName: null, canPickTechnician: false, technicians: [], route: null, jobs: [], customers: {}, ...opts };
}
export async function buildTechnicianDay(identity: AppSyncIdentity | undefined | null, args: { date?: string | null; technicianId?: string | null }, injected?: TechnicianReadStore): Promise<TechnicianDayResult> {
  assertReader(identity);
  const client = await dataClient(); const store = injected ?? technicianReadStore(); const scope = readScope(identity, store);
  const office = callerIsOffice(identity); let technicianId: string | null = null, technicianName: string | null = null;
  let technicians: { id: string; name: string }[] = [];
  if (office) {
    const roster = await listAll((nextToken) => client.models.Technician.list({ limit: 200, nextToken }));
    technicians = (roster as AnyRecord[]).filter((row) => row.active).map((row) => ({ id: String(row.id), name: String(row.name ?? "") }));
    technicianId = args.technicianId ?? technicians[0]?.id ?? null;
    technicianName = technicians.find((row) => row.id === technicianId)?.name ?? null;
  } else {
    const tech = await scope.technician();
    if (!tech) return emptyDay({ unlinked: true });
    if (!tech.active) return emptyDay({ accessEnded: true });
    if (!(await scope.license(tech)).current) return emptyDay({ licenseLapsed: true, technicianId: tech.id, technicianName: tech.name ?? null });
    technicianId = tech.id; technicianName = tech.name ?? null;
  }
  const basics = { technicianId, technicianName, canPickTechnician: office, technicians };
  if (!technicianId || !args.date) return emptyDay(basics);
  const routes = await listAll((nextToken) => client.models.Route.listRouteByTechnicianIdAndDate({ technicianId: technicianId!, date: { eq: args.date! } }, { nextToken }));
  const routeList = (routes as AnyRecord[]).filter((row) => row.technicianId === technicianId && row.date === args.date);
  if (!routeList.length) return emptyDay(basics);
  const displayRoute = routeList.slice().sort((a, b) => String(a.id).localeCompare(String(b.id)))[0];
  // Gen2 already creates gsi-Route.jobs. Query every duplicate route, then use
  // authoritative rows: a stale GSI assignment cannot expose another tech's stop.
  const routeIds = [...new Set(routeList.map((row) => String(row.id)))];
  const rows = await mapConcurrent(routeIds, 3, (id) => store.routeJobs(id));
  const jobsById = new Map(rows.flat().filter((row) => routeIds.includes(String(row.routeId))).map((row) => [row.id, row]));
  const matched: FieldRow[] = [], mismatched: FieldRow[] = [];
  for (const row of jobsById.values()) (row.technicianId === technicianId ? matched : mismatched).push(row);
  // This read has always opened durable mismatch cases. An unconfirmed write
  // must not turn a missing stop into a falsely clean day or queue.
  for (const row of mismatched) {
    const confirmed = await openOwnedWork({ kind: "ROUTE_MISMATCH", dedupeKey: `route-mismatch:${row.id}`,
      title: "A visit's route and assigned technician disagree",
      detail: `Job ${row.id}${row.scheduledDate ? ` (${String(row.scheduledDate)})` : ""} sits on route ${String(row.routeId)} (${technicianName ?? technicianId}), but its assigned technician is ${row.technicianId ? String(row.technicianId) : "nobody"}. The stop was withheld from the technician's day until the route and assignment agree.`,
      relatedId: row.id, sourceUrl: "/schedule", resolutionAction: "On the Schedule board, re-assign the visit so its route and technician agree (or unassign it back to the pool), then confirm it appears on the right day.", ownerTeam: "OPS",
    });
    if (!confirmed) throw new Error("A route assignment mismatch could not be recorded. Please retry or contact the office.");
  }
  const visible: FieldRow[] = [...matched, ...(office ? mismatched.map((row): FieldRow => ({ ...row, assignmentMismatch: true })) : [])];
  const jobs = visible
    .sort((a, b) => Number(a.routeOrder ?? 0) - Number(b.routeOrder ?? 0) || String(a.id).localeCompare(String(b.id))).map(pickJob);
  const customers: Record<string, AnyRecord> = {};
  await mapConcurrent([...new Set(jobs.map((row) => String(row.customerId)))], 4, async (id) => {
    const result = await client.models.Customer.get({ id }, { selectionSet: [...CUSTOMER_VISIT_FIELDS] });
    if (result.errors?.length) throw new Error("Customer visit details could not be read. Please retry.");
    const row = pickCustomer(result.data as AnyRecord | null); if (row) customers[id] = row;
  });
  return { ...basics, route: { id: String(displayRoute.id), date: displayRoute.date as string ?? null, status: displayRoute.status as string ?? null, notes: displayRoute.notes as string ?? null }, jobs, customers };
}

export type TechnicianJobArgs = { view?: string | null; historyToken?: string | null; historyLimit?: number | null; reportId?: string | null };
export type TechnicianJobResult = {
  job: AnyRecord; onsiteMinutes: number; packetChanged: boolean; customer: AnyRecord | null;
  reports: AnyRecord[]; reportsUnavailable?: boolean; customerUnavailable?: boolean;
  technician: { id: string; name: string | null; active: boolean | null; userSub: string | null } | null;
  historyAllowed: boolean; currentOnly?: boolean;
  catalog?: AnyRecord[]; catalogUnavailable?: boolean;
  priorVisits?: AnyRecord[]; historyUnavailable?: boolean; historyNextToken?: string | null;
  lineage?: AnyRecord[]; lineageUnavailable?: boolean;
};
export type TechnicianHistoryResult = { historyPage: true; historyAllowed: boolean; priorVisits: AnyRecord[]; historyNextToken: string | null };
export type TechnicianFullJobResult = TechnicianJobResult & { catalog: AnyRecord[]; priorVisits: AnyRecord[]; lineage: AnyRecord[] };
function cursorBinding(identity: AppSyncIdentity | undefined | null, job: FieldRow) {
  return createHash("sha256").update(JSON.stringify([callerSub(identity), job.id, job.customerId])).digest("hex");
}
function historyCursor(token: string | null | undefined, binding: string): HistoryKey | null {
  if (!token) return null;
  try {
    if (token.length > 12000 || !/^[A-Za-z0-9_-]+$/.test(token)) throw new Error();
    const value = JSON.parse(Buffer.from(token, "base64url").toString()); const key = value.key as HistoryKey;
    if (value.v !== 1 || value.binding !== binding || !key || Object.keys(key).sort().join(",") !== "customerId,id" ||
        [key.id, key.customerId].some((id) => typeof id !== "string" || !id || Buffer.byteLength(id) > 2048)) throw new Error();
    return key;
  } catch { throw new Error("Visit history continuation is invalid. Reload this job."); }
}
function nextHistory(key: HistoryKey | null, binding: string) { return key ? Buffer.from(JSON.stringify({ v: 1, binding, key })).toString("base64url") : null; }
function visitSummary(row: FieldRow) { return { id: row.id, status: row.status, serviceType: row.serviceType ?? null, scheduledDate: row.scheduledDate ?? null, noAccessReason: row.noAccessReason ?? null, notPerformedReason: row.notPerformedReason ?? null }; }
async function hydrateHistory(rows: FieldRow[], store: TechnicianReadStore) {
  return mapConcurrent(rows, 3, async (row) => {
    let findings: AnyRecord | null = null, findingsUnavailable = false;
    if (row.status === "COMPLETED") {
      try {
          const reports = await store.reports(row.id);
          const finalized = reports.find((report) => report.status === "FINALIZED" && report.jobId === row.id && report.customerId === row.customerId);
          if (finalized) {
          findings = Object.fromEntries(["servicesPerformed", "productsUsed", "areasTreated", "targetPests", "recommendations", "reEntryIntervalHours"].map((field) => [field, (finalized as unknown as AnyRecord)[field] ?? null]));
          }
      } catch { findingsUnavailable = true; }
    }
    return { ...visitSummary(row), findings, ...(findingsUnavailable ? { findingsUnavailable: true } : {}) };
  });
}
/** Full initial packet, bounded explicit history pages, or thin authoritative post-write refresh. */
export function buildTechnicianJob(identity: AppSyncIdentity | undefined | null, jobId: string): Promise<TechnicianFullJobResult>;
export function buildTechnicianJob(identity: AppSyncIdentity | undefined | null, jobId: string, args: TechnicianJobArgs, injected?: TechnicianReadStore): Promise<TechnicianJobResult | TechnicianHistoryResult>;
export async function buildTechnicianJob(identity: AppSyncIdentity | undefined | null, jobId: string, args: TechnicianJobArgs = {}, injected?: TechnicianReadStore): Promise<TechnicianJobResult | TechnicianHistoryResult> {
  assertReader(identity);
  if (args.view != null && !["CURRENT", "HISTORY"].includes(args.view)) throw new Error("Invalid technician job view");
  if (args.view !== "HISTORY" && (args.historyToken != null || args.historyLimit != null)) throw new Error("History arguments require the history view");
  if (args.reportId != null && (args.view !== "CURRENT" || typeof args.reportId !== "string" || !args.reportId || Buffer.byteLength(args.reportId) > 2048)) throw new Error("A report refresh requires the current view and a valid report ID");
  const limit = args.historyLimit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new Error("Visit history page must contain between 1 and 20 records");
  const store = injected ?? technicianReadStore(); const scope = readScope(identity, store);
  const job = await store.job(jobId);
  await assertCanReadJob(identity, job, scope);
  if (!job) throw new Error("Job not found");
  const office = callerIsOffice(identity), tech = await scope.technician();
  const historyAllowed = office || Boolean(tech && (await scope.license(tech)).current);
  const client = await dataClient();
  const binding = cursorBinding(identity, job);
  if (args.view === "HISTORY") {
    const key = historyCursor(args.historyToken, binding);
    if (key && key.customerId !== job.customerId) throw new Error("Visit history continuation is invalid. Reload this job.");
    if (!historyAllowed) return { historyPage: true, historyAllowed: false, priorVisits: [], historyNextToken: null };
    const page = await store.historyPage(String(job.customerId), key, limit);
    return { historyPage: true, historyAllowed: true, priorVisits: await hydrateHistory(page.rows.filter((row) => row.id !== jobId && row.customerId === job.customerId), store), historyNextToken: nextHistory(page.key, binding) };
  }
  const [customer, reports] = await Promise.all([
    client.models.Customer.get({ id: String(job.customerId) }, { selectionSet: [...CUSTOMER_VISIT_FIELDS] }).then((result) => {
      if (result.errors?.length) throw new Error(); return { row: pickCustomer(result.data as AnyRecord | null), unavailable: false };
    }).catch(() => ({ row: null, unavailable: true })),
    (args.reportId ? store.report(args.reportId).then((row) => {
      if (!row || row.jobId !== jobId || row.customerId !== job.customerId || (!historyAllowed && row.technicianId !== tech?.id)) throw new Error("Report could not be verified");
      return [row];
    }) : store.reports(jobId))
      .then((rows) => ({ rows: rows as AnyRecord[], unavailable: false })).catch(() => ({ rows: [] as AnyRecord[], unavailable: true })),
  ]);
  const result: TechnicianJobResult = {
    job: pickJob(job), onsiteMinutes: onsiteMinutesFor(job.propertyClass as string | null),
    packetChanged: Number(job.packetVersion ?? 1) > 1 && Number(job.packetAckVersion ?? 0) < Number(job.packetVersion ?? 1),
    customer: customer.row, ...(customer.unavailable ? { customerUnavailable: true } : {}),
    reports: reports.rows.filter((row) => row.jobId === jobId && row.customerId === job.customerId && (historyAllowed || row.technicianId === tech?.id)),
    ...(reports.unavailable ? { reportsUnavailable: true } : {}),
    technician: tech ? { id: tech.id, name: tech.name ?? null, active: tech.active ?? null, userSub: tech.userSub ?? null } : null,
    historyAllowed,
  };
  if (args.view === "CURRENT") return { ...result, currentOnly: true };
  if (!historyAllowed) return { ...result, catalog: [], priorVisits: [], lineage: [], historyNextToken: null };
  // A hash-only relationship GSI has no chronological order. Read this one
  // customer's narrow metadata completely before claiming a globally latest6.
  const [history, catalog] = await Promise.all([
    store.customerJobs(String(job.customerId)).then((rows) => ({ rows, unavailable: false })).catch(() => ({ rows: [] as FieldRow[], unavailable: true })),
    listAll((nextToken) => client.models.Product.list({ limit: 100, nextToken })).then((rows) => ({ rows: rows as AnyRecord[], unavailable: false })).catch(() => ({ rows: [] as AnyRecord[], unavailable: true })),
  ]);
  result.catalog = catalog.rows.filter((row) => row.active && row.labelApproved && typeof row.epaNumber === "string" && row.epaNumber.trim() && typeof row.defaultRate === "string" && row.defaultRate.trim() && row.reEntryHours != null);
  if (catalog.unavailable) result.catalogUnavailable = true;
  const ownHistory = history.rows.filter((row) => row.customerId === job.customerId && row.id !== job.id);
  const recent = ownHistory.slice().sort((a, b) => String(b.scheduledDate ?? "0").localeCompare(String(a.scheduledDate ?? "0")) || a.id.localeCompare(b.id)).slice(0, 6);
  result.priorVisits = await hydrateHistory(recent, store);
  if (history.unavailable) result.historyUnavailable = true;
  // Full chain from already verified customer metadata; never follow a pointer
  // into another customer's rows or claim a truncated/cyclic chain is complete.
  const map = new Map([...ownHistory, job].map((row) => [row.id, row])); const seen = new Set([job.id]); const lineage: AnyRecord[] = [];
  let cursor: FieldRow | undefined = job;
  while (cursor?.rebookedFromJobId) {
    const fromId = String(cursor.rebookedFromJobId); const from = map.get(fromId);
    if (!from || seen.has(fromId)) { result.lineageUnavailable = true; break; }
    lineage.push(visitSummary(from)); seen.add(fromId); cursor = from;
  }
  result.lineage = lineage;
  // Full history pages start from the actual relationship index; client dedupes
  // these recent-context IDs while preserving access to every other visit.
  result.historyNextToken = null;
  return result;
}
