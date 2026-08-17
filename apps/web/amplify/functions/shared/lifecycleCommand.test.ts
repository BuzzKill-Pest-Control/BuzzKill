import { beforeEach, describe, expect, it, vi } from "vitest";
import { _setLockStoreForTests, memoryLockStore } from "./atomicLock";

/**
 * The lifecycle command claim gate — the merge-exclusion half. A customer
 * merge owns BOTH of its rows until it settles, so a FRESH deactivate/
 * reactivate must refuse while its customer is mid-merge, a tombstone must
 * refuse with a pointer to the surviving record, and an unreadable customer
 * row fails CLOSED. Resume of an EXISTING command is exempt: the merge
 * refuses to start while any non-settled command is open, so the two can
 * never interleave.
 */

const customers = new Map<string, Record<string, unknown>>();
/** The durable command store (id = caller idempotency key). */
const commands = new Map<string, Record<string, unknown>>();

const fakeDataClient = {
  models: {
    Customer: {
      get: async ({ id }: { id: string }) => ({
        data: customers.get(id) ?? null,
      }),
    },
    // create is conditional on the id not existing — the single-winner guard.
    CustomerLifecycleCommand: {
      create: async (input: { id: string } & Record<string, unknown>) => {
        if (commands.has(input.id)) return { data: null };
        commands.set(input.id, { ...input });
        return { data: { ...input } };
      },
      get: async ({ id }: { id: string }) => ({
        data: commands.get(id) ?? null,
      }),
      update: async (input: { id: string } & Record<string, unknown>) => {
        const row = commands.get(input.id);
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
        data: [...commands.values()].filter(
          (c) => c.customerId === customerId
        ),
        nextToken: null,
      }),
    },
  },
};

vi.mock("./dataClient", () => ({ dataClient: async () => fakeDataClient }));

const { claimLifecycleCommand } = await import("./lifecycleCommand");

const claimInput = (
  over: Partial<Parameters<typeof claimLifecycleCommand>[0]> = {}
) => ({
  idempotencyKey: "cmd-1",
  customerId: "c1",
  action: "DEACTIVATE" as const,
  actor: { sub: "s1", email: "owner@x.com" },
  reasonCode: "CUSTOMER_REQUEST",
  ...over,
});

beforeEach(() => {
  customers.clear();
  commands.clear();
  _setLockStoreForTests(
    memoryLockStore({ CustomerLifecycleCommand: commands })
  );
  customers.set("c1", { id: "c1", displayName: "Dana", status: "ACTIVE" });
});

describe("claimLifecycleCommand — merge exclusion", () => {
  it("claims a fresh command on a customer with no merge in flight", async () => {
    const res = await claimLifecycleCommand(claimInput());
    expect(res.claimed).toBe(true);
    expect(commands.has("cmd-1")).toBe(true);
  });

  it("refuses a FRESH command while the customer is mid-merge, naming the merge", async () => {
    customers.set("c1", {
      id: "c1",
      status: "ACTIVE",
      mergeCounterpartId: "c2",
    });
    await expect(claimLifecycleCommand(claimInput())).rejects.toThrow(
      /mid-merge with c2/
    );
    // Nothing was claimed — the refusal happens before any write.
    expect(commands.size).toBe(0);
  });

  it("refuses a merge tombstone with a pointer to the surviving record", async () => {
    customers.set("c1", { id: "c1", status: "MERGED", mergedIntoId: "c9" });
    await expect(claimLifecycleCommand(claimInput())).rejects.toThrow(
      /merged into c9; act on that record instead/
    );
    expect(commands.size).toBe(0);
  });

  it("does NOT block resume of an EXISTING command while the merge is in flight", async () => {
    commands.set("cmd-1", {
      id: "cmd-1",
      customerId: "c1",
      action: "DEACTIVATE",
      stage: "PARTIAL",
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
    const res = await claimLifecycleCommand(claimInput());
    expect(res.claimed).toBe(true);
    if (!res.claimed) throw new Error("unreachable");
    expect(res.resumedFromStage).toBe("PARTIAL");
  });

  it("fails CLOSED when the customer row cannot be read", async () => {
    const orig = fakeDataClient.models.Customer.get;
    fakeDataClient.models.Customer.get = async () => {
      throw new Error("dynamo down");
    };
    try {
      const res = await claimLifecycleCommand(claimInput());
      expect(res.claimed).toBe(false);
      if (res.claimed) throw new Error("unreachable");
      expect(res.state).toBe("UNVERIFIED");
      expect(String(res.command.lastError)).toMatch(
        /could not verify merge state/i
      );
      expect(commands.size).toBe(0);
    } finally {
      fakeDataClient.models.Customer.get = orig;
    }
  });
});
