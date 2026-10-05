import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _setLockStoreForTests, memoryLockStore } from "./atomicLock";
import { isLeadOpen } from "./leadStage";

type Row = Record<string, unknown>;
const customers = new Map<string, Row>();
const jobs = new Map<string, Row>();
let followup: Row | null;
let followupReadFails = false;
const { acquireClaim, releaseClaim, appendActivity, openWork, resolveWork } = vi.hoisted(() => ({
  acquireClaim: vi.fn(), releaseClaim: vi.fn(), appendActivity: vi.fn(),
  openWork: vi.fn(), resolveWork: vi.fn(),
}));
vi.mock("./dataClient", () => ({
  dataClient: async () => ({ models: {
    Customer: { get: async ({ id }: { id: string }) => ({ data: customers.has(id) ? { ...customers.get(id) } : null }) },
    WorkItem: { get: async () => ({ data: followup, errors: followupReadFails ? [{ message: "unreadable" }] : undefined }) },
  } }),
}));
vi.mock("./leadClaim", () => ({ acquireLeadLifecycleClaim: acquireClaim, releaseLeadLifecycleClaim: releaseClaim }));
vi.mock("./leadLifecycle", () => ({ appendLeadActivity: appendActivity }));
vi.mock("./ownedWork", () => ({
  openOwnedWork: openWork, resolveOwnedWork: resolveWork,
  workItemId: (kind: string, id: string) => `${kind}:${id}`,
}));
vi.mock("./customerMerge", () => ({ isMidMerge: (row: Row) => Boolean(row.mergeCounterpartId) }));
const { settleLeadForOfficeJob } = await import("./officeJobLead");
const input = { customerId: "c1", jobId: "j1", actor: { sub: "office", email: "office@example.com" } };

beforeEach(() => {
  vi.resetAllMocks();
  customers.clear();
  jobs.clear();
  jobs.set("j1", { id: "j1", customerId: "c1", status: "SCHEDULED" });
  customers.set("c1", {
    id: "c1", status: "LEAD", nextAction: "Contact customer", nextActionAt: "2026-10-05T12:00:00Z",
    stripeCustomerId: "cus_existing", contactConsent: false, accessGroups: ["cus-c1", "grp-g1"],
  });
  followup = { id: "LEAD_FOLLOWUP:c1", status: "OPEN" };
  followupReadFails = false;
  acquireClaim.mockResolvedValue({ won: true, holder: "ours" });
  releaseClaim.mockResolvedValue(undefined);
  appendActivity.mockResolvedValue({ id: "activity" });
  openWork.mockResolvedValue("recovery");
  resolveWork.mockImplementation(async () => { if (followup) followup.status = "RESOLVED"; return true; });
  _setLockStoreForTests(memoryLockStore({ Customer: customers, Job: jobs }));
});
afterEach(() => _setLockStoreForTests(null));

describe("settling a saved office job's originating lead", () => {
  it("closes sales follow-up without touching payment, consent, or access", async () => {
    expect(await settleLeadForOfficeJob(input)).toEqual({});
    const customer = customers.get("c1")!;
    expect(customer).toMatchObject({ status: "ACTIVE", stripeCustomerId: "cus_existing", contactConsent: false, accessGroups: ["cus-c1", "grp-g1"] });
    expect(customer.nextAction ?? null).toBeNull();
    expect(customer.nextActionAt ?? null).toBeNull();
    expect(customer.convertedAt).toBeTruthy();
    expect(isLeadOpen(customer)).toBe(false);
    expect(followup?.status).toBe("RESOLVED");
    expect(appendActivity).toHaveBeenCalledWith(expect.objectContaining({ mutationId: "office-job:j1", preserveOriginalActor: true, actor: input.actor, outcome: "NOTE" }));
    expect(releaseClaim).toHaveBeenCalledWith("c1", "ours");
    expect(openWork).not.toHaveBeenCalled();
  });

  it("retries cleanup after a partial close without re-converting or duplicating history", async () => {
    resolveWork.mockResolvedValueOnce(false);
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/Job saved/);
    const convertedAt = customers.get("c1")!.convertedAt;
    expect(await settleLeadForOfficeJob(input)).toEqual({});
    expect(customers.get("c1")!.convertedAt).toBe(convertedAt);
    expect(appendActivity).toHaveBeenCalledTimes(1);
    expect(followup?.status).toBe("RESOLVED");
  });

  it("adopts a concurrent active conversion without changing its facts", async () => {
    const customer = customers.get("c1")!;
    Object.assign(customer, { status: "ACTIVE", convertedAt: "2026-10-01T00:00:00Z", leadMutationId: "paid-booking:b1" });
    const before = { ...customer };
    expect(await settleLeadForOfficeJob(input)).toEqual({});
    expect(customer).toEqual(before);
    expect(appendActivity).not.toHaveBeenCalled();
    expect(followup?.status).toBe("RESOLVED");
  });

  it.each([{ doNotContact: true }, { lostReason: "PRICE" }])("preserves deliberate terminal lead facts: %j", async (facts) => {
    Object.assign(customers.get("c1")!, facts);
    expect(await settleLeadForOfficeJob(input)).toEqual({});
    expect(customers.get("c1")).toMatchObject({ status: "LEAD", ...facts });
    expect(appendActivity).not.toHaveBeenCalled();
    expect(resolveWork).not.toHaveBeenCalled();
    expect(followup?.status).toBe("OPEN");
  });

  it.each([{ mergeCounterpartId: "c2" }, { status: "MERGED" }, { status: "INACTIVE" }])("refuses unsafe lifecycle changes and owns recovery: %j", async (facts) => {
    Object.assign(customers.get("c1")!, facts);
    const before = { ...customers.get("c1") };
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/Job saved.*Do not add the job again/);
    expect(customers.get("c1")).toEqual(before);
    expect(resolveWork).not.toHaveBeenCalled();
    expect(openWork).toHaveBeenCalledWith(expect.objectContaining({ kind: "LEAD_LIFECYCLE_RECOVERY", relatedId: "office-job:j1", customerId: "c1" }));
  });

  it("a lead action holding the claim yields a saved-job warning instead of racing it", async () => {
    acquireClaim.mockResolvedValue({ won: false });
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/recovery item/);
    expect(customers.get("c1")!.status).toBe("LEAD");
    expect(appendActivity).not.toHaveBeenCalled();
    expect(resolveWork).not.toHaveBeenCalled();
    expect(releaseClaim).not.toHaveBeenCalled();
  });

  it.each([{ mergeCounterpartId: "c2" }, { doNotContact: true }, { lostReason: "PRICE" }, { leadMutationId: "another-action" }, { conversionReviewBookingId: "paid-review" }, { nextAction: "Resolve paid booking identity" }, { nextActionAt: "2026-10-06T12:00:00Z" }])("guards a lifecycle change arriving after the read: %j", async (race) => {
    appendActivity.mockImplementation(async () => { Object.assign(customers.get("c1")!, race); return {}; });
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/Job saved/);
    expect(customers.get("c1")).toMatchObject({ status: "LEAD", ...race });
    expect(resolveWork).not.toHaveBeenCalled();
  });

  it.each(["LEAD", "ACTIVE"])("does not touch a pending paid identity decision on %s", async (status) => {
    Object.assign(customers.get("c1")!, {
      status, conversionReviewBookingId: "paid-review", nextAction: "Resolve paid booking identity",
    });
    const before = { ...customers.get("c1") };
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/Job saved/);
    expect(customers.get("c1")).toEqual(before);
    expect(appendActivity).not.toHaveBeenCalled();
    expect(resolveWork).not.toHaveBeenCalled();
  });

  it("checks job cancellation atomically with conversion, after the earlier job read", async () => {
    appendActivity.mockImplementation(async () => { jobs.get("j1")!.status = "CANCELED"; return {}; });
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/Job saved/);
    expect(customers.get("c1")).toMatchObject({ status: "LEAD", nextAction: "Contact customer" });
    expect(resolveWork).not.toHaveBeenCalled();
  });

  it("checks job ownership atomically with conversion", async () => {
    appendActivity.mockImplementation(async () => { jobs.get("j1")!.customerId = "c2"; return {}; });
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/Job saved/);
    expect(customers.get("c1")!.status).toBe("LEAD");
    expect(resolveWork).not.toHaveBeenCalled();
  });

  it("does not fall back to an unguarded conversion without transactional support", async () => {
    const store = memoryLockStore({ Customer: customers, Job: jobs });
    delete store.transactionalUpdate;
    _setLockStoreForTests(store);
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/Job saved/);
    expect(customers.get("c1")!.status).toBe("LEAD");
    expect(resolveWork).not.toHaveBeenCalled();
  });

  it("an audit failure cannot silently convert a lead", async () => {
    appendActivity.mockRejectedValue(new Error("audit failed"));
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/Job saved/);
    expect(customers.get("c1")!.status).toBe("LEAD");
    expect(resolveWork).not.toHaveBeenCalled();
  });

  it("reports an unreadable follow-up as incomplete even if resolve returned success", async () => {
    followupReadFails = true;
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/recovery item/);
  });

  it("still preserves saved-job success when both conversion and recovery fail", async () => {
    acquireClaim.mockRejectedValue(new Error("offline"));
    openWork.mockRejectedValue(new Error("offline"));
    expect((await settleLeadForOfficeJob(input)).warning).toMatch(/Recovery work could not be recorded/);
  });
});
