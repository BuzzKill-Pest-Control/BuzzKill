import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The customer-merge engine (design 2026-08-17). The properties under test
 * are the ones the adversarial design review demanded:
 *  - preview computes consequences and blocks/warns without touching anything;
 *  - the claim marks BOTH rows and exactly one of two racing merges wins;
 *  - a parked merge resumes from its stage and never re-appends;
 *  - the tombstone flip verifies the loser is child-free first (racing
 *    writers loop the CHILDREN pass instead of being tombstoned over);
 *  - the tombstone is blanked with a snapshot, and matcher-visible identity
 *    keys (booking-link token) die during the merge, not after;
 *  - resolveMergedCustomer follows chains, bounded.
 */

type Row = Record<string, unknown>;
const tables: Record<string, Map<string, Row>> = {};
const table = (name: string): Map<string, Row> => {
  tables[name] ??= new Map();
  return tables[name];
};

const MODEL_NAMES = [
  "Customer",
  "ServicePlan",
  "Job",
  "Agreement",
  "ServiceReport",
  "ServiceReportAmendment",
  "Invoice",
  "Dispute",
  "TreatmentObligation",
  "PortalRequest",
  "CallbackRequest",
  "LeadPricingRun",
  "LeadActivity",
  "BookingRequest",
  "WorkItem",
  "CustomerLifecycleEvent",
  "PlanCancellationClaim",
  "VisitChangeClaim",
  "LeadLifecycleClaim",
];

let seq = 0;
const matchesFilter = (row: Row, filter?: Record<string, unknown>): boolean => {
  if (!filter) return true;
  for (const [field, cond] of Object.entries(filter)) {
    if (field === "or") {
      const any = (cond as Record<string, unknown>[]).some((c) =>
        matchesFilter(row, c)
      );
      if (!any) return false;
      continue;
    }
    const c = cond as {
      eq?: unknown;
      attributeExists?: boolean;
      contains?: unknown;
    };
    if ("eq" in c && row[field] !== c.eq) return false;
    if (c.attributeExists === true && (row[field] === undefined || row[field] === null))
      return false;
    if ("contains" in c) {
      const v = row[field];
      if (!Array.isArray(v) || !v.includes(c.contains)) return false;
    }
  }
  return true;
};

/** Real DynamoDB Scan semantics: `limit` bounds items EVALUATED (pre-filter),
 *  so a page can be EMPTY with matches deeper in the table and a nextToken.
 *  The engine's pagination bugs were invisible to a fake that filtered first —
 *  this fake makes single-page filtered reads fail the way production does. */
const SCAN_WINDOW = 3;
function fakeModel(name: string) {
  return {
    get: async ({ id }: { id: string }) => ({
      data: table(name).get(id) ?? null,
    }),
    list: async (opts?: {
      filter?: Record<string, unknown>;
      limit?: number;
      nextToken?: string;
    }) => {
      const all = [...table(name).values()];
      const start = opts?.nextToken ? Number(opts.nextToken) : 0;
      const window = Math.min(opts?.limit ?? 100, SCAN_WINDOW);
      const evaluated = all.slice(start, start + window);
      const matched = evaluated.filter((r) => matchesFilter(r, opts?.filter));
      const nextStart = start + window;
      return {
        data: matched,
        nextToken: nextStart < all.length ? String(nextStart) : null,
      };
    },
    create: async (row: Row) => {
      const id = String(row.id ?? `${name.toLowerCase()}-${++seq}`);
      if (table(name).has(id)) throw new Error(`${name} ${id} exists`);
      const stored = { ...row, id };
      table(name).set(id, stored);
      return { data: stored };
    },
    update: async (row: Row) => {
      const id = String(row.id);
      const prior = table(name).get(id);
      if (!prior) return { data: null };
      const next = { ...prior, ...row };
      table(name).set(id, next);
      return { data: next };
    },
    listWorkItemByStatusAndDueAt: async ({ status }: { status: string }) => ({
      data: [...table("WorkItem").values()].filter((r) => r.status === status),
      nextToken: null,
    }),
    listCustomerByStatusAndDisplayName: async ({ status }: { status: string }) => ({
      data: [...table("Customer").values()].filter((r) => r.status === status),
      nextToken: null,
    }),
    listCustomerLifecycleCommandByCustomerIdAndRequestedAt: async () => ({
      data: [],
      nextToken: null,
    }),
    listGroupChangeCommandByCustomerIdAndRequestedAt: async () => ({
      data: [],
      nextToken: null,
    }),
  };
}

const fakeClient = {
  models: Object.fromEntries(
    [...MODEL_NAMES, "CustomerLifecycleCommand", "GroupChangeCommand"].map(
      (n) => [n, fakeModel(n)]
    )
  ),
};
vi.mock("./dataClient", () => ({ dataClient: async () => fakeClient }));

const workOpened: Row[] = [];
const workResolved: Row[] = [];
vi.mock("./ownedWork", () => ({
  WORK_SUPPRESSED: "suppressed",
  openOwnedWork: async (o: Row) => {
    workOpened.push(o);
    return `w-${workOpened.length}`;
  },
  resolveOwnedWork: async (o: Row) => {
    workResolved.push(o);
    return true;
  },
}));

import { memoryLockStore, _setLockStoreForTests } from "./atomicLock";
import {
  mergeCustomers,
  resolveMergedCustomer,
  isMidMerge,
  parseMergeState,
  listStuckMerges,
  cleanupDualStamps,
  type MergeDeps,
} from "./customerMerge";

// ---- fakes -----------------------------------------------------------------

const cognitoCalls: string[] = [];
let userGroups: Record<string, string[]> = {};
const fakeCognito = () => ({
  ensureGroup: async () => undefined,
  addToGroup: async (u: string, g: string) => {
    cognitoCalls.push(`add:${u}:${g}`);
    userGroups[u] = [...(userGroups[u] ?? []), g];
  },
  removeFromGroup: async (u: string, g: string) => {
    cognitoCalls.push(`remove:${u}:${g}`);
    userGroups[u] = (userGroups[u] ?? []).filter((x) => x !== g);
  },
  usernamesInGroup: async (g: string) =>
    Object.entries(userGroups)
      .filter(([, gs]) => gs.includes(g))
      .map(([u]) => u),
  groupsForUser: async (u: string) => userGroups[u] ?? [],
  disableUser: async (u: string) => {
    cognitoCalls.push(`disable:${u}`);
  },
});

let stripeSubs: Record<string, string[]> = {};
let stripeCards: Record<string, string | null> = {};
const subMetadata: Record<string, string> = {};
const fakeStripe = () => ({
  listActiveSubscriptionIds: async (cus: string) => stripeSubs[cus] ?? [],
  setSubscriptionCrmCustomer: async (sub: string, crmId: string) => {
    subMetadata[sub] = crmId;
  },
  defaultPaymentMethodLabel: async (cus: string) => stripeCards[cus] ?? null,
});

const deps = (): MergeDeps => ({
  cognito: fakeCognito(),
  stripe: fakeStripe(),
  actor: { sub: "owner-sub", email: "owner@pestbuzzkill.com" },
});

const seedCustomer = (id: string, over: Row = {}): Row => {
  const row: Row = {
    id,
    displayName: `Customer ${id}`,
    status: "ACTIVE",
    accessGroups: [`cus-${id}`],
    ...over,
  };
  table("Customer").set(id, row);
  return row;
};

const seedChild = (model: string, id: string, customerId: string, over: Row = {}) => {
  table(model).set(id, {
    id,
    customerId,
    accessGroups: [`cus-${customerId}`],
    ...over,
  });
};

const run = (
  action: "PREVIEW" | "EXECUTE" | "RESUME",
  survivorId = "surv",
  loserId = "dup",
  extra: { acknowledgeWarnings?: boolean; idempotencyKey?: string } = {}
) =>
  mergeCustomers({
    action,
    survivorId,
    loserId,
    idempotencyKey: extra.idempotencyKey ?? "mk-1",
    acknowledgeWarnings: extra.acknowledgeWarnings,
    deps: deps(),
  });

beforeEach(() => {
  for (const t of Object.values(tables)) t.clear();
  workOpened.length = 0;
  workResolved.length = 0;
  cognitoCalls.length = 0;
  userGroups = {};
  stripeSubs = {};
  stripeCards = {};
  for (const k of Object.keys(subMetadata)) delete subMetadata[k];
  seq = 0;
  _setLockStoreForTests(memoryLockStore(tables));
});

// ---- tests -----------------------------------------------------------------

describe("preview", () => {
  it("computes counts, the billing plan, and warnings without touching anything", async () => {
    seedCustomer("surv", { stripeCustomerId: "cus_s" });
    seedCustomer("dup", { stripeCustomerId: "cus_l", email: "d@x.com" });
    stripeCards.cus_s = "visa •••• 4242";
    stripeCards.cus_l = "amex •••• 0005";
    seedChild("Job", "j1", "dup");
    seedChild("Invoice", "i1", "dup");

    const out = await run("PREVIEW");
    if (out.decision !== "PREVIEW") throw new Error(out.decision);
    expect(out.preview.childCounts.Job).toBe(1);
    expect(out.preview.childCounts.Invoice).toBe(1);
    expect(out.preview.billing.pointerPlan).toBe("SURVIVOR_KEPT");
    expect(out.preview.warnings.map((w) => w.code)).toContain("BOTH_HAVE_CARDS");
    expect(out.preview.blockers).toHaveLength(0);
    // Nothing was written.
    expect(table("Customer").get("dup")!.status).toBe("ACTIVE");
  });

  it("a group conflict is a hard blocker — GroupChangeCommand owns that surface", async () => {
    seedCustomer("surv");
    seedCustomer("dup", { groupId: "g1" });
    const out = await run("PREVIEW");
    if (out.decision !== "PREVIEW") throw new Error(out.decision);
    expect(out.preview.blockers.map((b) => b.code)).toContain("GROUP_CONFLICT");
  });

  it("an unsettled visit-change command blocks the merge", async () => {
    seedCustomer("surv");
    seedCustomer("dup");
    seedChild("Job", "j1", "dup");
    table("VisitChangeClaim").set("j1", { id: "j1", stage: "FAILED" });
    const out = await run("PREVIEW");
    if (out.decision !== "PREVIEW") throw new Error(out.decision);
    expect(out.preview.blockers.map((b) => b.code)).toContain("OPEN_VISIT_CHANGE");
  });
});

describe("execute", () => {
  it("refuses without acknowledgement while warnings stand, proceeds with it", async () => {
    seedCustomer("surv", { stripeCustomerId: "cus_s" });
    seedCustomer("dup", { stripeCustomerId: "cus_l" });
    stripeCards.cus_s = "visa";
    stripeCards.cus_l = "amex";

    const refused = await run("EXECUTE");
    expect(refused.decision).toBe("NEEDS_ACKNOWLEDGEMENT");

    const merged = await run("EXECUTE", "surv", "dup", {
      acknowledgeWarnings: true,
    });
    expect(merged.decision).toBe("MERGED");
  });

  it("the full happy path: repoint + dual-stamp, gap-fill, tombstone with snapshot, audit, absorbed list", async () => {
    seedCustomer("surv", { email: "kept@x.com", phone: null });
    seedCustomer("dup", {
      email: "dup@x.com",
      phone: "+15085551234",
      serviceCity: "Marlborough",
      stripeCustomerId: "cus_l",
      externalRef: "thumbtack#42",
      status: "LEAD",
    });
    stripeCards.cus_l = "amex •••• 0005";
    stripeSubs.cus_l = ["sub_1"];
    seedChild("Job", "j1", "dup");
    seedChild("Invoice", "i1", "dup");
    table("WorkItem").set("w1", {
      id: "w1",
      kind: "LEAD_FOLLOWUP",
      status: "OPEN",
      customerId: "dup",
      relatedId: "dup",
      sourceUrl: "/customers/dup",
    });

    const out = await run("EXECUTE", "surv", "dup", {
      acknowledgeWarnings: true,
    });
    expect(out.decision).toBe("MERGED");

    const job = table("Job").get("j1")!;
    expect(job.customerId).toBe("surv");
    // Dual-stamp: cus-surv ADDED, cus-dup kept for the token-grace window.
    expect(job.accessGroups).toContain("cus-surv");
    expect(job.accessGroups).toContain("cus-dup");

    const surv = table("Customer").get("surv")!;
    expect(surv.phone).toBe("+15085551234"); // gap-filled
    expect(surv.email).toBe("kept@x.com"); // never overwritten
    expect(surv.externalRef).toBe("thumbtack#42"); // thread continuity moved
    expect(surv.stripeCustomerId).toBe("cus_l"); // survivor had no card
    expect(String(surv.notes)).toContain("Merged from");
    // LockSets null removes the attribute — falsy either way.
    expect(surv.mergeCounterpartId ?? null).toBeNull();
    expect(JSON.parse(String(surv.mergeState)).absorbed).toEqual(["dup"]);

    const dup = table("Customer").get("dup")!;
    expect(dup.status).toBe("MERGED");
    expect(dup.mergedIntoId).toBe("surv");
    expect(dup.email ?? null).toBeNull();
    expect(dup.phone ?? null).toBeNull();
    const state = parseMergeState(dup.mergeState)!;
    expect(state.stage).toBe("COMPLETE");
    expect(state.blanked?.email).toBe("dup@x.com"); // snapshot preserved
    expect(state.decisions?.stripePointer).toBe("ADOPTED_LOSER");

    // Subscription metadata repointed so post-merge invoices name the survivor.
    expect(subMetadata.sub_1).toBe("surv");

    // The loser's follow-up died with the merge and cannot come back.
    expect(table("WorkItem").get("w1")!.status).toBe("RESOLVED");

    // Audit-first, both sides.
    const events = [...table("CustomerLifecycleEvent").values()];
    expect(events.map((e) => e.action).sort()).toEqual([
      "ABSORBED_DUPLICATE",
      "MERGED_AWAY",
    ]);
  });

  it("exactly one of two racing merges (A→B vs B→A) wins its claim", async () => {
    seedCustomer("surv");
    seedCustomer("dup");
    const first = await run("EXECUTE", "surv", "dup");
    expect(first.decision).toBe("MERGED");
    const second = await run("EXECUTE", "dup", "surv", {
      idempotencyKey: "mk-2",
    });
    // The counterparty is a tombstone now — refused, never a chain built
    // over a live merge.
    expect(second.decision).toBe("REFUSED");
  });

  it("a three-party overlap is refused on the survivor-side marker", async () => {
    seedCustomer("a");
    seedCustomer("b", { mergeCounterpartId: "a" }); // A→B in flight (parked)
    seedCustomer("c");
    const out = await run("EXECUTE", "c", "b", { idempotencyKey: "mk-3" });
    expect(out.decision).toBe("REFUSED");
  });

  it("the tombstone verify catches a child that raced in after CHILDREN and loops back", async () => {
    seedCustomer("surv");
    seedCustomer("dup");
    seedChild("Job", "j1", "dup");
    // Simulate a finalize racing the merge: when the WORK stage first pages
    // OPEN items, a new Job appears on the loser.
    const workModel = fakeClient.models.WorkItem as unknown as {
      listWorkItemByStatusAndDueAt: (k: { status: string }) => Promise<unknown>;
    };
    const original = workModel.listWorkItemByStatusAndDueAt.bind(workModel);
    let injected = false;
    workModel.listWorkItemByStatusAndDueAt = async (k: { status: string }) => {
      if (!injected) {
        injected = true;
        seedChild("Job", "j-raced", "dup");
      }
      return original(k);
    };

    const out = await run("EXECUTE", "surv", "dup");
    expect(out.decision).toBe("MERGED");
    expect(table("Job").get("j-raced")!.customerId).toBe("surv");
  });

  it("a mid-command failure parks with MERGE_RECOVERY and resumes to completion", async () => {
    seedCustomer("surv");
    seedCustomer("dup", { stripeCustomerId: "cus_l" });
    stripeSubs.cus_l = ["sub_1"];
    // First attempt: Stripe explodes during BILLING.
    const failing = deps();
    failing.stripe = {
      ...fakeStripe(),
      setSubscriptionCrmCustomer: async () => {
        throw new Error("stripe down");
      },
    };
    const first = await mergeCustomers({
      action: "EXECUTE",
      survivorId: "surv",
      loserId: "dup",
      idempotencyKey: "mk-r",
      deps: failing,
    });
    expect(first.decision).toBe("PARTIAL");
    expect(workOpened.some((w) => w.kind === "MERGE_RECOVERY")).toBe(true);
    const parked = parseMergeState(table("Customer").get("dup")!.mergeState)!;
    expect(parked.stage).toBe("BILLING");
    expect(table("Customer").get("dup")!.mergeLeaseUntil ?? null).toBeNull();

    // The daily reconcile sees it once its retry delay elapses.
    parked.nextAttemptAt = new Date(Date.now() - 1000).toISOString();
    table("Customer").set("dup", {
      ...table("Customer").get("dup")!,
      mergeState: JSON.stringify(parked),
    });
    const stuck = await listStuckMerges();
    expect(stuck.map((s) => s.loserId)).toEqual(["dup"]);

    // Resume with a healthy provider completes and resolves the case.
    const resumed = await mergeCustomers({
      action: "RESUME",
      survivorId: "surv",
      loserId: "dup",
      idempotencyKey: "mk-r",
      deps: deps(),
    });
    expect(resumed.decision).toBe("MERGED");
    expect(subMetadata.sub_1).toBe("surv");
    expect(workResolved.some((w) => w.kind === "MERGE_RECOVERY")).toBe(true);
  });

  it("replaying a COMPLETE merge returns the stored outcome without re-running", async () => {
    seedCustomer("surv");
    seedCustomer("dup");
    await run("EXECUTE");
    const survNotes = String(table("Customer").get("surv")!.notes);
    const replay = await run("EXECUTE");
    expect(replay.decision).toBe("MERGED");
    // No double-append on replay.
    expect(String(table("Customer").get("surv")!.notes)).toBe(survNotes);
  });

  it("portal: grant precedes revoke, the sub repoints, and the login stays enabled — it serves the survivor now", async () => {
    seedCustomer("surv");
    seedCustomer("dup", { portalUserSub: "sub-1" });
    userGroups["dup@x.com"] = ["CUSTOMER", "cus-dup"];

    await run("EXECUTE");

    const addIdx = cognitoCalls.indexOf("add:dup@x.com:cus-surv");
    const removeIdx = cognitoCalls.indexOf("remove:dup@x.com:cus-dup");
    expect(addIdx).toBeGreaterThanOrEqual(0);
    expect(removeIdx).toBeGreaterThan(addIdx); // grant BEFORE revoke
    expect(table("Customer").get("surv")!.portalUserSub).toBe("sub-1");
    expect(cognitoCalls).not.toContain("disable:dup@x.com");
  });

  it("a login left with no substantive memberships after the revoke is disabled (membership removal only — the ops surface has no kill)", async () => {
    // The grant normally adds cus-surv to whoever held cus-dup, so a live
    // login follows the merge. The disable branch covers a login that ends
    // the merge holding nothing substantive (e.g. an abandoned duplicate
    // login the person never used) — modeled by dropping the granted group
    // when the loser revoke runs.
    seedCustomer("surv", { portalUserSub: "sub-s" });
    seedCustomer("dup");
    userGroups["orphan@x.com"] = ["CUSTOMER", "cus-dup"];
    // The grant will add cus-surv to orphan@x.com (it holds cus-dup), so to
    // exercise the empty-membership branch, pre-strip it right after grant
    // via a wrapper.
    const d = deps();
    const origRemove = d.cognito.removeFromGroup;
    d.cognito.removeFromGroup = async (u: string, g: string) => {
      await origRemove(u, g);
      // After the loser revoke, also drop the granted survivor group to
      // model a login the person abandoned.
      if (g === "cus-dup") {
        userGroups[u] = (userGroups[u] ?? []).filter((x) => x !== "cus-surv");
      }
    };
    const out = await mergeCustomers({
      action: "EXECUTE",
      survivorId: "surv",
      loserId: "dup",
      idempotencyKey: "mk-d",
      deps: d,
    });
    expect(out.decision).toBe("MERGED");
    expect(cognitoCalls).toContain("disable:orphan@x.com");
  });
});

describe("resume and repair (the adversarial-review class)", () => {
  it("children beyond the first scan window are still repointed and the verify still sees stragglers", async () => {
    seedCustomer("surv");
    seedCustomer("dup");
    // Bury the loser's rows deep: filler rows fill the early scan windows,
    // so a single-page filtered read returns [] with a nextToken — the
    // production behavior that stranded children before the pagination fix.
    for (let i = 0; i < 10; i++) seedChild("Job", `filler-${i}`, "other");
    seedChild("Job", "j-deep", "dup");
    for (let i = 0; i < 10; i++) seedChild("Invoice", `fill-i-${i}`, "other");
    seedChild("Invoice", "i-deep", "dup");

    const out = await run("EXECUTE");
    expect(out.decision).toBe("MERGED");
    expect(table("Job").get("j-deep")!.customerId).toBe("surv");
    expect(table("Invoice").get("i-deep")!.customerId).toBe("surv");
  });

  it("half-claim (survivor marked, loser untouched) self-repairs on the next EXECUTE of the same pair", async () => {
    seedCustomer("dup"); // sorts after "a-surv": survivor is marked first
    seedCustomer("a-surv", { mergeCounterpartId: "dup" }); // crash after mark 1
    const out = await mergeCustomers({
      action: "EXECUTE",
      survivorId: "a-surv",
      loserId: "dup",
      idempotencyKey: "mk-repair",
      deps: deps(),
    });
    expect(out.decision).toBe("MERGED");
    expect(table("Customer").get("dup")!.mergedIntoId).toBe("a-surv");
    expect(table("Customer").get("a-surv")!.mergeCounterpartId ?? null).toBeNull();
  });

  it("half-claim (loser marked with a CLAIM blob) resumes: the survivor marker is re-asserted", async () => {
    seedCustomer("z-surv"); // sorts after "dup": loser is marked first
    seedCustomer("dup", {
      mergeCounterpartId: "z-surv",
      mergeLeaseNonce: "dead-worker",
      mergeLeaseUntil: new Date(Date.now() - 60_000).toISOString(),
      mergeState: JSON.stringify({
        survivorId: "z-surv",
        idempotencyKey: "mk-half",
        stage: "CLAIM",
        requestedAt: new Date().toISOString(),
      }),
    });
    const out = await mergeCustomers({
      action: "RESUME",
      survivorId: "z-surv",
      loserId: "dup",
      idempotencyKey: "mk-half",
      deps: deps(),
    });
    expect(out.decision).toBe("MERGED");
    expect(table("Customer").get("dup")!.mergedIntoId).toBe("z-surv");
  });

  it("a lost second claim rolls the first mark back — the pair is not left frozen", async () => {
    seedCustomer("a"); // ordered[0]
    seedCustomer("b", { mergeCounterpartId: "somebody-else" }); // foreign mark
    const out = await mergeCustomers({
      action: "EXECUTE",
      survivorId: "a",
      loserId: "b",
      idempotencyKey: "mk-race",
      deps: deps(),
    });
    expect(out.decision).toBe("REFUSED");
    // ordered[0] ("a", the survivor here) was marked then rolled back.
    expect(table("Customer").get("a")!.mergeCounterpartId ?? null).toBeNull();
  });

  it("a resume that re-enters TOMBSTONE preserves the blanked snapshot", async () => {
    seedCustomer("surv");
    seedCustomer("dup", { email: "keepme@x.com", phone: "+15085550000" });
    // Park AFTER the terminal flip: the loser revoke throws once.
    userGroups["dup@x.com"] = ["CUSTOMER", "cus-dup"];
    const d = deps();
    let failedOnce = false;
    const origRemove = d.cognito.removeFromGroup;
    d.cognito.removeFromGroup = async (u: string, g: string) => {
      if (!failedOnce) {
        failedOnce = true;
        throw new Error("cognito blip");
      }
      await origRemove(u, g);
    };
    const first = await mergeCustomers({
      action: "EXECUTE",
      survivorId: "surv",
      loserId: "dup",
      idempotencyKey: "mk-snap",
      acknowledgeWarnings: true,
      deps: d,
    });
    expect(first.decision).toBe("PARTIAL");
    // The flip already blanked the row; the snapshot must be in the blob.
    const parked = parseMergeState(table("Customer").get("dup")!.mergeState)!;
    expect(parked.blanked?.email).toBe("keepme@x.com");

    const resumed = await mergeCustomers({
      action: "RESUME",
      survivorId: "surv",
      loserId: "dup",
      idempotencyKey: "mk-snap",
      deps: deps(),
    });
    expect(resumed.decision).toBe("MERGED");
    const final = parseMergeState(table("Customer").get("dup")!.mergeState)!;
    // The resumed flip rebuilt from an already-blanked row — the snapshot
    // must have survived the rebuild.
    expect(final.blanked?.email).toBe("keepme@x.com");
    expect(final.blanked?.phone).toBe("+15085550000");
  });

  it("a crash between the FIELDS write and the stage advance re-enters FIELDS without double-appending", async () => {
    seedCustomer("surv", { notes: "original" });
    seedCustomer("dup", { phone: "+15085551111" });
    // Simulate the crash window: survivor already carries the suffixed
    // marker and the gap-fill, but the blob still says FIELDS.
    table("Customer").set("surv", {
      ...table("Customer").get("surv")!,
      phone: "+15085551111",
      notes: "original\n— Merged from Customer dup (dup) on 2026-08-17",
      mergeCounterpartId: "dup#fields-done",
    });
    table("Customer").set("dup", {
      ...table("Customer").get("dup")!,
      mergeCounterpartId: "surv",
      mergeLeaseNonce: "dead",
      mergeLeaseUntil: new Date(Date.now() - 60_000).toISOString(),
      mergeState: JSON.stringify({
        survivorId: "surv",
        idempotencyKey: "mk-fields",
        stage: "FIELDS",
        requestedAt: new Date().toISOString(),
      }),
    });
    const out = await mergeCustomers({
      action: "RESUME",
      survivorId: "surv",
      loserId: "dup",
      idempotencyKey: "mk-fields",
      deps: deps(),
    });
    expect(out.decision).toBe("MERGED");
    const notes = String(table("Customer").get("surv")!.notes);
    expect(notes.match(/Merged from/g)!.length).toBe(1); // no double append
  });
});

describe("the staging-drill cascade class", () => {
  it("parseMergeState survives every AWSJSON round-trip shape", () => {
    const blob = { survivorId: "s", idempotencyKey: "k", stage: "BILLING", requestedAt: "t" };
    expect(parseMergeState(blob)?.stage).toBe("BILLING");
    expect(parseMergeState(JSON.stringify(blob))?.stage).toBe("BILLING");
    expect(parseMergeState(JSON.stringify(JSON.stringify(blob)))?.stage).toBe("BILLING");
    expect(parseMergeState("not json {{")).toBeNull();
    expect(parseMergeState(JSON.stringify({ absorbed: ["x"] }))).toBeNull();
  });

  it("RESUME with no readable saved state refuses and touches NOTHING", async () => {
    seedCustomer("surv", { mergeCounterpartId: "dup#fields-done" });
    seedCustomer("dup");
    const out = await mergeCustomers({
      action: "RESUME",
      survivorId: "surv",
      loserId: "dup",
      idempotencyKey: "mk-x",
      deps: deps(),
    });
    expect(out.decision).toBe("REFUSED");
    if (out.decision === "REFUSED") {
      expect(out.blockers[0].code).toBe("NOTHING_TO_RESUME");
    }
    // The stale marker was not cleared and no claim landed.
    expect(table("Customer").get("surv")!.mergeCounterpartId).toBe("dup#fields-done");
    expect(table("Customer").get("dup")!.mergeCounterpartId ?? null).toBeNull();
  });

  it("a fresh EXECUTE self-repairs a stale suffixed survivor marker and completes", async () => {
    // The drill's end state: blob destroyed, loser clean, survivor stuck
    // with the FIELDS-era marker.
    seedCustomer("surv", { mergeCounterpartId: "dup#fields-done" });
    seedCustomer("dup", { phone: "+15085552222" });
    const out = await run("EXECUTE", "surv", "dup", { idempotencyKey: "mk-repair2" });
    expect(out.decision).toBe("MERGED");
    expect(table("Customer").get("dup")!.status).toBe("MERGED");
    expect(table("Customer").get("surv")!.mergeCounterpartId ?? null).toBeNull();
  });

  it("a fresh EXECUTE refuses to overwrite unreadable merge state on the loser", async () => {
    seedCustomer("surv");
    seedCustomer("dup", { mergeState: "corrupted {{ not json" });
    const out = await run("EXECUTE", "surv", "dup", { idempotencyKey: "mk-c" });
    expect(out.decision).toBe("REFUSED");
    if (out.decision === "REFUSED") {
      expect(out.blockers[0].code).toBe("UNREADABLE_MERGE_STATE");
    }
    expect(table("Customer").get("dup")!.mergeState).toBe("corrupted {{ not json");
  });

  it("a former survivor's absorbed genealogy rides into the new survivor's list", async () => {
    seedCustomer("c");
    seedCustomer("b", { mergeState: JSON.stringify({ absorbed: ["a"] }) });
    const out = await run("EXECUTE", "c", "b", { idempotencyKey: "mk-chain" });
    expect(out.decision).toBe("MERGED");
    const absorbed = JSON.parse(String(table("Customer").get("c")!.mergeState)).absorbed;
    expect(absorbed.sort()).toEqual(["a", "b"]);
  });
});

describe("office-facing copy (the UX review class)", () => {
  it("TOKEN_STALENESS appears only when a record actually has a portal login", async () => {
    seedCustomer("surv");
    seedCustomer("dup");
    const none = await run("PREVIEW");
    if (none.decision !== "PREVIEW") throw new Error(none.decision);
    expect(none.preview.warnings.map((w) => w.code)).not.toContain(
      "TOKEN_STALENESS"
    );

    seedCustomer("surv2", { portalUserSub: "sub-s" });
    seedCustomer("dup2");
    const keptSide = await run("PREVIEW", "surv2", "dup2");
    if (keptSide.decision !== "PREVIEW") throw new Error(keptSide.decision);
    expect(keptSide.preview.warnings.map((w) => w.code)).toContain(
      "TOKEN_STALENESS"
    );

    seedCustomer("surv3");
    seedCustomer("dup3", { portalUserSub: "sub-l" });
    const dupSide = await run("PREVIEW", "surv3", "dup3");
    if (dupSide.decision !== "PREVIEW") throw new Error(dupSide.decision);
    expect(dupSide.preview.warnings.map((w) => w.code)).toContain(
      "TOKEN_STALENESS"
    );
  });

  it("keeping a LEAD over an ACTIVE customer warns, needs acknowledgement, and is never a blocker", async () => {
    seedCustomer("surv", { status: "LEAD" });
    seedCustomer("dup", { status: "ACTIVE" });

    const preview = await run("PREVIEW");
    if (preview.decision !== "PREVIEW") throw new Error(preview.decision);
    const warning = preview.preview.warnings.find(
      (w) => w.code === "LEAD_SURVIVOR"
    );
    expect(warning).toBeDefined();
    expect(warning!.detail).toContain(
      "double-check which record should survive"
    );
    expect(preview.preview.blockers).toHaveLength(0);

    const unacked = await run("EXECUTE");
    expect(unacked.decision).toBe("NEEDS_ACKNOWLEDGEMENT");
    if (unacked.decision === "NEEDS_ACKNOWLEDGEMENT") {
      expect(unacked.warnings.map((w) => w.code)).toContain("LEAD_SURVIVOR");
    }
    const acked = await run("EXECUTE", "surv", "dup", {
      acknowledgeWarnings: true,
    });
    expect(acked.decision).toBe("MERGED");
  });

  it("the usual direction (ACTIVE keeps, LEAD absorbed) does not warn", async () => {
    seedCustomer("surv", { status: "ACTIVE" });
    seedCustomer("dup", { status: "LEAD" });
    const preview = await run("PREVIEW");
    if (preview.decision !== "PREVIEW") throw new Error(preview.decision);
    expect(preview.preview.warnings.map((w) => w.code)).not.toContain(
      "LEAD_SURVIVOR"
    );
  });

  it("blockers name people (id in parentheses), not bare UUIDs, and say the next step", async () => {
    seedCustomer("surv", { displayName: "Dana Keeper" });
    seedCustomer("dup", { displayName: "Dana K. (old)" });
    table("ServicePlan").set("p1", {
      id: "p1",
      customerId: "dup",
      planName: "Quarterly Pest Prevention",
    });
    table("PlanCancellationClaim").set("p1", { id: "p1", stage: "BILLING" });

    const out = await run("PREVIEW");
    if (out.decision !== "PREVIEW") throw new Error(out.decision);
    const blocker = out.preview.blockers.find(
      (b) => b.code === "OPEN_PLAN_CANCELLATION"
    );
    expect(blocker).toBeDefined();
    // Named, with the id in parentheses for support — never the id alone.
    expect(blocker!.detail).toContain("Dana K. (old) (dup)");
    expect(blocker!.detail).toContain("Quarterly Pest Prevention");
    // The next step, in office terms.
    expect(blocker!.detail).toContain("Service plans card");
  });

  it("no blocker or warning ever says 'survivor' to the office", async () => {
    seedCustomer("surv", { status: "INACTIVE", portalUserSub: "sub-s" });
    seedCustomer("dup", { groupId: "g1", externalRef: "tt#1" });
    const out = await run("PREVIEW");
    if (out.decision !== "PREVIEW") throw new Error(out.decision);
    const texts = [
      ...out.preview.blockers.map((b) => b.detail),
      ...out.preview.warnings.map((w) => w.detail),
    ];
    expect(texts.length).toBeGreaterThan(0);
    for (const t of texts) {
      expect(t.toLowerCase()).not.toContain("survivor");
    }
    const group = out.preview.blockers.find((b) => b.code === "GROUP_CONFLICT");
    expect(group!.detail).toContain("the kept record");
  });

  it("a parked merge leads with a plain sentence for the office and keeps the raw error for engineering", async () => {
    seedCustomer("surv", { displayName: "Kept Person" });
    seedCustomer("dup", { displayName: "Dupe Person", stripeCustomerId: "cus_l" });
    stripeSubs.cus_l = ["sub_1"];
    const failing = deps();
    failing.stripe = {
      ...fakeStripe(),
      setSubscriptionCrmCustomer: async () => {
        throw new Error("stripe down");
      },
    };
    const first = await mergeCustomers({
      action: "EXECUTE",
      survivorId: "surv",
      loserId: "dup",
      idempotencyKey: "mk-copy",
      deps: failing,
    });
    expect(first.decision).toBe("PARTIAL");
    if (first.decision === "PARTIAL") {
      // Plain sentence first, technical tail after.
      expect(first.error).toMatch(
        /^The merge of Dupe Person \(dup\) into Kept Person \(surv\) stopped partway\./
      );
      expect(first.error).toContain("stripe down");
    }
    const work = workOpened.find((w) => w.kind === "MERGE_RECOVERY")!;
    expect(String(work.detail)).toMatch(/^The merge of Dupe Person/);
    expect(String(work.detail)).toContain("stripe down");
    // mergeState.lastError stays the raw engine message, untouched.
    const parked = parseMergeState(table("Customer").get("dup")!.mergeState)!;
    expect(parked.lastError).toBe("stripe down");
  });
});

describe("the follow rule", () => {
  it("resolveMergedCustomer follows a chain to its terminus, bounded", async () => {
    seedCustomer("a", { status: "MERGED", mergedIntoId: "b" });
    seedCustomer("b", { status: "MERGED", mergedIntoId: "c" });
    seedCustomer("c");
    const live = await resolveMergedCustomer("a");
    expect(live?.id).toBe("c");
  });

  it("isMidMerge is true only while in flight", () => {
    expect(isMidMerge({ mergeCounterpartId: "x", status: "ACTIVE" })).toBe(true);
    expect(isMidMerge({ mergeCounterpartId: "x", status: "MERGED" })).toBe(false);
    expect(isMidMerge({ mergeCounterpartId: null, status: "ACTIVE" })).toBe(false);
  });
});

describe("the dual-stamp cleanup", () => {
  it("strips cus-loser from a completed merge's children after the grace window", async () => {
    seedCustomer("surv");
    seedCustomer("dup");
    seedChild("Job", "j1", "dup");
    await run("EXECUTE");
    expect(table("Job").get("j1")!.accessGroups).toContain("cus-dup");

    // Inside the grace window: untouched.
    expect(await cleanupDualStamps()).toBe(0);

    // Age the merge out past the window — grace runs from COMPLETION, so a
    // long-parked merge still owes pre-completion tokens their hour.
    const dup = table("Customer").get("dup")!;
    const state = parseMergeState(dup.mergeState)!;
    state.completedAt = new Date(Date.now() - 48 * 3600_000).toISOString();
    table("Customer").set("dup", {
      ...dup,
      mergeState: JSON.stringify(state),
    });
    const cleaned = await cleanupDualStamps();
    expect(cleaned).toBeGreaterThan(0);
    expect(table("Job").get("j1")!.accessGroups).not.toContain("cus-dup");
    expect(table("Job").get("j1")!.accessGroups).toContain("cus-surv");
  });
});
