import { randomUUID } from "node:crypto";
import { dataClient } from "./dataClient";
import { forEachPage, listAll } from "./pagination";
import {
  casFencedUpdate,
  casGuardedUpdate,
  casTakeover,
} from "./atomicLock";
import { openOwnedWork, resolveOwnedWork, WORK_SUPPRESSED } from "./ownedWork";
import { cusGroup } from "./dynamicGroups";
import { listAllLifecycleCommands } from "./lifecycleCommand";

/**
 * Customer merge (design 2026-08-17) — absorb a duplicate (loser) into the
 * record being kept (survivor) as a durable, resumable, staged command.
 *
 * The command's lock is its OWN: top-level mergeLeaseNonce/mergeLeaseUntil on
 * the loser row, because (a) the CAS layer conditions on top-level DynamoDB
 * attributes — a nonce inside the mergeState JSON blob cannot fence anything —
 * and (b) the 5-minute, action-blind CustomerLifecycleClaim cannot guard a
 * merge parked for days. mergeCounterpartId is set on BOTH rows for the whole
 * command: it is the mid-merge marker every other command family refuses on
 * (see isMidMerge), and the survivor-side marker is what makes a three-party
 * overlap (A→B parked while B→C starts) detectable.
 *
 * Stage order (each write fenced on the nonce, lease renewed as it goes):
 *   CLAIM → IDENTITY → FIELDS → BILLING → PORTAL_GRANT → CHILDREN → WORK
 *   → TOMBSTONE (verify child-free, audit-first, flip, post-flip stray
 *   resolve, revoke) → COMPLETE.
 * PORTAL_GRANT runs BEFORE CHILDREN and the revoke half runs LAST, with
 * children dual-stamped [.., cus-survivor, cus-loser], so the portal never
 * goes dark mid-merge; a daily cleanup strips the loser stamp after tokens
 * have aged out.
 *
 * No stage sends email. Failures park on a MERGE_RECOVERY owned work item;
 * the daily reconcile auto-resumes at house pacing.
 */

const MERGE_LEASE_MS = 5 * 60_000;
const MERGE_RETRY_DELAY_MS = 15 * 60_000;
export const MERGE_MAX_AUTO_ATTEMPTS = 5;
/** How many CHILDREN↔TOMBSTONE verify loops before the merge fails the stage. */
const MAX_CHILD_VERIFY_LOOPS = 3;

export type MergeStage =
  | "CLAIM"
  | "IDENTITY"
  | "FIELDS"
  | "BILLING"
  | "PORTAL_GRANT"
  | "CHILDREN"
  | "WORK"
  | "TOMBSTONE"
  | "COMPLETE";

export type MergeDecisions = {
  externalRefMoved?: boolean;
  orphanedExternalRef?: string;
  bookingLinkTokenMoved?: boolean;
  stripePointer?: "SURVIVOR_KEPT" | "ADOPTED_LOSER" | "NONE";
  subscriptionsRepointed?: string[];
};

export type MergeStateBlob = {
  survivorId: string;
  idempotencyKey: string;
  stage: MergeStage;
  requestedAt: string;
  actorEmail?: string;
  attemptCount?: number;
  nextAttemptAt?: string | null;
  lastError?: string | null;
  decisions?: MergeDecisions;
  /** Per-child-model completion map for the CHILDREN pass. */
  childModelsDone?: Record<string, boolean>;
  childVerifyLoops?: number;
  /** Snapshot of every field the tombstone blanked, for the CRM banner. */
  blanked?: Record<string, unknown>;
  /** A former survivor's own absorbed ids, captured before CLAIM overwrote
   *  its marker — unioned into the new survivor's genealogy at finalize. */
  loserPriorAbsorbed?: string[];
  completedAt?: string;
  /** Set once the daily cleanup has stripped this tombstone's dual-stamps. */
  stampsCleanedAt?: string;
  recoveryWorkItemId?: string;
};

/** The survivor-side marker blob: who is being (or was) absorbed. */
type SurvivorMergeMarker = { absorbed?: string[] };

type CustomerRow = Record<string, unknown> & { id: string };

export type MergeCognitoOps = {
  ensureGroup(groupName: string): Promise<void>;
  addToGroup(username: string, groupName: string): Promise<void>;
  removeFromGroup(username: string, groupName: string): Promise<void>;
  usernamesInGroup(groupName: string): Promise<string[]>;
  groupsForUser(username: string): Promise<string[]>;
  disableUser(username: string): Promise<void>;
};

export type MergeStripeOps = {
  /** Live (not canceled) subscriptions hanging off a Stripe customer. */
  listActiveSubscriptionIds(stripeCustomerId: string): Promise<string[]>;
  /** Merge {crmCustomerId} into the subscription's metadata. */
  setSubscriptionCrmCustomer(
    subscriptionId: string,
    crmCustomerId: string
  ): Promise<void>;
  /** Label of the default payment method, or null when there is none. */
  defaultPaymentMethodLabel(stripeCustomerId: string): Promise<string | null>;
};

export type MergeDeps = {
  cognito: MergeCognitoOps;
  stripe: MergeStripeOps | null;
  actor: { sub?: string; email?: string };
};

// ---------------------------------------------------------------------------
// mergedIntoId — the follow rule
// ---------------------------------------------------------------------------

const MAX_FOLLOW_HOPS = 5;

/**
 * The follow rule: every consumer of a STORED customer id resolves it through
 * this before treating it as a live customer — frozen ids (Stripe metadata
 * snapshots, booking checkpoints, deterministic lead/import ids, S3 keys,
 * EmailLog references) all predate any merge that later retired their row.
 * Follows mergedIntoId to its terminus (bounded); returns the live row, the
 * tombstone itself if its pointer is broken, or null if the id never existed.
 */
export async function resolveMergedCustomer(
  id: string
): Promise<CustomerRow | null> {
  const client = await dataClient();
  let current = (await client.models.Customer.get({ id })).data as
    | CustomerRow
    | null;
  let hops = 0;
  while (
    current &&
    current.status === "MERGED" &&
    typeof current.mergedIntoId === "string" &&
    current.mergedIntoId &&
    hops < MAX_FOLLOW_HOPS
  ) {
    const next = (
      await client.models.Customer.get({ id: current.mergedIntoId })
    ).data as CustomerRow | null;
    if (!next) break;
    current = next;
    hops += 1;
  }
  return current;
}

/**
 * Whether this customer is part of an IN-FLIGHT merge. Every other durable
 * command family (lifecycle, group change, plan cancel, visit change, lead
 * disposition) refuses while this is true — the merge's exclusion must be
 * bidirectional or a parked merge gets trampled. A finished tombstone
 * (status MERGED) is not mid-merge; it is refused on status instead.
 */
export function isMidMerge(row: {
  mergeCounterpartId?: string | null;
  status?: string | null;
}): boolean {
  return Boolean(row.mergeCounterpartId) && row.status !== "MERGED";
}

/**
 * The survivor's marker carries a `#fields-done` progress suffix from FIELDS
 * until finalize. Anything that treats mergeCounterpartId as a customer id
 * (refusal messages, the CRM resume banner) must strip it first.
 */
export function mergeCounterpartCustomerId(
  marker: string | null | undefined
): string | null {
  if (!marker) return null;
  const hash = marker.indexOf("#");
  return hash === -1 ? marker : marker.slice(0, hash);
}

export function parseMergeState(raw: unknown): MergeStateBlob | null {
  if (!raw) return null;
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (obj && typeof obj === "object" && "stage" in obj) {
      return obj as MergeStateBlob;
    }
    return null;
  } catch {
    return null;
  }
}

function parseSurvivorMarker(raw: unknown): SurvivorMergeMarker {
  if (!raw) return {};
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    return obj && typeof obj === "object" ? (obj as SurvivorMergeMarker) : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// The child-record surface
// ---------------------------------------------------------------------------

/** Models repointed customerId → survivor. `stamped` = carries accessGroups
 *  (restamped by ADDING cus-survivor — the dual-stamp grace; cus-loser is
 *  stripped by the daily cleanup after tokens age out). */
const CHILD_MODELS: { name: string; stamped: boolean }[] = [
  { name: "ServicePlan", stamped: true },
  { name: "Job", stamped: true },
  { name: "Agreement", stamped: true },
  { name: "ServiceReport", stamped: true },
  { name: "ServiceReportAmendment", stamped: true },
  { name: "Invoice", stamped: true },
  { name: "Dispute", stamped: true },
  { name: "TreatmentObligation", stamped: true },
  { name: "PortalRequest", stamped: true },
  { name: "CallbackRequest", stamped: true },
  { name: "LeadPricingRun", stamped: false },
  { name: "LeadActivity", stamped: false },
];

/** Survivor gap-fill field set (fillIfMissing — the paid-conversion rule). */
const FILL_IF_MISSING_FIELDS = [
  "contactName",
  "email",
  "phone",
  "serviceStreet",
  "serviceUnit",
  "serviceCity",
  "serviceState",
  "serviceZip",
  "billingStreet",
  "billingCity",
  "billingState",
  "billingZip",
  "propertyClass",
  "leadSource",
] as const;

/** Everything the tombstone blanks (snapshotted into mergeState.blanked). */
const TOMBSTONE_BLANK_FIELDS = [
  "email",
  "phone",
  "serviceStreet",
  "serviceUnit",
  "serviceCity",
  "serviceState",
  "serviceZip",
  "billingStreet",
  "billingCity",
  "billingState",
  "billingZip",
  "externalRef",
  "bookingLinkToken",
  "bookingLinkTokenExpiresAt",
  "portalUserSub",
  "stripeCustomerId",
  "paymentMethodLabel",
  "paymentMethodKind",
  "groupId",
] as const;

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

export type MergeWarning = {
  code:
    | "BOTH_HAVE_CARDS"
    | "BOTH_EXTERNAL_REFS"
    | "UNEXPIRED_BOOKING_LINK"
    | "INACTIVE_SURVIVOR"
    | "OPEN_WORK_ITEMS"
    | "TOKEN_STALENESS";
  detail: string;
};

export type MergeBlocker = { code: string; detail: string };

export type MergePreview = {
  survivor: { id: string; displayName: string; status: string };
  loser: { id: string; displayName: string; status: string };
  childCounts: Record<string, number>;
  billing: {
    survivorCard: string | null;
    loserCard: string | null;
    pointerPlan: MergeDecisions["stripePointer"];
    loserActiveSubscriptions: number;
  };
  portal: {
    survivorHasLogin: boolean;
    loserHasLogin: boolean;
    sharedLogin: boolean;
  };
  fieldDiff: {
    field: string;
    survivor: unknown;
    loser: unknown;
    outcome: "KEEP" | "FILL" | "CONFLICT";
  }[];
  warnings: MergeWarning[];
  blockers: MergeBlocker[];
};

async function loadCustomer(id: string): Promise<CustomerRow | null> {
  const client = await dataClient();
  return (await client.models.Customer.get({ id })).data as CustomerRow | null;
}

async function countChildren(loserId: string): Promise<Record<string, number>> {
  const client = await dataClient();
  const counts: Record<string, number> = {};
  for (const m of CHILD_MODELS) {
    const rows = await listAll(
      (nextToken) =>
        (
          client.models as Record<
            string,
            { list: (o: object) => Promise<{ data: unknown[]; nextToken?: string | null }> }
          >
        )[m.name].list({
          filter: { customerId: { eq: loserId } },
          limit: 500,
          nextToken,
        }),
      { pageErrors: "throw" }
    );
    counts[m.name] = rows.length;
  }
  // BookingRequest carries two customer pointers; count either.
  const bookings = await listAll(
    (nextToken) =>
      client.models.BookingRequest.list({
        filter: {
          or: [
            { customerId: { eq: loserId } },
            { leadCustomerId: { eq: loserId } },
          ],
        },
        limit: 500,
        nextToken,
      }),
    { pageErrors: "throw" }
  );
  counts.BookingRequest = bookings.length;
  return counts;
}

/** Non-settled command families that must finish before a merge may start.
 *  Fails CLOSED: an unreadable scan refuses the merge. */
async function findBlockingCommands(
  customerId: string
): Promise<MergeBlocker[]> {
  const client = await dataClient();
  const blockers: MergeBlocker[] = [];

  // Lifecycle commands (deactivate/reactivate) — any non-settled one blocks.
  const lifecycle = await listAllLifecycleCommands(
    client as { models: Record<string, unknown> },
    customerId
  );
  for (const cmd of lifecycle) {
    const stage = (cmd as { stage?: string | null }).stage ?? "";
    if (stage !== "COMPLETE" && stage !== "FAILED") {
      blockers.push({
        code: "OPEN_LIFECYCLE_COMMAND",
        detail: `A ${(cmd as { action?: string }).action ?? "lifecycle"} command is not settled for ${customerId}. Finish or resume it first.`,
      });
    }
  }

  // Group-change commands (loose cast: the generated index query name sits
  // past the schema's inference-depth comfort zone).
  const groupCmdModel = (
    client.models as unknown as {
      GroupChangeCommand: {
        listGroupChangeCommandByCustomerIdAndRequestedAt: (
          key: { customerId: string },
          opts: { limit: number; nextToken?: string | null }
        ) => Promise<{ data: unknown[]; nextToken?: string | null }>;
      };
    }
  ).GroupChangeCommand;
  const groupCmds = await listAll(
    (nextToken) =>
      groupCmdModel.listGroupChangeCommandByCustomerIdAndRequestedAt(
        { customerId },
        { nextToken, limit: 200 }
      ),
    { pageErrors: "throw" }
  );
  for (const cmd of groupCmds as { stage?: string | null }[]) {
    const stage = cmd.stage ?? "";
    if (stage !== "COMPLETE" && stage !== "FAILED") {
      blockers.push({
        code: "OPEN_GROUP_CHANGE",
        detail: `A group change is not settled for ${customerId}.`,
      });
    }
  }

  // Plan-cancellation claims are keyed by servicePlanId — enumerate the
  // customer's plans first. Visit-change claims are keyed by jobId — same.
  const plans = (await listAll(
    (nextToken) =>
      client.models.ServicePlan.list({
        filter: { customerId: { eq: customerId } },
        limit: 200,
        nextToken,
      }),
    { pageErrors: "throw" }
  )) as { id: string }[];
  for (const plan of plans) {
    const { data: claim } = await client.models.PlanCancellationClaim.get({
      id: plan.id,
    });
    const stage = (claim as { stage?: string | null } | null)?.stage ?? null;
    if (claim && stage !== "COMPLETE") {
      blockers.push({
        code: "OPEN_PLAN_CANCELLATION",
        detail: `Plan ${plan.id} has an unsettled cancellation command.`,
      });
    }
  }
  const jobs = (await listAll(
    (nextToken) =>
      client.models.Job.list({
        filter: { customerId: { eq: customerId } },
        limit: 500,
        nextToken,
      }),
    { pageErrors: "throw" }
  )) as { id: string }[];
  for (const job of jobs) {
    const { data: claim } = await client.models.VisitChangeClaim.get({
      id: job.id,
    });
    // VisitChangeClaim rows are deleted on clean COMPLETE, so existence means
    // a command is live or parked.
    if (claim) {
      blockers.push({
        code: "OPEN_VISIT_CHANGE",
        detail: `Job ${job.id} has an unsettled visit-change command.`,
      });
    }
  }

  // A live lead-lifecycle claim (createLead / disposition in flight).
  try {
    const { data: leadClaim } = await client.models.LeadLifecycleClaim.get({
      id: customerId,
    });
    const until = (leadClaim as { leaseUntil?: string | null } | null)
      ?.leaseUntil;
    if (leadClaim && until && Date.parse(until) > Date.now()) {
      blockers.push({
        code: "OPEN_LEAD_CLAIM",
        detail: `A lead-lifecycle operation is in flight for ${customerId}.`,
      });
    }
  } catch {
    blockers.push({
      code: "UNREADABLE_SCAN",
      detail: "Lead-claim state could not be read; refusing (blocked is safe).",
    });
  }

  return blockers;
}

async function computePreview(
  survivorId: string,
  loserId: string,
  deps: MergeDeps
): Promise<MergePreview> {
  if (survivorId === loserId) {
    throw new Error("survivorId and loserId must differ.");
  }
  const survivor = await loadCustomer(survivorId);
  const loser = await loadCustomer(loserId);
  if (!survivor) throw new Error(`Survivor ${survivorId} not found.`);
  if (!loser) throw new Error(`Loser ${loserId} not found.`);

  const blockers: MergeBlocker[] = [];
  const warnings: MergeWarning[] = [];

  if (loser.status === "MERGED") {
    blockers.push({
      code: "LOSER_ALREADY_MERGED",
      detail: `${loserId} was already merged into ${String(loser.mergedIntoId ?? "another record")}.`,
    });
  }
  if (survivor.status === "MERGED") {
    blockers.push({
      code: "SURVIVOR_IS_TOMBSTONE",
      detail: `${survivorId} was merged into ${String(survivor.mergedIntoId ?? "another record")} — merge into that record instead.`,
    });
  }
  // Mid-merge markers block — UNLESS they name exactly THIS pair, which is a
  // half-claim (a crash between the two CLAIM marks) the self-repairing
  // claim path is allowed to re-assert and complete.
  const survivorMarker = mergeCounterpartCustomerId(
    (survivor.mergeCounterpartId as string | null) ?? null
  );
  const loserMarker = mergeCounterpartCustomerId(
    (loser.mergeCounterpartId as string | null) ?? null
  );
  const survivorForeign =
    Boolean(survivorMarker) && survivorMarker !== loserId;
  const loserForeign = Boolean(loserMarker) && loserMarker !== survivorId;
  if (
    (isMidMerge(survivor as { mergeCounterpartId?: string | null; status?: string | null }) &&
      survivorForeign) ||
    (isMidMerge(loser as { mergeCounterpartId?: string | null; status?: string | null }) &&
      loserForeign)
  ) {
    blockers.push({
      code: "MERGE_IN_FLIGHT",
      detail:
        "One of these records is already part of a DIFFERENT in-flight merge. Resume or finish it first.",
    });
  }
  // Group conflict: refused in v1 — the GroupChangeCommand owns that surface.
  if (loser.groupId && loser.groupId !== survivor.groupId) {
    blockers.push({
      code: "GROUP_CONFLICT",
      detail:
        "The duplicate belongs to a customer group the survivor doesn't. Move or clear its group first, then merge.",
    });
  }

  blockers.push(...(await findBlockingCommands(survivorId)));
  blockers.push(...(await findBlockingCommands(loserId)));

  const childCounts = await countChildren(loserId);

  // Billing facts + pointer plan.
  let survivorCard: string | null = null;
  let loserCard: string | null = null;
  let loserActiveSubscriptions = 0;
  if (deps.stripe) {
    if (survivor.stripeCustomerId) {
      survivorCard = await deps.stripe.defaultPaymentMethodLabel(
        String(survivor.stripeCustomerId)
      );
    }
    if (loser.stripeCustomerId) {
      loserCard = await deps.stripe.defaultPaymentMethodLabel(
        String(loser.stripeCustomerId)
      );
      loserActiveSubscriptions = (
        await deps.stripe.listActiveSubscriptionIds(
          String(loser.stripeCustomerId)
        )
      ).length;
    }
  }
  const pointerPlan: MergeDecisions["stripePointer"] =
    !survivorCard && loserCard ? "ADOPTED_LOSER" : survivorCard ? "SURVIVOR_KEPT" : "NONE";
  if (survivorCard && loserCard) {
    warnings.push({
      code: "BOTH_HAVE_CARDS",
      detail: `Both records have a saved payment method (kept: ${survivorCard}; not kept: ${loserCard}). Re-collect if the kept card is wrong.`,
    });
  }

  if (loser.externalRef && survivor.externalRef) {
    warnings.push({
      code: "BOTH_EXTERNAL_REFS",
      detail: `Both records carry a marketplace thread id. The duplicate's thread (${String(loser.externalRef)}) will be orphaned — future messages on it will page sales instead of reaching this customer.`,
    });
  }
  const tokenExpiry = loser.bookingLinkTokenExpiresAt
    ? Date.parse(String(loser.bookingLinkTokenExpiresAt))
    : 0;
  if (loser.bookingLinkToken && tokenExpiry > Date.now()) {
    warnings.push({
      code: "UNEXPIRED_BOOKING_LINK",
      detail: survivor.bookingLinkToken
        ? "The duplicate has an unexpired emailed booking link; it will be expired (the survivor already has one)."
        : "The duplicate has an unexpired emailed booking link; it will be moved to the survivor so the emailed link keeps working.",
    });
  }
  if (survivor.status === "INACTIVE") {
    warnings.push({
      code: "INACTIVE_SURVIVOR",
      detail: "The record being kept is INACTIVE — the merged customer stays inactive.",
    });
  }
  warnings.push({
    code: "TOKEN_STALENESS",
    detail:
      "If this customer is signed into the portal right now, actions may fail for up to an hour until their session refreshes. Reading their records keeps working throughout.",
  });

  // Open work items naming the loser (informational count).
  const client = await dataClient();
  let openWork = 0;
  await forEachPage(
    (nextToken) =>
      client.models.WorkItem.listWorkItemByStatusAndDueAt(
        { status: "OPEN" },
        { nextToken, limit: 200 }
      ),
    (items) => {
      for (const it of items as { customerId?: string | null; relatedId?: string | null }[]) {
        if (it.customerId === loserId || it.relatedId === loserId) openWork++;
      }
    },
    { pageErrors: "ignore" }
  );
  if (openWork > 0) {
    warnings.push({
      code: "OPEN_WORK_ITEMS",
      detail: `${openWork} open work item${openWork === 1 ? "" : "s"} name the duplicate; they will be repointed to the survivor.`,
    });
  }

  const fieldDiff = FILL_IF_MISSING_FIELDS.map((field) => {
    const s = survivor[field];
    const l = loser[field];
    const outcome: "KEEP" | "FILL" | "CONFLICT" = !s && l ? "FILL" : s && l && s !== l ? "CONFLICT" : "KEEP";
    return { field, survivor: s ?? null, loser: l ?? null, outcome };
  }).filter((d) => d.loser !== null || d.survivor !== null);

  return {
    survivor: {
      id: survivorId,
      displayName: String(survivor.displayName ?? survivorId),
      status: String(survivor.status ?? ""),
    },
    loser: {
      id: loserId,
      displayName: String(loser.displayName ?? loserId),
      status: String(loser.status ?? ""),
    },
    childCounts,
    billing: {
      survivorCard,
      loserCard,
      pointerPlan,
      loserActiveSubscriptions,
    },
    portal: {
      survivorHasLogin: Boolean(survivor.portalUserSub),
      loserHasLogin: Boolean(loser.portalUserSub),
      sharedLogin:
        Boolean(survivor.portalUserSub) &&
        survivor.portalUserSub === loser.portalUserSub,
    },
    fieldDiff,
    warnings,
    blockers,
  };
}

// ---------------------------------------------------------------------------
// The staged executor
// ---------------------------------------------------------------------------

type MergeOutcome =
  | { decision: "PREVIEW"; preview: MergePreview }
  | { decision: "REFUSED"; blockers: MergeBlocker[] }
  | {
      decision: "NEEDS_ACKNOWLEDGEMENT";
      warnings: MergeWarning[];
      preview: MergePreview;
    }
  | {
      decision: "MERGED";
      survivorId: string;
      loserId: string;
      decisions: MergeDecisions;
    }
  | {
      decision: "PARTIAL";
      stage: MergeStage;
      error: string;
      idempotencyKey: string;
    };

const stateJson = (blob: MergeStateBlob): string => JSON.stringify(blob);

async function writeStage(
  loserId: string,
  nonce: string,
  blob: MergeStateBlob,
  extraSets: Record<string, string | number | boolean | null> = {}
): Promise<void> {
  const res = await casFencedUpdate(
    "Customer",
    loserId,
    { field: "mergeLeaseNonce", nonce },
    {
      mergeState: stateJson(blob),
      mergeLeaseUntil: new Date(Date.now() + MERGE_LEASE_MS).toISOString(),
      ...extraSets,
    }
  );
  if (!res.ok) {
    throw new Error(
      `merge ${loserId}: lost the lease mid-stage (${blob.stage}) — standing down`
    );
  }
}

async function appendAudit(
  customerId: string,
  action: string,
  effects: string,
  actor: MergeDeps["actor"],
  dedupeId: string
): Promise<void> {
  const client = await dataClient();
  try {
    await client.models.CustomerLifecycleEvent.create({
      id: dedupeId,
      customerId,
      action,
      actorSub: actor.sub ?? undefined,
      actorEmail: actor.email ?? "system",
      reason: "Duplicate-customer merge",
      effects,
      occurredAt: new Date().toISOString(),
    });
  } catch {
    // A conflict on the deterministic id means a prior attempt already
    // recorded it — exactly the replay this dedupes.
  }
}

export async function mergeCustomers(input: {
  action: "PREVIEW" | "EXECUTE" | "RESUME";
  survivorId: string;
  loserId: string;
  idempotencyKey: string;
  acknowledgeWarnings?: boolean;
  deps: MergeDeps;
}): Promise<MergeOutcome> {
  const { survivorId, loserId, idempotencyKey, deps } = input;

  if (input.action === "PREVIEW") {
    return {
      decision: "PREVIEW",
      preview: await computePreview(survivorId, loserId, deps),
    };
  }

  // ---- adopt / claim / resume -------------------------------------------
  const nonce = `merge-${randomUUID()}`;
  let blob: MergeStateBlob | null = null;

  const loserNow = await loadCustomer(loserId);
  if (!loserNow) throw new Error(`Loser ${loserId} not found.`);
  const existing = parseMergeState(loserNow.mergeState);

  if (existing && existing.survivorId === survivorId) {
    if (existing.stage === "COMPLETE") {
      return {
        decision: "MERGED",
        survivorId,
        loserId,
        decisions: existing.decisions ?? {},
      };
    }
    if (
      existing.idempotencyKey !== idempotencyKey &&
      input.action === "EXECUTE"
    ) {
      return {
        decision: "REFUSED",
        blockers: [
          {
            code: "MERGE_IN_FLIGHT",
            detail:
              "This merge is already in flight under a different request. Resume it instead of starting again.",
          },
        ],
      };
    }
    // Same merge — take over its expired lease and resume from its stage.
    const takeover = await casTakeover("Customer", loserId, {
      nonceField: "mergeLeaseNonce",
      nonce,
      leaseField: "mergeLeaseUntil",
      leaseMs: MERGE_LEASE_MS,
    });
    if (!takeover.ok) {
      return {
        decision: "PARTIAL",
        stage: existing.stage,
        error: "Another worker holds this merge's lease right now.",
        idempotencyKey: existing.idempotencyKey,
      };
    }
    blob = existing;
    // Every resume re-asserts the survivor-side marker (a crash between the
    // CLAIM marks, or a raced value-guarded rollback, may have left it
    // unset) and re-arms the CHILDREN verify budget — the loop cap bounds
    // one attempt's work, not the merge's lifetime.
    if (blob.stage !== "COMPLETE") {
      const survivorRow = await loadCustomer(survivorId);
      const marker = String(survivorRow?.mergeCounterpartId ?? "");
      if (!marker) {
        const reassert = await casGuardedUpdate(
          "Customer",
          survivorId,
          { mergeCounterpartId: loserId },
          [
            { kind: "fieldMissingOrNull", field: "mergeCounterpartId" },
            { kind: "fieldNotIn", field: "status", values: ["MERGED"] },
          ]
        );
        if (!reassert.ok) {
          throw new Error(
            "merge: survivor marker could not be re-asserted on resume"
          );
        }
      } else if (mergeCounterpartCustomerId(marker) !== loserId) {
        throw new Error(
          `merge: survivor ${survivorId} is marked for a different merge (${marker})`
        );
      }
      blob.childVerifyLoops = 0;
    }
  } else if (existing) {
    return {
      decision: "REFUSED",
      blockers: [
        {
          code: "MERGE_IN_FLIGHT",
          detail: `${loserId} is mid-merge with ${existing.survivorId}, not ${survivorId}.`,
        },
      ],
    };
  } else {
    // Fresh EXECUTE: full preview gate first.
    const preview = await computePreview(survivorId, loserId, deps);
    if (preview.blockers.length > 0) {
      return { decision: "REFUSED", blockers: preview.blockers };
    }
    const actionableWarnings = preview.warnings.filter(
      (w) => w.code !== "TOKEN_STALENESS"
    );
    if (actionableWarnings.length > 0 && !input.acknowledgeWarnings) {
      return {
        decision: "NEEDS_ACKNOWLEDGEMENT",
        warnings: actionableWarnings,
        preview,
      };
    }

    // The loser's own prior marker (a former survivor's absorbed list) is
    // about to be overwritten by the command blob — capture the genealogy so
    // the finalize can union it into the new survivor's absorbed set.
    const loserPriorAbsorbed = parseSurvivorMarker(loserNow.mergeState).absorbed;
    blob = {
      survivorId,
      idempotencyKey,
      stage: "CLAIM",
      requestedAt: new Date().toISOString(),
      actorEmail: deps.actor.email,
      decisions: {},
      childModelsDone: {},
      ...(loserPriorAbsorbed?.length ? { loserPriorAbsorbed } : {}),
    };

    // Mark both rows, lower id first — a fixed order cannot deadlock with a
    // concurrent reverse merge; exactly one of A→B / B→A wins its first CAS.
    // fieldEqualsOrMissing (not missing-only) makes the claim SELF-REPAIRING:
    // a crash between the two marks leaves a half-claim that the next EXECUTE
    // of the same pair re-asserts and completes, instead of a frozen pair no
    // sweep can see.
    const ordered = [survivorId, loserId].sort();
    const marks: Record<string, Record<string, string | number | boolean | null>> = {
      [survivorId]: { mergeCounterpartId: loserId },
      [loserId]: {
        mergeCounterpartId: survivorId,
        mergeLeaseNonce: nonce,
        mergeLeaseUntil: new Date(Date.now() + MERGE_LEASE_MS).toISOString(),
        mergeState: stateJson(blob),
      },
    };
    const counterpartOf: Record<string, string> = {
      [survivorId]: loserId,
      [loserId]: survivorId,
    };
    const claimConditions = (rowId: string): Parameters<typeof casGuardedUpdate>[3] => [
      {
        kind: "fieldEqualsOrMissing",
        field: "mergeCounterpartId",
        value: counterpartOf[rowId],
      },
      { kind: "fieldNotIn", field: "status", values: ["MERGED"] },
    ];
    const first = await casGuardedUpdate(
      "Customer",
      ordered[0],
      marks[ordered[0]],
      claimConditions(ordered[0])
    );
    if (!first.ok) {
      return {
        decision: "REFUSED",
        blockers: [
          {
            code: "MERGE_IN_FLIGHT",
            detail: "Another merge claimed one of these records first.",
          },
        ],
      };
    }
    const second = await casGuardedUpdate(
      "Customer",
      ordered[1],
      marks[ordered[1]],
      claimConditions(ordered[1])
    );
    if (!second.ok) {
      // Roll the first mark back and stand down — the counterparty's merge
      // won. The loser-side rollback is FENCED on our nonce so a stalled
      // worker waking late can never erase a resumer's live command; the
      // survivor-side rollback is value-guarded, and a stray survives it
      // only until the pair's next self-repairing claim.
      if (ordered[0] === loserId) {
        await casFencedUpdate(
          "Customer",
          loserId,
          { field: "mergeLeaseNonce", nonce },
          {
            mergeCounterpartId: null,
            mergeLeaseNonce: null,
            mergeLeaseUntil: null,
            mergeState: null,
          }
        );
      } else {
        await casGuardedUpdate(
          "Customer",
          survivorId,
          { mergeCounterpartId: null },
          [
            {
              kind: "fieldEquals",
              field: "mergeCounterpartId",
              value: loserId,
            },
          ]
        );
      }
      return {
        decision: "REFUSED",
        blockers: [
          {
            code: "MERGE_IN_FLIGHT",
            detail: "Another merge claimed one of these records first.",
          },
        ],
      };
    }

    // The preview's blocker scan ran BEFORE the marks landed, and a command
    // claimed in that window (or invisible to an eventually-consistent GSI
    // read) would now interleave with the merge. Re-scan under the held
    // claim; on any hit, release both marks and refuse. A residual window
    // remains only for a command that both started AND finished its own
    // claim between our scan and marks — the other families' own mid-merge
    // gates shrink that to the same seconds-wide double-race.
    const lateBlockers = [
      ...(await findBlockingCommands(survivorId)),
      ...(await findBlockingCommands(loserId)),
    ];
    if (lateBlockers.length > 0) {
      await casFencedUpdate(
        "Customer",
        loserId,
        { field: "mergeLeaseNonce", nonce },
        {
          mergeCounterpartId: null,
          mergeLeaseNonce: null,
          mergeLeaseUntil: null,
          mergeState: null,
        }
      );
      await casGuardedUpdate("Customer", survivorId, { mergeCounterpartId: null }, [
        { kind: "fieldEquals", field: "mergeCounterpartId", value: loserId },
      ]);
      return { decision: "REFUSED", blockers: lateBlockers };
    }
    blob.stage = "IDENTITY";
    await writeStage(loserId, nonce, blob);
  }

  // ---- drive the stages --------------------------------------------------
  try {
    const outcome = await driveStages(survivorId, loserId, nonce, blob, deps);
    return outcome;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failed: MergeStateBlob = {
      ...blob,
      attemptCount: (blob.attemptCount ?? 0) + 1,
      nextAttemptAt: new Date(Date.now() + MERGE_RETRY_DELAY_MS).toISOString(),
      lastError: message,
    };
    const work = await openOwnedWork({
      kind: "MERGE_RECOVERY",
      dedupeKey: `merge:${loserId}`,
      title: `Customer merge needs a resume: ${String(loserNow.displayName ?? loserId)}`,
      detail: `Merging ${loserId} into ${survivorId} stopped at stage ${failed.stage} (attempt ${failed.attemptCount}): ${message}. Both records are frozen against other lifecycle changes until this finishes.`,
      customerId: survivorId,
      relatedId: loserId,
      sourceUrl: `/customers/${survivorId}`,
      resolutionAction:
        "Resume the merge from the survivor's customer screen (or wait for the daily auto-resume) and verify it completes.",
      ownerTeam: "OPS",
    });
    if (work && work !== WORK_SUPPRESSED) failed.recoveryWorkItemId = work;
    // Park with the lease RELEASED so the next resume needn't wait it out.
    await casFencedUpdate(
      "Customer",
      loserId,
      { field: "mergeLeaseNonce", nonce },
      { mergeState: stateJson(failed), mergeLeaseUntil: null }
    ).catch(() => undefined);
    return {
      decision: "PARTIAL",
      stage: failed.stage,
      error: message,
      idempotencyKey: blob.idempotencyKey,
    };
  }
}

async function driveStages(
  survivorId: string,
  loserId: string,
  nonce: string,
  blob: MergeStateBlob,
  deps: MergeDeps
): Promise<MergeOutcome> {
  const order: MergeStage[] = [
    "IDENTITY",
    "FIELDS",
    "BILLING",
    "PORTAL_GRANT",
    "CHILDREN",
    "WORK",
    "TOMBSTONE",
  ];
  let idx = order.indexOf(blob.stage);
  if (idx < 0) idx = 0; // CLAIM resumes at IDENTITY

  for (; idx < order.length; idx++) {
    const stage = order[idx];
    blob.stage = stage;
    switch (stage) {
      case "IDENTITY": {
        const survivor = await loadCustomer(survivorId);
        const loser = await loadCustomer(loserId);
        if (!survivor || !loser) throw new Error("merge: row vanished mid-command");
        const decisions = blob.decisions ?? {};
        // The moves must LAND or the merge parks — TOMBSTONE later blanks the
        // loser's copy, so a swallowed LOST here would destroy the only copy
        // of a thread ref or an emailed link. A lost write whose target
        // already holds the value (a prior attempt's landing) is success.
        if (loser.externalRef && !survivor.externalRef) {
          const moved = await casGuardedUpdate(
            "Customer",
            survivorId,
            { externalRef: String(loser.externalRef) },
            [{ kind: "fieldMissingOrNull", field: "externalRef" }]
          );
          if (!moved.ok) {
            const check = await loadCustomer(survivorId);
            if (check?.externalRef !== loser.externalRef) {
              throw new Error("merge: externalRef move did not land");
            }
          }
          decisions.externalRefMoved = true;
        } else if (loser.externalRef && survivor.externalRef) {
          decisions.orphanedExternalRef = String(loser.externalRef);
        }
        const expiry = loser.bookingLinkTokenExpiresAt
          ? Date.parse(String(loser.bookingLinkTokenExpiresAt))
          : 0;
        if (
          loser.bookingLinkToken &&
          expiry > Date.now() &&
          !survivor.bookingLinkToken
        ) {
          const moved = await casGuardedUpdate(
            "Customer",
            survivorId,
            {
              bookingLinkToken: String(loser.bookingLinkToken),
              bookingLinkTokenExpiresAt: String(loser.bookingLinkTokenExpiresAt),
            },
            [{ kind: "fieldMissingOrNull", field: "bookingLinkToken" }]
          );
          if (!moved.ok) {
            const check = await loadCustomer(survivorId);
            if (check?.bookingLinkToken !== loser.bookingLinkToken) {
              throw new Error("merge: booking-link token move did not land");
            }
          }
          decisions.bookingLinkTokenMoved = true;
        }
        // Either way the loser's token dies NOW — two live rows must never
        // resolve the same indexed token.
        const killed = await casFencedUpdate(
          "Customer",
          loserId,
          { field: "mergeLeaseNonce", nonce },
          { bookingLinkToken: null, bookingLinkTokenExpiresAt: null }
        );
        if (!killed.ok) {
          throw new Error("merge: lost the lease killing the loser's booking link");
        }
        blob.decisions = decisions;
        blob.stage = "FIELDS";
        await writeStage(loserId, nonce, blob);
        break;
      }
      case "FIELDS": {
        const survivor = await loadCustomer(survivorId);
        const loser = await loadCustomer(loserId);
        if (!survivor || !loser) throw new Error("merge: row vanished mid-command");
        const marker = String(survivor.mergeCounterpartId ?? "");
        if (marker === `${loserId}#fields-done`) {
          blob.stage = "BILLING";
          await writeStage(loserId, nonce, blob);
          break;
        }
        const sets: Record<string, string | number | boolean | null> = {};
        for (const f of FILL_IF_MISSING_FIELDS) {
          if (!survivor[f] && loser[f]) sets[f] = String(loser[f]);
        }
        // TCPA: consent evidence moves ONLY with the channel value it attests.
        const phoneCopied = "phone" in sets;
        const emailCopied = "email" in sets;
        if (
          !survivor.contactConsent &&
          loser.contactConsent &&
          (phoneCopied || emailCopied)
        ) {
          sets.contactConsent = true;
          for (const f of [
            "contactConsentAt",
            "contactConsentSource",
            "contactConsentText",
            "contactConsentPolicyVersion",
          ]) {
            if (loser[f]) sets[f] = String(loser[f]);
          }
        }
        if (loser.doNotContact && !survivor.doNotContact) {
          sets.doNotContact = true;
          if (loser.doNotContactAt) sets.doNotContactAt = String(loser.doNotContactAt);
          if (loser.doNotContactBy) sets.doNotContactBy = String(loser.doNotContactBy);
        }
        for (const f of ["lastTouchedAt", "lastAttemptedAt", "lastReachedAt"]) {
          const s = survivor[f] ? Date.parse(String(survivor[f])) : 0;
          const l = loser[f] ? Date.parse(String(loser[f])) : 0;
          if (l > s) sets[f] = String(loser[f]);
        }
        const conflictNotes = FILL_IF_MISSING_FIELDS.filter(
          (f) => survivor[f] && loser[f] && survivor[f] !== loser[f]
        )
          .map((f) => `${f}: ${String(loser[f])}`)
          .join("; ");
        const provenance = `\n— Merged from ${String(loser.displayName ?? loserId)} (${loserId}) on ${new Date().toISOString().slice(0, 10)}${conflictNotes ? ` — their differing details: ${conflictNotes}` : ""}`;
        sets.notes = `${String(survivor.notes ?? "")}${provenance}`;
        // Documents: append the loser's entries (fileKeys stay under the
        // loser's S3 prefix; entitlement follows the merge pointer).
        try {
          const sDocs = survivor.documents
            ? JSON.parse(String(survivor.documents))
            : [];
          const lDocs = loser.documents ? JSON.parse(String(loser.documents)) : [];
          if (Array.isArray(lDocs) && lDocs.length > 0) {
            sets.documents = JSON.stringify([
              ...(Array.isArray(sDocs) ? sDocs : []),
              ...lDocs,
            ]);
          }
        } catch {
          // Unparseable documents never block a merge; they stay put.
        }
        // The whole gap-fill is ONE conditional write that also advances the
        // survivor-side marker — single-row atomicity, so a crash cannot
        // double-append the provenance or the documents.
        const wrote = await casGuardedUpdate(
          "Customer",
          survivorId,
          { ...sets, mergeCounterpartId: `${loserId}#fields-done` },
          [{ kind: "fieldEquals", field: "mergeCounterpartId", value: loserId }]
        );
        if (!wrote.ok) {
          // Marker neither fresh nor advanced — someone tampered; fail loud.
          const check = await loadCustomer(survivorId);
          if (
            String(check?.mergeCounterpartId ?? "") !== `${loserId}#fields-done`
          ) {
            throw new Error("merge: survivor marker lost during FIELDS");
          }
        }
        blob.stage = "BILLING";
        await writeStage(loserId, nonce, blob);
        break;
      }
      case "BILLING": {
        const survivor = await loadCustomer(survivorId);
        const loser = await loadCustomer(loserId);
        if (!survivor || !loser) throw new Error("merge: row vanished mid-command");
        const decisions = blob.decisions ?? {};
        if (deps.stripe && loser.stripeCustomerId) {
          const survivorCard = survivor.stripeCustomerId
            ? await deps.stripe.defaultPaymentMethodLabel(
                String(survivor.stripeCustomerId)
              )
            : null;
          const loserCard = await deps.stripe.defaultPaymentMethodLabel(
            String(loser.stripeCustomerId)
          );
          if (!survivorCard && loserCard) {
            const adopted = await casGuardedUpdate(
              "Customer",
              survivorId,
              {
                stripeCustomerId: String(loser.stripeCustomerId),
                paymentMethodLabel: loser.paymentMethodLabel
                  ? String(loser.paymentMethodLabel)
                  : loserCard,
                paymentMethodKind: loser.paymentMethodKind
                  ? String(loser.paymentMethodKind)
                  : "CARD",
              },
              [
                {
                  kind: "fieldEquals",
                  field: "mergeCounterpartId",
                  value: `${loserId}#fields-done`,
                },
              ]
            );
            if (!adopted.ok) {
              const check = await loadCustomer(survivorId);
              if (check?.stripeCustomerId !== loser.stripeCustomerId) {
                // TOMBSTONE blanks the loser's pointer — a swallowed miss
                // here would orphan the person's only saved card.
                throw new Error("merge: Stripe pointer adoption did not land");
              }
            }
            decisions.stripePointer = "ADOPTED_LOSER";
          } else {
            decisions.stripePointer = survivorCard ? "SURVIVOR_KEPT" : "NONE";
          }
          // Webhooks attribute subscription invoices from FROZEN metadata —
          // repoint every live subscription so post-merge invoices name the
          // survivor. (Invoices already minted resolve via the follow rule.)
          const done = new Set(decisions.subscriptionsRepointed ?? []);
          const subs = await deps.stripe.listActiveSubscriptionIds(
            String(loser.stripeCustomerId)
          );
          for (const subId of subs) {
            if (done.has(subId)) continue;
            await deps.stripe.setSubscriptionCrmCustomer(subId, survivorId);
            done.add(subId);
            decisions.subscriptionsRepointed = [...done];
            blob.decisions = decisions;
            await writeStage(loserId, nonce, blob);
          }
        }
        blob.decisions = decisions;
        blob.stage = "PORTAL_GRANT";
        await writeStage(loserId, nonce, blob);
        break;
      }
      case "PORTAL_GRANT": {
        const survivor = await loadCustomer(survivorId);
        const loser = await loadCustomer(loserId);
        if (!survivor || !loser) throw new Error("merge: row vanished mid-command");
        const usernames = await deps.cognito.usernamesInGroup(
          cusGroup(loserId)
        );
        if (usernames.length > 0) {
          await deps.cognito.ensureGroup(cusGroup(survivorId));
          for (const u of usernames) {
            await deps.cognito.addToGroup(u, cusGroup(survivorId));
          }
        }
        if (loser.portalUserSub && !survivor.portalUserSub) {
          const repointed = await casGuardedUpdate(
            "Customer",
            survivorId,
            {
              portalUserSub: String(loser.portalUserSub),
              portalInvitedAt: loser.portalInvitedAt
                ? String(loser.portalInvitedAt)
                : null,
            },
            [
              {
                kind: "fieldEquals",
                field: "mergeCounterpartId",
                value: `${loserId}#fields-done`,
              },
            ]
          );
          if (!repointed.ok) {
            const check = await loadCustomer(survivorId);
            if (check?.portalUserSub !== loser.portalUserSub) {
              // TOMBSTONE blanks the loser's sub — a swallowed miss would
              // sever the person's only portal login.
              throw new Error("merge: portal login repoint did not land");
            }
          }
        }
        blob.stage = "CHILDREN";
        await writeStage(loserId, nonce, blob);
        break;
      }
      case "CHILDREN": {
        const done = blob.childModelsDone ?? {};
        for (const m of CHILD_MODELS) {
          if (done[m.name]) continue;
          await repointChildModel(m, loserId, survivorId);
          done[m.name] = true;
          blob.childModelsDone = done;
          await writeStage(loserId, nonce, blob);
        }
        if (!done.BookingRequest) {
          await repointBookingRequests(loserId, survivorId);
          done.BookingRequest = true;
          blob.childModelsDone = done;
        }
        blob.stage = "WORK";
        await writeStage(loserId, nonce, blob);
        break;
      }
      case "WORK": {
        await repointOpenWork(loserId, survivorId);
        blob.stage = "TOMBSTONE";
        await writeStage(loserId, nonce, blob);
        break;
      }
      case "TOMBSTONE": {
        // Verify-before-terminal (the GroupChange rule): anything a race
        // created on the loser after CHILDREN's cursor passed loops us back
        // instead of tombstoning over live records.
        const straggler = await anyChildLeft(loserId);
        if (straggler) {
          const loops = (blob.childVerifyLoops ?? 0) + 1;
          if (loops > MAX_CHILD_VERIFY_LOOPS) {
            throw new Error(
              `merge: children keep appearing on ${loserId} (${straggler}) — a writer is racing this merge`
            );
          }
          blob.childVerifyLoops = loops;
          blob.childModelsDone = {};
          blob.stage = "CHILDREN";
          await writeStage(loserId, nonce, blob);
          idx = order.indexOf("CHILDREN") - 1; // loop back
          break;
        }

        const loser = await loadCustomer(loserId);
        if (!loser) throw new Error("merge: loser vanished before tombstone");

        // Audit FIRST — deterministic ids make the appends replay-safe.
        await appendAudit(
          loserId,
          "MERGED_AWAY",
          `Merged into ${survivorId}`,
          deps.actor,
          `merge-${loserId}-away`
        );
        await appendAudit(
          survivorId,
          "ABSORBED_DUPLICATE",
          `Absorbed duplicate ${loserId}`,
          deps.actor,
          `merge-${loserId}-absorb`
        );

        // The terminal flip: status, pointer, and the blanking — one fenced
        // write, with the snapshot preserved for the CRM tombstone banner.
        // MERGED with prior state, never rebuilt from scratch: a resume after
        // the first flip reads an already-blanked row, and an empty rebuild
        // would destroy the only preserved copy of the loser's identity.
        const blanked: Record<string, unknown> = { ...(blob.blanked ?? {}) };
        const blanks: Record<string, null> = {} as Record<string, null>;
        for (const f of TOMBSTONE_BLANK_FIELDS) {
          if (loser[f] !== undefined && loser[f] !== null) blanked[f] = loser[f];
          blanks[f] = null;
        }
        blob.blanked = blanked;
        blob.stage = "TOMBSTONE";
        const flip = await casFencedUpdate(
          "Customer",
          loserId,
          { field: "mergeLeaseNonce", nonce },
          {
            ...blanks,
            status: "MERGED",
            mergedIntoId: survivorId,
            mergeState: stateJson(blob),
            mergeLeaseUntil: new Date(Date.now() + MERGE_LEASE_MS).toISOString(),
          }
        );
        if (!flip.ok) throw new Error("merge: lost the lease at the terminal flip");

        // POST-flip stray resolve: anything the 15-minute lead sweep
        // re-created between WORK and now dies here — and cannot come back,
        // because the loser is no longer status=LEAD.
        await repointOpenWork(loserId, survivorId);

        // Revoke the loser's access LAST: membership only, never killLogin —
        // one login can serve many properties.
        const usernames = await deps.cognito.usernamesInGroup(
          cusGroup(loserId)
        );
        for (const u of usernames) {
          await deps.cognito.removeFromGroup(u, cusGroup(loserId));
          const remaining = (await deps.cognito.groupsForUser(u)).filter(
            (g) =>
              g === "CUSTOMER" || g.startsWith("cus-") || g.startsWith("grp-")
          );
          const substantive = remaining.filter((g) => g !== "CUSTOMER");
          if (substantive.length === 0) {
            await deps.cognito.disableUser(u);
          }
        }

        // Survivor finalize: clear its marker, record the absorption — the
        // genealogy unions the loser's OWN absorbed ids (a former survivor),
        // so verifiers that scan by absorbed ids keep seeing grandchildren.
        // CHECKED: a swallowed LOST here would leave the survivor frozen
        // mid-merge forever with every recovery path closed.
        const survivor = await loadCustomer(survivorId);
        const marker = parseSurvivorMarker(survivor?.mergeState);
        const absorbed = Array.from(
          new Set([
            ...(marker.absorbed ?? []),
            ...(blob.loserPriorAbsorbed ?? []),
            loserId,
          ])
        );
        const finalized = await casGuardedUpdate(
          "Customer",
          survivorId,
          {
            mergeCounterpartId: null,
            mergeState: JSON.stringify({ absorbed }),
          },
          [
            {
              kind: "fieldIn",
              field: "mergeCounterpartId",
              values: [loserId, `${loserId}#fields-done`],
            },
          ]
        );
        if (!finalized.ok) {
          const check = await loadCustomer(survivorId);
          if (check?.mergeCounterpartId) {
            throw new Error("merge: survivor finalize did not land");
          }
        }

        const complete: MergeStateBlob = {
          ...blob,
          stage: "COMPLETE",
          completedAt: new Date().toISOString(),
        };
        const done = await casFencedUpdate(
          "Customer",
          loserId,
          { field: "mergeLeaseNonce", nonce },
          { mergeState: stateJson(complete), mergeLeaseUntil: null }
        );
        if (!done.ok) {
          throw new Error("merge: lost the lease writing COMPLETE");
        }

        // Resolve the recovery case only once COMPLETE is durably recorded —
        // never while a park could still need it.
        await resolveOwnedWork({
          kind: "MERGE_RECOVERY",
          dedupeKey: `merge:${loserId}`,
          note: "The merge completed.",
        });
        return {
          decision: "MERGED",
          survivorId,
          loserId,
          decisions: blob.decisions ?? {},
        };
      }
      default:
        break;
    }
  }
  throw new Error(`merge: unreachable stage state ${blob.stage}`);
}

// ---------------------------------------------------------------------------
// Child repointing
// ---------------------------------------------------------------------------

type AnyModel = {
  list: (o: {
    filter?: object;
    limit?: number;
    nextToken?: string;
  }) => Promise<{ data: unknown[]; nextToken?: string | null }>;
  update: (o: object) => Promise<{ data: unknown }>;
};

/**
 * A FULL filtered scan with a real nextToken loop. An Amplify filtered list
 * is a DynamoDB Scan whose `limit` bounds items EVALUATED BEFORE the filter —
 * a page can be empty with matches deeper in the table, so a single-page read
 * is never "no matches" (the exact hazard shared/pagination.ts documents).
 * Throws on page errors: every caller here feeds a repoint or a terminal
 * verify, and a partial scan must park the merge, not pass it.
 */
async function scanAllByFilter(
  api: AnyModel,
  filter: object
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let nextToken: string | undefined;
  do {
    const page = await api.list({ filter, limit: 500, nextToken });
    const errs = (page as { errors?: { message: string }[] }).errors;
    if (errs?.length) {
      throw new Error(errs.map((e) => e.message).join("; "));
    }
    out.push(...(page.data as Record<string, unknown>[]));
    nextToken = page.nextToken ?? undefined;
  } while (nextToken);
  return out;
}

async function models(): Promise<Record<string, AnyModel>> {
  const c = await dataClient();
  // Assigning through `unknown` first keeps tsc from deep-comparing the
  // V6Client models type (the schema sits at the inference-depth ceiling).
  const m: unknown = c.models;
  return m as Record<string, AnyModel>;
}

/** Dual-stamp: ADD cus-survivor, keep cus-loser (stripped by the daily
 *  cleanup once pre-merge portal tokens have aged out). */
function restampGroups(existing: unknown, survivorId: string): string[] {
  const groups = Array.isArray(existing) ? existing.map(String) : [];
  return Array.from(new Set([...groups, cusGroup(survivorId)]));
}

async function repointChildModel(
  m: { name: string; stamped: boolean },
  loserId: string,
  survivorId: string
): Promise<void> {
  const api = (await models())[m.name];
  if (!api) return;
  // Full scans until a scan finds nothing: a repointed row stops matching,
  // so this is naturally idempotent (the groupChange restamp pattern — plain
  // writes, verified by the TOMBSTONE re-scan rather than fenced per-row).
  // Bounded rounds: a writer racing faster than we repoint is a fault.
  for (let round = 0; round < 5; round++) {
    const rows = (await scanAllByFilter(api, {
      customerId: { eq: loserId },
    })) as ({ id: string; accessGroups?: unknown } & Record<string, unknown>)[];
    if (rows.length === 0) return;
    for (const row of rows) {
      await api.update({
        id: row.id,
        customerId: survivorId,
        ...(m.stamped
          ? { accessGroups: restampGroups(row.accessGroups, survivorId) }
          : {}),
      });
    }
  }
  throw new Error(
    `merge: ${m.name} rows keep appearing on ${loserId} — a writer is outracing the repoint`
  );
}

async function repointBookingRequests(
  loserId: string,
  survivorId: string
): Promise<void> {
  const api = (await models()).BookingRequest;
  if (!api) return;
  for (const field of ["customerId", "leadCustomerId"] as const) {
    for (let round = 0; round < 5; round++) {
      const rows = (await scanAllByFilter(api, {
        [field]: { eq: loserId },
      })) as { id: string }[];
      if (rows.length === 0) break;
      for (const row of rows) {
        await api.update({ id: row.id, [field]: survivorId });
      }
    }
  }
}

/** Repoint every OPEN work item naming the loser; resolve the duplicate-lead
 *  and lead-followup items this merge IS the resolution of. */
async function repointOpenWork(
  loserId: string,
  survivorId: string
): Promise<void> {
  const client = await dataClient();
  const nowIso = new Date().toISOString();
  await forEachPage(
    (nextToken) =>
      client.models.WorkItem.listWorkItemByStatusAndDueAt(
        { status: "OPEN" },
        { nextToken, limit: 200 }
      ),
    async (items) => {
      for (const raw of items as ({
        id: string;
        kind?: string | null;
        customerId?: string | null;
        relatedId?: string | null;
        sourceUrl?: string | null;
      } & Record<string, unknown>)[]) {
        const namesLoser =
          raw.customerId === loserId ||
          raw.relatedId === loserId ||
          (raw.sourceUrl ?? "").includes(`/customers/${loserId}`);
        if (!namesLoser) continue;
        if (raw.kind === "LEAD_FOLLOWUP" || raw.kind === "DUPLICATE_LEAD") {
          await client.models.WorkItem.update({
            id: raw.id,
            status: "RESOLVED",
            resolvedAt: nowIso,
            resolutionNote: `Merged into ${survivorId} — this merge is the resolution.`,
          });
          continue;
        }
        await client.models.WorkItem.update({
          id: raw.id,
          customerId:
            raw.customerId === loserId ? survivorId : raw.customerId ?? undefined,
          relatedId:
            raw.relatedId === loserId ? survivorId : raw.relatedId ?? undefined,
          sourceUrl: (raw.sourceUrl ?? "").includes(`/customers/${loserId}`)
            ? (raw.sourceUrl ?? "").replace(
                `/customers/${loserId}`,
                `/customers/${survivorId}`
              )
            : raw.sourceUrl ?? undefined,
        });
      }
    },
    { pageErrors: "throw" }
  );
}

/** The TOMBSTONE verify: is ANY child still pointing at the loser? FULL
 *  scans on purpose — this feeds the terminal flip, and a single-page read
 *  passes vacuously on any real table (limit bounds pre-filter evaluation). */
async function anyChildLeft(loserId: string): Promise<string | null> {
  const api = await models();
  for (const m of CHILD_MODELS) {
    const rows = await scanAllByFilter(api[m.name], {
      customerId: { eq: loserId },
    });
    if (rows.length > 0) return m.name;
  }
  const byCustomer = await scanAllByFilter(api.BookingRequest, {
    customerId: { eq: loserId },
  });
  if (byCustomer.length > 0) return "BookingRequest";
  const byLead = await scanAllByFilter(api.BookingRequest, {
    leadCustomerId: { eq: loserId },
  });
  if (byLead.length > 0) return "BookingRequest.leadCustomerId";
  return null;
}

// ---------------------------------------------------------------------------
// The daily reconcile
// ---------------------------------------------------------------------------

/**
 * Find every in-flight merge whose lease has expired and re-drive it (house
 * pacing: 15-minute retry, 5 auto attempts, then it stays parked on its
 * MERGE_RECOVERY item until a human resumes). Runs from daily-reminders via
 * a direct crm-admin invoke — only crm-admin holds the Cognito/Stripe
 * credentials the stages need.
 */
export async function listStuckMerges(): Promise<
  { loserId: string; state: MergeStateBlob }[]
> {
  const client = await dataClient();
  const stuck: { loserId: string; state: MergeStateBlob }[] = [];
  await forEachPage(
    (nextToken) =>
      client.models.Customer.list({
        filter: { mergeCounterpartId: { attributeExists: true } },
        limit: 500,
        nextToken,
      }),
    (rows) => {
      const now = Date.now();
      for (const row of rows as CustomerRow[]) {
        const state = parseMergeState(row.mergeState);
        if (!state || state.stage === "COMPLETE") continue;
        const lease = row.mergeLeaseUntil
          ? Date.parse(String(row.mergeLeaseUntil))
          : 0;
        const nextAt = state.nextAttemptAt
          ? Date.parse(String(state.nextAttemptAt))
          : 0;
        if (lease > now || nextAt > now) continue;
        if ((state.attemptCount ?? 0) >= MERGE_MAX_AUTO_ATTEMPTS) continue;
        stuck.push({ loserId: row.id, state });
      }
    },
    { pageErrors: "ignore" }
  );
  return stuck;
}

/**
 * Strip the cus-loser dual-stamps from a COMPLETE merge's children once the
 * grace window (pre-merge portal tokens' max lifetime) has passed. Idempotent
 * and cheap: tombstones are found by status, their absorb time from the
 * audit-carrying mergeState.
 */
export async function cleanupDualStamps(opts?: {
  graceMs?: number;
}): Promise<number> {
  const grace = opts?.graceMs ?? 24 * 60 * 60 * 1000;
  const client = await dataClient();
  const api = await models();
  let cleaned = 0;
  const tombstoneQuery = (
    client.models as unknown as {
      Customer: {
        listCustomerByStatusAndDisplayName: (
          key: { status: string },
          opts: { limit: number; nextToken?: string | null }
        ) => Promise<{ data: unknown[]; nextToken?: string | null }>;
      };
    }
  ).Customer;
  const tombstones = (await listAll(
    (nextToken) =>
      tombstoneQuery.listCustomerByStatusAndDisplayName(
        { status: "MERGED" },
        { nextToken, limit: 200 }
      ),
    { pageErrors: "ignore" }
  )) as CustomerRow[];
  for (const t of tombstones) {
    const state = parseMergeState(t.mergeState);
    if (!state || state.stage !== "COMPLETE") continue;
    // Already swept — never rescan every tombstone forever.
    if (state.stampsCleanedAt) continue;
    // Grace runs from COMPLETION, not request: a merge parked for days and
    // then resumed still owes pre-completion portal tokens their hour.
    const completed =
      Date.parse(state.completedAt ?? "") ||
      Date.parse(state.requestedAt ?? "") ||
      0;
    if (Date.now() - completed < grace) continue;
    const survivorId = state.survivorId;
    const stale = cusGroup(t.id);
    for (const m of CHILD_MODELS.filter((m) => m.stamped)) {
      const rows = (await listAll(
        (nextToken) =>
          api[m.name].list({
            filter: { accessGroups: { contains: stale } },
            limit: 500,
            nextToken,
          }),
        { pageErrors: "throw" }
      )) as ({ id: string; customerId?: unknown; accessGroups?: unknown })[];
      for (const row of rows) {
        const groups = (Array.isArray(row.accessGroups)
          ? row.accessGroups.map(String)
          : []
        ).filter((g) => g !== stale);
        // Safety net: a stale-token portal session may have CREATED a row on
        // the tombstone after the merge completed (row auth passed on the
        // dual-stamp). Repoint it to the survivor while stripping the stamp
        // — otherwise stripping orphans it entirely.
        const stranded = row.customerId === t.id && survivorId;
        await api[m.name].update({
          id: row.id,
          accessGroups: stranded
            ? Array.from(new Set([...groups, cusGroup(survivorId)]))
            : groups,
          ...(stranded ? { customerId: survivorId } : {}),
        });
        cleaned++;
      }
    }
    // Mark the sweep done (guarded on the row still being this tombstone).
    await casGuardedUpdate(
      "Customer",
      t.id,
      {
        mergeState: stateJson({
          ...state,
          stampsCleanedAt: new Date().toISOString(),
        }),
      },
      [{ kind: "fieldEquals", field: "status", value: "MERGED" }]
    );
  }
  return cleaned;
}
