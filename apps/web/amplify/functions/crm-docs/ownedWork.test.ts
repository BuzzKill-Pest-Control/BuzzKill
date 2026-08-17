import { beforeEach, describe, expect, it, vi } from "vitest";

// GL-18: updateOwnedWork closes an exception only from a verified outcome or an
// owner manual override. These fakes let the verifier read the customer / job /
// invoice state it re-checks before a close is allowed.
let item: Record<string, unknown>;
let customer: Record<string, unknown> | null;
let job: Record<string, unknown> | null;
let invoices: Record<string, unknown>[];
let emailLogs: Record<string, unknown>[];
const history: Record<string, unknown>[] = [];

const finalizeClaims = new Map<string, Record<string, unknown>>();

const fakeDataClient = {
  models: {
    ServiceReportFinalizeClaim: {
      // Conditional create: an existing id loses — the single-winner finalize
      // claim (GL-15).
      create: async ({ id }: { id: string }) => {
        if (finalizeClaims.has(id)) return { data: null };
        finalizeClaims.set(id, { id, requestedAt: new Date().toISOString() });
        return { data: finalizeClaims.get(id) };
      },
      get: async ({ id }: { id: string }) => ({
        data: finalizeClaims.get(id) ?? null,
      }),
      delete: async ({ id }: { id: string }) => {
        const existed = finalizeClaims.get(id) ?? null;
        finalizeClaims.delete(id);
        return { data: existed };
      },
    },
    WorkItem: {
      get: async () => ({ data: item }),
      update: async (input: Record<string, unknown>) => {
        Object.assign(item, input);
        return { data: item };
      },
    },
    WorkEvent: {
      create: async (input: Record<string, unknown>) => {
        history.push(input);
        return { data: input };
      },
    },
    Customer: { get: async () => ({ data: customer }) },
    Job: { get: async () => ({ data: job }) },
    Invoice: { list: async () => ({ data: invoices }) },
    EmailLog: {
      list: async ({
        filter,
      }: {
        filter?: { customerId?: { eq?: string } };
      }) => ({
        data: emailLogs.filter((l) => l.customerId === filter?.customerId?.eq),
      }),
    },
  },
};

vi.mock("../shared/dataClient", () => ({ dataClient: async () => fakeDataClient }));
vi.mock("../shared/email", () => ({
  emailShell: (heading: string, body: string) => `${heading}\n${body}`,
  notifyOffice: async () => true,
  sendEmail: async () => true,
}));
vi.mock("../shared/stripeClient", () => ({ stripeClient: () => ({}) }));

const { updateOwnedWork } = await import("./handler");

beforeEach(() => {
  finalizeClaims.clear();
  item = {
    id: "work-1",
    kind: "LOCATION_REVIEW", // a kind with no verified path (manual-only)
    status: "OPEN",
    ownerSub: null,
    ownerEmail: "info@example.com",
    relatedId: "rel-1",
  };
  customer = null;
  job = null;
  invoices = [];
  emailLogs = [];
  history.length = 0;
});

describe("owned-work: claim", () => {
  it("claims work to the signed-in actor and records the ownership event", async () => {
    await updateOwnedWork({
      workItemId: "work-1",
      action: "CLAIM",
      actorSub: "sub-1",
      actorEmail: "olga@example.com",
    });

    expect(item).toMatchObject({
      ownerSub: "sub-1",
      ownerEmail: "olga@example.com",
      status: "OPEN",
    });
    expect(history).toContainEqual(
      expect.objectContaining({ eventType: "CLAIMED", actorSub: "sub-1" })
    );
  });
});

describe("owned-work: manual override is owner-only (GL-18)", () => {
  it("refuses a free-text close by a routine (non-owner) user", async () => {
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "sub-1",
        actorEmail: "olga@example.com",
        actorIsOwner: false,
        note: "Looked fine to me.",
      })
    ).rejects.toThrow(/only an owner/i);
    expect(item.status).toBe("OPEN");
  });

  it("requires a controlled reason for an owner override", async () => {
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "own-1",
        actorEmail: "owner@example.com",
        actorIsOwner: true,
        note: "Reviewed the report.",
      })
    ).rejects.toThrow(/reason/i);
  });

  it("rejects a reason that is not allowed for the kind", async () => {
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "own-1",
        actorEmail: "owner@example.com",
        actorIsOwner: true,
        reasonCode: "NOT_A_REAL_REASON",
        note: "Reviewed the report.",
      })
    ).rejects.toThrow(/allowed reasons/i);
  });

  it("requires evidence, then records the override separately", async () => {
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "own-1",
        actorEmail: "owner@example.com",
        actorIsOwner: true,
        reasonCode: "PRESENCE_CONFIRMED",
        note: "  ",
      })
    ).rejects.toThrow(/evidence/i);

    await updateOwnedWork({
      workItemId: "work-1",
      action: "RESOLVE",
      actorSub: "own-1",
      actorEmail: "owner@example.com",
      actorIsOwner: true,
      reasonCode: "PRESENCE_CONFIRMED",
      note: "Checked the tech's photos against the address.",
    });

    expect(item).toMatchObject({
      status: "RESOLVED",
      resolvedManualOverride: true,
      resolvedReason: "PRESENCE_CONFIRMED",
    });
    expect(history).toContainEqual(
      expect.objectContaining({ eventType: "MANUAL_OVERRIDE" })
    );
  });
});

describe("owned-work: verified close (GL-18)", () => {
  it("steers a routine user to the verified action for a verifiable kind", async () => {
    item.kind = "MISSING_CONTACT";
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "sub-1",
        actorEmail: "olga@example.com",
        actorIsOwner: false,
        note: "Handled it.",
      })
    ).rejects.toThrow(/verified/i);
    expect(item.status).toBe("OPEN");
  });

  it("refuses a verified close when the real-world outcome is not yet true", async () => {
    item.kind = "MISSING_CONTACT";
    customer = { id: "rel-1", email: null };
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "sub-1",
        actorEmail: "olga@example.com",
        actorIsOwner: false,
        resolutionActionId: "CONTACT_ADDED",
      })
    ).rejects.toThrow(/isn't done yet/i);
    expect(item.status).toBe("OPEN");
  });

  it("lets a routine user close once the outcome is verified", async () => {
    item.kind = "MISSING_CONTACT";
    customer = { id: "rel-1", email: "dana@example.com" };
    // GL-18 R2: an address alone is not enough — the missed message must have
    // actually gone out since the case opened.
    emailLogs.push({
      id: "e1",
      customerId: "rel-1",
      deliveryStatus: "SENT",
      createdAt: "2026-08-01T00:00:00Z",
    });
    await updateOwnedWork({
      workItemId: "work-1",
      action: "RESOLVE",
      actorSub: "sub-1",
      actorEmail: "olga@example.com",
      actorIsOwner: false,
      resolutionActionId: "CONTACT_ADDED",
    });

    expect(item).toMatchObject({ status: "RESOLVED", resolvedManualOverride: false });
    expect(history).toContainEqual(
      expect.objectContaining({ eventType: "RESOLVED" })
    );
  });

  it("refuses the close when the address is on file but nothing has been sent since the case opened", async () => {
    item.kind = "MISSING_CONTACT";
    customer = { id: "rel-1", email: "dana@example.com" };
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "sub-1",
        actorEmail: "olga@example.com",
        actorIsOwner: false,
        resolutionActionId: "CONTACT_ADDED",
      })
    ).rejects.toThrow(/isn't done yet/i);
    expect(item.status).toBe("OPEN");
  });

  it("counts a qualifying pre-merge send logged under an absorbed id (the merge follow rule)", async () => {
    item.kind = "MISSING_CONTACT";
    item.customerId = "surv-1";
    customer = {
      id: "surv-1",
      email: "dana@example.com",
      mergeState: JSON.stringify({ absorbed: ["loser-1"] }),
    };
    emailLogs.push({
      id: "e1",
      customerId: "loser-1",
      deliveryStatus: "SENT",
      createdAt: "2026-08-01T00:00:00Z",
    });

    await updateOwnedWork({
      workItemId: "work-1",
      action: "RESOLVE",
      actorSub: "sub-1",
      actorEmail: "olga@example.com",
      actorIsOwner: false,
      resolutionActionId: "CONTACT_ADDED",
    });

    expect(item).toMatchObject({ status: "RESOLVED", resolvedManualOverride: false });
  });

  it("a send logged under an id the customer never absorbed still refuses the close", async () => {
    item.kind = "MISSING_CONTACT";
    item.customerId = "surv-1";
    customer = { id: "surv-1", email: "dana@example.com" };
    emailLogs.push({
      id: "e1",
      customerId: "loser-1",
      deliveryStatus: "SENT",
      createdAt: "2026-08-01T00:00:00Z",
    });

    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "sub-1",
        actorEmail: "olga@example.com",
        actorIsOwner: false,
        resolutionActionId: "CONTACT_ADDED",
      })
    ).rejects.toThrow(/isn't done yet/i);
    expect(item.status).toBe("OPEN");
  });

  it("closes a paid-cancellation only when the money is EXACTLY settled, and only for Finance", async () => {
    item.kind = "PAID_VISIT_CANCELLATION";
    job = { id: "rel-1", status: "SCHEDULED" };
    invoices = [{ status: "OPEN", stripePaymentIntentId: "pi_live" }];
    // GL-18 R10: money settlement is role-controlled — plain office can't run it.
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "fin-1",
        actorEmail: "finance@example.com",
        actorIsOwner: false,
        resolutionActionId: "MONEY_SETTLED",
      })
    ).rejects.toThrow(/finance role/i);
    // An in-flight charge refuses even for Finance.
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "fin-1",
        actorEmail: "finance@example.com",
        actorIsOwner: false,
        actorIsFinance: true,
        resolutionActionId: "MONEY_SETTLED",
      })
    ).rejects.toThrow(/in flight/i);

    // GL-18 R1: a PARTIAL refund on a canceled visit is NOT settled — the old
    // visitGone/any-refund shortcuts are gone.
    invoices = [{ status: "REFUNDED", amountCents: 15000, refundedAmountCents: 5000 }];
    job = { id: "rel-1", status: "CANCELED" };
    await expect(
      updateOwnedWork({
        workItemId: "work-1",
        action: "RESOLVE",
        actorSub: "fin-1",
        actorEmail: "finance@example.com",
        actorIsOwner: false,
        actorIsFinance: true,
        resolutionActionId: "MONEY_SETTLED",
      })
    ).rejects.toThrow(/full refund|retained/i);

    // Fully refunded settles.
    invoices = [{ status: "REFUNDED", amountCents: 15000, refundedAmountCents: 15000 }];
    await updateOwnedWork({
      workItemId: "work-1",
      action: "RESOLVE",
      actorSub: "fin-1",
      actorEmail: "finance@example.com",
      actorIsOwner: false,
      actorIsFinance: true,
      resolutionActionId: "MONEY_SETTLED",
    });
    expect(item.status).toBe("RESOLVED");
  });

  it("lets a trusted server caller close as verified without an owner", async () => {
    item.kind = "NO_ACCESS";
    await updateOwnedWork({
      workItemId: "work-1",
      action: "RESOLVE",
      actorSub: null,
      actorEmail: "system@pestbuzzkill.com",
      verified: true,
      note: "Rebooked as a linked visit.",
    });
    expect(item).toMatchObject({ status: "RESOLVED", resolvedManualOverride: false });
    expect(history).toContainEqual(
      expect.objectContaining({ eventType: "RESOLVED" })
    );
  });
});
