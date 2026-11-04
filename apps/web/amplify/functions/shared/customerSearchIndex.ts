import { createHash } from "node:crypto";
import { normalizeCustomerSearchQuery } from "./customerSearch";

export const INDEX_MAX_WORDS = 32;
export const INDEX_MAX_WORD_LENGTH = 80;
export const INDEX_MAX_ENTRIES = INDEX_MAX_WORDS + 2;
export const INDEX_SOURCE_FIELDS = ["id", "displayName", "contactName", "email", "phone", "status", "mergedIntoId", "updatedAt"] as const;
export type IndexSource = { id: string; displayName?: string | null; contactName?: string | null; email?: string | null; phone?: string | null; status?: string | null; mergedIntoId?: string | null; updatedAt?: string | null };
export type IndexKey = { pk: string; sk: string };
export type IndexEntry = IndexKey & { customerId: string; kind: "lookup" };
export type IndexManifest = IndexKey & { kind: "manifest"; customerId: string; revision: string; keys: IndexKey[] };
export type Lookup = { pk: string; prefix?: string };
export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export const keyId = (key: IndexKey) => JSON.stringify([key.pk, key.sk]);
const encodedId = (id: string) => Buffer.from(id).toString("base64url");

export function normalizedPhone(value: string): string {
  const digits = value.normalize("NFKD").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}
export function normalizedEmail(value: string): string { return value.trim().normalize("NFKC").toLowerCase(); }
const namePartition = (word: string) => `N#${hash(Array.from(word).slice(0, 2).join(""))}`;

/** Source identifiers and long imported names cannot create unbounded keys or transactions. Fallback remains complete. */
export function indexEntries(source: IndexSource | null): IndexEntry[] {
  if (!source || !source.id || Buffer.byteLength(source.id) > 256 || source.mergedIntoId ||
      !["ACTIVE", "INACTIVE", "LEAD"].includes(source.status ?? "")) return [];
  const id = encodedId(source.id);
  const keys: IndexKey[] = [];
  const phone = normalizedPhone(source.phone ?? "");
  if (phone.length >= 7 && phone.length <= 32) keys.push({ pk: `P#${hash(phone)}`, sk: id });
  const email = normalizedEmail(source.email ?? "");
  if (email && email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) keys.push({ pk: `E#${hash(email)}`, sk: id });
  const names = `${source.displayName ?? ""} ${source.contactName ?? ""}`.slice(0, 8192);
  const words = [...new Set(normalizeCustomerSearchQuery(names).split(/\s+/).filter(Boolean))].slice(0, INDEX_MAX_WORDS);
  for (const word of words) {
    const token = Array.from(word).slice(0, INDEX_MAX_WORD_LENGTH).join("");
    if (Array.from(token).length >= 2) keys.push({ pk: namePartition(token), sk: `${token}#${id}` });
  }
  return [...new Map(keys.map((key) => [keyId(key), { ...key, customerId: source.id, kind: "lookup" as const }])).values()];
}

/** One genuinely indexed candidate path. Address/substring matches are still found by the bounded fallback. */
export function indexedLookup(query: string): Lookup | null {
  const email = normalizedEmail(query);
  if (email.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { pk: `E#${hash(email)}` };
  const phone = normalizedPhone(query);
  if (!/\p{L}/u.test(query) && phone.length >= 10 && phone.length <= 32) return { pk: `P#${hash(phone)}` };
  if (!/\p{L}/u.test(query)) return null;
  const words = normalizeCustomerSearchQuery(query).split(/\s+/)
    .filter((word) => !word.includes("@") && Array.from(word).length >= 2 && Array.from(word).length <= INDEX_MAX_WORD_LENGTH);
  words.sort((a, b) => Array.from(b).length - Array.from(a).length || a.localeCompare(b));
  return words[0] ? { pk: namePartition(words[0]), prefix: words[0] } : null;
}

export function manifestKey(id: string): IndexKey { return { pk: `C#${hash(id)}`, sk: "M" }; }

/** A corrupted manifest must never let a worker delete another customer's derived entries. */
export function manifestKeys(value: unknown, id: string): IndexKey[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > INDEX_MAX_ENTRIES) throw new Error("Customer search manifest is invalid");
  const encoded = encodedId(id);
  const keys = value.map((raw) => {
    const key = raw as Partial<IndexKey>;
    if (!key || typeof key.pk !== "string" || typeof key.sk !== "string" || Buffer.byteLength(key.sk) > 1024 ||
        !((/^[PE]#[a-f0-9]{64}$/.test(key.pk) && key.sk === encoded) ||
          (/^N#[a-f0-9]{64}$/.test(key.pk) && key.sk.endsWith(`#${encoded}`) &&
            namePartition(key.sk.slice(0, -(encoded.length + 1))) === key.pk))) throw new Error("Customer search manifest is invalid");
    return { pk: key.pk, sk: key.sk };
  });
  if (new Set(keys.map(keyId)).size !== keys.length) throw new Error("Customer search manifest is invalid");
  return keys;
}
