import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * getDocumentUrl and the merge follow rule.
 *
 * S3 keys freeze the customer id they were minted under, so a document that
 * belonged to a merged-away customer stays readable by whoever is entitled to
 * the SURVIVOR — entitlement follows mergedIntoId. The quote key's exact-id
 * check follows the same pointer: a pre-merge quotes/<cid>/ key is accepted
 * only when <cid> resolves to the booking's current customer. Anyone else
 * stays refused.
 */

const customers = new Map<string, Record<string, unknown>>();
let booking: Record<string, unknown> | null = null;

const fakeDataClient = {
  models: {
    Customer: {
      get: async ({ id }: { id: string }) => ({
        data: customers.get(id) ?? null,
      }),
    },
    BookingRequest: {
      get: async ({ id }: { id: string }) => ({
        data: booking && booking.id === id ? booking : null,
      }),
    },
  },
};
vi.mock("../shared/dataClient", () => ({ dataClient: async () => fakeDataClient }));
vi.mock("../shared/email", () => ({
  emailShell: (h: string, b: string) => `${h}${b}`,
  sendEmail: async () => true,
  notifyOffice: async () => true,
}));
vi.mock("../shared/stripeClient", () => ({ stripeClient: () => ({}) }));
vi.mock("../shared/subscription", () => ({
  startPlanBilling: async () => ({ started: true }),
}));
vi.mock("../shared/recurring", () => ({
  nextVisitDate: () => "2026-08-15",
  prettyDate: (d: string) => d,
  scheduleNextRecurringVisit: async () => undefined,
}));
vi.mock("../shared/pdf", () => ({
  renderServiceReportPdf: async () => new Uint8Array([1]),
}));
const quotePdfCalls: unknown[] = [];
vi.mock("../shared/quoteDoc", () => ({
  renderQuotePdfForBooking: async (b: unknown) => {
    quotePdfCalls.push(b);
    return new Uint8Array([1]);
  },
}));
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: class {
    async send() {
      return {};
    }
  },
  PutObjectCommand: class {},
  GetObjectCommand: class {},
}));
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: async () => "https://s3.example/signed",
}));

const { handler } = await import("./handler");

const getUrl = (key: string, groups: string[]) =>
  (handler as unknown as (e: never) => Promise<{ url: string }>)({
    info: { fieldName: "getDocumentUrl" },
    arguments: { key },
    identity: { sub: "u-1", groups, claims: {} },
  } as never);

beforeEach(() => {
  customers.clear();
  booking = null;
  quotePdfCalls.length = 0;
  process.env.DOCS_BUCKET = "test-docs";
});

describe("getDocumentUrl entitlement follows a merge", () => {
  it("the survivor's login reads a tombstone-keyed document", async () => {
    customers.set("loser-1", {
      id: "loser-1",
      status: "MERGED",
      mergedIntoId: "surv-1",
    });
    customers.set("surv-1", { id: "surv-1", status: "ACTIVE" });

    const res = await getUrl("documents/loser-1/123-ab.pdf", [
      "CUSTOMER",
      "cus-surv-1",
    ]);
    expect(res.url).toBe("https://s3.example/signed");
  });

  it("a caller not entitled to the survivor is still refused", async () => {
    customers.set("loser-1", {
      id: "loser-1",
      status: "MERGED",
      mergedIntoId: "surv-1",
    });
    customers.set("surv-1", { id: "surv-1", status: "ACTIVE" });

    await expect(
      getUrl("documents/loser-1/123-ab.pdf", ["CUSTOMER", "cus-other-9"])
    ).rejects.toThrow(/not authorized/i);
  });

  it("a live customer's own key needs no follow", async () => {
    const res = await getUrl("documents/c-live/123-ab.pdf", [
      "CUSTOMER",
      "cus-c-live",
    ]);
    expect(res.url).toBe("https://s3.example/signed");
  });
});

describe("quote keys and the merge follow rule", () => {
  it("a pre-merge quotes/<cid>/ key is accepted when <cid> resolves to the booking's current customer", async () => {
    customers.set("loser-1", {
      id: "loser-1",
      status: "MERGED",
      mergedIntoId: "surv-1",
    });
    customers.set("surv-1", { id: "surv-1", status: "ACTIVE" });
    // The booking was repointed to the survivor by the merge's CHILDREN pass.
    booking = { id: "bk-1", customerId: "surv-1" };

    const res = await getUrl("quotes/loser-1/bk-1.pdf", ["OWNER"]);
    expect(res.url).toBe("https://s3.example/signed");
    expect(quotePdfCalls).toHaveLength(1);
  });

  it("a key naming an unrelated customer stays refused, merge map or not", async () => {
    customers.set("surv-1", { id: "surv-1", status: "ACTIVE" });
    booking = { id: "bk-1", customerId: "surv-1" };

    await expect(
      getUrl("quotes/stranger-1/bk-1.pdf", ["OWNER"])
    ).rejects.toThrow(/not authorized/i);
    expect(quotePdfCalls).toHaveLength(0);
  });
});
