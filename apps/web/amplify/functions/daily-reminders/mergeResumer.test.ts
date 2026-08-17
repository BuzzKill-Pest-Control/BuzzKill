import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The daily merge resumer: stuck merges are re-driven through crm-admin's
 * resumeMerge internal op via a direct Lambda invoke. The payload shape is
 * load-bearing — opFieldName reads info.fieldName, and the resumeMerge case
 * reads loserId/survivorId/idempotencyKey — so drift here silently strands
 * every parked merge.
 */

const customers: Record<string, unknown>[] = [];
const fakeClient = {
  models: {
    Customer: {
      list: async () => ({ data: customers, nextToken: null }),
      listCustomerByStatusAndDisplayName: async () => ({
        data: [],
        nextToken: null,
      }),
    },
  },
};
vi.mock("../shared/dataClient", () => ({ dataClient: async () => fakeClient }));
vi.mock("../shared/email", () => ({
  emailShell: (h: string, b: string) => `${h}${b}`,
  sendEmail: async () => true,
  notifyOffice: async () => true,
  resendQueuedEmail: async () => "RESENT",
}));

const invoked: { FunctionName?: string; Payload?: Uint8Array }[] = [];
vi.mock("@aws-sdk/client-lambda", () => ({
  LambdaClient: class {
    async send(cmd: { input: { FunctionName?: string; Payload?: Uint8Array } }) {
      invoked.push(cmd.input);
      return {};
    }
  },
  InvokeCommand: class {
    input: { FunctionName?: string; Payload?: Uint8Array };
    constructor(input: { FunctionName?: string; Payload?: Uint8Array }) {
      this.input = input;
    }
  },
}));

const { reconcileMerges } = await import("./handler");

beforeEach(() => {
  customers.length = 0;
  invoked.length = 0;
  process.env.CRM_ADMIN_FUNCTION_NAME = "crm-admin-fn";
});

describe("reconcileMerges", () => {
  it("re-drives a stuck merge through crm-admin with the resumeMerge payload shape", async () => {
    customers.push({
      id: "dup",
      mergeCounterpartId: "surv",
      mergeLeaseUntil: new Date(Date.now() - 60_000).toISOString(),
      mergeState: JSON.stringify({
        survivorId: "surv",
        idempotencyKey: "mk-1",
        stage: "BILLING",
        requestedAt: new Date().toISOString(),
        attemptCount: 1,
        nextAttemptAt: new Date(Date.now() - 1000).toISOString(),
      }),
    });

    const out = await reconcileMerges();

    expect(out.resumed).toBe(1);
    expect(invoked).toHaveLength(1);
    expect(invoked[0].FunctionName).toBe("crm-admin-fn");
    const payload = JSON.parse(Buffer.from(invoked[0].Payload!).toString());
    expect(payload.info.fieldName).toBe("resumeMerge");
    expect(payload.arguments).toEqual({
      loserId: "dup",
      survivorId: "surv",
      idempotencyKey: "mk-1",
    });
  });

  it("a merge past its auto-attempt cap stays parked — no invoke", async () => {
    customers.push({
      id: "dup",
      mergeCounterpartId: "surv",
      mergeLeaseUntil: null,
      mergeState: JSON.stringify({
        survivorId: "surv",
        idempotencyKey: "mk-1",
        stage: "CHILDREN",
        requestedAt: new Date().toISOString(),
        attemptCount: 5,
      }),
    });

    const out = await reconcileMerges();
    expect(out.resumed).toBe(0);
    expect(invoked).toHaveLength(0);
  });

  it("a missing function name reports without failing the subtask", async () => {
    delete process.env.CRM_ADMIN_FUNCTION_NAME;
    delete process.env.CRM_ADMIN_FUNCTION_PARAM;
    customers.push({
      id: "dup",
      mergeCounterpartId: "surv",
      mergeLeaseUntil: null,
      mergeState: JSON.stringify({
        survivorId: "surv",
        idempotencyKey: "mk-1",
        stage: "WORK",
        requestedAt: new Date().toISOString(),
      }),
    });

    const out = await reconcileMerges();
    expect(out.resumed).toBe(0);
    expect(invoked).toHaveLength(0);
  });
});
