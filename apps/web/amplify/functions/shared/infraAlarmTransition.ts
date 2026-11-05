import { randomUUID } from "node:crypto";
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { InfraAlarmMessage } from "./infraSentry";

const client = new DynamoDBClient({});
// Longer than ops-alerts' 60-second Lambda limit, so a crashed holder expires safely.
const LEASE_MS = 90_000;
const conditionalFailure = (error: unknown) => error instanceof Error && error.name === "ConditionalCheckFailedException";

function transition(message: InfraAlarmMessage) {
  const alarm = message.AlarmName;
  const state = message.NewStateValue;
  const time = message.StateChangeTime;
  const branch = process.env.SENTRY_INFRA_ALARM_BRANCH;
  if (typeof alarm !== "string" || !/^buzzkill-[a-z0-9][a-z0-9-]{1,246}$/.test(alarm) ||
      (branch && !alarm.startsWith(`buzzkill-${branch}-`)) ||
      (state !== "ALARM" && state !== "OK") || typeof time !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|\+0000|\+00:00)$/.test(time)) {
    throw new Error("Infrastructure alarm transition is invalid");
  }
  const at = Date.parse(time);
  if (!Number.isFinite(at) || new Date(at).toISOString().slice(0, 19) !== time.slice(0, 19)) {
    throw new Error("Infrastructure alarm transition is invalid");
  }
  return { alarm, state, at };
}

/** Serialize state changes and retries, preserving the newest observed transition before its effects. */
export async function withInfraAlarmTransition(
  message: InfraAlarmMessage,
  action: () => Promise<void>
): Promise<void> {
  const table = process.env.INFRA_ALARM_STATE_TABLE;
  if (!table) {
    if (process.env.SENTRY_INFRA_DSN) throw new Error("Infrastructure alarm state table is not configured");
    await action();
    return;
  }
  if (!/^[A-Za-z0-9_.-]{3,255}$/.test(table)) throw new Error("Infrastructure alarm state table is invalid");
  const { alarm, state, at } = transition(message);
  const holder = randomUUID();
  const now = Date.now();
  let previous: Record<string, unknown>;
  try {
    const acquired = await client.send(new UpdateItemCommand({
      TableName: table, Key: marshall({ alarm }),
      UpdateExpression: "SET leaseHolder = :holder, leaseUntil = :until",
      ConditionExpression: "attribute_not_exists(leaseUntil) OR leaseUntil <= :now",
      ExpressionAttributeValues: marshall({ ":holder": holder, ":until": now + LEASE_MS, ":now": now }),
      ReturnValues: "ALL_OLD",
    }));
    previous = acquired.Attributes ? unmarshall(acquired.Attributes) : {};
  } catch (error) {
    throw new Error(conditionalFailure(error)
      ? "Infrastructure alarm transition is already processing"
      : "Infrastructure alarm state is unavailable");
  }
  let actionFailed = false;
  try {
    const priorAt = previous.transitionAt;
    const priorState = previous.transitionState;
    if ((priorAt !== undefined || priorState !== undefined) &&
        (typeof priorAt !== "number" || !Number.isSafeInteger(priorAt) ||
         (priorState !== "ALARM" && priorState !== "OK"))) {
      throw new Error("Infrastructure alarm stored transition is invalid");
    }
    // OK wins an equal-timestamp conflict. A late ALARM retry cannot resurrect a recovery.
    if (typeof priorAt === "number" && (at < priorAt || (at === priorAt && priorState === "OK" && state === "ALARM"))) return;
    try {
      await client.send(new UpdateItemCommand({
        TableName: table, Key: marshall({ alarm }),
        UpdateExpression: "SET transitionAt = :at, transitionState = :state",
        ConditionExpression: "leaseHolder = :holder AND leaseUntil > :now",
        ExpressionAttributeValues: marshall({ ":at": at, ":state": state, ":holder": holder, ":now": Date.now() }),
      }));
    } catch (error) {
      throw new Error(conditionalFailure(error)
        ? "Infrastructure alarm transition lease was lost"
        : "Infrastructure alarm state is unavailable");
    }
    await action();
  } catch (error) {
    actionFailed = true;
    throw error;
  } finally {
    try {
      await client.send(new UpdateItemCommand({
        TableName: table, Key: marshall({ alarm }),
        UpdateExpression: "REMOVE leaseHolder, leaseUntil",
        ConditionExpression: "leaseHolder = :holder",
        ExpressionAttributeValues: marshall({ ":holder": holder }),
      }));
    } catch (error) {
      // An expired holder cannot remove its successor's lease; a primary delivery error wins.
      if (!conditionalFailure(error) && !actionFailed) throw new Error("Infrastructure alarm transition lease release failed");
    }
  }
}
