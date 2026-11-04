import { describe, expect, it } from "vitest";
import { indexEntries, indexedLookup, INDEX_MAX_ENTRIES, keyId, manifestKey, manifestKeys } from "./customerSearchIndex";

const source = { id: "customer-1", status: "LEAD", displayName: "José Smith", contactName: "Jane Smith", email: "JANE@Example.COM", phone: "+1 (508) 258-9294" };
describe("derived contact/name index", () => {
  it("uses normalized phone/email equality and indexed name token prefixes", () => {
    const entries = indexEntries(source);
    for (const query of ["5082589294", "+1 (508) 258-9294", "５０８２５８９２９４", "jane@example.com", " JANE@EXAMPLE.COM ", "Jose", "Smi"]) {
      const lookup = indexedLookup(query)!;
      expect(lookup).not.toBeNull();
      expect(entries.some((entry) => entry.pk === lookup.pk && (!lookup.prefix || entry.sk.startsWith(lookup.prefix)))).toBe(true);
    }
    expect(entries.every((entry) => Object.keys(entry).sort().join(",") === "customerId,kind,pk,sk")).toBe(true);
    expect(entries.filter((entry) => entry.pk.startsWith("P#") || entry.pk.startsWith("E#")).map((entry) => entry.pk).join()).not.toMatch(/508|jane|example/);
  });
  it("deduplicates display/contact tokens and bounds long imported names and key sizes", () => {
    const entries = indexEntries({ ...source, displayName: Array.from({ length: 100 }, (_, i) => `Long${i}${"é".repeat(500)}`).join(" "), contactName: "Smith Smith" });
    expect(entries.length).toBeLessThanOrEqual(INDEX_MAX_ENTRIES);
    expect(new Set(entries.map(keyId)).size).toBe(entries.length);
    expect(entries.every((entry) => Buffer.byteLength(entry.pk) <= 2048 && Buffer.byteLength(entry.sk) <= 1024)).toBe(true);
    expect(indexEntries({ ...source, displayName: "Smith Smith", contactName: "Smith" }).filter((entry) => entry.pk.startsWith("N#"))).toHaveLength(1);
  });
  it("keeps DNC/inactive rows discoverable but omits tombstones and deleted sources", () => {
    expect(indexEntries({ ...source, status: "INACTIVE" }).length).toBeGreaterThan(0);
    expect(indexEntries({ ...source, doNotContact: true } as typeof source).length).toBeGreaterThan(0);
    expect(indexEntries({ ...source, mergedIntoId: "winner" })).toEqual([]);
    expect(indexEntries({ ...source, status: "MERGED" })).toEqual([]);
    expect(indexEntries(null)).toEqual([]);
  });
  it("safely falls back for short numeric/long tokens and oversized source IDs", () => {
    expect(indexedLookup("508")).toBeNull();
    expect(indexedLookup("x".repeat(81))).toBeNull();
    expect(indexEntries({ ...source, id: "x".repeat(2048) })).toEqual([]);
    expect(Buffer.byteLength(manifestKey("x".repeat(2048)).pk)).toBe(66);
  });
  it("accepts only this customer's unique bounded old entry keys", () => {
    const keys = indexEntries(source).map(({ pk, sk }) => ({ pk, sk }));
    expect(manifestKeys(keys, source.id)).toEqual(keys);
    expect(() => manifestKeys(keys, "another-customer")).toThrow(/manifest is invalid/);
    expect(() => manifestKeys([...keys, keys[0]], source.id)).toThrow(/manifest is invalid/);
    expect(() => manifestKeys(Array(35).fill(keys[0]), source.id)).toThrow(/manifest is invalid/);
  });
});
