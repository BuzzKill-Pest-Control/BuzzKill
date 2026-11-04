import { describe, expect, it, vi } from "vitest";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { indexTransaction, sourceFence, synchronizeCustomer, type IndexSnapshot, type IndexWriter } from "./customerIndexWriter";
import { indexEntries, INDEX_SOURCE_FIELDS, keyId, manifestKey, type IndexManifest, type IndexSource } from "./customerSearchIndex";

const source: IndexSource = { id: "customer-1", status: "ACTIVE", displayName: "Jane Smith", email: "old@example.com", phone: "5082589294" };
const manifest = (row: IndexSource): IndexManifest => ({ ...manifestKey(row.id), kind: "manifest", customerId: row.id, revision: "revision-1", keys: indexEntries(row).map(({ pk, sk }) => ({ pk, sk })) });

describe("atomic derived-index replacement", () => {
  it("fences every indexed raw source fact, distinguishing absent, null and unchanged timestamps", () => {
    const fence = sourceFence({ ...source, contactName: null, updatedAt: "same-timestamp" });
    expect(Object.values(fence.ExpressionAttributeNames)).toEqual([...INDEX_SOURCE_FIELDS]);
    const values = unmarshall(fence.ExpressionAttributeValues!);
    expect(values[":s3"]).toBe("old@example.com");
    expect(values[":s2"]).toBeNull();
    expect(values[":s7"]).toBe("same-timestamp");
    expect(sourceFence(source).ConditionExpression).toContain("attribute_not_exists(#s7)");
    expect(sourceFence(null).ConditionExpression).toBe("attribute_not_exists(#id)");
  });
  it("never changes business rows and does not delete/put the same derived key twice", () => {
    const next = { ...source, displayName: "Jane Doe", email: "new@example.com" };
    const tx = indexTransaction(source.id, { source: next, manifest: manifest(source) }, "Customers", "Search");
    expect(tx[0].ConditionCheck!.TableName).toBe("Customers");
    const writes = tx.slice(1);
    expect(writes.every((item) => (item.Put ?? item.Delete)!.TableName === "Search")).toBe(true);
    const keys = writes.map((item) => item.Put ? { pk: item.Put.Item!.pk, sk: item.Put.Item!.sk } : item.Delete!.Key);
    expect(new Set(keys.map((key) => JSON.stringify(key))).size).toBe(keys.length);
    const puts = writes.flatMap((item) => item.Put ? [unmarshall(item.Put.Item!)] : []);
    expect(puts.find((item) => item.kind === "manifest")!.revision).not.toBe("revision-1");
    expect(tx.at(-1)!.Put!.ConditionExpression).toBe("#revision = :revision");
  });
  it("bounds maximum old/new replacement below100 transaction items", () => {
    const named = (prefix: string) => ({ ...source, displayName: Array.from({ length: 32 }, (_, i) => `${prefix}${i}`).join(" ") });
    const tx = indexTransaction(source.id, { source: named("new"), manifest: manifest(named("old")) }, "Customers", "Search");
    expect(tx.length).toBeLessThanOrEqual(70);
    expect(tx.length).toBeGreaterThan(60);
  });
  it.each([null, { ...source, status: "MERGED", mergedIntoId: "winner" }])("removes orphan/tombstone entries using a source condition", (current) => {
    const tx = indexTransaction(source.id, { source: current, manifest: manifest(source) }, "Customers", "Search");
    expect(tx.slice(1).every((item) => Boolean(item.Delete))).toBe(true);
    expect(tx.at(-1)!.Delete!.Key).toEqual(expect.objectContaining({ pk: expect.any(Object), sk: { S: "M" } }));
    expect(tx[0].ConditionCheck!.ConditionExpression).toBe(current ? sourceFence(current).ConditionExpression : "attribute_not_exists(#id)");
  });
  it.each([undefined, "same-timestamp"])("rereads facts after a concurrent change even with timestamp %s", async (timestamp) => {
    let current: IndexSource = { ...source, updatedAt: timestamp };
    let saved: IndexManifest | null = manifest(current);
    const committed: IndexSnapshot[] = [];
    let attempted = false;
    const writer: IndexWriter = {
      snapshot: async () => structuredClone({ source: current, manifest: saved }),
      commit: async (_id, snapshot) => {
        // Concurrent direct writer changes email without updating the optional timestamp.
        if (!attempted) { attempted = true; current = { ...current, email: "new@example.com" }; }
        const fence = sourceFence(snapshot.source);
        const values = unmarshall(fence.ExpressionAttributeValues!);
        if (values[":s3"] !== current.email) return false;
        committed.push(snapshot);
        saved = manifest(current);
        return true;
      },
    };
    await synchronizeCustomer(source.id, writer);
    expect(committed).toHaveLength(1);
    expect(committed[0].source!.email).toBe("new@example.com");
  });
  it("bounds CAS conflicts and refuses another customer's manifest or malformed IDs", async () => {
    const writer: IndexWriter = { snapshot: vi.fn(async () => ({ source, manifest: null })), commit: vi.fn(async () => false) };
    await expect(synchronizeCustomer(source.id, writer)).rejects.toThrow(/retry is required/);
    expect(writer.commit).toHaveBeenCalledTimes(3);
    await expect(synchronizeCustomer("x".repeat(2049), writer)).rejects.toThrow(/identity is invalid/);
    const foreign = { ...manifest(source), customerId: "another" };
    expect(() => indexTransaction(source.id, { source, manifest: foreign }, "Customers", "Search")).toThrow(/manifest is invalid/);
    // A maximum legal source PK never exceeds the derived table's key limit.
    const long = { ...source, id: "x".repeat(2048) };
    expect(indexTransaction(long.id, { source: long, manifest: null }, "Customers", "Search").length).toBe(2);
  });
  it("old/new key overlap remains unique for duplicate name tokens", () => {
    const same = { ...source, displayName: "Jane Jane", contactName: "Jane" };
    const keys = indexEntries(same).map(keyId);
    expect(new Set(keys).size).toBe(keys.length);
    expect(() => indexTransaction(source.id, { source: same, manifest: manifest(same) }, "Customers", "Search")).not.toThrow();
  });
});
