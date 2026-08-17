import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The daily backstops.
 *
 * The filters are the whole feature. A digest that lists plans or jobs which
 * are supposed to be unbilled — or an alert that cries about visits somebody
 * is staffed to make — trains the office to ignore it, at which point it is
 * worse than not existing.
 */

type Plan = {
  id: string;
  customerId: string;
  planName: string;
  priceCents: number;
  status: string;
  stripeSubscriptionId?: string | null;
};
type Job = {
  id: string;
  customerId?: string;
  servicePlanId?: string | null;
  serviceType?: string;
  type?: string;
  status: string;
  scheduledDate?: string | null;
  routeId?: string | null;
  priceCents?: number | null;
  paidAt?: string | null;
  completedAt?: string | null;
  timeWindow?: string | null;
};
type Invoice = { id: string; jobId?: string | null; status: string };
type Route = { id: string; date: string; technicianId: string };
type Tech = {
  id: string;
  name: string;
  active: boolean;
  licenseNumber?: string | null;
  licenseExpiresOn?: string | null;
};

let plans: Plan[] = [];
let jobs: Job[] = [];
let invoiceRows: Invoice[] = [];
let routes: Route[] = [];
let techs: Tech[] = [];
type DisputeRow = {
  id: string;
  stripeDisputeId: string;
  customerId?: string | null;
  amountCents: number;
  status: string;
  evidenceDueBy?: string | null;
  ownerEmail?: string | null;
};
let disputeRows: DisputeRow[] = [];

/** Same shop-timezone date arithmetic the handler uses. */
const easternPlusDays = (n: number) =>
  new Date(Date.now() + n * 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });

const fakeDataClient = {
  models: {
    ServicePlan: {
      list: async () => ({
        data: plans.filter((p) => p.status === "ACTIVE"),
        nextToken: null,
      }),
    },
    Job: {
      listJobByScheduledDate: async ({
        scheduledDate,
      }: {
        scheduledDate: string;
      }) => ({
        data: jobs.filter((j) => j.scheduledDate === scheduledDate),
        nextToken: null,
      }),
      listJobByServicePlanId: async ({ servicePlanId }: { servicePlanId: string }) => ({
        data: jobs.filter((j) => j.servicePlanId === servicePlanId),
        nextToken: null,
      }),
      listJobByStatusAndScheduledDate: async (
        { status }: { status: string },
        opts?: { filter?: { type?: { eq?: string } } }
      ) => ({
        data: jobs.filter(
          (j) =>
            j.status === status &&
            (!opts?.filter?.type?.eq || j.type === opts.filter.type.eq)
        ),
        nextToken: null,
      }),
    },
    Invoice: {
      list: async () => ({ data: invoiceRows, nextToken: null }),
      // The dunning/reminder passes read the status index.
      listInvoiceByStatusAndIssuedAt: async ({ status }: { status: string }) => ({
        data: invoiceRows.filter((i) => i.status === status),
        nextToken: null,
      }),
    },
    Dispute: {
      listDisputeByStatus: async ({ status }: { status: string }) => ({
        data: disputeRows.filter((d) => d.status === status),
        nextToken: null,
      }),
    },
    Route: {
      get: async ({ id }: { id: string }) => ({
        data: routes.find((r) => r.id === id) ?? null,
      }),
    },
    Technician: {
      get: async ({ id }: { id: string }) => ({
        data: techs.find((t) => t.id === id) ?? null,
      }),
    },
    Customer: {
      get: async ({ id }: { id: string }) => ({
        data: { id, displayName: `Customer ${id}`, email: `${id}@example.com` },
      }),
    },
  },
};

vi.mock("../shared/dataClient", () => ({ dataClient: async () => fakeDataClient }));

const officeEmails: { subject: string; bodyHtml: string }[] = [];
const customerEmails: { to: string; subject: string; html: string }[] = [];
vi.mock("../shared/email", () => ({
  emailShell: (h: string, b: string) => `${h}${b}`,
  sendEmail: async (opts: { to: string; subject: string; html: string }) => {
    customerEmails.push(opts);
    return true;
  },
  notifyOffice: async (opts: { subject: string; bodyHtml: string }) => {
    officeEmails.push(opts);
    return true;
  },
}));

const { handler } = await import("./handler");

/** Office alerts about one topic — every digest asserts on its own subject. */
const alertsAbout = (needle: string) =>
  officeEmails.filter((e) => e.subject.includes(needle));

let jobSeq = 0;
const seedJob = (over: Partial<Job> = {}): Job => {
  const j: Job = {
    id: `j${++jobSeq}`,
    customerId: "c-one",
    serviceType: "Wasp nest removal",
    type: "ONE_TIME",
    status: "COMPLETED",
    priceCents: 29900,
    paidAt: null,
    completedAt: "2026-07-10T15:00:00.000Z",
    scheduledDate: null,
    routeId: null,
    ...over,
  };
  jobs.push(j);
  return j;
};

beforeEach(() => {
  plans = [];
  jobs = [];
  invoiceRows = [];
  routes = [];
  techs = [];
  disputeRows = [];
  jobSeq = 0;
  officeEmails.length = 0;
  customerEmails.length = 0;
});

describe("unstaffed-visit gate on tomorrow's reminders", () => {
  const tomorrow = () => easternPlusDays(1);

  const staffedSetup = () => {
    routes.push({ id: "r1", date: tomorrow(), technicianId: "t1" });
    techs.push({ id: "t1", name: "Sam", active: true, licenseNumber: "MA-1", licenseExpiresOn: "2099-01-01" });
  };

  it("reminds the customer when the visit is on an active technician's route", async () => {
    staffedSetup();
    seedJob({
      customerId: "c-early",
      status: "SCHEDULED",
      scheduledDate: tomorrow(),
      routeId: "r1",
      completedAt: null,
    });

    await handler();

    expect(customerEmails).toHaveLength(1);
    expect(customerEmails[0].to).toBe("c-early@example.com");
    expect(alertsAbout("Morning ops")).toHaveLength(0);
  });

  it("suppresses the reminder and alerts the office when the visit is on no route", async () => {
    seedJob({
      customerId: "c-lost",
      status: "SCHEDULED",
      scheduledDate: tomorrow(),
      routeId: null,
      completedAt: null,
    });

    await handler();

    expect(customerEmails).toHaveLength(0);
    const alerts = alertsAbout("Morning ops");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].bodyHtml).toContain("Customer c-lost");
    expect(alerts[0].bodyHtml).toContain("on no technician's route");
    expect(alerts[0].bodyHtml).toContain("No reminder was sent");
  });

  it("suppresses the reminder when the route's technician is deactivated", async () => {
    routes.push({ id: "r1", date: tomorrow(), technicianId: "t1" });
    techs.push({ id: "t1", name: "Sam", active: false });
    seedJob({
      customerId: "c-fired",
      status: "SCHEDULED",
      scheduledDate: tomorrow(),
      routeId: "r1",
      completedAt: null,
    });

    await handler();

    expect(customerEmails).toHaveLength(0);
    const alerts = alertsAbout("Morning ops");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].bodyHtml).toContain("Sam, who is deactivated");
  });

  it("suppresses the reminder when the job's route is dated a different day", async () => {
    routes.push({ id: "r1", date: "2020-01-01", technicianId: "t1" });
    techs.push({ id: "t1", name: "Sam", active: true, licenseNumber: "MA-1", licenseExpiresOn: "2099-01-01" });
    seedJob({
      customerId: "c-moved",
      status: "SCHEDULED",
      scheduledDate: tomorrow(),
      routeId: "r1",
      completedAt: null,
    });

    await handler();

    expect(customerEmails).toHaveLength(0);
    expect(alertsAbout("Morning ops")).toHaveLength(1);
  });

  it("includes a pool job whose target date is tomorrow, without reminding anyone", async () => {
    seedJob({
      customerId: "c-pool",
      status: "UNSCHEDULED",
      scheduledDate: tomorrow(),
      completedAt: null,
    });

    await handler();

    expect(customerEmails).toHaveLength(0);
    const alerts = alertsAbout("Morning ops");
    expect(alerts).toHaveLength(1);
    expect(alerts[0].bodyHtml).toContain("needs-scheduling pool");
  });

  it("leaves the one-week-out reminder alone — routes do not exist yet", async () => {
    seedJob({
      customerId: "c-week",
      status: "SCHEDULED",
      scheduledDate: easternPlusDays(7),
      routeId: null,
      completedAt: null,
    });

    await handler();

    expect(customerEmails).toHaveLength(1);
    expect(customerEmails[0].to).toBe("c-week@example.com");
    expect(alertsAbout("Morning ops")).toHaveLength(0);
  });
});

describe("the consolidated morning ops email", () => {
  const tomorrow = () => easternPlusDays(1);

  it("bundles unstaffed visits and dispute deadlines into ONE email", async () => {
    seedJob({
      customerId: "c-lost",
      status: "SCHEDULED",
      scheduledDate: tomorrow(),
      routeId: null,
      completedAt: null,
    });
    disputeRows.push({
      id: "d1",
      stripeDisputeId: "dp_123",
      customerId: "c-dis",
      amountCents: 12500,
      status: "NEEDS_RESPONSE",
      evidenceDueBy: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      ownerEmail: null,
    });

    await handler();

    expect(officeEmails).toHaveLength(1);
    const email = officeEmails[0];
    expect(email.subject).toContain("Morning ops:");
    expect(email.subject).toContain("1 unstaffed visit tomorrow");
    expect(email.subject).toContain("1 dispute needs evidence");
    expect(email.bodyHtml).toContain("Customer c-lost");
    // The dispute id deep-links straight to the Stripe response form —
    // under /test/ off-main (PRODUCTION_EMAIL unset), live path on main.
    expect(email.bodyHtml).toContain("dashboard.stripe.com/test/disputes/dp_123");
  });

  it("a morning with nothing to say sends nothing at all", async () => {
    await handler();
    expect(officeEmails).toHaveLength(0);
  });

  it("the retired info digests are gone — an outstanding invoice alone emails nobody", async () => {
    // An OPEN invoice used to trigger the daily AR-aging digest
    // unconditionally; the owner retired it (2026-08-15). No dueDate, so the
    // customer-facing reminder pass correctly stays quiet too.
    invoiceRows.push({ id: "i1", jobId: null, status: "OPEN" });

    await handler();

    expect(officeEmails).toHaveLength(0);
  });
});
