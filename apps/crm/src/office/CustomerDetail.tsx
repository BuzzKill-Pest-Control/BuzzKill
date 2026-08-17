import {
  Fragment,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  api,
  clientActionId,
  DEACTIVATION_REASONS,
  dueDateForTerms,
  jsonField,
  listAll,
  listCustomerLifecycleEvents,
  listLifecycleCommands,
  mergeCustomers,
  previewLifecycleTransition,
  opResult,
  REACTIVATION_REASONS,
  recordOfflinePayment,
  rescheduleVisit,
  sendInvoicePaymentLink,
  settleInvoice,
  unwrap,
  VISIT_RESCHEDULE_REASONS,
  type MergeOutcome,
  type MergePreview,
  type MergeStateInfo,
  type CustomerLifecycleEvent,
  type VisitRescheduleOutcome,
  type Agreement,
  type CallbackRequest,
  type Customer,
  type CustomerGroup,
  type Invoice,
  type PortalRequest,
  type InvoiceTerms,
  type Job,
  type ServicePlan,
  type ServiceReport,
  type ServiceReportAmendment,
} from "../lib/api";
import { SERVICE_CATALOG } from "../../../web/amplify/functions/shared/serviceCatalog";
import { fmtDate, fmtDateTime, money, todayEastern } from "../lib/format";
import { toMessage, useAction, useAsync, useKeyedAction } from "../lib/useAsync";
import { daysPastDue } from "../lib/aging";
import { isManualSettled } from "../lib/deposits";
import { dunningStateLabel, isOverdue } from "../lib/recovery";
import { amountInWords } from "../lib/amountWords";
import { planCadence } from "../lib/planCadence";
import {
  completeJobConfirmText,
  startBillingConfirmText,
} from "../lib/billingDisclosure";
import { isOfficeCompletableServiceType } from "../lib/jobTypes";
import {
  Badge,
  Button,
  Card,
  DeliveryBadge,
  ErrorNote,
  SuccessNote,
  Field,
  ListRow,
  Page,
  SegControl,
  Sheet,
  Spinner,
  StatusBadge,
} from "../ui/kit";
import CustomerForm, { customerToForm } from "../components/CustomerForm";
import LeadPanel from "../components/LeadPanel";
import QuoteHistory from "../components/QuoteHistory";
import CollectPaymentSheet from "../components/CollectPaymentSheet";
import VisitCancelSheet from "../components/VisitCancelSheet";
import DocButton from "../components/DocButton";
import CustomerDocuments from "../components/CustomerDocuments";
import { DateField } from "../components/DateTimeFields";
import { useRoles } from "../lib/auth";
import { Icon } from "../ui/icons";
import {
  groupChangeSummary,
  isTechnicalLifecycleReason,
  lifecycleActionTitle,
  lifecycleReasonSummary,
} from "../lib/customerPresentation";

/** Human-friendly label for a controlled reason code (CUSTOMER_REQUEST →
 *  "Customer request"). Mirrors the same helper on the Staff screen. */
function reasonLabel(code: string): string {
  const s = code.replace(/_/g, " ").toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** One displayable string for a merge-envelope / tombstone-snapshot value —
 *  these arrive as unknown out of AWSJSON and must never render "[object …]". */
function fieldValue(v: unknown): string {
  if (v == null || v === "") return "—";
  return typeof v === "string" ? v : JSON.stringify(v);
}

/** The engine suffixes the survivor's mergeCounterpartId to
 *  "<loserId>#fields-done" from the FIELDS stage until completion — strip the
 *  progress suffix before showing the marker or using it as a customer id.
 *  Mirrors shared/customerMerge.ts mergeCounterpartCustomerId by hand (that
 *  module is not a pure leaf, so the CRM cannot import it). */
function mergeCounterpartCustomerId(
  marker: string | null | undefined
): string | null {
  if (!marker) return null;
  const hash = marker.indexOf("#");
  return hash === -1 ? marker : marker.slice(0, hash);
}

/** Office words for the schema's field names — used by the merge preview's
 *  diff rows and the tombstone's preserved-details snapshot. */
const FIELD_LABELS: Record<string, string> = {
  displayName: "Name",
  contactName: "Contact name",
  email: "Email",
  phone: "Phone",
  serviceStreet: "Street",
  serviceUnit: "Unit",
  serviceCity: "City",
  serviceState: "State",
  serviceZip: "ZIP",
  billingStreet: "Billing street",
  billingCity: "Billing city",
  billingState: "Billing state",
  billingZip: "Billing ZIP",
  propertyClass: "Property type",
  leadSource: "Source",
  notes: "Notes",
  externalRef: "Prior-system reference",
  bookingLinkToken: "Booking link",
  bookingLinkTokenExpiresAt: "Booking link expires",
  portalUserSub: "Portal login",
  stripeCustomerId: "Billing account",
  paymentMethodLabel: "Payment method",
  paymentMethodKind: "Payment method type",
  groupId: "Group",
};

function fieldLabel(field: string): string {
  const named = FIELD_LABELS[field];
  if (named) return named;
  const spaced = field.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Office words for the linked-record model names in the merge preview. */
const CHILD_MODEL_LABELS: Record<string, string> = {
  ServicePlan: "Service plans",
  Job: "Jobs",
  Agreement: "Agreements",
  ServiceReport: "Service reports",
  ServiceReportAmendment: "Report corrections",
  Invoice: "Invoices",
  Dispute: "Payment disputes",
  TreatmentObligation: "Treatment schedule",
  PortalRequest: "Portal requests",
  CallbackRequest: "Guarantee callbacks",
  LeadPricingRun: "Saved price quotes",
  LeadActivity: "Lead history",
  BookingRequest: "Quotes & bookings",
};

function childModelLabel(model: string): string {
  return (
    CHILD_MODEL_LABELS[model] ?? model.replace(/([a-z])([A-Z])/g, "$1 $2")
  );
}

/** Office words for where an unfinished merge stopped ("stopped while …"). */
const MERGE_STAGE_LABEL: Record<string, string> = {
  CLAIM: "locking the records",
  IDENTITY: "moving contact identifiers",
  FIELDS: "combining details",
  BILLING: "pointing billing at the kept record",
  PORTAL_GRANT: "granting portal access",
  CHILDREN: "moving linked records",
  WORK: "moving open tasks",
  TOMBSTONE: "retiring the duplicate",
};

function mergeStageLabel(stage: string): string {
  return MERGE_STAGE_LABEL[stage] ?? stage.replace(/_/g, " ").toLowerCase();
}

/** Retype-to-confirm comparison: trim, case-fold, and unify curly/straight
 *  apostrophes and quotes — "O'Brien" typed with an iPhone smart quote must
 *  still count as a match. */
function normalizeConfirmText(s: string): string {
  return s
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .trim()
    .toLowerCase();
}

/** A slow response during EXECUTE is not a failure — a big merge keeps running
 *  server-side after the request times out client-side. (Safari says "Load
 *  failed"; Chrome says "Failed to fetch".) */
const MERGE_TIMEOUT_ERROR =
  /timed? ?out|timeout|failed to fetch|load failed|network ?error|network request failed|socket|connection/i;

/** Default survivor by record weight, not by which page the sheet opened on:
 *  ACTIVE beats LEAD/INACTIVE; then having a saved payment method; then the
 *  older record (the longer history). */
function defaultSurvivorChoice(
  thisRecord: Customer,
  otherRecord: Customer
): "THIS" | "OTHER" {
  const weight = (c: Customer) => (c.status === "ACTIVE" ? 1 : 0);
  if (weight(thisRecord) !== weight(otherRecord)) {
    return weight(thisRecord) > weight(otherRecord) ? "THIS" : "OTHER";
  }
  const hasCard = (c: Customer) =>
    Boolean(c.paymentMethodLabel || c.stripeCustomerId);
  if (hasCard(thisRecord) !== hasCard(otherRecord)) {
    return hasCard(thisRecord) ? "THIS" : "OTHER";
  }
  const a = thisRecord.createdAt ?? "";
  const b = otherRecord.createdAt ?? "";
  if (a && b && a !== b) return a < b ? "THIS" : "OTHER";
  return "THIS";
}

function RecordSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="record-section"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>
        <span>{title}</span>
        <Badge tone={count > 0 ? "info" : "muted"}>{count}</Badge>
        <span className="record-section-chevron" aria-hidden="true">›</span>
      </summary>
      <div className="record-section-body">{children}</div>
    </details>
  );
}

/**
 * What deactivation actually does, said before the button runs it. The money
 * and the visits are stated because they are real consequences the office is
 * committing to; the outstanding balance is not knowable until the server
 * computes it, so it is reported in the result, not the confirm.
 */
function deactivateConfirmText(
  name: string,
  counts: {
    activePlanCount: number;
    upcomingVisits: number;
    hasPortal: boolean;
  }
): string {
  const lines: string[] = [];
  if (counts.activePlanCount > 0) {
    lines.push(
      `• cancel ${counts.activePlanCount} active plan${
        counts.activePlanCount === 1 ? "" : "s"
      } — the Stripe subscription stops charging`
    );
  }
  if (counts.upcomingVisits > 0) {
    lines.push(
      `• cancel ${counts.upcomingVisits} upcoming visit${
        counts.upcomingVisits === 1 ? "" : "s"
      } and take ${counts.upcomingVisits === 1 ? "it" : "them"} off the route`
    );
  }
  if (counts.hasPortal) lines.push("• end their portal login");
  const body =
    lines.length > 0
      ? `\n\nThis will:\n${lines.join("\n")}`
      : "\n\nThey have no live billing, visits, or portal login to stop.";
  return `Mark ${name} inactive?${body}\n\nAny unpaid balance is reported, not charged. Their history stays.`;
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const roles = useRoles();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [reports, setReports] = useState<ServiceReport[]>([]);
  const [amendments, setAmendments] = useState<ServiceReportAmendment[]>([]);
  const [amending, setAmending] = useState<ServiceReport | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [groups, setGroups] = useState<CustomerGroup[]>([]);
  const [rescheduling, setRescheduling] = useState<Job | null>(null);
  const [cancelingJob, setCancelingJob] = useState<Job | null>(null);
  const [packeting, setPacketing] = useState<Job | null>(null);
  const [pm, setPm] = useState<{ hasPaymentMethod: boolean; label: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [refunding, setRefunding] = useState<Invoice | null>(null);
  const [settling, setSettling] = useState<Invoice | null>(null);
  const [sheet, setSheet] = useState<
    | null
    | "edit"
    | "job"
    | "collect"
    | "charge"
    | "record"
    | "portal"
    | "group"
  >(null);
  // Duplicate-customer merge (OWNER). The hint arrives once from the lead
  // inbox's duplicate decision via nav state (consumed below, so a reload
  // never re-opens the sheet): the just-created duplicate's id, prefilled as
  // the record to absorb into the one on this page.
  const [merging, setMerging] = useState(false);
  const [mergePrefill, setMergePrefill] = useState<string | null>(null);
  const [mergeBusy, setMergeBusy] = useState(false);
  const [infoNote, setInfoNote] = useState<string | null>(null);
  // The mid-merge banner names the counterpart, and the tombstone page names
  // the record it was kept under — both fetched, with the id as fallback.
  const [counterpartName, setCounterpartName] = useState<string | null>(null);
  const [mergedIntoName, setMergedIntoName] = useState<string | null>(null);
  // GL-09 — the lifecycle transition ledger (deactivate/reactivate history) and
  // the reason-picker sheets that gate each transition on a controlled reason.
  const [lifecycle, setLifecycle] = useState<CustomerLifecycleEvent[]>([]);
  const [lifecycleReadFailed, setLifecycleReadFailed] = useState(false);
  const [openLifecycleCommand, setOpenLifecycleCommand] = useState<{
    id: string;
    action: string;
    stage: string;
    lastError?: string | null;
  } | null>(null);
  const [lifecyclePreview, setLifecyclePreview] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [lifecycleSheet, setLifecycleSheet] = useState<
    "deactivate" | "reactivate" | null
  >(null);
  const [reasonCode, setReasonCode] = useState<string>("");
  const [reasonNote, setReasonNote] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const c = unwrap(await api().models.Customer.get({ id }));
      if (!c) {
        setNotFound(true);
        return;
      }
      setCustomer(c);
      const filter = { customerId: { eq: id } };
      const [pl, jb, ag, rp, amd, inv, gr] = await Promise.all([
        listAll((t) => api().models.ServicePlan.list({ filter, limit: 200, nextToken: t })),
        listAll((t) => api().models.Job.list({ filter, limit: 500, nextToken: t })),
        listAll((t) => api().models.Agreement.list({ filter, limit: 200, nextToken: t })),
        listAll((t) => api().models.ServiceReport.list({ filter, limit: 500, nextToken: t })),
        listAll((t) => api().models.ServiceReportAmendment.list({ filter, limit: 500, nextToken: t })),
        listAll((t) => api().models.Invoice.list({ filter, limit: 500, nextToken: t })),
        listAll((t) => api().models.CustomerGroup.list({ limit: 500, nextToken: t })),
      ]);
      setPlans(pl);
      setJobs(
        jb.sort((a, b) =>
          (b.scheduledDate ?? "9999").localeCompare(a.scheduledDate ?? "9999")
        )
      );
      setAgreements(ag);
      setReports(rp.filter((r) => r.status === "FINALIZED"));
      setAmendments(
        amd.sort((a, b) =>
          (a.issuedAt ?? "").localeCompare(b.issuedAt ?? "")
        )
      );
      setInvoices(
        inv.sort((a, b) =>
          (b.issuedAt ?? "").localeCompare(a.issuedAt ?? "")
        )
      );
      setGroups(gr);
      // The lifecycle ledger is OWNER/OFFICE/FINANCE-readable; load it for those
      // roles so the transition history refreshes after every deactivate/reactivate.
      if (roles.office || roles.finance) {
        const lc = await listCustomerLifecycleEvents(id);
        // GL-09/X1: a read failure is a FAILURE, never an empty timeline.
        setLifecycleReadFailed(lc.readFailed);
        setLifecycle(
          (lc.data ?? [])
            .slice()
            .sort((a, b) =>
              String(b.occurredAt ?? "").localeCompare(String(a.occurredAt ?? ""))
            )
        );
        // GL-09: a non-terminal lifecycle command = "Transition needs recovery".
        const cmds = await listLifecycleCommands(id);
        setOpenLifecycleCommand(
          cmds.find((c) => c.stage !== "COMPLETE" && c.stage !== "FAILED") ?? null
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load customer");
    }
  }, [id, roles.office, roles.finance]);

  useEffect(() => {
    void load();
  }, [load]);

  // Every button-level write on this page goes through `run` below, so the
  // gate lives here once — keyed by button, because these ~17 writes are
  // independent of each other and a plain single-flight would let one in
  // flight silently swallow a press on an unrelated button.
  const perform = useKeyedAction("Action failed");

  // GL-09: the employee confirmation renders the SERVER inventory, computed
  // fresh each time the deactivate sheet opens.
  useEffect(() => {
    if (lifecycleSheet !== "deactivate" || !customer) {
      setLifecyclePreview(null);
      return;
    }
    let stale = false;
    void (async () => {
      try {
        const res = await previewLifecycleTransition({
          customerId: customer.id,
          action: "DEACTIVATE",
          reasonCode,
        });
        const data = opResult<Record<string, unknown>>(res);
        if (!stale) setLifecyclePreview(data ?? null);
      } catch {
        if (!stale) setLifecyclePreview(null);
      }
    })();
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lifecycleSheet, reasonCode, customer?.id]);

  // Payment summary is a live Stripe lookup — load after the record.
  useEffect(() => {
    if (!customer || !roles.office) return;
    api()
      .queries.getPaymentMethodSummary({ customerId: customer.id })
      .then((res) => {
        if (!res.errors?.length) {
          setPm(
            opResult<{ hasPaymentMethod: boolean; label: string | null }>(res)
          );
        }
      })
      .catch(() => undefined);
  }, [customer, roles.office]);

  // Nav-state arrivals, consumed exactly once and then cleared (replace
  // navigation) so a reload or back/forward never replays them:
  // - mergeLoserId (+ nonce) from the lead inbox's duplicate decision opens
  //   the merge sheet with the duplicate prefilled (OWNER-only; anyone else
  //   just lands on the record);
  // - mergedFrom is the landing note after a merge navigated here from the
  //   absorbed side.
  useEffect(() => {
    const st = location.state as {
      mergeLoserId?: string;
      mergeNonce?: string;
      mergeHintAt?: number;
      mergedFrom?: string;
    } | null;
    if (!st || (!st.mergeLoserId && !st.mergedFrom)) return;
    if (roles.loading) return; // wait until we know who this is
    if (st.mergedFrom) {
      setNotice(`Merged ${st.mergedFrom} into this record.`);
    }
    if (st.mergeLoserId && roles.owner) {
      // The nonce (mergeHintAt from the lead inbox) marks this specific
      // handoff: even if the same history entry replays (back/forward cache),
      // the sheet opens only the first time.
      const nonce =
        st.mergeNonce ??
        (st.mergeHintAt != null ? String(st.mergeHintAt) : null);
      const nonceKey = nonce ? `merge-hint-${nonce}` : null;
      const alreadySeen = nonceKey
        ? window.sessionStorage.getItem(nonceKey) !== null
        : false;
      if (!alreadySeen) {
        if (nonceKey) window.sessionStorage.setItem(nonceKey, "1");
        setMergePrefill(st.mergeLoserId);
        setMerging(true);
      }
    }
    navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, roles.loading, roles.owner, navigate]);

  // Mirrors the server's isMidMerge: mergeCounterpartId is the marker set for
  // the whole in-flight command. While it is set, the recovery banner under
  // the page header owns the record.
  const counterpartCustomerId = mergeCounterpartCustomerId(
    customer?.mergeCounterpartId
  );

  // Name the counterpart in the mid-merge banner — the id alone tells the
  // office nothing when both records carry the same customer name.
  useEffect(() => {
    setCounterpartName(null);
    if (!counterpartCustomerId) return;
    let stale = false;
    void (async () => {
      try {
        const row = unwrap(
          await api().models.Customer.get({ id: counterpartCustomerId })
        );
        if (!stale) setCounterpartName(row?.displayName ?? null);
      } catch {
        // The small id line still identifies it.
      }
    })();
    return () => {
      stale = true;
    };
  }, [counterpartCustomerId]);

  // Name the survivor on the tombstone page's "merged into" link.
  const mergedIntoId =
    customer?.status === "MERGED" ? (customer.mergedIntoId ?? null) : null;
  useEffect(() => {
    setMergedIntoName(null);
    if (!mergedIntoId) return;
    let stale = false;
    void (async () => {
      try {
        const row = unwrap(
          await api().models.Customer.get({ id: mergedIntoId })
        );
        if (!stale) setMergedIntoName(row?.displayName ?? null);
      } catch {
        // The generic link text still works.
      }
    })();
    return () => {
      stale = true;
    };
  }, [mergedIntoId]);

  // Resume an unfinished merge from the banner. Its failures render inside
  // the banner card (its own error channel), not the page-top ErrorNote.
  const resumeMerge = useAction(async () => {
    if (!customer) return;
    const counterpartId = mergeCounterpartCustomerId(
      customer.mergeCounterpartId
    );
    // The command blob lives on the LOSER row, and this page may be either
    // side: read our own blob first, then the counterpart's. survivorId +
    // idempotencyKey come from the blob — resuming under a guessed key would
    // fork the command.
    let info = jsonField<MergeStateInfo>(customer.mergeState);
    let loserId = customer.id;
    if ((!info?.idempotencyKey || !info?.survivorId) && counterpartId) {
      const counterpart = unwrap(
        await api().models.Customer.get({ id: counterpartId })
      );
      info = jsonField<MergeStateInfo>(counterpart?.mergeState);
      loserId = counterpartId;
    }
    if (!info?.idempotencyKey || !info?.survivorId) {
      throw new Error(
        "The merge's saved state could not be read. It stays parked and the daily reconcile will resume it — or try again shortly."
      );
    }
    const res = opResult<MergeOutcome>(
      await mergeCustomers({
        action: "RESUME",
        survivorId: info.survivorId,
        loserId,
        idempotencyKey: info.idempotencyKey,
        acknowledgeWarnings: true,
      })
    );
    if (res?.decision === "MERGED") {
      if (res.survivorId === customer.id) {
        setNotice(
          "The merge finished — the duplicate is absorbed into this record."
        );
        await load();
      } else {
        // This page was the absorbed side — follow the survivor, and tell
        // the landing page what just happened.
        navigate(`/customers/${res.survivorId}`, {
          state: { mergedFrom: customer.displayName },
        });
      }
      return;
    }
    if (res?.decision === "PARTIAL") {
      throw new Error(
        `The merge is still unfinished — it stopped while ${mergeStageLabel(
          res.stage
        )}${res.error ? ` (${res.error})` : ""}. It stays parked and is safe to resume again.`
      );
    }
    if (res?.decision === "REFUSED") {
      throw new Error(
        res.blockers.map((b) => b.detail).join(" ") || "The merge was refused."
      );
    }
    throw new Error(
      "The merge returned an unexpected result — reload and try again."
    );
  }, "Could not resume the merge");

  if (notFound) {
    return (
      <Page title="Customer" back="/customers">
        <ErrorNote error="Customer not found" />
      </Page>
    );
  }
  if (!customer) {
    return (
      <Page title="Customer" back="/customers">
        <ErrorNote error={error} />
        <Spinner />
      </Page>
    );
  }

  // A MERGED customer is a tombstone: its visits, plans, invoices, documents,
  // billing, and portal access all live on the survivor now. Nothing here is
  // actionable — the record renders as preserved evidence only, so no action
  // buttons exist on this branch at all.
  if (customer.status === "MERGED") {
    const mergeInfo = jsonField<MergeStateInfo>(customer.mergeState);
    const blanked =
      mergeInfo?.blanked && typeof mergeInfo.blanked === "object"
        ? Object.entries(mergeInfo.blanked)
        : [];
    return (
      <Page title={customer.displayName} back="/customers">
        <Card className="customer-summary-card">
          <div className="inline-actions">
            <StatusBadge status={customer.status} />
          </div>
          <p style={{ marginTop: 10 }}>
            This record was merged into{" "}
            {customer.mergedIntoId ? (
              <button
                type="button"
                className="text-action"
                onClick={() => navigate(`/customers/${customer.mergedIntoId}`)}
              >
                {mergedIntoName ?? "the record it was kept under"}
              </button>
            ) : (
              <span className="muted">
                another record, but the pointer is missing — find the kept
                record by name in Customers
              </span>
            )}
            . Everything linked to it — visits, plans, invoices, documents,
            billing, portal access — lives there now.
          </p>
        </Card>
        <Card title="Original details preserved at merge">
          {blanked.length > 0 ? (
            <dl className="kv">
              {blanked.map(([k, v]) => (
                <Fragment key={k}>
                  <dt>{fieldLabel(k)}</dt>
                  <dd>{fieldValue(v)}</dd>
                </Fragment>
              ))}
            </dl>
          ) : (
            <p className="muted small">
              No snapshot could be read for this record.
            </p>
          )}
        </Card>
      </Page>
    );
  }

  const isLead = customer.status === "LEAD";
  const group = groups.find((g) => g.id === customer.groupId);
  const documentCount = (() => {
    const raw = (customer as { documents?: unknown }).documents;
    let v: unknown = raw;
    if (typeof raw === "string") {
      try {
        v = JSON.parse(raw || "[]");
      } catch {
        v = [];
      }
    }
    return Array.isArray(v) ? v.length : 0;
  })();
  const activePlan = plans.find((p) => p.status === "ACTIVE");
  const upcomingJob = jobs.find(
    (j) => j.status === "SCHEDULED" && (j.scheduledDate ?? "") >= todayEastern()
  );
  const needsAttention =
    customer.status === "ACTIVE" && !activePlan && !upcomingJob;

  const run = async (
    name: string,
    fn: () => Promise<unknown>,
    successMsg?: string
  ) => {
    setError(null);
    await perform.run(name, async () => {
      setNotice(null);
      await fn();
      await load();
      if (successMsg) {
        setNotice(successMsg);
        window.setTimeout(
          () => setNotice((n) => (n === successMsg ? null : n)),
          6000
        );
      }
    });
  };

  const address = [
    customer.serviceStreet,
    customer.serviceCity,
    customer.serviceState,
    customer.serviceZip,
  ]
    .filter(Boolean)
    .join(", ");

  const statusAction =
    customer.status === "LEAD" ? null : roles.finance ? (
      customer.status === "ACTIVE" ? (
        <Button
          small
          variant="danger"
          loading={perform.busyKey === "deactivate"}
          onClick={() => {
            setReasonCode(DEACTIVATION_REASONS[0]);
            setReasonNote("");
            setLifecycleSheet("deactivate");
          }}
        >
          Mark inactive
        </Button>
      ) : (
        <Button
          small
          variant="subtle"
          loading={perform.busyKey === "reactivate"}
          onClick={() => {
            setReasonCode(REACTIVATION_REASONS[0]);
            setReasonNote("");
            setLifecycleSheet("reactivate");
          }}
        >
          Reactivate
        </Button>
      )
    ) : (
      <span
        className="permission-tooltip"
        title={
          customer.status === "ACTIVE"
            ? "Finance or an owner can mark this customer inactive, cancel billing, clear future visits, and end portal access."
            : "Finance or an owner can reactivate this customer."
        }
      >
        <Button small variant="ghost" disabled>
          Finance / owner only
        </Button>
      </span>
    );

  // A finished tombstone took the early return above, so a set marker here
  // means the merge is still in flight or parked.
  const midMerge = Boolean(counterpartCustomerId);

  const mergeAction = midMerge ? null : roles.owner ? (
    <Button small variant="ghost" onClick={() => setMerging(true)}>
      Merge into another customer…
    </Button>
  ) : (
    <span
      className="permission-tooltip"
      title="Only an owner can merge duplicate customer records."
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Button small variant="ghost" disabled>
        Merge into another customer…
      </Button>
      <span className="muted" style={{ fontSize: 11 }}>
        Owner only
      </span>
    </span>
  );

  return (
    <Page
      title={customer.displayName}
      back={isLead ? "/leads" : "/customers"}
      actions={
        roles.office ? (
          <Button small variant="ghost" onClick={() => setSheet("edit")}>
            Edit
          </Button>
        ) : undefined
      }
    >
      <ErrorNote error={error ?? perform.error} />
      <SuccessNote message={notice} />
      {infoNote ? (
        <p className="info-note" role="status">
          {infoNote}
        </p>
      ) : null}

      {/* A mid-merge customer is a third state: other durable commands refuse
          while the marker is set, so the one safe action is resuming the
          merge — under its own saved idempotency key, never a fresh one. It
          renders first, before the summary card, because until it finishes it
          owns everything below it. Resume failures render inside this card. */}
      {midMerge ? (
        <Card>
          <Badge tone="danger">merge needs recovery</Badge>
          <p className="muted small" style={{ marginTop: 8 }}>
            A merge between this record and{" "}
            <strong>{counterpartName ?? "its duplicate"}</strong>{" "}
            <span style={{ fontSize: 11 }}>({counterpartCustomerId})</span>{" "}
            didn't finish. Other changes to either record are refused until it
            does — resume it to continue from the last completed step. Nothing
            is lost while it waits.
          </p>
          <ErrorNote error={resumeMerge.error} />
          <Button
            block
            loading={resumeMerge.busy}
            onClick={() => void resumeMerge.run()}
          >
            Resume merge
          </Button>
        </Card>
      ) : null}

      <Card className="customer-summary-card">
        <div className="customer-summary-status">
          <div className="inline-actions">
            <StatusBadge status={customer.status} />
            {needsAttention ? (
              <Badge tone="warn">no plan or upcoming job</Badge>
            ) : null}
          </div>
          <span className="inline-actions">
            {statusAction}
            {mergeAction}
          </span>
        </div>

        {customer.notes ? (
          <div className="customer-note">
            <Icon name="notes" size={16} />
            <span>{customer.notes}</span>
          </div>
        ) : null}

        <div className="customer-profile-grid">
          {customer.contactName ? (
            <div className="customer-profile-item">
              <Icon name="contact" size={18} />
              <div>
                <span className="customer-profile-label">Contact</span>
                <span className="customer-profile-value">{customer.contactName}</span>
              </div>
            </div>
          ) : null}
          <div className="customer-profile-item">
            <Icon name="email" size={18} />
            <div>
              <span className="customer-profile-label">Email</span>
              {customer.email ? (
                <a className="customer-profile-value" href={`mailto:${customer.email}`}>
                  {customer.email}
                </a>
              ) : (
                <span className="customer-profile-value muted">Not provided</span>
              )}
            </div>
          </div>
          <div className="customer-profile-item">
            <Icon name="phone" size={18} />
            <div>
              <span className="customer-profile-label">Phone</span>
              {customer.phone ? (
                <a className="customer-profile-value" href={`tel:${customer.phone}`}>
                  {customer.phone}
                </a>
              ) : (
                <span className="customer-profile-value muted">Not provided</span>
              )}
            </div>
          </div>
          <div className="customer-profile-item customer-profile-wide">
            <Icon name="address" size={18} />
            <div>
              <span className="customer-profile-label">Service address</span>
              <span className="customer-profile-value">{address || "Not provided"}</span>
            </div>
          </div>
          {customer.leadSource ? (
            <div className="customer-profile-item">
              <Icon name="leads" size={18} />
              <div>
                <span className="customer-profile-label">Source</span>
                <span className="customer-profile-value">{customer.leadSource}</span>
              </div>
            </div>
          ) : null}
          <div className="customer-profile-item">
            <Icon name="group" size={18} />
            <div>
              <span className="customer-profile-label">Group</span>
              <span className="customer-profile-value customer-group-value">
                {group ? (
                  <button
                    type="button"
                    className="text-action"
                    onClick={() => navigate(`/groups/${group.id}`)}
                  >
                    {group.name}
                  </button>
                ) : (
                  <span className="muted">No group assigned</span>
                )}
                {roles.office ? (
                  <button
                    type="button"
                    className="text-action customer-group-action"
                    onClick={() => setSheet("group")}
                  >
                    {group ? "Change" : "Add group"}
                  </button>
                ) : null}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {isLead && roles.office ? (
        <LeadPanel customer={customer} onChanged={() => void load()} />
      ) : null}

      {/* Every quote this customer was given, for the whole life of the record.
          It used to live inside LeadPanel, which is gated on status === LEAD —
          so the history disappeared the moment a lead converted, even though
          the quotes still existed. "What did we quote them?" is asked most
          often after they become a customer. */}
      {roles.office ? <QuoteHistory customer={customer} /> : null}

      {roles.office && !isLead ? (
        <Card
          title="Payment method"
          // While the summary is still loading we know nothing — showing the
          // badge early flashed "missing" at customers who do have a card.
          actions={
            pm === null ? null : (
              <Badge tone={pm.hasPaymentMethod ? "ok" : "warn"}>
                {pm.hasPaymentMethod ? "on file" : "missing"}
              </Badge>
            )
          }
        >
          {/* Only the FACTS wait on the lookup — the actions stay available.
              A failed summary query leaves pm null forever, so gating the
              buttons on it would strip staff of "Collect now" entirely. */}
          {pm === null ? (
            <p className="muted small" style={{ marginBottom: 10 }}>
              Checking…
            </p>
          ) : (
            <p style={{ marginBottom: 10 }}>
              {pm.hasPaymentMethod ? pm.label : "No payment method saved — collect before the first treatment."}
            </p>
          )}
          <div className="row-split">
            <Button small variant="subtle" onClick={() => setSheet("collect")}>
              {pm === null
                ? "Collect / update"
                : pm.hasPaymentMethod
                  ? "Update card / bank"
                  : "Collect now"}
            </Button>
            <Button
              small
              variant="ghost"
              loading={perform.busyKey === "payreq"}
              disabled={!customer.email}
              onClick={() =>
                void run(
                  "payreq",
                  async () =>
                    unwrap(
                      await api().mutations.sendCustomerEmail({
                        customerId: customer.id,
                        kind: "payment-request",
                        idempotencyKey: clientActionId("payment-request"),
                      })
                    ),
                  `Payment request emailed to ${customer.email}`
                )
              }
            >
              Email request
            </Button>
          </div>
          {/* Two buttons, not one screen with a toggle. Taking money and
              writing down that money arrived are different acts, and the only
              thing that used to separate them was which half of a segmented
              control was lit. Both are finance work: office staff collect the
              card but never take payment. */}
          {roles.finance ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button small variant="ghost" onClick={() => setSheet("charge")}>
                Charge the card
              </Button>
              <Button small variant="ghost" onClick={() => setSheet("record")}>
                Record a payment
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}

      {roles.office && !isLead ? (
        <Card
          title="Portal access"
          actions={
            customer.portalLastLoginAt ? (
              <Badge tone="ok">active</Badge>
            ) : customer.portalUserSub ? (
              <Badge tone="info">invited</Badge>
            ) : (
              <Badge tone="muted">not invited</Badge>
            )
          }
        >
          <div className="portal-access-line">
            <p className="muted small">
              {customer.portalLastLoginAt
                ? `Last signed in ${fmtDateTime(customer.portalLastLoginAt)}.`
                : customer.portalUserSub
                  ? `Invited${customer.portalInvitedAt ? ` ${fmtDate(customer.portalInvitedAt, true)}` : ""} — hasn't signed in yet.`
                  : "Not invited yet."}
            </p>
            <div className="inline-actions">
              {roles.owner ? (
                <span
                  className="permission-tooltip"
                  title={!customer.email ? "Add an email address first." : undefined}
                >
                  <Button
                    small
                    variant="subtle"
                    disabled={!customer.email}
                    loading={perform.busyKey === "invite"}
                    onClick={() =>
                      void run(
                        "invite",
                        async () =>
                          unwrap(
                            await api().mutations.adminCreateUser({
                              email: customer.email!,
                              name: customer.contactName ?? customer.displayName,
                              roles: ["CUSTOMER"],
                              customerId: customer.id,
                              resend: Boolean(customer.portalUserSub),
                            })
                          ),
                        `Portal invite sent to ${customer.email}`
                      )
                    }
                  >
                    {customer.portalUserSub ? "Resend invite" : "Invite to portal"}
                  </Button>
                </span>
              ) : !customer.portalUserSub ? (
                <span
                  className="permission-tooltip"
                  title="Portal invitations are owner-only. Ask an owner to invite this customer."
                >
                  <Button small variant="ghost" disabled>
                    Invite to portal
                  </Button>
                </span>
              ) : null}
              {customer.portalUserSub ? (
                <Button
                  small
                  variant="ghost"
                  loading={perform.busyKey === "remind"}
                  onClick={() =>
                    void run(
                      "remind",
                      async () =>
                        unwrap(
                          await api().mutations.sendCustomerEmail({
                            customerId: customer.id,
                            kind: "portal-reminder",
                            idempotencyKey: clientActionId("portal-reminder"),
                          })
                        ),
                      `Portal link emailed to ${customer.email}`
                    )
                  }
                >
                  Send portal link
                </Button>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      {/* Plans are born in one place only: the online booking's payment
          webhook. No "+ Plan" here — a hand-typed price can never enter a
          subscription, because there is no path for one. */}
      <Card title="Service plans">
        {plans.length === 0 ? (
          <p className="muted small">
            {isLead
              ? "No service plans — the plan is created when the lead books and pays online."
              : "No service plans."}
          </p>
        ) : (
          plans.map((p) => (
            <ListRow
              key={p.id}
              title={p.planName}
              subtitle={planCadence(p.priceCents, p.serviceFrequency, p.seasonal)}
              meta={
                <>
                  {p.cancellationPending ? (
                    <Badge tone="warn">canceling</Badge>
                  ) : (
                    <StatusBadge status={p.status} />
                  )}
                  {roles.finance && p.status === "ACTIVE" ? (
                    <>
                      {p.stripeSubscriptionId ? (
                        <Button
                          small
                          variant="danger"
                          loading={perform.busyKey === `cancel-${p.id}`}
                          onClick={() => {
                            if (!window.confirm("Cancel this plan's billing?")) return;
                            void run(`cancel-${p.id}`, async () =>
                              unwrap(
                                await api().mutations.cancelSubscription({
                                  servicePlanId: p.id,
                                })
                              )
                            );
                          }}
                        >
                          Cancel
                        </Button>
                      ) : (
                        <Button
                          small
                          variant="subtle"
                          loading={perform.busyKey === `start-${p.id}`}
                          onClick={() => {
                            // Begins charging a card every month, indefinitely.
                            // Completion starts billing on its own now, so
                            // reaching for this by hand means something went
                            // wrong — worth a sentence before it starts.
                            if (
                              !window.confirm(
                                startBillingConfirmText(customer.displayName, p)
                              )
                            ) {
                              return;
                            }
                            void run(
                              `start-${p.id}`,
                              async () =>
                                unwrap(
                                  await api().mutations.startSubscription({
                                    servicePlanId: p.id,
                                  })
                                ),
                              `Billing started — ${money(p.priceCents)} every month`
                            );
                          }}
                        >
                          Start billing
                        </Button>
                      )}
                      <Button
                        small
                        variant="ghost"
                        loading={perform.busyKey === `pause-${p.id}`}
                        onClick={() => {
                          if (!window.confirm("Deactivate this plan? Billing pauses and no new visits are scheduled.")) return;
                          void run(`pause-${p.id}`, async () =>
                            unwrap(
                              await api().mutations.pausePlan({
                                servicePlanId: p.id,
                              })
                            )
                          );
                        }}
                      >
                        Deactivate
                      </Button>
                    </>
                  ) : null}
                  {roles.finance && p.status === "PAUSED" ? (
                    <Button
                      small
                      variant="subtle"
                      loading={perform.busyKey === `resume-${p.id}`}
                      onClick={() =>
                        void run(`resume-${p.id}`, async () =>
                          unwrap(
                            await api().mutations.resumePlan({
                              servicePlanId: p.id,
                            })
                          )
                        )
                      }
                    >
                      Reactivate
                    </Button>
                  ) : null}
                </>
              }
            />
          ))
        )}
      </Card>

      {/* Job creation is for ACTIVE customers only. A lead with an
          office-created job would be a payment-less conversion side door —
          leads get a job when they book and pay online, not before. */}
      <Card
        title="Jobs"
        actions={
          roles.office && customer.status === "ACTIVE" ? (
            <Button small variant="subtle" onClick={() => setSheet("job")}>
              {activePlan && !upcomingJob ? "Schedule visit" : "+ Job"}
            </Button>
          ) : undefined
        }
      >
        {activePlan && !upcomingJob && roles.office && customer.status === "ACTIVE" ? (
          <div className="attention-note" style={{ marginBottom: 8 }}>
            <Badge tone="warn">schedule needed</Badge>
            <span>Plan is active but nothing is on the schedule.</span>
          </div>
        ) : null}
        {jobs.length === 0 ? (
          <p className="muted small">
            {isLead
              ? "No jobs — the first visit is scheduled when the lead books and pays online."
              : "No jobs yet."}
          </p>
        ) : (
          (() => {
            const renderJob = (j: Job) => {
              const report = reports.find((r) => r.jobId === j.id);
              // FAILED may be retried and VOID was withdrawn — neither speaks
              // for the job, so neither hides the Charge button. Mirrors the
              // server's covering rule in chargeOneTimeJob.
              const invoice = invoices.find(
                (inv) =>
                  inv.jobId === j.id &&
                  inv.status !== "FAILED" &&
                  inv.status !== "VOID"
              );
              const reschedulable =
                roles.office &&
                (j.status === "SCHEDULED" || j.status === "UNSCHEDULED");
              // GL-12: the dispatch packet is editable while the visit is live
              // (not yet a closed record). Same statuses the server allows.
              const packetEditable =
                roles.office &&
                (j.status === "SCHEDULED" ||
                  j.status === "UNSCHEDULED" ||
                  j.status === "IN_PROGRESS");
              return (
                <ListRow
                  key={j.id}
                  className="customer-job-row"
                  title={j.serviceType}
                  subtitle={
                    <>
                      {`${j.scheduledDate ? fmtDate(j.scheduledDate, true) : "unscheduled"}${j.priceCents ? ` · ${money(j.priceCents)}` : ""}`}
                      {j.status === "COMPLETED" ? (
                        <span className="nested-line">
                          {report?.pdfKey ? (
                            <>
                              report <DocButton docKey={report.pdfKey} label="view" />
                            </>
                          ) : (
                            "report pending"
                          )}
                          {invoice
                            ? ` · invoice ${invoice.status?.toLowerCase()}`
                            : ""}
                        </span>
                      ) : null}
                      {/* GL-15: the no-access evidence (reason + door photo) is
                          retrievable here, not through engineering. */}
                      {j.status === "NO_ACCESS" ? (
                        <span className="nested-line">
                          {j.noAccessReason
                            ? `no access: ${String(j.noAccessReason).replace(/_/g, " ").toLowerCase()}`
                            : "no access"}
                          {j.noAccessPhotoKey ? (
                            <>
                              {" "}
                              <DocButton
                                docKey={j.noAccessPhotoKey}
                                label="door photo"
                              />
                            </>
                          ) : null}
                        </span>
                      ) : null}
                    </>
                  }
                  meta={
                    <span className="customer-job-meta">
                      <StatusBadge status={j.status} />
                      {/* Paid online at booking. Shown on every status so the
                          row never looks chargeable to someone scanning it. */}
                      {j.paidAt ? (
                        <Badge tone="ok">
                          paid {j.priceCents ? money(j.priceCents) : ""} online
                        </Badge>
                      ) : null}
                      {/* GL-06: a pending bank debit is a real, dispatchable
                          visit — every screen says "Payment pending", never
                          paid and never chargeable. */}
                      {!j.paidAt && j.paymentPendingIntentId ? (
                        <Badge tone="warn">
                          payment pending
                          {j.priceCents ? ` ${money(j.priceCents)}` : ""} (bank)
                        </Badge>
                      ) : null}
                      {/* Office completion is for defined administrative job
                          types only. Field/pesticide work is completed by the
                          technician's finalized report — the legal application
                          record — so it never gets an office "Complete" button;
                          the server refuses it too. */}
                      {roles.office &&
                      (j.status === "SCHEDULED" || j.status === "IN_PROGRESS") &&
                      isOfficeCompletableServiceType(j.serviceType) ? (
                        <Button
                          small
                          variant="ghost"
                          loading={perform.busyKey === `complete-${j.id}`}
                          onClick={() => {
                            // Completing a recurring job may start the plan's
                            // monthly billing server-side. When it will, the
                            // confirm says so — in the Start-billing button's
                            // words, since it moves the same money.
                            if (
                              !window.confirm(
                                completeJobConfirmText(customer.displayName, j, plans)
                              )
                            ) {
                              return;
                            }
                            void run(`complete-${j.id}`, async () =>
                              unwrap(
                                await api().mutations.completeJob({ jobId: j.id })
                              )
                            );
                          }}
                        >
                          ✓ Complete
                        </Button>
                      ) : null}
                      {roles.finance &&
                      j.type === "ONE_TIME" &&
                      j.status === "COMPLETED" &&
                      j.priceCents &&
                      !j.paidAt &&
                      !invoice ? (
                        <Button
                          small
                          variant="subtle"
                          loading={perform.busyKey === `charge-${j.id}`}
                          onClick={() => {
                            // The amount is the job's own price, so there is no
                            // typo to catch here — but it is still a live card
                            // charge from a list someone is scanning.
                            if (
                              !window.confirm(
                                `Charge ${customer.displayName} ${money(j.priceCents ?? 0)} for ${j.serviceType}?\n\n${amountInWords(j.priceCents ?? 0)}${pm?.label ? ` — on ${pm.label}` : ""}.\n\nThis takes the money now. It can be refunded, but not undone.`
                              )
                            ) {
                              return;
                            }
                            void run(`charge-${j.id}`, async () => {
                              // chargeOneTimeJob returns a.json() → read the
                              // real status. A bank (ACH) debit comes back
                              // "processing": the money is NOT collected yet, so
                              // don't claim it was charged.
                              const res = opResult<{ status?: string }>(
                                await api().mutations.chargeOneTimeJob({ jobId: j.id })
                              );
                              const collected =
                                res?.status === "succeeded" || res?.status === "PAID";
                              setNotice(
                                collected
                                  ? `Charged ${money(j.priceCents ?? 0)} for ${j.serviceType}.`
                                  : `Bank payment for ${money(j.priceCents ?? 0)} is processing — it'll show as paid once it settles (a few business days), or we'll flag it if it fails.`
                              );
                            });
                          }}
                        >
                          Charge {money(j.priceCents)}
                        </Button>
                      ) : null}
                      {reschedulable ? (
                        <>
                          <Button
                            small
                            variant="ghost"
                            onClick={() => setRescheduling(j)}
                          >
                            {j.scheduledDate ? "Reschedule" : "Schedule"}
                          </Button>
                          <Button
                            small
                            variant="danger"
                            onClick={() => setCancelingJob(j)}
                          >
                            Cancel visit
                          </Button>
                        </>
                      ) : null}
                      {packetEditable ? (
                        <Button
                          small
                          variant="ghost"
                          onClick={() => setPacketing(j)}
                        >
                          Packet
                        </Button>
                      ) : null}
                    </span>
                  }
                />
              );
            };
            const planned = plans.filter((p) =>
              jobs.some((j) => j.servicePlanId === p.id)
            );
            const oneTime = jobs.filter((j) => !j.servicePlanId);
            return (
              <>
                {planned.map((p) => (
                  <div key={p.id} className="job-group">
                    <p className="group-label">{p.planName}</p>
                    {jobs
                      .filter((j) => j.servicePlanId === p.id)
                      .slice(0, 6)
                      .map(renderJob)}
                  </div>
                ))}
                {oneTime.length ? (
                  <div className="job-group">
                    {planned.length ? (
                      <p className="group-label">One-time jobs</p>
                    ) : null}
                    {oneTime.slice(0, 8).map(renderJob)}
                  </div>
                ) : null}
              </>
            );
          })()
        )}
      </Card>

      {/* Low-activity records share one compact area. Empty sections are one
          summary row instead of permanent full-height cards; every record is
          still available on demand. */}
      <Card title="Records & history" className="records-card">
        <RecordSection
          title="Agreements"
          count={agreements.length}
          defaultOpen={agreements.length > 0}
        >
          {agreements.length === 0 ? (
            <p className="muted small records-empty">No agreements.</p>
          ) : (
            agreements.map((a) => (
              <ListRow
                key={a.id}
                title={a.title}
                subtitle={
                  a.signedAt
                    ? `Accepted by ${a.signerName} · ${fmtDateTime(a.signedAt)}`
                    : undefined
                }
                meta={
                  <>
                    <StatusBadge status={a.status} />
                    {a.pdfKey ? <DocButton docKey={a.pdfKey} /> : null}
                  </>
                }
              />
            ))
          )}
        </RecordSection>

        <RecordSection
          title="Documents"
          count={documentCount}
          defaultOpen={documentCount > 0}
        >
          <CustomerDocuments customer={customer} onChanged={() => load()} />
        </RecordSection>

        <RecordSection
          title="Service reports"
          count={reports.length}
          defaultOpen={reports.length > 0}
        >
        {reports.length === 0 ? (
          <p className="muted small records-empty">No completed service reports.</p>
        ) : (
          reports.map((r) => {
            const reportAmendments = amendments.filter(
              (a) => a.originalReportId === r.id
            );
            const undelivered =
              r.deliveryStatus === "BOUNCED" ||
              r.deliveryStatus === "COMPLAINED" ||
              r.deliveryStatus === "FAILED" ||
              r.deliveryStatus === "SUPPRESSED" ||
              r.deliveryStatus === "NO_EMAIL";
            return (
              <div key={r.id}>
                <ListRow
                  title={fmtDate(r.serviceDate, true)}
                  subtitle={r.servicesPerformed ?? undefined}
                  meta={
                    <>
                      <DeliveryBadge
                        status={r.deliveryStatus}
                        emailedAt={r.emailedAt}
                      />
                      {r.pdfKey ? <DocButton docKey={r.pdfKey} /> : null}
                      {roles.office ? (
                        <Button
                          small
                          variant="ghost"
                          onClick={() => setAmending(r)}
                        >
                          Issue amendment
                        </Button>
                      ) : null}
                    </>
                  }
                />
                {/* GL-15: the photos and evidence behind the legal record are
                    retrievable here, not through engineering. */}
                {(r.photoKeys ?? []).filter(Boolean).length > 0 ? (
                  <div style={{ marginLeft: 16, marginBottom: 4 }}>
                    <span className="muted small">
                      {(r.photoKeys ?? []).filter(Boolean).length} photo
                      {(r.photoKeys ?? []).filter(Boolean).length === 1 ? "" : "s"}
                      :
                    </span>{" "}
                    {(r.photoKeys ?? [])
                      .filter((k): k is string => Boolean(k))
                      .map((k, i) => (
                        <DocButton key={k} docKey={k} label={`photo ${i + 1}`} />
                      ))}
                  </div>
                ) : null}
                {undelivered && roles.office ? (
                  <div style={{ marginLeft: 16, marginBottom: 8 }}>
                    <ReportDeliveryRecovery
                      reportId={r.id}
                      onDone={load}
                    />
                  </div>
                ) : null}
                {reportAmendments.map((a) => (
                  <div key={a.id} style={{ marginLeft: 16 }}>
                    <ListRow
                      title={`Amendment — ${fmtDate(a.issuedAt ?? "", true)}`}
                      subtitle={a.reason ?? undefined}
                      meta={
                        <>
                          <DeliveryBadge
                            status={a.deliveryStatus}
                            emailedAt={a.emailedAt}
                          />
                          {a.pdfKey ? <DocButton docKey={a.pdfKey} /> : null}
                        </>
                      }
                    />
                  </div>
                ))}
              </div>
            );
          })
        )}
        </RecordSection>

        <RecordSection
          title="Lifecycle history"
          count={lifecycle.length}
          defaultOpen={lifecycleReadFailed}
        >
          {lifecycleReadFailed ? (
            <p className="small records-read-error">
              Some history could not be read. Try again before relying on this
              list.
            </p>
          ) : null}
          {lifecycle.length === 0 && !lifecycleReadFailed ? (
            <p className="muted small records-empty">No lifecycle changes.</p>
          ) : null}
          {lifecycle.map((e) => {
            const groupSummary =
              e.action === "GROUP_CHANGE"
                ? groupChangeSummary(e.effects, groups)
                : null;
            const statusSummary =
              e.priorStatus && e.newStatus
                ? `${reasonLabel(e.priorStatus)} → ${reasonLabel(e.newStatus)}`
                : null;
            const technicalReason = isTechnicalLifecycleReason(e.reason);
            return (
              <ListRow
                key={e.id}
                title={lifecycleActionTitle(e.action)}
                subtitle={
                  <span>
                    {groupSummary ? (
                      <span className="nested-line lifecycle-summary">
                        {groupSummary}
                      </span>
                    ) : null}
                    {statusSummary ? (
                      <span className="nested-line lifecycle-summary">
                        Status: {statusSummary}
                      </span>
                    ) : null}
                    Reason:{" "}
                    {technicalReason
                      ? "System verification"
                      : lifecycleReasonSummary(e.reason)}
                    {e.actorEmail ? ` · by ${e.actorEmail}` : ""}
                    {e.effects || technicalReason ? (
                      <details className="history-technical-detail">
                        <summary>Technical details</summary>
                        {technicalReason ? (
                          <span>Recorded reason: {e.reason}</span>
                        ) : null}
                        {e.effects ? (
                          <span>Recorded change: {e.effects}</span>
                        ) : null}
                      </details>
                    ) : null}
                  </span>
                }
                meta={
                  <span className="muted small">
                    {e.occurredAt ? fmtDateTime(e.occurredAt) : ""}
                  </span>
                }
              />
            );
          })}
        </RecordSection>
      </Card>

      {roles.office ? (
        <Card title="Invoices">
          {invoices.length === 0 ? (
            <p className="muted small">No invoices yet.</p>
          ) : (
            invoices.slice(0, 10).map((inv) => {
              const job = inv.jobId ? jobs.find((j) => j.id === inv.jobId) : null;
              const plan = inv.servicePlanId
                ? plans.find((p) => p.id === inv.servicePlanId)
                : null;
              const source = job
                ? `${job.serviceType}${job.scheduledDate ? ` (${fmtDate(job.scheduledDate, true)})` : ""}`
                : plan
                  ? plan.planName
                  : null;
              const refundedCents = inv.refundedAmountCents ?? 0;
              const refundable = Math.max(0, inv.amountCents - refundedCents);
              const canRefund =
                roles.finance &&
                (inv.status === "PAID" || inv.status === "REFUNDED") &&
                refundable > 0;
              // Money that moved gets refunded; an invoice that should never
              // have existed gets voided. There is no third option and no delete.
              const canVoid =
                roles.finance && (inv.status === "OPEN" || inv.status === "FAILED");
              // Recovery: an OPEN/FAILED invoice is a bill still owed. Finance
              // can settle it (mark an offline payment, or charge the card);
              // office can email the customer a link to pay it.
              const owed = inv.status === "OPEN" || inv.status === "FAILED";
              const today = todayEastern();
              const overdue = isOverdue(inv, today);
              const daysLate = daysPastDue(inv, today);
              const canSettle = roles.finance && owed;
              const canSendLink = roles.office && owed && Boolean(customer.email);
              return (
                <ListRow
                  key={inv.id}
                  title={money(inv.amountCents)}
                  subtitle={
                    <>
                      {`${inv.description} · ${fmtDate(inv.issuedAt, true)}`}
                      {source ? (
                        <span className="nested-line">for {source}</span>
                      ) : null}
                      {owed && inv.dueDate ? (
                        <span className="nested-line">
                          {overdue
                            ? `Due ${fmtDate(inv.dueDate, true)} · ${daysLate} day${daysLate === 1 ? "" : "s"} overdue`
                            : `Due ${fmtDate(inv.dueDate, true)}`}
                          {inv.poNumber ? ` · PO ${inv.poNumber}` : ""}
                        </span>
                      ) : null}
                      {inv.status === "FAILED" ? (
                        <span className="nested-line">
                          {dunningStateLabel(inv, today)}
                          {inv.failureReason ? ` — ${inv.failureReason}` : ""}
                        </span>
                      ) : null}
                      {refundedCents > 0 ? (
                        <span className="nested-line">
                          {money(refundedCents)} refunded
                          {inv.refundReason ? ` — ${inv.refundReason}` : ""}
                        </span>
                      ) : null}
                      {inv.status === "VOID" && inv.voidReason ? (
                        <span className="nested-line">
                          voided — {inv.voidReason}
                        </span>
                      ) : null}
                    </>
                  }
                  meta={
                    <>
                      {overdue ? <Badge tone="danger">overdue</Badge> : null}
                      <StatusBadge status={inv.status} />
                      {/* Cash/cheque money: settled says it was received;
                          deposited says it reached the bank. The dashboard's
                          "Awaiting bank deposit" queue is where it's marked. */}
                      {isManualSettled(inv) ? (
                        inv.depositedAt ? (
                          <Badge tone="ok">deposited</Badge>
                        ) : (
                          <Badge tone="warn">awaiting deposit</Badge>
                        )
                      ) : null}
                      {canSettle ? (
                        <Button
                          small
                          variant="subtle"
                          onClick={() => setSettling(inv)}
                        >
                          Mark paid
                        </Button>
                      ) : null}
                      {canSettle && pm?.hasPaymentMethod ? (
                        <Button
                          small
                          variant="ghost"
                          loading={perform.busyKey === `settle-${inv.id}`}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Charge ${customer.displayName} ${money(inv.amountCents)} on ${pm?.label ?? "the card on file"} to settle this invoice?\n\n${amountInWords(inv.amountCents)}.\n\nThis takes the money now. It can be refunded, but not undone.`
                              )
                            ) {
                              return;
                            }
                            void run(
                              `settle-${inv.id}`,
                              async () => {
                                const res = opResult<{
                                  status?: string;
                                  failureReason?: string;
                                }>(
                                  await settleInvoice({
                                    invoiceId: inv.id,
                                    method: "CARD",
                                  })
                                );
                                // A decline comes back as FAILED, not thrown —
                                // don't let it read as a settled invoice.
                                if (res?.status === "FAILED") {
                                  throw new Error(
                                    res?.failureReason
                                      ? `The card was declined — ${res.failureReason}. The invoice is still unpaid.`
                                      : "The card was declined. The invoice is still unpaid."
                                  );
                                }
                              },
                              `Charged ${money(inv.amountCents)} — invoice settled`
                            );
                          }}
                        >
                          Charge card
                        </Button>
                      ) : null}
                      {canSendLink ? (
                        <Button
                          small
                          variant="ghost"
                          loading={perform.busyKey === `link-${inv.id}`}
                          onClick={() =>
                            void run(
                              `link-${inv.id}`,
                              async () =>
                                unwrap(
                                  await sendInvoicePaymentLink({
                                    customerId: customer.id,
                                    invoiceId: inv.id,
                                  })
                                ),
                              `Payment link emailed to ${customer.email}`
                            )
                          }
                        >
                          Send link
                        </Button>
                      ) : null}
                      {canRefund ? (
                        <Button
                          small
                          variant="ghost"
                          onClick={() => setRefunding(inv)}
                        >
                          Refund
                        </Button>
                      ) : null}
                      {canVoid ? (
                        <Button
                          small
                          variant="ghost"
                          loading={perform.busyKey === `void-${inv.id}`}
                          onClick={() => {
                            const reason = window.prompt(
                              `Void this ${money(inv.amountCents)} invoice? It stays on the record as voided, with your name and this reason.\n\nWhy is it being voided?`
                            );
                            if (!reason?.trim()) return;
                            void run(
                              `void-${inv.id}`,
                              async () =>
                                unwrap(
                                  await api().mutations.voidInvoice({
                                    invoiceId: inv.id,
                                    reason: reason.trim(),
                                  })
                                ),
                              `Voided the ${money(inv.amountCents)} invoice`
                            );
                          }}
                        >
                          Void
                        </Button>
                      ) : null}
                    </>
                  }
                />
              );
            })
          )}
        </Card>
      ) : null}

      {/* GL-09: a customer mid-transition is a THIRD state, not active or
          inactive — the next employee sees one safe resume action. */}
      {openLifecycleCommand ? (
        <Card>
          <Badge tone="danger">transition needs recovery</Badge>
          <p className="muted small" style={{ marginTop: 8 }}>
            A {openLifecycleCommand.action.toLowerCase()} of this customer
            stopped at {openLifecycleCommand.stage.replace(/_/g, " ").toLowerCase()}
            {openLifecycleCommand.lastError
              ? ` (${openLifecycleCommand.lastError})`
              : ""}
            . Billing, schedule, access, status, or the customer notice may be
            part-done — treat this customer as neither fully active nor fully
            inactive until it is resumed.
          </p>
          <Button
            block
            loading={perform.busyKey === "resume-lifecycle"}
            onClick={() => {
              const cmd = openLifecycleCommand;
              void run("resume-lifecycle", async () => {
                // Resume = re-run the same idempotent transition under the SAME
                // command key, so it continues from the last confirmed step.
                const res = opResult<{ partial?: boolean; message?: string }>(
                  cmd.action === "DEACTIVATE"
                    ? await api().mutations.deactivateCustomer({
                        customerId: customer.id,
                        reasonCode: "OTHER",
                        note: "Resuming an unfinished transition",
                        idempotencyKey: cmd.id,
                      })
                    : await api().mutations.reactivateCustomer({
                        customerId: customer.id,
                        reasonCode: "OTHER",
                        note: "Resuming an unfinished transition",
                        idempotencyKey: cmd.id,
                      })
                );
                if (res?.partial) {
                  throw new Error(
                    res.message ??
                      "The transition still could not fully finish — it stays owned and is safe to retry."
                  );
                }
                setNotice("The unfinished transition was completed.");
              });
            }}
          >
            Resume {openLifecycleCommand.action.toLowerCase()}
          </Button>
        </Card>
      ) : null}

      {/* ---------- Sheets ---------- */}

      {/* GL-09 — deactivation is one server action gated on a controlled reason.
          The button opens this sheet; confirming fires the single
          deactivateCustomer mutation (money + schedule + portal + status), and a
          partial result is surfaced truthfully instead of claimed as done. */}
      <Sheet
        open={lifecycleSheet === "deactivate"}
        onClose={() => setLifecycleSheet(null)}
        title={`Deactivate ${customer.displayName}`}
      >
        <div className="form-grid">
          {lifecyclePreview ? (
            (() => {
              const p = lifecyclePreview as {
                willStop?: { plans: number; futureVisits: number; portalLogin: boolean };
                needsDecision?: {
                  paidVisits: { id: string; scheduledDate: string | null }[];
                  inProgressVisits: { id: string }[];
                };
                outstandingBalanceCents?: number;
                balanceHandling?: string;
                notice?: { subject: string } | null;
                readFailures?: string[];
              };
              return (
                <div className="muted small" style={{ display: "grid", gap: 4 }}>
                  <div>
                    <strong>Will stop:</strong> {p.willStop?.plans ?? 0} plan(s)
                    billing, {p.willStop?.futureVisits ?? 0} upcoming visit(s)
                    {p.willStop?.portalLogin ? ", and the portal login" : ""}.
                  </div>
                  {(p.needsDecision?.paidVisits.length ?? 0) > 0 ||
                  (p.needsDecision?.inProgressVisits.length ?? 0) > 0 ? (
                    <div>
                      <strong>Needs a decision (owned, 1 business day):</strong>{" "}
                      {p.needsDecision?.paidVisits.length ?? 0} paid visit(s) and{" "}
                      {p.needsDecision?.inProgressVisits.length ?? 0} in-progress
                      visit(s) — each gets its own owned honor/refund/finish case.
                    </div>
                  ) : null}
                  <div>
                    <strong>Money:</strong>{" "}
                    {(p.outstandingBalanceCents ?? 0) > 0
                      ? `${money(p.outstandingBalanceCents ?? 0)} still owed — ${String(p.balanceHandling ?? "").toLowerCase().replace(/_/g, " ")}; nothing is auto-charged.`
                      : "no outstanding balance; nothing is charged."}
                  </div>
                  <div>
                    <strong>Customer notice:</strong>{" "}
                    {p.notice ? `"${p.notice.subject}" will be sent.` : "none for this reason."}
                  </div>
                  {(p.readFailures?.length ?? 0) > 0 ? (
                    <div style={{ color: "var(--danger, #b00)" }}>
                      Some records could not be read ({p.readFailures!.join(", ")}) —
                      this preview may be incomplete.
                    </div>
                  ) : null}
                </div>
              );
            })()
          ) : (
            <p className="muted small" style={{ margin: 0 }}>
              {deactivateConfirmText(customer.displayName, {
                activePlanCount: plans.filter((p) => p.status === "ACTIVE").length,
                upcomingVisits: jobs.filter(
                  (j) =>
                    (j.status === "SCHEDULED" || j.status === "UNSCHEDULED") &&
                    !j.paidAt
                ).length,
                hasPortal: !!customer.portalUserSub,
              })}
            </p>
          )}
          <Field
            label="Reason"
            hint="A controlled reason is recorded with your name and the time in the lifecycle history."
          >
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              {DEACTIVATION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {reasonLabel(r)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note" hint="Required when the reason is 'Other'.">
            <input
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Optional context"
            />
          </Field>
          <Button
            block
            variant="danger"
            loading={perform.busyKey === "deactivate"}
            disabled={reasonCode === "OTHER" && !reasonNote.trim()}
            onClick={() => {
              if (reasonCode === "OTHER" && !reasonNote.trim()) return;
              const rc = reasonCode;
              const note = reasonNote.trim() || null;
              setLifecycleSheet(null);
              void run("deactivate", async () => {
                const res = opResult<{
                  jobsCanceled: number;
                  outstandingBalanceCents: number;
                  portalRevoked: boolean;
                  partial: boolean;
                  message?: string;
                }>(
                  await api().mutations.deactivateCustomer({
                    customerId: customer.id,
                    reasonCode: rc,
                    note,
                  })
                );
                // A step didn't finish (a plan still billing, the portal login
                // still live, or the status write didn't stick): the customer is
                // still ACTIVE on purpose, the office was paged, and an owned
                // recovery is open. Surface the truth instead of claiming success.
                if (res?.partial) {
                  throw new Error(
                    res.message ??
                      "The deactivation could not be finished, so the customer is still active. The office has been notified — it's owned and safe to retry."
                  );
                }
                const bal = res?.outstandingBalanceCents ?? 0;
                setNotice(
                  `${customer.displayName} deactivated — billing stopped, ${
                    res?.jobsCanceled ?? 0
                  } upcoming visit(s) canceled${
                    res?.portalRevoked ? ", portal login ended" : ""
                  }.${
                    bal > 0
                      ? ` Outstanding balance of ${money(
                          bal
                        )} is NOT charged — settle it separately.`
                      : ""
                  }`
                );
                window.setTimeout(
                  () =>
                    setNotice((n) =>
                      n && n.startsWith(customer.displayName) ? null : n
                    ),
                  12000
                );
              });
            }}
          >
            Deactivate customer
          </Button>
        </div>
      </Sheet>

      {/* GL-09 — reactivation is one server action (restores the login first,
          then flips ACTIVE, then records the transition), also gated on a reason. */}
      <Sheet
        open={lifecycleSheet === "reactivate"}
        onClose={() => setLifecycleSheet(null)}
        title={`Reactivate ${customer.displayName}`}
      >
        <div className="form-grid">
          <p className="muted small" style={{ margin: 0 }}>
            Restores their portal login and marks them active again. Canceled
            plans stay canceled — a reactivated customer re-subscribes through a
            new booking.
          </p>
          <Field
            label="Reason"
            hint="A controlled reason is recorded with your name and the time in the lifecycle history."
          >
            <select
              value={reasonCode}
              onChange={(e) => setReasonCode(e.target.value)}
            >
              {REACTIVATION_REASONS.map((r) => (
                <option key={r} value={r}>
                  {reasonLabel(r)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Note" hint="Required when the reason is 'Other'.">
            <input
              value={reasonNote}
              onChange={(e) => setReasonNote(e.target.value)}
              placeholder="Optional context"
            />
          </Field>
          <Button
            block
            variant="subtle"
            loading={perform.busyKey === "reactivate"}
            disabled={reasonCode === "OTHER" && !reasonNote.trim()}
            onClick={() => {
              if (reasonCode === "OTHER" && !reasonNote.trim()) return;
              const rc = reasonCode;
              const note = reasonNote.trim() || null;
              setLifecycleSheet(null);
              void run("reactivate", async () => {
                // GL-09: the completion words come from the PERSISTED result —
                // never an unconditional success over a partial/in-progress
                // server outcome.
                const res = opResult<{
                  reactivated?: boolean;
                  alreadyActive?: boolean;
                  partial?: boolean;
                  inProgress?: boolean;
                  audited?: boolean;
                  state?: string;
                  message?: string;
                }>(
                  await api().mutations.reactivateCustomer({
                    customerId: customer.id,
                    reasonCode: rc,
                    note,
                  })
                );
                if (res?.inProgress) {
                  throw new Error(
                    res.message ??
                      "A transition is already in progress for this customer — refresh in a moment for its outcome."
                  );
                }
                if (res?.partial || res?.state === "NEEDS_RECOVERY") {
                  throw new Error(
                    res.message ??
                      "The reactivation could not fully finish — it is owned and safe to retry."
                  );
                }
                if (res?.audited === false) {
                  throw new Error(
                    "The customer is active again, but the audit record could not be written — a recovery item now owns reconstructing it."
                  );
                }
                setNotice(
                  res?.alreadyActive
                    ? "This customer was already active — portal access re-checked."
                    : "Customer reactivated — their portal login is back on. Canceled plans stay canceled; add a new plan through a booking."
                );
              });
            }}
          >
            Reactivate customer
          </Button>
        </div>
      </Sheet>

      <Sheet open={sheet === "edit"} onClose={() => setSheet(null)} title="Edit customer">
        <CustomerForm
          initial={customerToForm(customer)}
          submitLabel="Save changes"
          showLeadSource={isLead}
          onSubmit={async (v) => {
            // Safe contact/address/note edit only (GL-09) — raw Customer.update
            // is closed to the browser, so protected lifecycle fields (status,
            // Stripe ids, access groups, paid state) can't be changed from here.
            unwrap(
              await api().mutations.updateCustomerContact({
                customerId: customer.id,
                displayName: v.displayName.trim(),
                contactName: v.contactName.trim() || null,
                email: v.email.trim() || null,
                phone: v.phone.trim() || null,
                serviceStreet: v.serviceStreet.trim() || null,
                serviceUnit: v.serviceUnit.trim() || null,
                serviceCity: v.serviceCity.trim() || null,
                serviceState: v.serviceState.trim() || null,
                serviceZip: v.serviceZip.trim() || null,
                propertyClass: v.propertyClass || null,
                leadSource: v.leadSource.trim() || null,
                notes: v.notes.trim() || null,
              })
            );
            setSheet(null);
            await load();
          }}
        />
      </Sheet>

      <Sheet
        open={amending !== null}
        onClose={() => setAmending(null)}
        title="Issue report amendment"
      >
        {amending ? (
          <AmendReportForm
            report={amending}
            onDone={async (deliveryStatus) => {
              setAmending(null);
              setNotice(
                deliveryStatus === "ACCEPTED" || deliveryStatus === "DELIVERED"
                  ? "Amendment issued and sent to the customer."
                  : deliveryStatus === "NO_EMAIL"
                    ? "Amendment issued — the customer has no email on file, so delivery is now owned office work."
                    : "Amendment issued — the email did NOT go out; delivery is now owned office work."
              );
              await load();
            }}
          />
        ) : null}
      </Sheet>

      <Sheet
        open={rescheduling !== null}
        onClose={() => setRescheduling(null)}
        title={rescheduling?.scheduledDate ? "Reschedule job" : "Schedule job"}
      >
        {rescheduling ? (
          <RescheduleForm
            job={rescheduling}
            onDone={async () => {
              setRescheduling(null);
              await load();
            }}
          />
        ) : null}
      </Sheet>

      <VisitCancelSheet
        jobId={cancelingJob?.id ?? null}
        open={cancelingJob !== null}
        onClose={() => setCancelingJob(null)}
        onDone={() => void load()}
      />

      <Sheet
        open={packeting !== null}
        onClose={() => setPacketing(null)}
        title="Dispatch packet"
      >
        {packeting ? (
          <JobPacketForm
            job={packeting}
            onDone={async () => {
              setPacketing(null);
              await load();
            }}
          />
        ) : null}
      </Sheet>

      <CallbacksSection customerId={customer.id} onChanged={load} />
      <PortalRequestsSection customerId={customer.id} />

      <Sheet open={sheet === "job"} onClose={() => setSheet(null)} title="New job">
        <JobForm
          plans={plans}
          onSubmit={async (v) => {
            const result = opResult<{
              catalogDecisionOpened?: boolean;
              message?: string;
            }>(
              await api().mutations.createOfficeJob({
                customerId: customer.id,
                servicePlanId: v.servicePlanId || undefined,
                serviceType: v.serviceType,
                serviceCode: v.serviceCode,
                priceCents: v.priceCents ?? undefined,
                scheduledDate: v.scheduledDate || undefined,
                accessInstructions: v.packet.accessInstructions.trim() || undefined,
                hazardNotes: v.packet.hazardNotes.trim() || undefined,
                prepInstructions: v.packet.prepInstructions.trim() || undefined,
                prepConfirmed: v.packet.prepInstructions.trim()
                  ? v.packet.prepConfirmed
                  : undefined,
                paymentExpectation: v.packet.paymentExpectation || undefined,
              })
            );
            if (result?.catalogDecisionOpened) {
              // GL-01: no job exists — the request is an owned catalog
              // decision with the one-business-day clock.
              window.alert(
                result.message ??
                  "That service isn't in the catalog — the request is now an owned catalog decision. No job was created."
              );
            }
            setSheet(null);
            await load();
          }}
        />
      </Sheet>

      <Sheet open={sheet === "group"} onClose={() => setSheet(null)} title="Customer group">
        <GroupPicker
          groups={groups}
          currentGroupId={customer.groupId}
          onPick={async (groupId, reason) => {
            unwrap(
              await api().mutations.setCustomerGroup({
                reason,
                customerId: customer.id,
                groupId: groupId ?? undefined,
              })
            );
            setSheet(null);
            await load();
          }}
        />
      </Sheet>

      <CollectPaymentSheet
        customerId={customer.id}
        open={sheet === "collect"}
        onClose={() => setSheet(null)}
        onSaved={() => {
          setSheet(null);
          setPm(null);
          // Webhook updates the label asynchronously; refresh shortly after.
          setTimeout(() => void load(), 1500);
        }}
      />

      <Sheet
        open={Boolean(refunding)}
        onClose={() => setRefunding(null)}
        title="Refund an invoice"
      >
        {refunding ? (
          <RefundSheet
            invoice={refunding}
            customer={customer}
            onDone={async (msg) => {
              setRefunding(null);
              setNotice(msg);
              window.setTimeout(() => setNotice(null), 6000);
              await load();
            }}
          />
        ) : null}
      </Sheet>

      <Sheet
        open={Boolean(settling)}
        onClose={() => setSettling(null)}
        title="Mark invoice paid"
      >
        {settling ? (
          <SettleInvoiceSheet
            invoice={settling}
            customer={customer}
            onDone={async (msg) => {
              setSettling(null);
              setNotice(msg);
              window.setTimeout(() => setNotice(null), 6000);
              await load();
            }}
          />
        ) : null}
      </Sheet>

      <Sheet
        open={sheet === "charge"}
        onClose={() => setSheet(null)}
        title="Charge the card on file"
      >
        <ChargeCardSheet
          customer={customer}
          hasPaymentMethod={pm?.hasPaymentMethod ?? false}
          cardLabel={pm?.label ?? customer.paymentMethodLabel ?? null}
          onDone={async (msg) => {
            setSheet(null);
            setNotice(msg);
            window.setTimeout(() => setNotice(null), 6000);
            await load();
          }}
        />
      </Sheet>

      <Sheet
        open={sheet === "record"}
        onClose={() => setSheet(null)}
        title="Record a payment"
      >
        <RecordPaymentSheet
          customer={customer}
          onDone={async (msg) => {
            setSheet(null);
            setNotice(msg);
            window.setTimeout(() => setNotice(null), 6000);
            await load();
          }}
        />
      </Sheet>

      <Sheet
        open={merging}
        // While the merge itself is running the sheet cannot be closed — a
        // half-watched EXECUTE must keep its owner in front of the outcome.
        locked={mergeBusy}
        onClose={() => {
          if (mergeBusy) return;
          setMerging(false);
          setMergePrefill(null);
        }}
        title="Merge duplicate records"
      >
        {merging ? (
          <MergeCustomerSheet
            customer={customer}
            prefillLoserId={mergePrefill}
            onBusyChange={setMergeBusy}
            onPrefillAlreadyMerged={() => {
              setMerging(false);
              setMergePrefill(null);
              setInfoNote("Already merged — nothing to do.");
            }}
            onDone={async (msg, survivorId, loserName) => {
              setMerging(false);
              setMergePrefill(null);
              setMergeBusy(false);
              if (survivorId === customer.id) {
                setNotice(msg);
                window.setTimeout(
                  () => setNotice((n) => (n === msg ? null : n)),
                  12000
                );
                await load();
              } else {
                // The record on this page was absorbed — follow the survivor,
                // and tell the landing page what just happened.
                navigate(`/customers/${survivorId}`, {
                  state: { mergedFrom: loserName },
                });
              }
            }}
          />
        ) : null}
      </Sheet>
    </Page>
  );
}

/**
 * Office escape hatch for one-off billing: either charge the card on file
 * for an arbitrary amount, or record an offline payment / invoice (cash,
 * check, adjustment) with no card movement.
 */
/**
 * Refund an invoice, in full or in part.
 *
 * Two-step on purpose: money moving back to a customer is still money moving,
 * and the second step restates the amount and who it goes to. Before this
 * existed the only way to refund was the Stripe dashboard, which left the CRM's
 * invoice PAID forever.
 */
function RefundSheet({
  invoice,
  customer,
  onDone,
}: {
  invoice: Invoice;
  customer: Customer;
  onDone: (message: string) => Promise<void>;
}) {
  const alreadyRefunded = invoice.refundedAmountCents ?? 0;
  const remaining = Math.max(0, invoice.amountCents - alreadyRefunded);
  const isCardPayment = Boolean(invoice.stripePaymentIntentId);

  const [amount, setAmount] = useState((remaining / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const cents = Math.round(parseFloat(amount) * 100);
  const validAmount = Number.isFinite(cents) && cents > 0 && cents <= remaining;

  const refund = useAction(async () => {
    const res = opResult<{ refundedNowCents?: number; sentToStripe?: boolean }>(
      await api().mutations.refundInvoice({
        invoiceId: invoice.id,
        amountCents: cents,
        reason: reason.trim(),
      })
    );
    await onDone(
      res?.sentToStripe === false
        ? `Recorded a ${money(cents)} refund — no card was charged for this invoice, so nothing was sent to Stripe.`
        : `Refunded ${money(cents)} to ${customer.displayName}. It reaches their account in 5–10 days.`
    );
  }, "Could not refund this invoice");

  // A refund cannot be undone, so a second click must not send a second one.
  const submit = async () => {
    if (!(await refund.run())) setConfirming(false);
  };

  if (confirming) {
    return (
      <div className="form-grid">
        <p>
          Refund <strong>{money(cents)}</strong> to{" "}
          <strong>{customer.displayName}</strong>
          {isCardPayment && customer.paymentMethodLabel
            ? ` on ${customer.paymentMethodLabel}`
            : ""}
          ?
        </p>
        <p className="muted small" style={{ margin: 0 }}>
          {isCardPayment
            ? "The money goes back to the card that paid, and reaches them in 5–10 days. Refunds can't be undone."
            : "This invoice was recorded as an offline payment, so no card was charged and nothing will be sent to Stripe. This records that you returned the money."}
        </p>
        <p className="muted small" style={{ margin: 0 }}>
          Reason: {reason.trim()}
        </p>
        <ErrorNote error={refund.error} />
        <Button block variant="danger" loading={refund.busy} onClick={() => void submit()}>
          Yes, refund {money(cents)}
        </Button>
        <Button block variant="subtle" onClick={() => setConfirming(false)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="form-grid">
      <p className="muted small" style={{ margin: 0 }}>
        {invoice.description} · {money(invoice.amountCents)} paid
        {alreadyRefunded > 0
          ? ` · ${money(alreadyRefunded)} already refunded, ${money(remaining)} left`
          : ""}
      </p>
      <Field label="Amount to refund ($)" hint={`Up to ${money(remaining)}`}>
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
        />
      </Field>
      <Field
        label="Reason"
        hint="Goes on the invoice. Say what happened, not just 'refund'."
      >
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Tech couldn't access the property"
        />
      </Field>
      <ErrorNote error={refund.error} />
      <Button
        block
        disabled={!validAmount || !reason.trim()}
        onClick={() => setConfirming(true)}
      >
        Review refund
      </Button>
    </div>
  );
}

/**
 * Charge a card. Two steps, because this is the control the review found on
 * backwards: giving money back had a confirmation and taking it did not, so a
 * CSR who meant $149.00 and typed 14900 charged $14,900 instantly with no
 * dialog and no undo.
 *
 * The confirmation states the amount in words as well as figures. $14,900.00
 * and $149.00 look alike at a glance; "fourteen thousand nine hundred dollars"
 * does not. Above RETYPE_ABOVE_CENTS it also has to be typed again, because at
 * that size reading past a confirmation is exactly the mistake being made.
 */
const RETYPE_ABOVE_CENTS = 50_000; // $500

function ChargeCardSheet({
  customer,
  hasPaymentMethod,
  cardLabel,
  onDone,
}: {
  customer: Customer;
  hasPaymentMethod: boolean;
  cardLabel: string | null;
  onDone: (message: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [retyped, setRetyped] = useState("");
  // One idempotency token per sheet open: accidental retries/double-taps
  // collapse to a single charge; a fresh sheet open charges again.
  const [idemToken] = useState(() => crypto.randomUUID());

  const cents = Math.round(parseFloat(amount) * 100);
  const validAmount = Number.isFinite(cents) && cents > 0;
  const needsRetype = validAmount && cents > RETYPE_ABOVE_CENTS;
  const retypeOk =
    !needsRetype || Math.round(parseFloat(retyped) * 100) === cents;

  // The idempotency token already collapses a duplicate that REACHES Stripe;
  // the gate stops the second request being made at all.
  const charge = useAction(async () => {
    const res = opResult<{ status?: string }>(
      await api().mutations.chargeManualAmount({
        customerId: customer.id,
        amountCents: cents,
        description: description.trim(),
        idempotencyKey: idemToken,
      })
    );
    await onDone(
      res?.status === "succeeded"
        ? `Charged ${money(cents)} to ${cardLabel ?? "the card on file"}`
        : `Charge submitted for ${money(cents)} — the status updates when it settles`
    );
  }, "Could not charge the card");

  const submit = async () => {
    if (!(await charge.run())) setConfirming(false);
  };

  if (!hasPaymentMethod) {
    return (
      <div className="form-grid">
        <p>
          <strong>{customer.displayName}</strong> has no payment method on file,
          so there is nothing to charge.
        </p>
        <p className="muted small" style={{ margin: 0 }}>
          Collect a card first. If they have already paid you by cash or cheque,
          record that instead — it is a separate action on the customer record.
        </p>
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="form-grid">
        <p style={{ margin: 0 }}>
          Charge <strong>{money(cents)}</strong> to{" "}
          <strong>{customer.displayName}</strong>
          {cardLabel ? ` on ${cardLabel}` : ""}?
        </p>
        <p style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>
          {amountInWords(cents)}
        </p>
        <p className="muted small" style={{ margin: 0 }}>
          {description.trim()}
        </p>
        <p className="muted small" style={{ margin: 0 }}>
          This takes the money now. It can be refunded afterwards, but it cannot
          be undone.
        </p>
        {needsRetype ? (
          <Field
            label="Type the amount again to confirm"
            hint="Anything over $500 is worth checking twice"
          >
            <input
              inputMode="decimal"
              value={retyped}
              onChange={(e) => setRetyped(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder={(cents / 100).toFixed(2)}
            />
          </Field>
        ) : null}
        <ErrorNote error={charge.error} />
        <Button
          block
          variant="danger"
          loading={charge.busy}
          disabled={!retypeOk}
          onClick={() => void submit()}
        >
          Yes, charge {money(cents)}
        </Button>
        <Button block variant="subtle" onClick={() => setConfirming(false)}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <div className="form-grid">
      <p className="muted small" style={{ margin: 0 }}>
        Charges {cardLabel ?? "the card on file"} straight away.
      </p>
      <Field label="Amount ($)">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="149.00"
        />
      </Field>
      <Field
        label="What is this for?"
        hint="Goes on the invoice and on the customer's card statement"
      >
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Extra visit — wasp nest follow-up"
        />
      </Field>
      <ErrorNote error={charge.error} />
      <Button
        block
        disabled={!validAmount || !description.trim()}
        onClick={() => {
          setRetyped("");
          setConfirming(true);
        }}
      >
        Review charge
      </Button>
    </div>
  );
}

/**
 * Record money taken outside Stripe, or raise an invoice to be settled later.
 * Moves no money.
 *
 * Deliberately a different screen from the charge, not a toggle beside it. As
 * one control the only thing separating "collected $500" from "took $500" was
 * which half of a segmented control was lit, and it defaulted to the recording
 * half whenever the payment-method lookup came back empty — including when it
 * failed. Goes through a mutation so the actor is stamped server-side.
 */
function RecordPaymentSheet({
  customer,
  onDone,
}: {
  customer: Customer;
  onDone: (message: string) => Promise<void>;
}) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [method, setMethod] = useState<"CASH" | "CHEQUE" | "BANK" | "OTHER">(
    "CHEQUE"
  );
  const [status, setStatus] = useState<"PAID" | "OPEN">("PAID");
  const [terms, setTerms] = useState<InvoiceTerms>("DUE_ON_RECEIPT");
  const [poNumber, setPoNumber] = useState("");

  const cents = Math.round(parseFloat(amount) * 100);
  const validAmount = Number.isFinite(cents) && cents > 0;
  // The server sets the due date from the terms; mirror it here so the office
  // sees, before saving, exactly when the customer's clock runs out.
  const dueDate = dueDateForTerms(terms, todayEastern());

  // Without the gate a double-click recorded the same cheque twice, which the
  // books then had to be corrected for by hand.
  const record = useAction(async () => {
    unwrap(
      await recordOfflinePayment({
        customerId: customer.id,
        amountCents: cents,
        description: description.trim(),
        status,
        method: status === "PAID" ? method : undefined,
        terms: status === "OPEN" ? terms : undefined,
        poNumber:
          status === "OPEN" && poNumber.trim() ? poNumber.trim() : undefined,
      })
    );
    await onDone(
      status === "PAID"
        ? `Recorded ${money(cents)} received by ${method.toLowerCase()}`
        : `Raised a ${money(cents)} invoice — due ${fmtDate(dueDate, true)}`
    );
  }, "Could not record the payment");

  return (
    <div className="form-grid">
      <p className="muted small" style={{ margin: 0 }}>
        Bookkeeping only — no card is charged. Your name is recorded against it.
      </p>
      <SegControl
        options={[
          { value: "PAID" as const, label: "Money received" },
          { value: "OPEN" as const, label: "Invoice to be paid" },
        ]}
        value={status}
        onChange={setStatus}
      />
      <Field label="Amount ($)">
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="149.00"
        />
      </Field>
      {status === "PAID" ? (
        <Field label="How did it arrive?">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
          >
            <option value="CHEQUE">Cheque</option>
            <option value="CASH">Cash</option>
            <option value="BANK">Bank transfer</option>
            <option value="OTHER">Other</option>
          </select>
        </Field>
      ) : (
        <>
          {/* Terms set the due date the invoice ages against — the check-paying
              HOA/commercial segment works on Net 15/30, not due-on-receipt. */}
          <Field
            label="Payment terms"
            hint={`Due ${fmtDate(dueDate, true)}`}
          >
            <select
              value={terms}
              onChange={(e) => setTerms(e.target.value as InvoiceTerms)}
            >
              <option value="DUE_ON_RECEIPT">Due on receipt</option>
              <option value="NET_15">Net 15</option>
              <option value="NET_30">Net 30</option>
            </select>
          </Field>
          <Field label="PO number" hint="Optional — for customers who pay against a purchase order">
            <input
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. 4500123987"
            />
          </Field>
        </>
      )}
      <Field label="What is this for?" hint="Shows on the invoice and their history">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Extra visit — wasp nest follow-up"
        />
      </Field>
      <ErrorNote error={record.error} />
      <Button
        block
        loading={record.busy}
        disabled={!validAmount || !description.trim()}
        onClick={() => void record.run()}
      >
        {status === "PAID" ? `Record ${validAmount ? money(cents) : "payment"} received` : "Raise invoice"}
      </Button>
    </div>
  );
}

/**
 * Settle an existing OPEN or FAILED invoice by recording that money arrived
 * outside the card — cash, a cheque, a bank transfer. This is the R31 gap the
 * old recordOfflinePayment could not close: it only ever created a new row, so
 * a cheque against an outstanding invoice left two records and a wrong balance.
 * Goes through settleInvoice(OFFLINE), which stamps the actor and closes the
 * existing invoice to PAID.
 */
function SettleInvoiceSheet({
  invoice,
  customer,
  onDone,
}: {
  invoice: Invoice;
  customer: Customer;
  onDone: (message: string) => Promise<void>;
}) {
  const [method, setMethod] = useState<"CASH" | "CHEQUE" | "BANK" | "OTHER">(
    "CHEQUE"
  );
  const [reference, setReference] = useState("");

  const settle = useAction(async () => {
    const note = [`Received by ${method.toLowerCase()}`, reference.trim()]
      .filter(Boolean)
      .join(" — ");
    unwrap(
      await settleInvoice({
        invoiceId: invoice.id,
        method: "OFFLINE",
        note,
      })
    );
    await onDone(
      `Marked ${money(invoice.amountCents)} paid — received by ${method.toLowerCase()}`
    );
  }, "Could not settle this invoice");

  return (
    <div className="form-grid">
      <p className="muted small" style={{ margin: 0 }}>
        {invoice.description} · {money(invoice.amountCents)}. Records that{" "}
        {customer.displayName} paid this outside the card — no money is charged.
        Your name is recorded against it.
      </p>
      <Field label="How did it arrive?">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as typeof method)}
        >
          <option value="CHEQUE">Cheque</option>
          <option value="CASH">Cash</option>
          <option value="BANK">Bank transfer</option>
          <option value="OTHER">Other</option>
        </select>
      </Field>
      <Field
        label="Reference"
        hint="Optional — cheque number, transfer id, anything to reconcile against"
      >
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Cheque #1042"
        />
      </Field>
      <ErrorNote error={settle.error} />
      <Button block loading={settle.busy} onClick={() => void settle.run()}>
        Mark {money(invoice.amountCents)} paid
      </Button>
    </div>
  );
}

/** One selectable survivor card. Duplicates usually share the exact same
 *  name, so the card carries what actually tells them apart: status, email or
 *  phone, and how long the record has existed. */
function SurvivorOptionCard({
  record,
  checked,
  disabled,
  onSelect,
}: {
  record: Customer;
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onSelect}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        background: checked ? "var(--brand-soft)" : "var(--surface)",
        border: checked
          ? "2px solid var(--brand)"
          : "1px solid var(--line-strong)",
        borderRadius: "var(--radius-sm)",
        // One extra pixel of padding when unchecked keeps the box from
        // shifting as the border width changes.
        padding: checked ? "9px 11px" : "10px 12px",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled && !checked ? 0.6 : 1,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <strong>{record.displayName}</strong>
        <StatusBadge status={record.status} />
        {checked ? <Badge tone="ok">keeping</Badge> : null}
      </span>
      <span className="muted small" style={{ display: "block", marginTop: 3 }}>
        {record.email || record.phone || "no email or phone on file"}
      </span>
      <span className="muted small" style={{ display: "block" }}>
        since {fmtDate(record.createdAt, true)}
      </span>
    </button>
  );
}

/**
 * Absorb a duplicate customer record into the one being kept (OWNER-only,
 * enforced server-side). Nothing is touched until the server's PREVIEW
 * envelope has been shown and the kept record confirmed by retyping — the
 * ChargeCardSheet rule: an irreversible action of this size is read past
 * exactly when it matters, so it must be typed. Because duplicates usually
 * share the exact same name, the retype target is the kept record's email or
 * phone when the names match. EXECUTE runs the durable staged command; a
 * PARTIAL outcome is parked server-side and resumed under the SAME
 * idempotency key, never a fresh one.
 */
function MergeCustomerSheet({
  customer,
  prefillLoserId,
  onBusyChange,
  onPrefillAlreadyMerged,
  onDone,
}: {
  customer: Customer;
  prefillLoserId: string | null;
  /** Lifts "the merge itself is running" so the parent can lock the sheet. */
  onBusyChange: (busy: boolean) => void;
  /** The hinted duplicate is already a tombstone — nothing to do. */
  onPrefillAlreadyMerged: () => void;
  onDone: (
    message: string,
    survivorId: string,
    loserName: string
  ) => Promise<void>;
}) {
  const [other, setOther] = useState<Customer | null>(null);
  const [prefillFailed, setPrefillFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [keep, setKeep] = useState<"THIS" | "OTHER">("THIS");
  const [preview, setPreview] = useState<MergePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [partial, setPartial] = useState<{
    stage: string;
    error: string;
    idempotencyKey: string;
  } | null>(null);
  // A thrown network/timeout during EXECUTE is NOT a failure — the durable
  // command keeps running server-side. This flag renders the "still working"
  // note in place of the buttons instead of a red error.
  const [stillWorking, setStillWorking] = useState(false);
  const [retyped, setRetyped] = useState("");
  // One idempotency key per sheet open: the preview, the execute, and any
  // in-sheet resume all address the same server-side command.
  const [idemKey] = useState(() => crypto.randomUUID());
  const confirmRef = useRef<HTMLDivElement | null>(null);

  // Candidate list for the picker. The status GSI never lists MERGED
  // tombstones, so one can never be picked as either side.
  const { data: candidates, error: candidatesError } = useAsync<Customer[]>(
    async () => {
      const statuses = ["LEAD", "ACTIVE", "INACTIVE"] as const;
      const pages = await Promise.all(
        statuses.map((status) =>
          listAll((t) =>
            api().models.Customer.listCustomerByStatusAndDisplayName(
              { status },
              { limit: 500, nextToken: t }
            )
          )
        )
      );
      return pages.flat().filter((c) => c.id !== customer.id);
    },
    [customer.id],
    "Could not load customers"
  );

  // Prefill from the lead inbox's duplicate decision: the just-created
  // duplicate arrives as the record to absorb. A hint that is already a
  // tombstone means the merge already happened — a no-op, not a load failure.
  useEffect(() => {
    if (!prefillLoserId) return;
    let stale = false;
    void (async () => {
      try {
        const row = unwrap(
          await api().models.Customer.get({ id: prefillLoserId })
        );
        if (stale) return;
        if (row && row.status === "MERGED") {
          onPrefillAlreadyMerged();
        } else if (row) {
          setOther(row);
          setKeep(defaultSurvivorChoice(customer, row));
        } else {
          setPrefillFailed(true);
        }
      } catch {
        if (!stale) setPrefillFailed(true);
      }
    })();
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillLoserId]);

  const executeMerge = useAction(
    async (action: "EXECUTE" | "RESUME", key: string) => {
      if (!other) return;
      const survivorRec = keep === "THIS" ? customer : other;
      const loserRec = keep === "THIS" ? other : customer;
      setStillWorking(false);
      let res: MergeOutcome | null;
      try {
        res = opResult<MergeOutcome>(
          await mergeCustomers({
            action,
            survivorId: survivorRec.id,
            loserId: loserRec.id,
            idempotencyKey: key,
            // The retype gate below IS the acknowledgement — the server
            // refuses an unacknowledged EXECUTE that carries warnings.
            acknowledgeWarnings: true,
          })
        );
      } catch (err) {
        // A big merge can outlive the request; the command is durable and
        // resumable under its saved key, so a timeout is "still working",
        // never a failure.
        if (MERGE_TIMEOUT_ERROR.test(toMessage(err, ""))) {
          setStillWorking(true);
          return;
        }
        throw err;
      }
      if (!res) throw new Error("The merge returned no result");
      if (res.decision === "MERGED") {
        await onDone(
          `Merged ${loserRec.displayName} into ${survivorRec.displayName}.`,
          res.survivorId,
          loserRec.displayName
        );
        return;
      }
      if (res.decision === "PARTIAL") {
        // Parked, not failed: the resume below re-drives it under the SAME
        // key the server reported, so the command continues instead of
        // forking.
        setPartial({
          stage: res.stage,
          error: res.error,
          idempotencyKey: res.idempotencyKey,
        });
        return;
      }
      if (res.decision === "REFUSED") {
        throw new Error(
          res.blockers.map((b) => b.detail).join(" ") ||
            "The merge was refused."
        );
      }
      if (res.decision === "NEEDS_ACKNOWLEDGEMENT") {
        // The records changed since the preview was computed — re-render the
        // fresh consequences and require a fresh confirmation.
        setPreview(res.preview);
        setRetyped("");
        setShowUnchanged(false);
        throw new Error(
          "The records changed since the preview — review the updated consequences and confirm again."
        );
      }
      throw new Error("The merge returned an unexpected result");
    },
    "Could not merge"
  );
  const clearExecuteError = executeMerge.clearError;

  // The preview runs on its own as soon as a pairing exists and re-runs when
  // the survivor choice flips (the deactivate-sheet pattern) — the
  // consequences on screen are always the consequences of THIS pairing.
  useEffect(() => {
    if (!other || partial || stillWorking) return;
    let stale = false;
    setPreview(null);
    setRetyped("");
    setShowUnchanged(false);
    setPreviewError(null);
    setPreviewLoading(true);
    clearExecuteError();
    const survivorId = keep === "THIS" ? customer.id : other.id;
    const loserId = keep === "THIS" ? other.id : customer.id;
    void (async () => {
      try {
        const res = opResult<MergeOutcome>(
          await mergeCustomers({
            action: "PREVIEW",
            survivorId,
            loserId,
            idempotencyKey: idemKey,
          })
        );
        if (stale) return;
        if (res?.decision !== "PREVIEW") {
          throw new Error("Could not check what this merge will do");
        }
        setPreview(res.preview);
      } catch (err) {
        if (!stale) {
          setPreviewError(
            toMessage(err, "Could not check what this merge will do")
          );
        }
      } finally {
        if (!stale) setPreviewLoading(false);
      }
    })();
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [other?.id, keep, previewNonce, customer.id, idemKey, clearExecuteError]);

  // Bring the confirm section into view when the consequences land — on a
  // phone the preview alone fills the screen.
  useEffect(() => {
    if (preview) {
      confirmRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [preview]);

  // The parent locks the sheet while the merge itself runs — watching the
  // outcome land is part of the action.
  useEffect(() => {
    onBusyChange(executeMerge.busy);
  }, [executeMerge.busy, onBusyChange]);
  useEffect(() => () => onBusyChange(false), [onBusyChange]);

  if (prefillLoserId && !other && !prefillFailed) {
    return <Spinner label="Loading the duplicate record…" />;
  }

  if (!other) {
    const q = query.trim().toLowerCase();
    const digits = (v?: string | null) => (v ?? "").replace(/\D/g, "");
    const qDigits = digits(q);
    const norm = (v?: string | null) => (v ?? "").trim().toLowerCase();
    // The evidence the office needs FIRST: records that match this one the
    // way the lead dedup gate matches — exact email, exact phone, or
    // name+ZIP. Same normalization, computed locally over the loaded pages.
    const matchEvidence = (c: Customer): string | null => {
      if (norm(c.email) && norm(c.email) === norm(customer.email)) {
        return "same email";
      }
      if (
        digits(c.phone).length >= 10 &&
        digits(c.phone) === digits(customer.phone)
      ) {
        return "same phone";
      }
      if (
        norm(c.displayName) === norm(customer.displayName) &&
        (c.serviceZip ?? "") !== "" &&
        c.serviceZip === customer.serviceZip
      ) {
        return "same name + ZIP";
      }
      return null;
    };
    const likely = q
      ? []
      : (candidates ?? [])
          .map((c) => ({ c, why: matchEvidence(c) }))
          .filter((m): m is { c: Customer; why: string } => m.why !== null)
          .slice(0, 5);
    const likelyIds = new Set(likely.map((m) => m.c.id));
    const filtered = (candidates ?? []).filter(
      (c) =>
        !likelyIds.has(c.id) &&
        (!q ||
          c.displayName.toLowerCase().includes(q) ||
          (c.serviceCity ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (qDigits.length >= 4 && digits(c.phone).includes(qDigits)))
    );
    const shown = filtered.slice(0, 8);
    const hidden = filtered.length - shown.length;
    const pick = (c: Customer) => {
      setOther(c);
      setKeep(defaultSurvivorChoice(customer, c));
    };
    return (
      <div className="form-grid">
        <p className="muted small" style={{ margin: 0 }}>
          Pick the record this one duplicates. Nothing changes until you have
          seen the full consequences and confirmed.
        </p>
        {prefillFailed ? (
          <p className="muted small" style={{ margin: 0 }}>
            The record handed over from the lead inbox could not be loaded —
            pick it here instead.
          </p>
        ) : null}
        <input
          placeholder="Search name, city, email, phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ErrorNote error={candidatesError} />
        {!candidates ? (
          <Spinner />
        ) : (
          <>
            {likely.length > 0 ? (
              <>
                <div className="section-label">Likely duplicates</div>
                {likely.map(({ c, why }) => (
                  <ListRow
                    key={c.id}
                    title={c.displayName}
                    subtitle={
                      [c.email, c.phone, c.serviceCity]
                        .filter(Boolean)
                        .join(" · ") || undefined
                    }
                    meta={
                      <span className="row-meta">
                        <Badge tone="info">{why}</Badge>
                        <StatusBadge status={c.status} />
                      </span>
                    }
                    onClick={() => pick(c)}
                  />
                ))}
                <div className="section-label">Everyone else</div>
              </>
            ) : null}
            {shown.length === 0 && likely.length === 0 ? (
              <p className="muted small">No matching customers.</p>
            ) : (
              shown.map((c) => (
                <ListRow
                  key={c.id}
                  title={c.displayName}
                  subtitle={
                    [c.email, c.phone, c.serviceCity]
                      .filter(Boolean)
                      .join(" · ") || undefined
                  }
                  meta={<StatusBadge status={c.status} />}
                  onClick={() => pick(c)}
                />
              ))
            )}
            {hidden > 0 ? (
              <p className="muted small" style={{ margin: 0 }}>
                {hidden} more not shown — keep typing to narrow it down.
              </p>
            ) : null}
          </>
        )}
      </div>
    );
  }

  const survivorRec = keep === "THIS" ? customer : other;
  const loserRec = keep === "THIS" ? other : customer;
  const blocked = (preview?.blockers.length ?? 0) > 0;
  // While the merge runs (or may still be running server-side), the pairing
  // must not change out from under it.
  const flightLocked = executeMerge.busy || stillWorking || Boolean(partial);

  // Retype gate. Duplicates usually share the exact same name, so typing the
  // name proves nothing — fall back to the kept record's email, then the last
  // 4 digits of its phone, then the word KEEP.
  const sameName =
    normalizeConfirmText(customer.displayName) ===
    normalizeConfirmText(other.displayName);
  const phoneLast4 = (survivorRec.phone ?? "").replace(/\D/g, "").slice(-4);
  const confirm = !sameName
    ? {
        kind: "text" as const,
        expected: survivorRec.displayName,
        label: `Type "${survivorRec.displayName}" to confirm`,
        why: null as string | null,
      }
    : survivorRec.email
      ? {
          kind: "text" as const,
          expected: survivorRec.email,
          label: `Type the kept record's email — ${survivorRec.email} — to confirm`,
          why: "Both records have the same name, so the kept record's email is the check instead.",
        }
      : phoneLast4.length === 4
        ? {
            kind: "digits" as const,
            expected: phoneLast4,
            label: `Type the last 4 digits of the kept record's phone (ending ${phoneLast4}) to confirm`,
            why: "Both records have the same name and no email, so the kept record's phone is the check instead.",
          }
        : {
            kind: "text" as const,
            expected: "KEEP",
            label: 'Type "KEEP" to confirm',
            why: "Both records have the same name and no email or phone to tell them apart.",
          };
  const retypeOk =
    confirm.kind === "digits"
      ? retyped.replace(/\D/g, "") === confirm.expected
      : normalizeConfirmText(retyped) ===
        normalizeConfirmText(confirm.expected);
  const showMismatch = !retypeOk && retyped.trim().length >= 3;

  return (
    <div className="form-grid">
      {partial ? (
        <p className="muted small" style={{ margin: 0 }}>
          Keeping <strong>{survivorRec.displayName}</strong> — absorbing{" "}
          <strong>{loserRec.displayName}</strong>.
        </p>
      ) : (
        <>
          <div className="row-split">
            <p className="muted small" style={{ margin: 0 }}>
              Merging this record with <strong>{other.displayName}</strong>.
            </p>
            <Button
              small
              variant="ghost"
              disabled={flightLocked}
              onClick={() => setOther(null)}
            >
              Change
            </Button>
          </div>
          <Field
            group
            label="Which record do we keep?"
            hint="Keeping the record with the longer history — switch if that's wrong."
          >
            <div
              role="radiogroup"
              aria-label="Which record do we keep?"
              style={{ display: "grid", gap: 8 }}
            >
              <SurvivorOptionCard
                record={customer}
                checked={keep === "THIS"}
                disabled={flightLocked}
                onSelect={() => setKeep("THIS")}
              />
              <SurvivorOptionCard
                record={other}
                checked={keep === "OTHER"}
                disabled={flightLocked}
                onSelect={() => setKeep("OTHER")}
              />
            </div>
          </Field>
        </>
      )}
      {previewLoading ? (
        <Spinner label="Checking what this merge will do…" />
      ) : null}
      {previewError ? (
        <>
          <ErrorNote error={previewError} />
          <Button
            block
            variant="subtle"
            onClick={() => setPreviewNonce((n) => n + 1)}
          >
            Try again
          </Button>
        </>
      ) : null}
      {preview ? (
        <div className="muted small" style={{ display: "grid", gap: 6 }}>
          {(() => {
            const moving = Object.entries(preview.childCounts).filter(
              ([, n]) => n > 0
            );
            return moving.length === 0 ? (
              <div>
                <strong>Linked records:</strong> none to move.
              </div>
            ) : (
              <div>
                <strong>Moving to the kept record:</strong>
                <dl className="kv">
                  {moving.map(([model, n]) => (
                    <Fragment key={model}>
                      <dt>{childModelLabel(model)}</dt>
                      <dd>{n}</dd>
                    </Fragment>
                  ))}
                </dl>
              </div>
            );
          })()}
          <div>
            <strong>Billing:</strong>{" "}
            {preview.billing.pointerPlan === "ADOPTED_LOSER"
              ? `the kept record adopts the duplicate's saved card${
                  preview.billing.loserCard
                    ? ` (${preview.billing.loserCard})`
                    : ""
                }.`
              : preview.billing.pointerPlan === "SURVIVOR_KEPT"
                ? `the kept record keeps its own card${
                    preview.billing.survivorCard
                      ? ` (${preview.billing.survivorCard})`
                      : ""
                  }.`
                : "neither record has card billing to move."}
            {preview.billing.loserActiveSubscriptions > 0
              ? ` ${preview.billing.loserActiveSubscriptions} active subscription${
                  preview.billing.loserActiveSubscriptions === 1 ? "" : "s"
                } repoint to the kept record.`
              : ""}
          </div>
          <div>
            <strong>Portal:</strong>{" "}
            {preview.portal.sharedLogin
              ? "both records already share one login — it keeps working."
              : preview.portal.loserHasLogin
                ? "the duplicate's login is granted the kept record before its own access is retired."
                : preview.portal.survivorHasLogin
                  ? "the kept record's login is unaffected."
                  : "neither record has a portal login."}
          </div>
          {preview.fieldDiff.length > 0
            ? (() => {
                const changedRows = preview.fieldDiff.filter(
                  (d) => d.outcome !== "KEEP"
                );
                const unchangedRows = preview.fieldDiff.filter(
                  (d) => d.outcome === "KEEP"
                );
                return (
                  <div>
                    <strong>Contact &amp; address</strong> (duplicate → kept)
                    {changedRows.map((d) => (
                      <span className="nested-line" key={d.field}>
                        {fieldLabel(d.field)}: {fieldValue(d.loser)} →{" "}
                        {fieldValue(
                          d.outcome === "FILL" ? d.loser : d.survivor
                        )}{" "}
                        <Badge
                          tone={d.outcome === "CONFLICT" ? "warn" : "info"}
                        >
                          {d.outcome === "FILL"
                            ? "filled from duplicate"
                            : "kept record wins"}
                        </Badge>
                      </span>
                    ))}
                    {changedRows.length === 0 ? (
                      <span className="nested-line">
                        Nothing changes on the kept record.
                      </span>
                    ) : null}
                    {unchangedRows.length > 0 ? (
                      <>
                        <span className="nested-line">
                          <button
                            type="button"
                            className="text-action"
                            onClick={() => setShowUnchanged((v) => !v)}
                          >
                            {showUnchanged
                              ? "Hide unchanged fields"
                              : `Show ${unchangedRows.length} unchanged field${
                                  unchangedRows.length === 1 ? "" : "s"
                                }`}
                          </button>
                        </span>
                        {showUnchanged
                          ? unchangedRows.map((d) => (
                              <span className="nested-line" key={d.field}>
                                {fieldLabel(d.field)}:{" "}
                                {fieldValue(d.survivor)}{" "}
                                <Badge tone="muted">unchanged</Badge>
                              </span>
                            ))
                          : null}
                      </>
                    ) : null}
                  </div>
                );
              })()
            : null}
          {preview.warnings.map((w) => (
            <div key={w.code}>
              <Badge tone="warn">warning</Badge> {w.detail}
            </div>
          ))}
          {preview.blockers.map((b) => (
            <div key={b.code}>
              <Badge tone="danger">blocked</Badge> {b.detail}
            </div>
          ))}
        </div>
      ) : null}
      <div ref={confirmRef} style={{ display: "grid", gap: 12 }}>
        {stillWorking ? (
          <p className="info-note" role="status" style={{ margin: 0 }}>
            Still working — a big merge can take a minute. It's safe to leave
            this open, or check the banner on this page shortly; nothing is
            lost.
          </p>
        ) : partial ? (
          <>
            <span>
              <Badge tone="danger">merge unfinished</Badge>
            </span>
            <p className="muted small" style={{ margin: 0 }}>
              The merge stopped while {mergeStageLabel(partial.stage)}
              {partial.error ? ` (${partial.error})` : ""}. Nothing is lost —
              it is parked server-side and resumes from the last completed
              step.
            </p>
            <ErrorNote error={executeMerge.error} />
            <Button
              block
              loading={executeMerge.busy}
              onClick={() =>
                void executeMerge.run("RESUME", partial.idempotencyKey)
              }
            >
              Resume merge
            </Button>
          </>
        ) : preview && blocked ? (
          <>
            <p className="muted small" style={{ margin: 0 }}>
              The merge can't run until the blockers above are cleared. Sort
              them out, then check again from here.
            </p>
            <Button
              block
              variant="subtle"
              loading={previewLoading}
              onClick={() => setPreviewNonce((n) => n + 1)}
            >
              Re-check
            </Button>
          </>
        ) : preview ? (
          <>
            <Field
              label={confirm.label}
              hint={[
                confirm.why,
                preview.warnings.length > 0
                  ? "Confirming acknowledges the warnings above."
                  : null,
                "A merge moves every linked record and cannot be undone.",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <input
                value={retyped}
                onChange={(e) => setRetyped(e.target.value)}
                placeholder="Type it here"
                autoComplete="off"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode={confirm.kind === "digits" ? "numeric" : "text"}
              />
              {showMismatch ? (
                <span className="small" style={{ color: "var(--warn-ink)" }}>
                  Doesn't match yet — type it exactly as shown.
                </span>
              ) : null}
            </Field>
            <ErrorNote error={executeMerge.error} />
            <Button
              block
              variant="danger"
              loading={executeMerge.busy}
              disabled={!retypeOk}
              onClick={() => void executeMerge.run("EXECUTE", idemKey)}
            >
              {sameName
                ? "Merge the duplicate into the kept record"
                : `Merge ${loserRec.displayName} into ${survivorRec.displayName}`}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- Sub-forms ---------- */

function RescheduleForm({
  job,
  onDone,
}: {
  job: Job;
  onDone: () => Promise<void>;
}) {
  const [date, setDate] = useState(job.scheduledDate ?? "");
  const [reasonCode, setReasonCode] = useState<string>(
    VISIT_RESCHEDULE_REASONS[0]
  );
  const [note, setNote] = useState("");
  const dateChanged = date !== (job.scheduledDate ?? "");

  const save = useAction(async () => {
    const data = opResult<VisitRescheduleOutcome>(
      await rescheduleVisit({
        jobId: job.id,
        scheduledDate: date || undefined,
        reasonCode,
        note: note.trim() || undefined,
      })
    );
    // A rescheduled visit whose customer notice failed is owned, not a
    // clean success — tell the office so they follow up.
    if (data && data.outcome === "PARTIAL") {
      throw new Error(
        "Rescheduled, but we couldn't email the customer — an operations task was opened to reach them."
      );
    }
    await onDone();
  }, "Could not reschedule");

  return (
    <div className="form-grid">
      {/* GL-07 R5: the same consequence preview as cancel — what a reschedule
          does and doesn't touch, before it's committed. */}
      <ul className="cancel-consequences">
        <li>No money moves — a reschedule never refunds or charges.</li>
        <li>
          {job.servicePlanId
            ? "This moves only this visit; a recurring plan keeps running."
            : "This is a one-time visit."}
        </li>
        <li>
          We revalidate the technician's license and the day's capacity before
          committing; a visit given a date with no technician is put in the
          Operations staffing queue, never left silently unassigned.
        </li>
        <li>The customer is emailed the old and new details when you save.</li>
      </ul>
      <Field label="Date">
        <DateField value={date} onChange={setDate} allowClear />
      </Field>
      {dateChanged && job.routeId ? (
        <p className="muted small">
          Moving the date takes this job off its current route — it'll be
          re-routed for the new day.
        </p>
      ) : null}
      <Field
        label="Reason"
        hint="A controlled reason is recorded on the visit's audit history."
      >
        <select value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
          {VISIT_RESCHEDULE_REASONS.map((r) => (
            <option key={r} value={r}>
              {reasonLabel(r)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note" hint="Required when the reason is 'Other'.">
        <input value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <ErrorNote error={save.error} />
      <Button
        block
        loading={save.busy}
        disabled={reasonCode === "OTHER" && !note.trim()}
        onClick={() => void save.run()}
      >
        {date ? "Save schedule" : "Mark unscheduled"}
      </Button>
    </div>
  );
}

/**
 * Issue an append-only correction to a finalized report (GL-15). The office
 * states why, and each fact being corrected as was → now. Nothing here edits the
 * original record — the mutation appends a new, linked amendment and delivers it.
 */
function AmendReportForm({
  report,
  onDone,
}: {
  report: ServiceReport;
  onDone: (deliveryStatus: string | null) => Promise<void>;
}) {
  type Row = { label: string; from: string; to: string };
  const [reason, setReason] = useState("");
  const [rows, setRows] = useState<Row[]>([{ label: "", from: "", to: "" }]);

  // An amendment is append-only: a second submit issues a SECOND correction
  // and emails the customer another copy.
  const issue = useAction(async () => {
    const changes = rows
      .filter((r) => r.label.trim() && r.to.trim())
      .map((r) => ({
        label: r.label.trim(),
        from: r.from.trim(),
        to: r.to.trim(),
      }));
    const data = opResult<{ deliveryStatus?: string | null }>(
      await api().mutations.amendServiceReport({
        reportId: report.id,
        reason: reason.trim(),
        changes: JSON.stringify(changes),
      })
    );
    // The notice words come from the PERSISTED delivery state — an
    // issued-but-undelivered amendment is never called "sent".
    await onDone(data?.deliveryStatus ?? null);
  }, "Could not issue the amendment");

  const setRow = (i: number, k: keyof Row, v: string) =>
    setRows((list) => list.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const ready =
    reason.trim().length > 0 &&
    rows.some((r) => r.label.trim() && r.to.trim());

  return (
    <div className="form-grid">
      <p className="muted small" style={{ margin: 0 }}>
        The original report is preserved unchanged. This issues a correction
        linked to it and sends the customer the amended copy.
      </p>
      <Field label="Reason for the correction">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this record being corrected?"
        />
      </Field>
      {rows.map((r, i) => (
        <Field group label={`Correction ${i + 1}`} key={i}>
          <input
            placeholder="What changed (e.g. Areas treated)"
            value={r.label}
            onChange={(e) => setRow(i, "label", e.target.value)}
          />
          <div className="form-row-2">
            <input
              placeholder="Was (optional)"
              value={r.from}
              onChange={(e) => setRow(i, "from", e.target.value)}
            />
            <input
              placeholder="Now (corrected value)"
              value={r.to}
              onChange={(e) => setRow(i, "to", e.target.value)}
            />
          </div>
          {rows.length > 1 ? (
            <Button
              small
              variant="ghost"
              onClick={() => setRows((l) => l.filter((_, idx) => idx !== i))}
            >
              ✕ Remove
            </Button>
          ) : null}
        </Field>
      ))}
      <Button
        small
        variant="ghost"
        onClick={() =>
          setRows((l) => [...l, { label: "", from: "", to: "" }])
        }
      >
        + Add another correction
      </Button>
      <ErrorNote error={issue.error} />
      <Button
        block
        loading={issue.busy}
        disabled={!ready}
        onClick={() => void issue.run()}
      >
        Issue amendment &amp; send
      </Button>
    </div>
  );
}

/**
 * GL-15 — the office's bounded recovery for an undelivered report: re-send the
 * exact document (the resume adopts any proven prior send) or record an
 * approved alternate delivery with how it was delivered. Shows the VERIFIED
 * resulting state via the reload.
 */
function ReportDeliveryRecovery({
  reportId,
  onDone,
}: {
  reportId: string;
  onDone: () => Promise<void>;
}) {
  const [mode, setMode] = useState<null | "alternate">(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "resend" | "alternate">(null);

  const record = useAction(async (action: "RESEND" | "ALTERNATE") => {
    const res = await api().mutations.recordReportDelivery({
      reportId,
      action,
      note: note.trim() || undefined,
    });
    if (res.errors?.length) throw new Error(res.errors[0].message);
    await onDone();
  }, "Could not record delivery");

  // A re-send puts another copy of the report in the customer's inbox, so the
  // second press has to be refused. `busy` stays to spin the pressed button.
  const run = async (action: "RESEND" | "ALTERNATE") => {
    setBusy(action === "RESEND" ? "resend" : "alternate");
    if (!(await record.run(action))) setBusy(null);
  };

  return (
    <div className="form-grid" style={{ gap: 6 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          small
          loading={busy === "resend"}
          onClick={() => void run("RESEND")}
        >
          Re-send report
        </Button>
        <Button small variant="ghost" onClick={() => setMode("alternate")}>
          Delivered another way…
        </Button>
      </div>
      {mode === "alternate" ? (
        <>
          <Field label="How was it delivered?" hint="Mailed, handed to the customer…">
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button
            small
            loading={busy === "alternate"}
            disabled={!note.trim()}
            onClick={() => void run("ALTERNATE")}
          >
            Record alternate delivery
          </Button>
        </>
      ) : null}
      <ErrorNote error={record.error} />
    </div>
  );
}

/** The dispatch-packet fields an office user captures per job (GL-12). */
type PacketValues = {
  accessInstructions: string;
  hazardNotes: string;
  prepInstructions: string;
  prepConfirmed: boolean;
  paymentExpectation: "" | "COLLECT_NOTHING" | "DUE_THROUGH_OFFICE";
};

/** The packet inputs, shared by the New-job form and the Edit-packet sheet. */
function PacketFields({
  value,
  onChange,
}: {
  value: PacketValues;
  onChange: (v: PacketValues) => void;
}) {
  const set = (patch: Partial<PacketValues>) => onChange({ ...value, ...patch });
  return (
    <>
      <Field label="Getting in" hint="Gate code, lockbox, parking, which door — for this visit">
        <input
          value={value.accessInstructions}
          onChange={(e) => set({ accessInstructions: e.target.value })}
        />
      </Field>
      <Field
        label="Safety"
        hint="Dogs, small children, allergies, hazards — shown to the tech in red"
      >
        <input
          value={value.hazardNotes}
          onChange={(e) => set({ hazardNotes: e.target.value })}
        />
      </Field>
      <Field label="Prep the customer must do">
        <input
          value={value.prepInstructions}
          onChange={(e) => set({ prepInstructions: e.target.value })}
        />
      </Field>
      {value.prepInstructions.trim() ? (
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={value.prepConfirmed}
            onChange={(e) => set({ prepConfirmed: e.target.checked })}
          />
          Prep confirmed with the customer
        </label>
      ) : null}
      <Field label="Payment at the door" hint="BuzzKill never collects in the field">
        <select
          value={value.paymentExpectation}
          onChange={(e) =>
            set({ paymentExpectation: e.target.value as PacketValues["paymentExpectation"] })
          }
        >
          <option value="">Office bills afterward (default)</option>
          <option value="COLLECT_NOTHING">Already paid — collect nothing</option>
          <option value="DUE_THROUGH_OFFICE">Payment due through the office</option>
        </select>
      </Field>
    </>
  );
}

const emptyPacket: PacketValues = {
  accessInstructions: "",
  hazardNotes: "",
  prepInstructions: "",
  prepConfirmed: false,
  paymentExpectation: "",
};

function JobForm({
  plans,
  onSubmit,
}: {
  plans: ServicePlan[];
  onSubmit: (v: {
    serviceType: string;
    serviceCode: string;
    priceCents: number | null;
    scheduledDate: string;
    servicePlanId: string;
    packet: PacketValues;
  }) => Promise<void>;
}) {
  // GL-01: the service is a CONTROLLED catalog selection — no free text can
  // invent work the business cannot price, staff, or document. "Something
  // else…" routes to an owned catalog decision instead of creating a job.
  const [serviceCode, setServiceCode] = useState("GENERAL_PEST");
  const [otherText, setOtherText] = useState("");
  const [price, setPrice] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [planId, setPlanId] = useState("");
  const [packet, setPacket] = useState<PacketValues>(emptyPacket);
  const activePlans = plans.filter((p) => p.status === "ACTIVE");
  const notInCatalog = serviceCode === "NOT_IN_CATALOG";
  const serviceType = notInCatalog
    ? otherText
    : (Object.values(SERVICE_CATALOG).find((e) => e.id === serviceCode)?.label ??
      serviceCode);

  // A second press creates a SECOND job — a duplicate visit on the board that
  // someone then has to find and cancel.
  const create = useAction(async () => {
    if (!serviceType.trim()) {
      throw new Error(
        notInCatalog ? "Describe what the customer asked for" : "Pick a service"
      );
    }
    const cents = price ? Math.round(parseFloat(price) * 100) : null;
    if (!planId && price && (!Number.isFinite(cents!) || cents! <= 0)) {
      throw new Error("Price doesn't look valid");
    }
    await onSubmit({
      serviceType: serviceType.trim(),
      serviceCode,
      priceCents: planId ? null : cents,
      scheduledDate,
      servicePlanId: planId,
      packet,
    });
  }, "Could not create job");

  return (
    <div className="form-grid">
      <Field label="Service">
        <select
          value={serviceCode}
          onChange={(e) => setServiceCode(e.target.value)}
        >
          {Object.values(SERVICE_CATALOG).map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
              {e.seasonal ? " — seasonal Apr–Oct" : ""}
            </option>
          ))}
          <option value="NOT_IN_CATALOG">Something else…</option>
        </select>
      </Field>
      {notInCatalog ? (
        <Field
          label="What did the customer ask for?"
          hint="This opens a catalog decision (answered within one business day) — it does not create a job"
        >
          <input
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="e.g. attic insulation restoration"
          />
        </Field>
      ) : null}
      {activePlans.length ? (
        <Field label="Part of plan" hint="Visits under a plan are covered by the monthly price">
          <select value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">One-time job (billed separately)</option>
            {activePlans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.planName}
              </option>
            ))}
          </select>
        </Field>
      ) : null}
      {!planId ? (
        <Field label="One-time price ($)">
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      ) : null}
      <Field label="Date" hint="Leave empty to schedule later">
        <DateField value={scheduledDate} onChange={setScheduledDate} allowClear />
      </Field>
      <PacketFields value={packet} onChange={setPacket} />
      <ErrorNote error={create.error} />
      <Button block loading={create.busy} onClick={() => void create.run()}>
        {notInCatalog ? "Send to catalog decision" : "Create job"}
      </Button>
    </div>
  );
}

/** GL-12: edit the dispatch packet on an existing job via updateJobPacket. */
function JobPacketForm({
  job,
  onDone,
}: {
  job: Job;
  onDone: () => Promise<void>;
}) {
  const [packet, setPacket] = useState<PacketValues>({
    accessInstructions: job.accessInstructions ?? "",
    hazardNotes: job.hazardNotes ?? "",
    prepInstructions: job.prepInstructions ?? "",
    prepConfirmed: job.prepConfirmed ?? false,
    paymentExpectation:
      job.paymentExpectation === "COLLECT_NOTHING" ||
      job.paymentExpectation === "DUE_THROUGH_OFFICE"
        ? job.paymentExpectation
        : "",
  });
  // GL-12: explicit property classification — duration and pricing hang off it.
  const [propertyClass, setPropertyClass] = useState<string>(
    (job as { propertyClass?: string | null }).propertyClass ?? ""
  );
  // GL-12: a material change after the technician started needs a recorded
  // manager reason — the server refuses without it.
  const [managerReason, setManagerReason] = useState("");
  const started = Boolean(job.startedAt);

  const save = useAction(async () => {
    opResult(
      await api().mutations.updateJobPacket({
        jobId: job.id,
        accessInstructions: packet.accessInstructions.trim() || undefined,
        hazardNotes: packet.hazardNotes.trim() || undefined,
        prepInstructions: packet.prepInstructions.trim() || undefined,
        prepConfirmed: packet.prepInstructions.trim()
          ? packet.prepConfirmed
          : undefined,
        paymentExpectation: packet.paymentExpectation || undefined,
        propertyClass: propertyClass || undefined,
        managerReason: managerReason.trim() || undefined,
      })
    );
    await onDone();
  }, "Could not save the packet");

  return (
    <div className="form-grid">
      <Field
        label="Property classification"
        hint="Residential visits take 30 minutes on site; commercial and community/common-area take 60. Required before dispatch."
      >
        <select
          value={propertyClass}
          onChange={(e) => setPropertyClass(e.target.value)}
        >
          <option value="">Pick one…</option>
          <option value="RESIDENTIAL">Residential (30 min)</option>
          <option value="COMMERCIAL">Commercial (60 min)</option>
          <option value="COMMUNITY">Community / common area (60 min)</option>
        </select>
      </Field>
      <PacketFields value={packet} onChange={setPacket} />
      {started ? (
        <Field
          label="Manager reason (service already started)"
          hint="Changing safety/access/scope/prep mid-visit is recorded with your name and shown to the technician."
        >
          <input
            value={managerReason}
            onChange={(e) => setManagerReason(e.target.value)}
            placeholder="Why this is changing now"
          />
        </Field>
      ) : null}
      <ErrorNote error={save.error} />
      <Button block loading={save.busy} onClick={() => void save.run()}>
        Save packet
      </Button>
    </div>
  );
}

function GroupPicker({
  groups,
  currentGroupId,
  onPick,
}: {
  groups: CustomerGroup[];
  currentGroupId?: string | null;
  onPick: (groupId: string | null, reason: string) => Promise<void>;
}) {
  const [value, setValue] = useState(currentGroupId ?? "");
  const [reason, setReason] = useState("");

  const save = useAction(
    async () => onPick(value || null, reason.trim()),
    "Could not update group"
  );

  return (
    <div className="form-grid">
      <Field
        label="Group"
        hint="Portal users in a group can view the other customers in it (for management companies)."
      >
        <select value={value} onChange={(e) => setValue(e.target.value)}>
          <option value="">No group</option>
          {groups
            // An inactive group can't take new members — hide it, but keep the
            // current one selectable so the field still shows the truth.
            .filter((g) => g.status !== "INACTIVE" || g.id === currentGroupId)
            .map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
        </select>
      </Field>
      {/* GL-11: membership changes grant/remove real portal access across the
          group, so the change always records who and when. A reason is
          optional — add one when it's useful, but it isn't required. */}
      <Field label="Why is this changing? (optional)">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. new property manager for Maple Ridge"
        />
      </Field>
      <ErrorNote error={save.error} />
      <Button block loading={save.busy} onClick={() => void save.run()}>
        Save group
      </Button>
    </div>
  );
}

/**
 * GL-11 — the customer's portal requests (reschedule / help), with the one
 * office action: resolve WITH AN ANSWER the customer sees in their portal
 * (and by email). Resolving here also closes the shared-queue item.
 */
function PortalRequestsSection({ customerId }: { customerId: string }) {
  const [rows, setRows] = useState<PortalRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    try {
      const models = api().models as unknown as {
        PortalRequest?: {
          listPortalRequestByCustomerId: (a: {
            customerId: string;
            limit?: number;
            nextToken?: string | null;
          }) => Promise<{ data: PortalRequest[]; nextToken?: string | null }>;
        };
      };
      if (!models.PortalRequest) {
        setRows([]);
        return;
      }
      const portalRequests = models.PortalRequest;
      setRows(
        await listAll((t) =>
          portalRequests.listPortalRequestByCustomerId({
            customerId,
            limit: 100,
            nextToken: t,
          })
        )
      );
    } catch {
      setRows([]);
    }
  }, [customerId]);
  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  // Resolving emails the customer the answer, so a double-press must not send
  // it twice. `busyId` stays for the pressed row's spinner.
  const resolve = useAction(async (id: string, note: string) => {
    opResult(
      await api().mutations.resolvePortalRequest({ portalRequestId: id, note })
    );
    await loadRows();
  }, "Could not resolve");

  if (!rows || rows.length === 0) return null;

  const resolveRequest = async (r: PortalRequest) => {
    const note = window.prompt(
      "The answer the customer will see in their portal and by email:"
    );
    if (!note?.trim()) return;
    setBusyId(r.id);
    try {
      await resolve.run(r.id, note.trim());
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card title="Portal requests">
      <ErrorNote error={resolve.error} />
      {rows
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""))
        .map((r) => (
          <ListRow
            key={r.id}
            title={r.kind === "RESCHEDULE" ? "Reschedule request" : "Help request"}
            subtitle={
              <>
                {[
                  r.jobId ? `visit ${r.jobId}` : null,
                  r.preferredDate ? `prefers ${fmtDate(r.preferredDate, true)}` : null,
                  r.message ?? null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {r.resolutionNote ? (
                  <span className="nested-line">Answered: {r.resolutionNote}</span>
                ) : null}
              </>
            }
            meta={
              r.status === "RESOLVED" ? (
                <Badge tone="ok">answered</Badge>
              ) : (
                <>
                  <Badge tone="warn">open</Badge>
                  <Button
                    small
                    loading={busyId === r.id}
                    onClick={() => void resolveRequest(r)}
                  >
                    Resolve with an answer
                  </Button>
                </>
              )
            }
          />
        ))}
    </Card>
  );
}

/**
 * GL-10 — the customer's guarantee callbacks: reference, promise clock,
 * photo evidence, the one scheduling action (never beyond the promised
 * return unless the customer chose later), and the technician's finding
 * once recorded. Money never appears — a callback visit is $0 by
 * construction.
 */
const CALLBACK_STATUS_LABEL: Record<string, string> = {
  REQUESTED: "needs scheduling",
  SCHEDULED: "scheduled",
  COMPLETED: "completed — guarantee continues",
  GUARANTEE_ENDED: "guarantee ended by finding",
};

function CallbacksSection({
  customerId,
  onChanged,
}: {
  customerId: string;
  onChanged: () => Promise<void>;
}) {
  const [rows, setRows] = useState<CallbackRequest[] | null>(null);
  const [scheduling, setScheduling] = useState<CallbackRequest | null>(null);
  const [date, setDate] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [techs, setTechs] = useState<{ id: string; displayName?: string | null }[]>([]);
  const [laterOk, setLaterOk] = useState(false);

  const loadRows = useCallback(async () => {
    try {
      const models = api().models as unknown as {
        CallbackRequest?: {
          listCallbackRequestByCustomerId: (a: {
            customerId: string;
            limit?: number;
            nextToken?: string | null;
          }) => Promise<{ data: CallbackRequest[]; nextToken?: string | null }>;
        };
      };
      if (!models.CallbackRequest) {
        setRows([]);
        return;
      }
      const callbackRequests = models.CallbackRequest;
      setRows(
        await listAll((t) =>
          callbackRequests.listCallbackRequestByCustomerId({
            customerId,
            limit: 100,
            nextToken: t,
          })
        )
      );
    } catch {
      setRows([]);
    }
  }, [customerId]);
  useEffect(() => {
    void loadRows();
  }, [loadRows]);
  // The callback visit takes real technician minutes — scheduling it picks
  // a real technician whose capacity the backend reserves atomically.
  useEffect(() => {
    if (!scheduling) return;
    void (async () => {
      try {
        const data = await listAll((t) =>
          api().models.Technician.list({ limit: 200, nextToken: t })
        );
        setTechs(
          data
            .filter((t) => t.active !== false)
            .map((t) => ({ id: t.id, displayName: t.name }))
        );
      } catch {
        setTechs([]);
      }
    })();
  }, [scheduling]);

  // Scheduling reserves the technician's minutes; a second press would book a
  // second callback visit against the same request.
  const schedule = useAction(async () => {
    if (!scheduling || !date || !technicianId) return;
    opResult(
      await api().mutations.scheduleCallback({
        callbackRequestId: scheduling.id,
        scheduledDate: date,
        technicianId,
        customerRequestedLater: laterOk || undefined,
      })
    );
    setScheduling(null);
    setDate("");
    setTechnicianId("");
    setLaterOk(false);
    await loadRows();
    await onChanged();
  }, "Could not schedule");

  if (!rows || rows.length === 0) return null;

  return (
    <Card title="Guarantee callbacks">
      {rows.map((cb) => (
        <ListRow
          key={cb.id}
          title={`${cb.id} — visit ${cb.originalJobId}`}
          subtitle={
            <>
              {`Promised return by ${cb.promisedBy ?? "—"}${cb.scheduledDate ? ` · scheduled ${fmtDate(cb.scheduledDate, true)}` : ""}`}
              {cb.note ? <span className="nested-line">{cb.note}</span> : null}
              {cb.photoKey ? (
                <span className="nested-line">
                  customer photo <DocButton docKey={cb.photoKey} label="view" />
                </span>
              ) : null}
              {cb.finding ? (
                <span className="nested-line">
                  Finding: {cb.finding.replace(/_/g, " ").toLowerCase()}
                  {cb.findingNote ? ` — ${cb.findingNote}` : ""}
                </span>
              ) : null}
            </>
          }
          meta={
            <>
              <Badge
                tone={
                  cb.status === "GUARANTEE_ENDED" || cb.status === "REQUESTED"
                    ? "warn"
                    : "ok"
                }
              >
                {CALLBACK_STATUS_LABEL[cb.status] ?? cb.status.toLowerCase()}
              </Badge>
              {cb.status === "REQUESTED" ? (
                <Button small onClick={() => setScheduling(cb)}>
                  Schedule
                </Button>
              ) : null}
            </>
          }
        />
      ))}
      <Sheet
        open={scheduling !== null}
        onClose={() => setScheduling(null)}
        title="Schedule the callback"
      >
        {scheduling ? (
          <div className="form-grid">
            <p className="muted small" style={{ margin: 0 }}>
              Promised return by <strong>{scheduling.promisedBy ?? "—"}</strong>.
              The visit is at no charge — nothing to price, nothing to collect.
            </p>
            <Field label="Date">
              <DateField value={date} onChange={setDate} />
            </Field>
            <Field
              label="Technician"
              hint="The visit reserves real minutes on their day — same capacity rules as any visit"
            >
              <select
                value={technicianId}
                onChange={(e) => setTechnicianId(e.target.value)}
              >
                <option value="">Pick a technician…</option>
                {techs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.displayName ?? t.id}
                  </option>
                ))}
              </select>
            </Field>
            {scheduling.promisedBy && date > scheduling.promisedBy ? (
              <label className="inline-check small">
                <input
                  type="checkbox"
                  checked={laterOk}
                  onChange={(e) => setLaterOk(e.target.checked)}
                />{" "}
                The customer asked for this later date
              </label>
            ) : null}
            <ErrorNote error={schedule.error} />
            <Button
              block
              loading={schedule.busy}
              disabled={!date || !technicianId}
              onClick={() => void schedule.run()}
            >
              Schedule the callback visit
            </Button>
          </div>
        ) : null}
      </Sheet>
    </Card>
  );
}
