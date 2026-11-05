import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { InfraAlarmMessage } from "./infraSentry";

const fake = vi.hoisted(() => ({
  rows: new Map<string, Record<string, unknown>>(),
  send: vi.fn(),
}));
vi.mock("@aws-sdk/client-dynamodb", async (importOriginal) => ({
  ...await importOriginal<typeof import("@aws-sdk/client-dynamodb")>(),
  DynamoDBClient: class { send(command: { input: Record<string, unknown> }) { return fake.send(command.input); } },
}));
const { withInfraAlarmTransition: run } = await import("./infraAlarmTransition");
const alarmName = "buzzkill-staging-stripe-webhook-errors";
const clock = Date.parse("2026-11-04T12:00:00Z");

function message(state = "ALARM", seconds = 0): InfraAlarmMessage {
  return { AlarmName: alarmName, NewStateValue: state,
    StateChangeTime: new Date(clock + seconds * 1000).toISOString() };
}
function conditional() {
  const error = new Error("Conditional check failed");
  error.name = "ConditionalCheckFailedException";
  return error;
}
function state() { return fake.rows.get(alarmName)!; }

beforeEach(() => {
  fake.rows.clear();
  vi.useFakeTimers();
  vi.setSystemTime(clock);
  vi.stubEnv("INFRA_ALARM_STATE_TABLE", "InfraAlarmState-test");
  vi.stubEnv("SENTRY_INFRA_DSN", "configured");
  vi.stubEnv("SENTRY_INFRA_ALARM_BRANCH", "staging");
  fake.send.mockReset().mockImplementation(async (input) => {
    const key = unmarshall(input.Key).alarm as string;
    const values = unmarshall(input.ExpressionAttributeValues);
    const previous = { ...(fake.rows.get(key) ?? {}) };
    const row = { ...previous };
    if (input.UpdateExpression.startsWith("SET leaseHolder")) {
      if (typeof row.leaseUntil === "number" && row.leaseUntil > Number(values[":now"])) throw conditional();
      Object.assign(row, { alarm: key, leaseHolder: values[":holder"], leaseUntil: values[":until"] });
    } else if (input.UpdateExpression.startsWith("SET transitionAt")) {
      if (row.leaseHolder !== values[":holder"] || Number(row.leaseUntil) <= Number(values[":now"])) throw conditional();
      Object.assign(row, { transitionAt: values[":at"], transitionState: values[":state"] });
    } else {
      if (row.leaseHolder !== values[":holder"]) throw conditional();
      delete row.leaseHolder;
      delete row.leaseUntil;
    }
    fake.rows.set(key, row);
    return input.ReturnValues === "ALL_OLD" ? { Attributes: marshall(previous) } : {};
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("monotonic alarm transitions", () => {
  it("does not reopen recovered CRM work when failed Sentry delivery retries an older ALARM", async () => {
    let open = false;
    const deliveryFailure = new Error("Sentry unavailable");
    await expect(run(message("ALARM", 0), async () => { open = true; throw deliveryFailure; })).rejects.toBe(deliveryFailure);
    await run(message("OK", 60), async () => { open = false; });
    const retriedAlarm = vi.fn(async () => { open = true; });
    await run(message("ALARM", 0), retriedAlarm);
    expect(open).toBe(false);
    expect(retriedAlarm).not.toHaveBeenCalled();
    expect(state()).toMatchObject({ transitionAt: clock + 60_000, transitionState: "OK" });
  });

  it("does not resolve a newer incident when an older OK arrives late", async () => {
    await run(message("ALARM", 60), async () => {});
    const lateRecovery = vi.fn(async () => {});
    await run(message("OK", 0), lateRecovery);
    expect(lateRecovery).not.toHaveBeenCalled();
    expect(state().transitionState).toBe("ALARM");
  });

  it("persists the newest observation before running effects and retries the same transition", async () => {
    const action = vi.fn(async () => {
      expect(state()).toMatchObject({ transitionAt: clock, transitionState: "ALARM" });
      expect(state().leaseUntil).toBe(clock + 90_000);
      throw new Error("delivery failed");
    });
    await expect(run(message(), action)).rejects.toThrow("delivery failed");
    await expect(run(message(), action)).rejects.toThrow("delivery failed");
    expect(action).toHaveBeenCalledTimes(2);
    expect(state()).not.toHaveProperty("leaseHolder");
    expect(state()).not.toHaveProperty("leaseUntil");
  });

  it("favors OK for conflicting states with the same timestamp in either delivery order", async () => {
    const actions: string[] = [];
    await run(message("ALARM"), async () => { actions.push("ALARM"); });
    await run(message("OK"), async () => { actions.push("OK"); });
    await run(message("ALARM"), async () => { actions.push("ALARM"); });
    expect(actions).toEqual(["ALARM", "OK"]);
    expect(state().transitionState).toBe("OK");
    fake.rows.clear();
    actions.length = 0;
    await run(message("OK"), async () => { actions.push("OK"); });
    await run(message("ALARM"), async () => { actions.push("ALARM"); });
    expect(actions).toEqual(["OK"]);
  });
});

describe("exclusive lease and fencing", () => {
  it("rejects concurrent processing for SNS retry while holding the lease across the callback", async () => {
    let finish!: () => void;
    const active = run(message(), () => new Promise<void>((resolve) => { finish = resolve; }));
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    const competing = vi.fn(async () => {});
    await expect(run(message("OK", 60), competing)).rejects.toThrow("already processing");
    expect(competing).not.toHaveBeenCalled();
    finish();
    await active;
    await run(message("OK", 60), competing);
    expect(competing).toHaveBeenCalledOnce();
  });

  it("takes over a crashed holder after expiry and preserves the prior transition", async () => {
    fake.rows.set(alarmName, { alarm: alarmName, leaseHolder: "crashed", leaseUntil: clock - 1,
      transitionAt: clock - 60_000, transitionState: "ALARM" });
    const action = vi.fn(async () => {
      expect(state().leaseHolder).not.toBe("crashed");
      expect(state().transitionState).toBe("OK");
    });
    await run(message("OK"), action);
    expect(action).toHaveBeenCalledOnce();
    expect(state()).not.toHaveProperty("leaseHolder");
  });

  it("does not let an expired holder release its successor's lease", async () => {
    let finishFirst!: () => void;
    const first = run(message(), () => new Promise<void>((resolve) => { finishFirst = resolve; }));
    await vi.waitFor(() => expect(finishFirst).toBeTypeOf("function"));
    const firstHolder = state().leaseHolder;
    vi.setSystemTime(clock + 90_001);
    let finishSecond!: () => void;
    const second = run(message("OK", 60), () => new Promise<void>((resolve) => { finishSecond = resolve; }));
    await vi.waitFor(() => expect(finishSecond).toBeTypeOf("function"));
    const secondHolder = state().leaseHolder;
    expect(secondHolder).not.toBe(firstHolder);
    finishFirst();
    await first;
    expect(state().leaseHolder).toBe(secondHolder);
    expect(state().transitionState).toBe("OK");
    finishSecond();
    await second;
    expect(state()).not.toHaveProperty("leaseHolder");
  });

  it("refuses effects if the lease expires before the transition write", async () => {
    const send = fake.send.getMockImplementation()!;
    fake.send.mockImplementation(async (input) => {
      if (input.UpdateExpression.startsWith("SET transitionAt")) {
        vi.setSystemTime(clock + 90_000);
        input.ExpressionAttributeValues[":now"] = { N: String(Date.now()) };
      }
      return send(input);
    });
    const action = vi.fn(async () => {});
    await expect(run(message(), action)).rejects.toThrow("lease was lost");
    expect(action).not.toHaveBeenCalled();
  });
});

describe("state store failures and configuration", () => {
  it("does not mask a callback failure when release also fails", async () => {
    const send = fake.send.getMockImplementation()!;
    fake.send.mockImplementation(async (input) => {
      if (input.UpdateExpression.startsWith("REMOVE")) throw new Error("private provider detail");
      return send(input);
    });
    const original = new Error("primary delivery failure");
    await expect(run(message(), async () => { throw original; })).rejects.toBe(original);
  });

  it("makes a release outage visible after successful processing", async () => {
    const send = fake.send.getMockImplementation()!;
    fake.send.mockImplementation(async (input) => {
      if (input.UpdateExpression.startsWith("REMOVE")) throw new Error("private provider detail");
      return send(input);
    });
    await expect(run(message(), async () => {})).rejects.toThrow(/^Infrastructure alarm transition lease release failed$/);
  });

  it("does not run effects when state persistence fails, and releases its lease", async () => {
    const send = fake.send.getMockImplementation()!;
    fake.send.mockImplementation(async (input) => {
      if (input.UpdateExpression.startsWith("SET transitionAt")) throw new Error("private provider detail");
      return send(input);
    });
    const action = vi.fn(async () => {});
    await expect(run(message(), action)).rejects.toThrow(/^Infrastructure alarm state is unavailable$/);
    expect(action).not.toHaveBeenCalled();
    expect(state()).not.toHaveProperty("leaseHolder");
  });

  it("requires durable state when Sentry reporting is enabled", async () => {
    vi.stubEnv("INFRA_ALARM_STATE_TABLE", undefined);
    const action = vi.fn(async () => {});
    await expect(run(message(), action)).rejects.toThrow("state table is not configured");
    expect(action).not.toHaveBeenCalled();
    vi.stubEnv("SENTRY_INFRA_DSN", undefined);
    await run(message(), action);
    expect(action).toHaveBeenCalledOnce();
    expect(fake.send).not.toHaveBeenCalled();
  });

  it.each([
    { AlarmName: "jane@example.com" }, { AlarmName: "buzzkill-other-stripe-webhook-errors" },
    { StateChangeTime: "2026-02-30T12:00:00Z" }, { StateChangeTime: undefined },
    { NewStateValue: "INSUFFICIENT_DATA" }, { StateChangeTime: "2026-11-04T12:00:00" },
  ])("rejects invalid transition data before writing %o", async (input) => {
    const action = vi.fn(async () => {});
    await expect(run({ ...message(), ...input }, action)).rejects.toThrow("transition is invalid");
    expect(action).not.toHaveBeenCalled();
    expect(fake.send).not.toHaveBeenCalled();
  });
});
