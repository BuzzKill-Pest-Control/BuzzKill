import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * FieldRoutes agreement import — deterministic ids make re-runs no-ops, and
 * the follow rule keeps re-runs truthful after a customer merge: a cust-fr-*
 * row that was merged away must have its plan and seed visit attached to the
 * SURVIVOR, never the tombstone, and a broken merge pointer must refuse the
 * row rather than file an agreement under a blanked record.
 */

type Row = Record<string, unknown> & { id: string };

// Conditional-create stores: a create against an existing id fails, exactly as
// DynamoDB's conditional put does — what makes createOrGet's resume real.
const store = {
  CustomerGroup: new Map<string, Row>(),
  Customer: new Map<string, Row>(),
  ServicePlan: new Map<string, Row>(),
  Job: new Map<string, Row>(),
};

function statefulModel(name: keyof typeof store) {
  return {
    create: async (input: Row) => {
      if (store[name].has(input.id)) {
        return { data: null, errors: [{ message: "ConditionalCheckFailed" }] };
      }
      const row = { ...input };
      store[name].set(input.id, row);
      return { data: row };
    },
    get: async ({ id }: { id: string }) => ({
      data: store[name].get(id) ?? null,
    }),
  };
}

const fakeDataClient = {
  models: {
    CustomerGroup: statefulModel("CustomerGroup"),
    Customer: statefulModel("Customer"),
    ServicePlan: statefulModel("ServicePlan"),
    Job: statefulModel("Job"),
  },
};
vi.mock("./dataClient", () => ({ dataClient: async () => fakeDataClient }));

const { importAgreement } = await import("./agreementImport");

const input = () => ({
  externalCustomerId: "77",
  externalSubscriptionId: "sub-9",
  displayName: "Dana Whitlock",
  planName: "Guaranteed Pest Control",
  priceCents: 5900,
  serviceFrequency: "QUARTERLY" as const,
  nextVisitDate: "2026-09-01",
  serviceType: "GENERAL_PEST",
});

beforeEach(() => {
  for (const m of Object.values(store)) m.clear();
});

describe("importAgreement and the merge follow rule", () => {
  it("a fresh import creates the customer, plan, and seed visit under the FieldRoutes-derived id", async () => {
    const res = await importAgreement(input());

    expect(res).toMatchObject({
      customerId: "cust-fr-77",
      servicePlanId: "plan-fr-sub-9",
      seedJobId: "job-fr-sub-9",
    });
    expect(store.ServicePlan.get("plan-fr-sub-9")).toMatchObject({
      customerId: "cust-fr-77",
      priceCents: 5900,
      accessGroups: ["cus-cust-fr-77"],
    });
    expect(store.Job.get("job-fr-sub-9")).toMatchObject({
      customerId: "cust-fr-77",
      accessGroups: ["cus-cust-fr-77"],
    });
  });

  it("a re-run onto a merged-away customer attaches the plan and visit to the survivor", async () => {
    store.Customer.set("cust-fr-77", {
      id: "cust-fr-77",
      status: "MERGED",
      mergedIntoId: "cust-surv",
    });
    store.Customer.set("cust-surv", {
      id: "cust-surv",
      status: "ACTIVE",
      groupId: null,
    });

    const res = await importAgreement(input());

    expect(res.customerId).toBe("cust-surv");
    expect(store.ServicePlan.get("plan-fr-sub-9")).toMatchObject({
      customerId: "cust-surv",
      accessGroups: ["cus-cust-surv"],
    });
    expect(store.Job.get("job-fr-sub-9")).toMatchObject({
      customerId: "cust-surv",
      accessGroups: ["cus-cust-surv"],
    });
  });

  it("the survivor's own group governs the access stamp, not the import row's", async () => {
    store.Customer.set("cust-fr-77", {
      id: "cust-fr-77",
      status: "MERGED",
      mergedIntoId: "cust-surv",
    });
    store.Customer.set("cust-surv", {
      id: "cust-surv",
      status: "ACTIVE",
      groupId: "grp-mgmt",
    });

    await importAgreement(input());

    expect(store.ServicePlan.get("plan-fr-sub-9")).toMatchObject({
      accessGroups: ["cus-cust-surv", "grp-grp-mgmt"],
    });
  });

  it("a tombstone with a broken merge pointer refuses the row (fail closed)", async () => {
    store.Customer.set("cust-fr-77", {
      id: "cust-fr-77",
      status: "MERGED",
      mergedIntoId: "cust-gone",
    });

    await expect(importAgreement(input())).rejects.toThrow(
      /merged away.*cannot be resolved/
    );
    expect(store.ServicePlan.size).toBe(0);
    expect(store.Job.size).toBe(0);
  });
});
