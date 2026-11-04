import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageResult } from "../shared/pagination";

/**
 * GL-22 — mailbox delivery events are never lost quietly:
 *  - a failed write THROWS (redelivery/DLQ), never ack-and-forget;
 *  - a malformed message becomes owned work (it can never succeed on retry);
 *  - a duplicate/out-of-order delivery event can never move a bounced or
 *    complained message back to delivered (X3 terminal guard).
 */

type LogRow = Record<string, unknown> & { id: string; messageId: string };
const logs: LogRow[] = [];
const logPages: PageResult<LogRow>[] = [];
let updateFailure: "THROW" | "GRAPHQL" | null = null;
let suppressionFailure: "GET" | "CREATE" | null = null;
const customers = new Map<string, Record<string, unknown>>();
let customerGets = 0;
const suppressions: Record<string, unknown>[] = [];
vi.mock("../shared/dataClient", () => ({
  dataClient: async () => ({
    models: {
      EmailLog: {
        listEmailLogByMessageId: async ({ messageId }: { messageId: string }) => logPages.shift() ?? ({
          data: logs.filter((l) => l.messageId === messageId),
        }),
        update: async (patch: LogRow) => {
          if (updateFailure === "THROW") throw new Error("dynamo down");
          if (updateFailure === "GRAPHQL") return { data: null, errors: [{ message: "log update unavailable" }] };
          const row = logs.find((l) => l.id === patch.id);
          if (row) Object.assign(row, patch);
          return { data: row ?? null };
        },
      },
      Customer: {
        get: async ({ id }: { id: string }) => {
          customerGets++;
          return { data: customers.get(id) ?? null };
        },
      },
      SuppressedEmail: {
        get: async () => suppressionFailure === "GET"
          ? { data: null, errors: [{ message: "suppression lookup unavailable" }] }
          : { data: null },
        create: async (row: Record<string, unknown>) => {
          if (suppressionFailure === "CREATE") return { data: null, errors: [{ message: "suppression write unavailable" }] };
          suppressions.push(row);
          return { data: row };
        },
      },
    },
  }),
}));
const workOpened: Record<string, unknown>[] = [];
vi.mock("../shared/ownedWork", () => ({
  openOwnedWork: async (o: Record<string, unknown>) => {
    workOpened.push(o);
    return "w1";
  },
}));

const { handler } = await import("./handler");

const snsEvent = (message: unknown, raw?: string) =>
  ({
    Records: [
      {
        Sns: {
          MessageId: "sns-1",
          Message: raw ?? JSON.stringify(message),
        },
      },
    ],
  }) as never;

beforeEach(() => {
  logs.length = 0;
  logPages.length = 0;
  updateFailure = null;
  suppressionFailure = null;
  workOpened.length = 0;
  customers.clear();
  customerGets = 0;
  suppressions.length = 0;
});

describe("ses-events durability (GL-22)", () => {
  it.each([
    ["bounce", "GET"], ["bounce", "CREATE"],
    ["complaint", "GET"], ["complaint", "CREATE"],
  ] as const)("retries a %s after a failed suppression %s", async (type, failure) => {
    const event = snsEvent({
      notificationType: type,
      mail: { messageId: "m1" },
      bounce: { bounceType: "Permanent", bouncedRecipients: [{ emailAddress: "dana@example.com" }] },
      complaint: { complainedRecipients: [{ emailAddress: "dana@example.com" }] },
    });
    suppressionFailure = failure;

    await expect(handler(event)).rejects.toThrow(/notification\(s\) failed/);
    expect(suppressions).toHaveLength(0);
    expect(workOpened).toHaveLength(0);

    suppressionFailure = null;
    await handler(event);
    expect(suppressions).toHaveLength(1);
    expect(suppressions[0]).toMatchObject({
      email: "dana@example.com", source: type === "bounce" ? "BOUNCED" : "COMPLAINED",
    });
    expect(workOpened).toHaveLength(1);
    expect(workOpened[0].kind).toBe("EMAIL_FAILURE");
  });

  it.each([false, true])("retries an errored log lookup before updating any logs (later page: %s)", async (laterPage) => {
    logs.push({ id: "l1", messageId: "m1", deliveryStatus: "SENT" });
    if (laterPage) logPages.push({ data: [...logs], nextToken: "page-2" });
    logPages.push({ data: null, errors: [{ message: "log lookup unavailable" }] });
    const event = snsEvent({ notificationType: "delivery", mail: { messageId: "m1" } });

    await expect(handler(event)).rejects.toThrow(/notification\(s\) failed/);
    expect(logs[0].deliveryStatus).toBe("SENT");

    await handler(event);
    expect(logs[0].deliveryStatus).toBe("DELIVERED");
  });

  it.each(["THROW", "GRAPHQL"] as const)("retries a failed log write (%s) instead of acknowledging it unrecorded", async (failure) => {
    logs.push({ id: "l1", messageId: "m1", deliveryStatus: "SENT" });
    updateFailure = failure;
    const event = snsEvent({ notificationType: "delivery", mail: { messageId: "m1" } });

    await expect(handler(event)).rejects.toThrow(/notification\(s\) failed/);
    expect(logs[0].deliveryStatus).toBe("SENT"); // unchanged, will retry

    updateFailure = null;
    await handler(event);
    expect(logs[0].deliveryStatus).toBe("DELIVERED");
  });

  it("a malformed message becomes owned work instead of an infinite retry or a silent drop", async () => {
    await handler(snsEvent(null, "{not json"));

    expect(workOpened).toHaveLength(1);
    expect(workOpened[0]).toMatchObject({
      kind: "INFRA_ALERT",
      dedupeKey: "ses-malformed:sns-1",
    });
  });

  it("a late delivery event can never un-bounce a message (terminal guard)", async () => {
    logs.push({ id: "l1", messageId: "m1", deliveryStatus: "BOUNCED" });

    await handler(
      snsEvent({ notificationType: "delivery", mail: { messageId: "m1" } })
    );

    expect(logs[0].deliveryStatus).toBe("BOUNCED");
  });

  it("a delivery event upgrades a SENT message normally", async () => {
    logs.push({ id: "l1", messageId: "m1", deliveryStatus: "SENT" });

    await handler(
      snsEvent({ notificationType: "delivery", mail: { messageId: "m1" } })
    );

    expect(logs[0].deliveryStatus).toBe("DELIVERED");
  });
});

describe("ses-events and the merge follow rule", () => {
  const bounceEvent = () =>
    snsEvent({
      notificationType: "bounce",
      mail: { messageId: "m1" },
      bounce: {
        bounceType: "Permanent",
        bounceSubType: "General",
        bouncedRecipients: [{ emailAddress: "dana@example.com" }],
      },
    });

  it("a bounce about a pre-merge send opens work naming the survivor, never the tombstone", async () => {
    logs.push({
      id: "l1",
      messageId: "m1",
      deliveryStatus: "SENT",
      customerId: "cus-loser",
    });
    customers.set("cus-loser", {
      id: "cus-loser",
      status: "MERGED",
      mergedIntoId: "cus-surv",
    });
    customers.set("cus-surv", { id: "cus-surv", status: "ACTIVE" });

    await handler(bounceEvent());

    expect(workOpened).toHaveLength(1);
    expect(workOpened[0]).toMatchObject({
      kind: "EMAIL_FAILURE",
      customerId: "cus-surv",
      relatedId: "cus-surv",
      sourceUrl: "/customers/cus-surv",
    });
    // The suppression case follows the same pointer.
    expect(suppressions[0]).toMatchObject({ relatedId: "cus-surv" });
  });

  it("a bounce for a live customer keeps its id unchanged", async () => {
    logs.push({
      id: "l1",
      messageId: "m1",
      deliveryStatus: "SENT",
      customerId: "cus-live",
    });
    customers.set("cus-live", { id: "cus-live", status: "ACTIVE" });

    await handler(bounceEvent());

    expect(workOpened[0]).toMatchObject({ customerId: "cus-live" });
  });

  it("delivery events never pay for merge resolution (the hot path stays cheap)", async () => {
    logs.push({
      id: "l1",
      messageId: "m1",
      deliveryStatus: "SENT",
      customerId: "cus-loser",
    });

    await handler(
      snsEvent({ notificationType: "delivery", mail: { messageId: "m1" } })
    );

    expect(customerGets).toBe(0);
  });
});
