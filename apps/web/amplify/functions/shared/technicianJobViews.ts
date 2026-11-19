import { createHash } from "node:crypto";
import type { AppSyncIdentity } from "aws-lambda";
import { callerGroups, callerIsOffice, callerSub } from "./authz";
import { licenseFactsFor, type LicenseFacts } from "./licenses";
import { dataClient } from "./dataClient";
import { assertCanReadJob, type LinkedTechnician } from "./jobAssignment";
import { onsiteMinutesFor } from "./dispatchReadiness";
import {
  mapConcurrent,
  technicianReadStore,
  type FieldRow,
  type HistoryKey,
  type TechnicianReadStore,
} from "./technicianReadStore";

type AnyRecord = Record<string, unknown>;
const CUSTOMER_VISIT_FIELDS = [
  "id",
  "displayName",
  "contactName",
  "email",
  "phone",
  "serviceStreet",
  "serviceUnit",
  "serviceCity",
  "serviceState",
  "serviceZip",
] as const;
function pickCustomer(row: AnyRecord | null | undefined): AnyRecord | null {
  return row
    ? Object.fromEntries(
        CUSTOMER_VISIT_FIELDS.map((field) => [field, row[field] ?? null]),
      )
    : null;
}
function pickJob(row: AnyRecord) {
  const out = { ...row };
  delete out.priceCents;
  delete out.paidPaymentIntentId;
  return out;
}
function assertReader(identity: AppSyncIdentity | null | undefined) {
  if (!callerIsOffice(identity) && !callerGroups(identity).includes("TECH"))
    throw new Error("Not authorized for technician records");
}
function readScope(
  identity: AppSyncIdentity | null | undefined,
  store: TechnicianReadStore,
) {
  let tech: Promise<LinkedTechnician | null> | undefined;
  let license: Promise<LicenseFacts> | undefined;
  return {
    technician: () =>
      (tech ??= callerSub(identity)
        ? store.technician(callerSub(identity)!)
        : Promise.resolve(null)),
    license: (row: LinkedTechnician) => (license ??= licenseFactsFor(row)),
  };
}

export type TechnicianJobArgs = {
  view?: string | null;
  historyToken?: string | null;
  historyLimit?: number | null;
  reportId?: string | null;
};
export type TechnicianJobResult = {
  job: AnyRecord;
  onsiteMinutes: number;
  packetChanged: boolean;
  customer: AnyRecord | null;
  reports: AnyRecord[];
  reportsUnavailable?: boolean;
  customerUnavailable?: boolean;
  technician: {
    id: string;
    name: string | null;
    active: boolean | null;
    userSub: string | null;
  } | null;
  historyAllowed: boolean;
  currentOnly?: boolean;
};
export type TechnicianHistoryResult = {
  historyPage: true;
  historyAllowed: boolean;
  priorVisits: AnyRecord[];
  historyNextToken: string | null;
};
function cursorBinding(
  identity: AppSyncIdentity | undefined | null,
  job: FieldRow,
) {
  return createHash("sha256")
    .update(JSON.stringify([callerSub(identity), job.id, job.customerId]))
    .digest("hex");
}
function historyCursor(
  token: string | null | undefined,
  binding: string,
): HistoryKey | null {
  if (!token) return null;
  try {
    if (token.length > 12000 || !/^[A-Za-z0-9_-]+$/.test(token))
      throw new Error();
    const value = JSON.parse(Buffer.from(token, "base64url").toString());
    const key = value.key as HistoryKey;
    if (
      value.v !== 1 ||
      value.binding !== binding ||
      !key ||
      Object.keys(key).sort().join(",") !== "customerId,id" ||
      [key.id, key.customerId].some(
        (id) => typeof id !== "string" || !id || Buffer.byteLength(id) > 2048,
      )
    )
      throw new Error();
    return key;
  } catch {
    throw new Error("Visit history continuation is invalid. Reload this job.");
  }
}
function nextHistory(key: HistoryKey | null, binding: string) {
  return key
    ? Buffer.from(JSON.stringify({ v: 1, binding, key })).toString("base64url")
    : null;
}
function visitSummary(row: FieldRow) {
  return {
    id: row.id,
    status: row.status,
    serviceType: row.serviceType ?? null,
    scheduledDate: row.scheduledDate ?? null,
    noAccessReason: row.noAccessReason ?? null,
    notPerformedReason: row.notPerformedReason ?? null,
  };
}
async function hydrateHistory(rows: FieldRow[], store: TechnicianReadStore) {
  return mapConcurrent(rows, 3, async (row) => {
    let findings: AnyRecord | null = null,
      findingsUnavailable = false;
    if (row.status === "COMPLETED") {
      try {
        const reports = await store.reports(row.id);
        const finalized = reports.find(
          (report) =>
            report.status === "FINALIZED" &&
            report.jobId === row.id &&
            report.customerId === row.customerId,
        );
        if (finalized) {
          findings = Object.fromEntries(
            [
              "servicesPerformed",
              "productsUsed",
              "areasTreated",
              "targetPests",
              "recommendations",
              "reEntryIntervalHours",
            ].map((field) => [
              field,
              (finalized as unknown as AnyRecord)[field] ?? null,
            ]),
          );
        }
      } catch {
        findingsUnavailable = true;
      }
    }
    return {
      ...visitSummary(row),
      findings,
      ...(findingsUnavailable ? { findingsUnavailable: true } : {}),
    };
  });
}
/** Explicit CURRENT/HISTORY views; legacy full packets remain in technicianReads. */
export async function buildTechnicianJobView(
  identity: AppSyncIdentity | undefined | null,
  jobId: string,
  args: TechnicianJobArgs,
  injected?: TechnicianReadStore,
): Promise<TechnicianJobResult | TechnicianHistoryResult> {
  assertReader(identity);
  if (!args.view || !["CURRENT", "HISTORY"].includes(args.view))
    throw new Error("Invalid technician job view");
  if (
    args.view !== "HISTORY" &&
    (args.historyToken != null || args.historyLimit != null)
  )
    throw new Error("History arguments require the history view");
  if (
    args.reportId != null &&
    (args.view !== "CURRENT" ||
      typeof args.reportId !== "string" ||
      !args.reportId ||
      Buffer.byteLength(args.reportId) > 2048)
  )
    throw new Error(
      "A report refresh requires the current view and a valid report ID",
    );
  const limit = args.historyLimit ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20)
    throw new Error("Visit history page must contain between 1 and 20 records");
  const store = injected ?? technicianReadStore();
  const scope = readScope(identity, store);
  const job = await store.job(jobId);
  await assertCanReadJob(identity, job, scope);
  if (!job) throw new Error("Job not found");
  const office = callerIsOffice(identity),
    tech = await scope.technician();
  const historyAllowed =
    office || Boolean(tech && (await scope.license(tech)).current);
  const client = await dataClient();
  const binding = cursorBinding(identity, job);
  if (args.view === "HISTORY") {
    const key = historyCursor(args.historyToken, binding);
    if (key && key.customerId !== job.customerId)
      throw new Error(
        "Visit history continuation is invalid. Reload this job.",
      );
    if (!historyAllowed)
      return {
        historyPage: true,
        historyAllowed: false,
        priorVisits: [],
        historyNextToken: null,
      };
    const page = await store.historyPage(String(job.customerId), key, limit);
    return {
      historyPage: true,
      historyAllowed: true,
      priorVisits: await hydrateHistory(
        page.rows.filter(
          (row) => row.id !== jobId && row.customerId === job.customerId,
        ),
        store,
      ),
      historyNextToken: nextHistory(page.key, binding),
    };
  }
  const [customer, reports] = await Promise.all([
    client.models.Customer.get(
      { id: String(job.customerId) },
      { selectionSet: [...CUSTOMER_VISIT_FIELDS] },
    )
      .then((result) => {
        if (result.errors?.length) throw new Error();
        return {
          row: pickCustomer(result.data as AnyRecord | null),
          unavailable: false,
        };
      })
      .catch(() => ({ row: null, unavailable: true })),
    (args.reportId
      ? store.report(args.reportId).then((row) => {
          if (
            !row ||
            row.jobId !== jobId ||
            row.customerId !== job.customerId ||
            (!historyAllowed && row.technicianId !== tech?.id)
          )
            throw new Error("Report could not be verified");
          return [row];
        })
      : store.reports(jobId)
    )
      .then((rows) => ({ rows: rows as AnyRecord[], unavailable: false }))
      .catch(() => ({ rows: [] as AnyRecord[], unavailable: true })),
  ]);
  const result: TechnicianJobResult = {
    job: pickJob(job),
    onsiteMinutes: onsiteMinutesFor(job.propertyClass as string | null),
    packetChanged:
      Number(job.packetVersion ?? 1) > 1 &&
      Number(job.packetAckVersion ?? 0) < Number(job.packetVersion ?? 1),
    customer: customer.row,
    ...(customer.unavailable ? { customerUnavailable: true } : {}),
    reports: reports.rows.filter(
      (row) =>
        row.jobId === jobId &&
        row.customerId === job.customerId &&
        (historyAllowed || row.technicianId === tech?.id),
    ),
    ...(reports.unavailable ? { reportsUnavailable: true } : {}),
    technician: tech
      ? {
          id: tech.id,
          name: tech.name ?? null,
          active: tech.active ?? null,
          userSub: tech.userSub ?? null,
        }
      : null,
    historyAllowed,
  };
  return { ...result, currentOnly: true };
}
