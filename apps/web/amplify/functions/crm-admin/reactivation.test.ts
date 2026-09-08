import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Customer reactivation and the safe office edit — the access + status side of
 * GL-09.
 *
 * The guarantees under test:
 *  - Reactivation is ONE server action: the portal login is restored FIRST and
 *    only then is status published ACTIVE, so a paying customer is never left
 *    ACTIVE with a dead login (the exact split that used to be two client calls).
 *  - Every reactivation is written to the lifecycle ledger; an already-ACTIVE
 *    customer heals access and reports the current fact without a second, false
 *    transition.
 *  - updateCustomerContact writes only contact/address/note fields — never a
 *    protected lifecycle field — and validates the email.
 */

process.env.AMPLIFY_AUTH_USERPOOL_ID = "pool-1";

/** Ordered log of the cross-system side effects, so we can prove access is
 *  restored before status is flipped. */
let events: string[] = [];

vi.mock("@aws-sdk/client-cognito-identity-provider", () => {
  const cmd = (type: string) =>
    class {
      input: Record<string, unknown>;
      __type = type;
      constructor(input: Record<string, unknown>) {
        this.input = input;
      }
    };
  return {
    CognitoIdentityProviderClient: class {
      async send(c: { __type: string; input: Record<string, unknown> }) {
        events.push(`cognito:${c.__type}`);
        if (c.__type === "ListGroups") return { Groups: [] };
        return {};
      }
    },
    AdminAddUserToGroupCommand: cmd("AddToGroup"),
    AdminCreateUserCommand: cmd("CreateUser"),
    AdminDisableUserCommand: cmd("Disable"),
    AdminEnableUserCommand: cmd("Enable"),
    AdminGetUserCommand: cmd("GetUser"),
    AdminListGroupsForUserCommand: cmd("ListGroups"),
    AdminRemoveUserFromGroupCommand: cmd("RemoveFromGroup"),
    AdminSetUserPasswordCommand: cmd("SetPassword"),
    AdminUpdateUserAttributesCommand: cmd("UpdateAttrs"),
    AdminUserGlobalSignOutCommand: cmd("SignOut"),
    CreateGroupCommand: cmd("CreateGroup"),
    ListUsersInGroupCommand: cmd("ListUsersInGroup"),
  };
});

type Customer = {
  id: string;
  displayName: string;
  email?: string | null;
  status: string;
  portalUserSub?: string | null;
  groupId?: string | null;
  serviceStreet?: string | null;
  serviceUnit?: string | null;
  serviceCity?: string | null;
  mergedIntoId?: string | null;
  mergeCounterpartId?: string | null;
};
const customers = new Map<string, Customer>();
/** The single-winner lifecycle claim store (id = customerId). */
const claims = new Map<string, Record<string, unknown>>();
const lifecycleCommands = new Map<string, Record<string, unknown>>();

/** Records every field written to a Customer, so a test can assert exactly
 *  which columns updateCustomerContact touched. */
let lastCustomerPatch: Record<string, unknown> | null = null;

const fakeDataClient = {
  models: {
    Customer: {
      get: async ({ id }: { id: string }) => ({ data: customers.get(id) ?? null }),
      list: async () => ({ data: [...customers.values()], nextToken: null }),
      update: async (patch: Partial<Customer> & { id: string }) => {
        lastCustomerPatch = patch;
        customers.set(patch.id, { ...customers.get(patch.id)!, ...patch });
        if (patch.status) events.push(`status:${patch.status}`);
        return { data: customers.get(patch.id) };
      },
    },
    // The lifecycle claim: create is conditional on the id not existing.
    CustomerLifecycleCommand: {
      create: async (input: { id: string } & Record<string, unknown>) => {
        if (lifecycleCommands.has(input.id)) return { data: null };
        lifecycleCommands.set(input.id, { ...input });
        return { data: { ...input } };
      },
      get: async ({ id }: { id: string }) => ({
        data: lifecycleCommands.get(id) ?? null,
      }),
      update: async (input: { id: string } & Record<string, unknown>) => {
        const row = lifecycleCommands.get(input.id);
        if (!row) return { data: null };
        for (const [k, v] of Object.entries(input)) {
          if (v !== undefined) row[k] = v;
        }
        return { data: { ...row } };
      },
      listCustomerLifecycleCommandByCustomerIdAndRequestedAt: async ({
        customerId,
      }: {
        customerId: string;
      }) => ({
        data: [...lifecycleCommands.values()].filter(
          (c) => c.customerId === customerId
        ),
        nextToken: null,
      }),
    },
    CustomerLifecycleClaim: {
      create: async (input: { id: string }) => {
        if (claims.has(input.id)) return { data: null };
        claims.set(input.id, { ...input });
        return { data: { ...input } };
      },
      delete: async ({ id }: { id: string }) => {
        claims.delete(id);
        return { data: { id } };
      },
    },
  },
};
vi.mock("../shared/dataClient", () => ({ dataClient: async () => fakeDataClient }));

const recordCustomerLifecycleEvent = vi.fn(async () => {
  events.push("audit");
  return { recorded: true };
});
vi.mock("../shared/lifecycleLog", () => ({
  recordCustomerLifecycleEvent: (...a: unknown[]) =>
    (
      recordCustomerLifecycleEvent as unknown as (
        ...x: unknown[]
      ) => Promise<{ recorded: boolean }>
    )(...a),
}));

const notifyOffice = vi.fn(async () => true);
vi.mock("../shared/email", () => ({
  notifyOffice: (...a: unknown[]) =>
    (notifyOffice as unknown as (...x: unknown[]) => Promise<boolean>)(...a),
  sendEmail: vi.fn(async () => true),
  emailShell: (h: string, b: string) => `${h}${b}`,
}));

const openOwnedWork = vi.fn(async () => {});
const openMissingContactWork = vi.fn(async () => {});
vi.mock("../shared/ownedWork", () => ({
  openOwnedWork: (...a: unknown[]) =>
    (openOwnedWork as unknown as (...x: unknown[]) => Promise<void>)(...a),
  openMissingContactWork: (...a: unknown[]) =>
    (openMissingContactWork as unknown as (...x: unknown[]) => Promise<void>)(...a),
}));

const { handler } = await import("./handler");

const call = (field: string, args: Record<string, unknown>) =>
  (handler as unknown as (e: unknown) => Promise<unknown>)({
    info: { fieldName: field },
    arguments: args,
    identity: {
      sub: "fin-1",
      groups: ["FINANCE"],
      claims: { email: "finance@buzzkill.com" },
    },
  });

beforeEach(() => {
  lifecycleCommands.clear();
  events = [];
  customers.clear();
  claims.clear();
  lastCustomerPatch = null;
  recordCustomerLifecycleEvent.mockClear();
  notifyOffice.mockClear();
  openOwnedWork.mockClear();
  openMissingContactWork.mockClear();
});

describe("reactivateCustomer (GL-09)", () => {
  it("restores portal access BEFORE flipping status, then records the transition", async () => {
    customers.set("c1", {
      id: "c1",
      displayName: "Dana Whitlock",
      email: "dana@example.com",
      status: "INACTIVE",
      portalUserSub: "sub-portal-1",
    });

    const res = (await call("reactivateCustomer", { customerId: "c1", reasonCode: "CUSTOMER_RETURNED" })) as {
      reactivated: boolean;
      alreadyActive: boolean;
      portalRestored: boolean;
      status: string;
    };

    expect(res).toMatchObject({
      reactivated: true,
      alreadyActive: false,
      portalRestored: true,
      status: "ACTIVE",
    });
    expect(customers.get("c1")!.status).toBe("ACTIVE");
    // Access first: the Cognito enable happens before the ACTIVE status write,
    // so there is no window where the record reads ACTIVE with a dead login.
    expect(events.indexOf("cognito:Enable")).toBeGreaterThanOrEqual(0);
    expect(events.indexOf("cognito:Enable")).toBeLessThan(
      events.indexOf("status:ACTIVE")
    );
    // The transition is recorded for leadership.
    const [entry] = recordCustomerLifecycleEvent.mock.calls[0] as unknown as [
      { action: string; priorStatus: string; newStatus: string },
    ];
    expect(entry.action).toBe("REACTIVATE");
    expect(entry.priorStatus).toBe("INACTIVE");
    expect(entry.newStatus).toBe("ACTIVE");
  });

  it("is concurrency-safe: an already-ACTIVE customer reports the fact and records no second transition", async () => {
    customers.set("c1", {
      id: "c1",
      displayName: "Dana Whitlock",
      email: "dana@example.com",
      status: "ACTIVE",
      portalUserSub: "sub-portal-1",
    });

    const res = (await call("reactivateCustomer", { customerId: "c1", reasonCode: "CUSTOMER_RETURNED" })) as {
      reactivated: boolean;
      alreadyActive: boolean;
      status: string;
    };

    expect(res).toMatchObject({ reactivated: false, alreadyActive: true, status: "ACTIVE" });
    // No status write and no second ledger row.
    expect(events).not.toContain("status:ACTIVE");
    expect(recordCustomerLifecycleEvent).not.toHaveBeenCalled();
  });

  it("no-ops portal restore for a customer that never had a login, still flips ACTIVE", async () => {
    customers.set("c1", {
      id: "c1",
      displayName: "No Portal",
      email: "np@example.com",
      status: "INACTIVE",
      portalUserSub: null,
    });

    const res = (await call("reactivateCustomer", { customerId: "c1", reasonCode: "CUSTOMER_RETURNED" })) as {
      portalRestored: boolean;
      status: string;
    };

    expect(res.portalRestored).toBe(false);
    expect(customers.get("c1")!.status).toBe("ACTIVE");
    expect(recordCustomerLifecycleEvent).toHaveBeenCalledOnce();
  });

  it("throws on a missing customer rather than reporting a reactivation it did not do", async () => {
    await expect(
      call("reactivateCustomer", { customerId: "nope", reasonCode: "CUSTOMER_RETURNED" })
    ).rejects.toThrow(/not found/i);
  });
});

describe("updateCustomerContact (GL-09)", () => {
  beforeEach(() => {
    customers.set("c1", {
      id: "c1",
      displayName: "Old Name",
      email: "old@example.com",
      status: "ACTIVE",
      portalUserSub: "sub-portal-1",
    });
  });

  it("writes only contact/address/note fields and never a protected lifecycle field", async () => {
    await call("updateCustomerContact", {
      customerId: "c1",
      displayName: "New Name",
      email: "New@Example.com",
      phone: "555-1000",
      serviceStreet: "1 Main St",
      notes: "gate code 4242",
    });

    // The write happened, email normalized, and the row still reads ACTIVE.
    expect(customers.get("c1")!.displayName).toBe("New Name");
    expect(customers.get("c1")!.email).toBe("new@example.com");
    expect(customers.get("c1")!.status).toBe("ACTIVE");
    // Not one protected lifecycle field is in the patch this mutation issued.
    const patched = Object.keys(lastCustomerPatch ?? {});
    for (const forbidden of [
      "status",
      "stripeCustomerId",
      "paymentMethodLabel",
      "paymentMethodKind",
      "portalUserSub",
      "accessGroups",
      "groupId",
      "convertedAt",
    ]) {
      expect(patched).not.toContain(forbidden);
    }
  });

  it("rejects an invalid email instead of saving it — in words, not an alarm", async () => {
    // This pattern is stricter than the Edit sheet's own, so a real address
    // typed slightly wrong clears the browser and lands here. That is a person
    // mistyping, not crm-admin failing.
    const res = (await call("updateCustomerContact", {
      customerId: "c1",
      displayName: "New Name",
      email: "not-an-email",
    })) as { refused?: string };

    expect(res.refused).toMatch(/valid email/i);
    // Nothing was written.
    expect(customers.get("c1")!.displayName).toBe("Old Name");
  });

  it("still THROWS on a blank name — the sheet enforces the same rule, so this is a broken client", async () => {
    await expect(
      call("updateCustomerContact", { customerId: "c1", displayName: "   " })
    ).rejects.toThrow(/name is required/i);
  });

  it("refuses a mid-merge customer instead of racing the in-flight merge", async () => {
    customers.set("c1", {
      ...customers.get("c1")!,
      mergeCounterpartId: "dup#fields-done",
    });

    const res = (await call("updateCustomerContact", {
      customerId: "c1",
      displayName: "New Name",
    })) as { refused?: string };

    expect(res.refused).toMatch(/mid-merge — finish or resume the merge first/);
    // Nothing was written.
    expect(customers.get("c1")!.displayName).toBe("Old Name");
  });

  it("refuses a merge tombstone and points at the surviving record", async () => {
    customers.set("c1", {
      ...customers.get("c1")!,
      status: "MERGED",
      mergedIntoId: "c2",
    });

    const res = (await call("updateCustomerContact", {
      customerId: "c1",
      displayName: "New Name",
    })) as { refused?: string };

    expect(res.refused).toMatch(/merged into c2/);
    expect(customers.get("c1")!.displayName).toBe("Old Name");
  });

  it("still THROWS for a customer it cannot read — absent and unreadable look the same", async () => {
    // Customer.get answers data: null either way, so "not found" is a sentence
    // a read failure would make false. Unlike the three refusals above, which
    // all need a row that actually says so.
    customers.delete("c1");

    await expect(
      call("updateCustomerContact", { customerId: "c1", displayName: "New Name" })
    ).rejects.toThrow(/not found/i);
  });
});

describe("reportSuspectAddresses", () => {
  it("skips merge tombstones — a merged-away row is never a suspect worth fixing", async () => {
    const suspectStreet = "290 Eliot Street, Unit 289 America blvd";
    customers.set("c-live", {
      id: "c-live",
      displayName: "Live Duplicate Street",
      status: "ACTIVE",
      serviceStreet: suspectStreet,
    });
    customers.set("c-gone", {
      id: "c-gone",
      displayName: "Merged Away",
      status: "MERGED",
      serviceStreet: suspectStreet,
    });

    const res = (await call("reportSuspectAddresses", {})) as {
      scanned: number;
      suspectCount: number;
      suspects: { customerId: string }[];
    };

    expect(res.suspects.map((s) => s.customerId)).toEqual(["c-live"]);
    expect(res.suspectCount).toBe(1);
    // The tombstone was still scanned — it is skipped, not hidden.
    expect(res.scanned).toBe(2);
  });
});

describe("liftEmailSuppression — the address the office types", () => {
  it("refuses a mistyped address in words, spending nothing", async () => {
    // The address is free text pasted out of a bounce notice, so a mistyped
    // one is a person mistyping — not crm-admin failing.
    const res = (await call("liftEmailSuppression", {
      email: "dana-at-example.com",
      reasonCode: "CUSTOMER_RECONSENTED",
      evidence: "Signed form on file",
    })) as { refused?: string };

    expect(res.refused).toMatch(/enter the suppressed email address/i);
  });

  it("still THROWS on a reason code that is not on the list — that is a broken client", async () => {
    // The screen offers exactly two codes. One arriving off-list means the
    // caller is not the screen, which is not a conversation to have in words.
    await expect(
      call("liftEmailSuppression", {
        email: "dana@example.com",
        reasonCode: "FELT_LIKE_IT",
        evidence: "x",
      })
    ).rejects.toThrow(/controlled suppression-release reason/i);
  });
});
