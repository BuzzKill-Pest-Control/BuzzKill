import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AppSyncIdentity } from "aws-lambda";

/**
 * GL-13 row-scoping — the technician read surface.
 *
 * Direct-handler proof that the model API's removal of the TECH read is backed
 * by real scoping: a technician's day and job come only from these queries, and
 * neither reveals another worker's work. Technician A cannot read Technician B's
 * job by id (same opaque refusal as a missing one); a reassignment removes the
 * former assignee's read on the next call; office may view anyone; and the
 * customer payload is reduced to visit fields with the job's money fields gone.
 */

type Tech = {
  id: string;
  name?: string | null;
  userSub?: string | null;
  active?: boolean | null;
  licenseNumber?: string | null;
  licenseExpiresOn?: string | null;
};
type Job = Record<string, unknown> & {
  id: string;
  customerId: string;
  technicianId?: string | null;
  routeId?: string | null;
};

const techs = new Map<string, Tech>();
const jobs = new Map<string, Job>();
const routes = new Map<string, Record<string, unknown>>();
const customers = new Map<string, Record<string, unknown>>();
const reports = new Map<string, Record<string, unknown>>();
const products: Record<string, unknown>[] = [];
const caseWrite = vi.fn(async () => true);
const licenseRead = vi.fn(async () => ({ data: [], nextToken: null }));
const store = {
  job: vi.fn(async (id: string) => jobs.get(id) ?? null),
  report: vi.fn(async (id: string) => reports.get(id) ?? null),
  reports: vi.fn(async (jobId: string) => [...reports.values()].filter((row) => row.jobId === jobId)),
  technician: vi.fn(async (sub: string) => [...techs.values()].find((row) => row.userSub === sub) ?? null),
  routeJobs: vi.fn(async (routeId: string) => [...jobs.values()].filter((row) => row.routeId === routeId)),
  customerJobs: vi.fn(async (customerId: string) => [...jobs.values()].filter((row) => row.customerId === customerId)),
  historyPage: vi.fn(async (customerId: string, key: { id: string } | null, limit: number) => {
    const rows = [...jobs.values()].filter((row) => row.customerId === customerId);
    const offset = key ? rows.findIndex((row) => row.id === key.id) + 1 : 0;
    const page = rows.slice(offset, offset + limit);
    return { rows: page, key: offset + limit < rows.length ? { id: page.at(-1)!.id, customerId } : null };
  }),
};

const fakeDataClient = {
  models: {
    Technician: {
      list: async () => ({ data: [...techs.values()], nextToken: null }),
    },
    Route: {
      listRouteByTechnicianIdAndDate: async (input: {
        technicianId: string;
        date: { eq: string };
      }) => ({
        data: [...routes.values()].filter(
          (r) =>
            r.technicianId === input.technicianId && r.date === input.date.eq
        ),
        nextToken: null as string | null,
      }),
    },
    Job: {
      get: async ({ id }: { id: string }) => ({ data: jobs.get(id) ?? null }),
      list: async ({
        filter,
      }: {
        filter?: {
          routeId?: { eq: string };
          customerId?: { eq: string };
          or?: { routeId?: { eq: string } }[];
        };
      }) => ({
        data: [...jobs.values()].filter((j) => {
          const routeOk = filter?.or
            ? filter.or.some((c) => j.routeId === c.routeId?.eq)
            : !filter?.routeId || j.routeId === filter.routeId.eq;
          return (
            routeOk &&
            (!filter?.customerId || j.customerId === filter.customerId.eq)
          );
        }),
        nextToken: null,
      }),
    },
    Customer: {
      get: async ({ id }: { id: string }) => ({
        data: customers.get(id) ?? null,
      }),
    },
    ServiceReport: {
      listServiceReportByJobId: async ({ jobId }: { jobId: string }) => ({
        data: [...reports.values()].filter((r) => r.jobId === jobId),
        nextToken: null,
      }),
    },
    Product: {
      list: async () => ({ data: products, nextToken: null }),
    },
    TechnicianLicense: { listTechnicianLicenseByTechnicianId: licenseRead },
  },
};

vi.mock("./dataClient", () => ({ dataClient: async () => fakeDataClient }));
vi.mock("./ownedWork", () => ({ openOwnedWork: (...args: unknown[]) => caseWrite(...args as []) }));
vi.mock("./technicianReadStore", async (original) => ({ ...await original<typeof import("./technicianReadStore")>(), technicianReadStore: () => store }));

const { buildTechnicianDay, buildTechnicianJob } = await import(
  "./technicianReads"
);

const identity = (sub: string | null, groups: string[]): AppSyncIdentity =>
  ({ sub, groups, claims: {} }) as unknown as AppSyncIdentity;

const TECH_A = identity("sub-a", ["TECH"]);
const TECH_B = identity("sub-b", ["TECH"]);
// Office work is the OWNER tier now (OFFICE/FINANCE consolidated into OWNER).
const OFFICE = identity("sub-office", ["OWNER"]);
const UNLINKED = identity("sub-nobody", ["TECH"]);

beforeEach(() => {
  vi.clearAllMocks(); caseWrite.mockResolvedValue(true); licenseRead.mockResolvedValue({ data: [], nextToken: null });
  store.reports.mockReset().mockImplementation(async (jobId) => [...reports.values()].filter((row) => row.jobId === jobId));
  techs.clear();
  jobs.clear();
  routes.clear();
  customers.clear();
  reports.clear();
  products.length = 0;

  techs.set("t_a", {
    id: "t_a",
    name: "Ana",
    userSub: "sub-a",
    active: true,
    licenseNumber: "MA-1",
    licenseExpiresOn: "2099-01-01",
  });
  techs.set("t_b", {
    id: "t_b",
    name: "Ben",
    userSub: "sub-b",
    active: true,
    licenseNumber: "MA-2",
    licenseExpiresOn: "2099-01-01",
  });

  customers.set("c_a", {
    id: "c_a",
    displayName: "Acme",
    contactName: "Al",
    email: "al@acme.test",
    phone: "555-1111",
    serviceStreet: "1 Main",
    serviceCity: "Town",
    serviceState: "CT",
    serviceZip: "06010",
    // Fields a technician must NOT receive:
    billingStreet: "9 Bank",
    stripeCustomerId: "cus_secret",
    notes: "internal org note",
  });

  routes.set("r_a", { id: "r_a", technicianId: "t_a", date: "2026-07-20", status: "PLANNED", notes: null });

  jobs.set("job_a", {
    id: "job_a",
    customerId: "c_a",
    technicianId: "t_a",
    routeId: "r_a",
    routeOrder: 1,
    serviceType: "General Pest",
    status: "SCHEDULED",
    scheduledStartTime: "15:30",
    scheduledEndTime: "16:30",
    priceCents: 12000,
    paidPaymentIntentId: "pi_secret",
  });
});
afterEach(() => vi.restoreAllMocks());

describe("proportional current reads and complete history", () => {
  it("uses one fresh request auth proof and CURRENT never reloads catalog/history", async () => {
    const product = vi.spyOn(fakeDataClient.models.Product, "list");
    const scanned = vi.spyOn(fakeDataClient.models.Job, "list");
    const roster = vi.spyOn(fakeDataClient.models.Technician, "list");
    const result = await buildTechnicianJob(TECH_A, "job_a", { view: "CURRENT" });
    expect(result).toMatchObject({ currentOnly: true, job: { id: "job_a" }, historyAllowed: true });
    expect(result).not.toHaveProperty("catalog"); expect(result).not.toHaveProperty("priorVisits");
    expect(store.technician).toHaveBeenCalledOnce(); expect(licenseRead).toHaveBeenCalledOnce();
    expect(product).not.toHaveBeenCalled(); expect(scanned).not.toHaveBeenCalled(); expect(roster).not.toHaveBeenCalled(); expect(store.customerJobs).not.toHaveBeenCalled();
    techs.set("t_a", { ...techs.get("t_a")!, active: false });
    await expect(buildTechnicianJob(TECH_A, "job_a", { view: "CURRENT" })).rejects.toThrow("Not authorized for this job");
    expect(store.technician).toHaveBeenCalledTimes(2);
  });
  it("unions every duplicate route page through keyed reads and fails visibly if mismatch work is unconfirmed", async () => {
    const route = vi.spyOn(fakeDataClient.models.Route, "listRouteByTechnicianIdAndDate");
    route.mockResolvedValueOnce({ data: [routes.get("r_a")!], nextToken: "another" }).mockResolvedValueOnce({ data: [{ id: "r_second", technicianId: "t_a", date: "2026-07-20" }], nextToken: null });
    jobs.set("bad", { id: "bad", customerId: "other", routeId: "r_second", technicianId: "t_b" });
    caseWrite.mockResolvedValueOnce(false);
    await expect(buildTechnicianDay(TECH_A, { date: "2026-07-20" })).rejects.toThrow(/mismatch could not be recorded/);
    expect(store.routeJobs.mock.calls.map(([id]) => id)).toEqual(["r_a", "r_second"]);
    expect(caseWrite).toHaveBeenCalledWith(expect.objectContaining({ kind: "ROUTE_MISMATCH", dedupeKey: "route-mismatch:bad" }));
  });
  it("sorts the complete customer partition before selecting recent context and caps prior-report concurrency at three", async () => {
    for (let i = 0; i < 12; i++) jobs.set(`prior-${i}`, { id: `prior-${i}`, customerId: "c_a", status: "COMPLETED", scheduledDate: `2026-${String(i + 1).padStart(2, "0")}-01` });
    let active = 0, maximum = 0;
    store.reports.mockImplementation(async (jobId) => {
      if (jobId === "job_a") return [];
      active++; maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 0)); active--;
      return [{ id: `rep-${jobId}`, jobId, customerId: "c_a", status: "FINALIZED", servicesPerformed: "treatment" }];
    });
    const result = await buildTechnicianJob(TECH_A, "job_a");
    expect(result.priorVisits.map((row) => row.id)).toEqual(["prior-11", "prior-10", "prior-9", "prior-8", "prior-7", "prior-6"]);
    expect(maximum).toBe(3); expect(store.customerJobs).toHaveBeenCalledWith("c_a");
  });
  it("preserves empty intermediate history continuation, includes undated visits and binds it to caller/job/customer", async () => {
    store.historyPage.mockResolvedValueOnce({ rows: [], key: { id: "examined", customerId: "c_a" } });
    const first = await buildTechnicianJob(TECH_A, "job_a", { view: "HISTORY", historyLimit: 2 });
    expect(first).toMatchObject({ historyPage: true, priorVisits: [], historyNextToken: expect.any(String) });
    if (!("historyPage" in first)) throw new Error("Wrong view");
    jobs.set("undated", { id: "undated", customerId: "c_a", status: "CANCELED", serviceType: "Earlier" });
    store.historyPage.mockResolvedValueOnce({ rows: [jobs.get("undated")!], key: null });
    const next = await buildTechnicianJob(TECH_A, "job_a", { view: "HISTORY", historyToken: first.historyNextToken });
    expect(next).toMatchObject({ priorVisits: [{ id: "undated", scheduledDate: null }], historyNextToken: null });
    await expect(buildTechnicianJob(OFFICE, "job_a", { view: "HISTORY", historyToken: first.historyNextToken })).rejects.toThrow(/continuation/);
    jobs.set("job_a", { ...jobs.get("job_a")!, customerId: "changed" });
    await expect(buildTechnicianJob(TECH_A, "job_a", { view: "HISTORY", historyToken: first.historyNextToken })).rejects.toThrow(/continuation/);
  });
  it("labels report/history/catalog failures as unavailable instead of claiming no history or report", async () => {
    store.reports.mockRejectedValueOnce(new Error("private report error"));
    vi.spyOn(fakeDataClient.models.Product, "list").mockRejectedValue(new Error("private product error"));
    store.customerJobs.mockRejectedValueOnce(new Error("private source error"));
    const result = await buildTechnicianJob(TECH_A, "job_a");
    expect(result).toMatchObject({ job: { id: "job_a" }, reportsUnavailable: true, catalogUnavailable: true, historyUnavailable: true });
    expect(JSON.stringify(result)).not.toMatch(/private.*error/);
  });
  it("fails a GraphQL licence page closed without fallback to a legacy current credential", async () => {
    licenseRead.mockResolvedValueOnce({ data: [], nextToken: null, errors: [{ message: "private licence failure" }] } as never);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(buildTechnicianJob(TECH_A, "job_a")).rejects.toThrow("Not authorized for this job");
    expect(log).toHaveBeenCalledWith("licenseRecordsFor: licence records could not be verified");
  });
  it("returns complete same-customer lineage beyond five attempts and marks cycles/missing pointers unavailable", async () => {
    jobs.set("job_a", { ...jobs.get("job_a")!, rebookedFromJobId: "attempt-7" });
    for (let i = 1; i <= 7; i++) jobs.set(`attempt-${i}`, { id: `attempt-${i}`, customerId: "c_a", rebookedFromJobId: i > 1 ? `attempt-${i - 1}` : null, status: "NO_ACCESS" });
    const full = await buildTechnicianJob(TECH_A, "job_a");
    expect(full.lineage).toHaveLength(7); expect(full.lineageUnavailable).toBeUndefined();
    jobs.set("attempt-1", { ...jobs.get("attempt-1")!, rebookedFromJobId: "job_a" });
    expect((await buildTechnicianJob(TECH_A, "job_a")).lineageUnavailable).toBe(true);
  });
  it("refreshes the confirmed report by source ID before its job index catches up, and refuses foreign report context", async () => {
    reports.set("saved", { id: "saved", jobId: "job_a", customerId: "c_a", technicianId: "t_a", status: "FINALIZED" });
    const result = await buildTechnicianJob(TECH_A, "job_a", { view: "CURRENT", reportId: "saved" });
    expect(result).toMatchObject({ reports: [{ id: "saved", status: "FINALIZED" }], currentOnly: true });
    expect(store.report).toHaveBeenCalledWith("saved"); expect(store.reports).not.toHaveBeenCalled();
    reports.set("saved", { id: "saved", jobId: "another-job", customerId: "private", technicianId: "t_b" });
    const denied = await buildTechnicianJob(TECH_A, "job_a", { view: "CURRENT", reportId: "saved" });
    expect(denied).toMatchObject({ reports: [], reportsUnavailable: true });
    expect(JSON.stringify(denied)).not.toContain("private");
  });
});

describe("buildTechnicianJob", () => {
  it("gives the assignee the job, with the customer reduced to visit fields", async () => {
    const d = await buildTechnicianJob(TECH_A, "job_a");
    expect(d.job.id).toBe("job_a");
    expect(d.job.scheduledStartTime).toBe("15:30");
    expect(d.job.scheduledEndTime).toBe("16:30");
    // Money fields are dropped even for the assignee's own job.
    expect(d.job.priceCents).toBeUndefined();
    expect(d.job.paidPaymentIntentId).toBeUndefined();
    // Customer carries only visit fields.
    expect(d.customer?.displayName).toBe("Acme");
    expect(d.customer?.serviceStreet).toBe("1 Main");
    expect(d.customer?.billingStreet).toBeUndefined();
    expect(d.customer?.stripeCustomerId).toBeUndefined();
    expect(d.customer?.notes).toBeUndefined();
    // The caller's OWN technician record, licence-free.
    expect(d.technician?.id).toBe("t_a");
    expect(d.technician).not.toHaveProperty("licenseNumber");
  });

  it("refuses a job that is not the caller's — opaque, like a missing one", async () => {
    await expect(buildTechnicianJob(TECH_B, "job_a")).rejects.toThrow(
      "Not authorized for this job"
    );
    await expect(buildTechnicianJob(TECH_B, "no_such_job")).rejects.toThrow(
      "Not authorized for this job"
    );
  });

  it("lets office read any job", async () => {
    const d = await buildTechnicianJob(OFFICE, "job_a");
    expect(d.job.id).toBe("job_a");
    // An office viewer is not a technician; report identity stays unset.
    expect(d.technician).toBeNull();
  });

  it("removes the former assignee's read the moment the job is reassigned", async () => {
    jobs.set("job_a", { ...jobs.get("job_a")!, technicianId: "t_b" });
    await expect(buildTechnicianJob(TECH_A, "job_a")).rejects.toThrow(
      "Not authorized for this job"
    );
    const d = await buildTechnicianJob(TECH_B, "job_a");
    expect(d.job.id).toBe("job_a");
  });
});

describe("buildTechnicianDay", () => {
  it("gives a technician their own route and stops, customers reduced to visit fields", async () => {
    const d = await buildTechnicianDay(TECH_A, { date: "2026-07-20" });
    expect(d.technicianId).toBe("t_a");
    expect(d.canPickTechnician).toBe(false);
    expect(d.technicians).toEqual([]);
    expect(d.route?.id).toBe("r_a");
    expect(d.jobs.map((j) => j.id)).toEqual(["job_a"]);
    expect(d.jobs[0].scheduledStartTime).toBe("15:30");
    expect(d.jobs[0].scheduledEndTime).toBe("16:30");
    expect(d.jobs[0].priceCents).toBeUndefined();
    expect(d.customers.c_a.serviceStreet).toBe("1 Main");
    expect(d.customers.c_a.billingStreet).toBeUndefined();
  });

  it("ignores a technicianId argument from a TECH — they only ever see themselves", async () => {
    const d = await buildTechnicianDay(TECH_A, {
      date: "2026-07-20",
      technicianId: "t_b",
    });
    expect(d.technicianId).toBe("t_a");
    expect(d.route?.id).toBe("r_a");
  });

  it("tells an unlinked technician login to get linked, without leaking any work", async () => {
    const d = await buildTechnicianDay(UNLINKED, { date: "2026-07-20" });
    expect(d.unlinked).toBe(true);
    expect(d.route).toBeNull();
    expect(d.jobs).toEqual([]);
  });

  it("lets office pick any technician's day and returns the picker roster", async () => {
    // Ben's route for the day.
    routes.set("r_b", { id: "r_b", technicianId: "t_b", date: "2026-07-20", status: "PLANNED", notes: null });
    jobs.set("job_b", {
      id: "job_b",
      customerId: "c_a",
      technicianId: "t_b",
      routeId: "r_b",
      routeOrder: 1,
      serviceType: "Rodent",
      status: "SCHEDULED",
    });
    const d = await buildTechnicianDay(OFFICE, {
      date: "2026-07-20",
      technicianId: "t_b",
    });
    expect(d.canPickTechnician).toBe(true);
    expect(d.technicians.map((t) => t.id).sort()).toEqual(["t_a", "t_b"]);
    expect(d.technicianId).toBe("t_b");
    expect(d.jobs.map((j) => j.id)).toEqual(["job_b"]);
  });

  it("unions stops split across DUPLICATE routes for the same technician+date", async () => {
    // Non-atomic route creation left two PLANNED routes for Ana on the same
    // day, with her stops split across them. Trusting a single route[0] would
    // hide whichever stops live on the other route (the bug that made a real
    // day read "No stops on this route"). The day must show every stop, in
    // routeOrder, regardless of which duplicate route each one landed on.
    routes.set("r_a2", {
      id: "r_a2",
      technicianId: "t_a",
      date: "2026-07-20",
      status: "PLANNED",
      notes: null,
    });
    jobs.set("job_a2", {
      id: "job_a2",
      customerId: "c_a",
      technicianId: "t_a",
      routeId: "r_a2",
      routeOrder: 2,
      serviceType: "Wasp",
      status: "SCHEDULED",
    });
    const d = await buildTechnicianDay(TECH_A, { date: "2026-07-20" });
    // job_a (order 1, route r_a) + job_a2 (order 2, route r_a2), both shown.
    expect(d.jobs.map((j) => j.id)).toEqual(["job_a", "job_a2"]);
    // Display route is a deterministic pick across the duplicates.
    expect(d.route?.id).toBe("r_a");
  });
});

describe("GL-13 boundaries — day view trusts the assignment, not the route", () => {
  it("withholds a route stop whose assigned technician disagrees, and keeps its customer out of the payload", async () => {
    // job_x sits on Ana's route but is assigned to Ben — a partial
    // reassignment. Ana must not see it (or its customer).
    customers.set("c_x", {
      id: "c_x",
      displayName: "Other Co",
      serviceStreet: "9 Elm",
    });
    jobs.set("job_x", {
      id: "job_x",
      customerId: "c_x",
      technicianId: "t_b",
      routeId: "r_a",
      routeOrder: 2,
      status: "SCHEDULED",
    });
    const d = await buildTechnicianDay(TECH_A, { date: "2026-07-20" });
    expect(d.jobs.map((j) => j.id)).toEqual(["job_a"]);
    expect(Object.keys(d.customers)).toEqual(["c_a"]);
  });

  it("shows the mismatch to office, flagged, since they own the fix", async () => {
    jobs.set("job_x", {
      id: "job_x",
      customerId: "c_a",
      technicianId: "t_b",
      routeId: "r_a",
      routeOrder: 2,
      status: "SCHEDULED",
    });
    const d = await buildTechnicianDay(OFFICE, {
      date: "2026-07-20",
      technicianId: "t_a",
    });
    const flagged = d.jobs.find((j) => j.id === "job_x");
    expect(flagged?.assignmentMismatch).toBe(true);
  });

  it("returns an explicit access-ended state for an inactive technician with a live session", async () => {
    techs.set("t_a", { ...techs.get("t_a")!, active: false });
    const d = await buildTechnicianDay(TECH_A, { date: "2026-07-20" });
    expect(d.accessEnded).toBe(true);
    expect(d.route).toBeNull();
    expect(d.jobs).toEqual([]);
    expect(Object.keys(d.customers)).toEqual([]);
  });

  it("returns no current/future route to a lapsed-licence technician", async () => {
    techs.set("t_a", { ...techs.get("t_a")!, licenseExpiresOn: "2020-01-01" });
    const d = await buildTechnicianDay(TECH_A, { date: "2026-07-20" });
    expect(d.licenseLapsed).toBe(true);
    expect(d.route).toBeNull();
    expect(d.jobs).toEqual([]);
  });

  it("lets a lapsed-licence technician review their own COMPLETED job — own reports only, no other-visit history", async () => {
    techs.set("t_a", { ...techs.get("t_a")!, licenseExpiresOn: "2020-01-01" });
    jobs.set("job_a", { ...jobs.get("job_a")!, status: "COMPLETED" });
    // Another visit at the same customer and another tech's report on this job.
    jobs.set("job_later", {
      id: "job_later",
      customerId: "c_a",
      technicianId: "t_b",
      status: "SCHEDULED",
    });
    reports.set("rep_own", {
      id: "rep_own",
      customerId: "c_a",
      jobId: "job_a",
      technicianId: "t_a",
      status: "FINALIZED",
    });
    reports.set("rep_other", {
      id: "rep_other",
      customerId: "c_a",
      jobId: "job_a",
      technicianId: "t_b",
      status: "FINALIZED",
    });
    const d = await buildTechnicianJob(TECH_A, "job_a");
    expect(d.priorVisits).toEqual([]);
    expect(d.reports.map((r) => r.id)).toEqual(["rep_own"]);
  });

  it("refuses even a COMPLETED job to an inactive technician", async () => {
    techs.set("t_a", { ...techs.get("t_a")!, active: false });
    jobs.set("job_a", { ...jobs.get("job_a")!, status: "COMPLETED" });
    await expect(buildTechnicianJob(TECH_A, "job_a")).rejects.toThrow(
      "Not authorized for this job"
    );
  });
});
