import { beforeEach, describe, expect, it, vi } from "vitest";
import { _setLockStoreForTests, memoryLockStore } from "./atomicLock";

/**
 * The group-change claim gate — the merge-exclusion half. A customer merge
 * owns BOTH of its rows until it settles, so a FRESH group change must
 * refuse while its customer is mid-merge, a tombstone must refuse with a
 * pointer to the surviving record, and an unreadable customer row fails
 * CLOSED. Resume of an EXISTING command (same target, stale lease) is
 * exempt: the merge refuses to start while one is open.
 */

const customers = new Map<string, Record<string, unknown>>();
/** The durable command store (random per-command ids, scanned by customer). */
const groupCommands = new Map<string, Record<string, unknown>>();

const fakeDataClient = {
  models: {
    Customer: {
      get: async ({ id }: { id: string }) => ({
        data: customers.get(id) ?? null,
      }),
    },
    GroupChangeCommand: {
      create: async (input: { id: string } & Record<string, unknown>) => {
        if (groupCommands.has(input.id)) return { data: null };
        groupCommands.set(input.id, { ...input });
        return { data: { ...input } };
      },
      get: async ({ id }: { id: string }) => ({
        data: groupCommands.get(id) ?? null,
      }),
      update: async (input: { id: string } & Record<string, unknown>) => {
        const row = groupCommands.get(input.id);
        if (!row) return { data: null };
        for (const [k, v] of Object.entries(input)) {
          if (v !== undefined) row[k] = v;
        }
        return { data: { ...row } };
      },
      listGroupChangeCommandByCustomerIdAndRequestedAt: async ({
        customerId,
      }: {
        customerId: string;
      }) => ({
        data: [...groupCommands.values()].filter(
          (c) => c.customerId === customerId
        ),
        nextToken: null,
      }),
    },
  },
};

vi.mock("./dataClient", () => ({ dataClient: async () => fakeDataClient }));

const openOwnedWork = vi.fn(async () => "work-1");
vi.mock("./ownedWork", () => ({
  openOwnedWork: (...a: unknown[]) =>
    (openOwnedWork as unknown as (...x: unknown[]) => Promise<string>)(...a),
  resolveOwnedWork: vi.fn(async () => true),
}));

const { claimGroupChange } = await import("./groupChange");

const changeInput = (over: Record<string, unknown> = {}) => ({
  customerId: "c1",
  fromGroupId: null,
  toGroupId: "g1",
  reason: "Moved under the management company",
  actor: { sub: "s1", email: "office@x.com" },
  ...over,
});

beforeEach(() => {
  customers.clear();
  groupCommands.clear();
  _setLockStoreForTests(memoryLockStore({ GroupChangeCommand: groupCommands }));
  customers.set("c1", { id: "c1", displayName: "Dana", status: "ACTIVE" });
});

describe("claimGroupChange — merge exclusion", () => {
  it("claims a fresh command on a customer with no merge in flight", async () => {
    const res = await claimGroupChange(changeInput());
    expect(res.claimed).toBe(true);
    expect(groupCommands.size).toBe(1);
  });

  it("refuses a FRESH group change while the customer is mid-merge, naming the merge", async () => {
    customers.set("c1", {
      id: "c1",
      status: "ACTIVE",
      mergeCounterpartId: "c2",
    });
    await expect(claimGroupChange(changeInput())).rejects.toThrow(
      /mid-merge with c2/
    );
    // Nothing was claimed — the refusal happens before any write.
    expect(groupCommands.size).toBe(0);
  });

  it("refuses a merge tombstone with a pointer to the surviving record", async () => {
    customers.set("c1", { id: "c1", status: "MERGED", mergedIntoId: "c9" });
    await expect(claimGroupChange(changeInput())).rejects.toThrow(
      /merged into c9; act on that record instead/
    );
    expect(groupCommands.size).toBe(0);
  });

  it("does NOT block resume of an EXISTING command while the merge is in flight", async () => {
    groupCommands.set("gc-c1-old", {
      id: "gc-c1-old",
      customerId: "c1",
      toGroupId: "g1",
      reason: "Moved under the management company",
      stage: "CUSTOMER_DONE",
      requestedAt: new Date(Date.now() - 60_000).toISOString(),
      leaseUntil: new Date(Date.now() - 1).toISOString(),
      leaseNonce: "stale",
      attemptCount: 1,
    });
    customers.set("c1", {
      id: "c1",
      status: "ACTIVE",
      mergeCounterpartId: "c2",
    });
    const res = await claimGroupChange(changeInput());
    expect(res.claimed).toBe(true);
    if (!res.claimed) throw new Error("unreachable");
    expect(res.commandId).toBe("gc-c1-old");
    expect(res.resumedFromStage).toBe("CUSTOMER_DONE");
  });

  it("fails CLOSED when the customer row cannot be read", async () => {
    const orig = fakeDataClient.models.Customer.get;
    fakeDataClient.models.Customer.get = async () => {
      throw new Error("dynamo down");
    };
    try {
      await expect(claimGroupChange(changeInput())).rejects.toThrow(
        /could not verify merge state/i
      );
      expect(groupCommands.size).toBe(0);
    } finally {
      fakeDataClient.models.Customer.get = orig;
    }
  });
});
