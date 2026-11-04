import { createHash } from "node:crypto";
import type { AppSyncIdentity } from "aws-lambda";
import { assertOffice, callerSub } from "./authz";
import { normalizeCustomerSearchQuery, type CustomerSearchHit, type CustomerSearchPage } from "./customerSearch";
import { indexedLookup } from "./customerSearchIndex";
import { currentSearchHit } from "./customerSearchRecords";
import { directoryStore, type DirectoryStore, type SourceKey } from "./customerSearchStore";
export { CUSTOMER_SEARCH_FIELDS } from "./customerSearchRecords";

const STATUSES = ["ACTIVE", "INACTIVE", "LEAD"] as const;
export const SEARCH_MAX_REQUESTS = 6;
export const SEARCH_MAX_EVALUATED = 150;
export const SEARCH_MAX_RESULTS = 50;
type Partition = { done: boolean; key: SourceKey | null };
type Cursor = { v: 2; binding: string; next: number; partitions: Partition[]; seeds: string[] };
export type SearchCustomersArgs = { query: string; limit?: number | null; nextToken?: string | null };

function initialCursor(binding: string): Cursor {
  return { v: 2, binding, next: 0, partitions: STATUSES.map(() => ({ done: false, key: null })), seeds: [] };
}
function validKey(key: unknown, status: string): key is SourceKey {
  if (!key || typeof key !== "object" || Array.isArray(key)) return false;
  const value = key as SourceKey;
  return Object.keys(value).sort().join(",") === "displayName,id,status" && typeof value.id === "string" && Boolean(value.id) &&
    Buffer.byteLength(value.id) <= 2048 && value.status === status && typeof value.displayName === "string" && Buffer.byteLength(value.displayName) <= 1024;
}
function readCursor(token: string, binding: string): Cursor {
  const invalid = () => new Error("This search continuation is invalid. Start the search again.");
  if (token.length > 40_000 || !/^[A-Za-z0-9_-]+$/.test(token)) throw invalid();
  let cursor: Cursor;
  try { cursor = JSON.parse(Buffer.from(token, "base64url").toString("utf8")); } catch { throw invalid(); }
  if (!cursor || cursor.v !== 2 || cursor.binding !== binding || !Number.isInteger(cursor.next) || cursor.next < 0 || cursor.next >= 3 ||
      !Array.isArray(cursor.seeds) || cursor.seeds.length > SEARCH_MAX_RESULTS || new Set(cursor.seeds).size !== cursor.seeds.length ||
      cursor.seeds.some((id) => typeof id !== "string" || !id || Buffer.byteLength(id) > 256) ||
      !Array.isArray(cursor.partitions) || cursor.partitions.length !== 3 || cursor.partitions.some((part, i) =>
        !part || typeof part.done !== "boolean" || !(part.key === null || validKey(part.key, STATUSES[i])) || (part.done && part.key !== null))) throw invalid();
  return { v: 2, binding, next: cursor.next, seeds: [...cursor.seeds], partitions: cursor.partitions.map((part) => ({ done: part.done, key: part.key })) };
}
function continuation(cursor: Cursor): string | null {
  return cursor.partitions.some((part) => !part.done) ? Buffer.from(JSON.stringify(cursor)).toString("base64url") : null;
}

/** Indexed first hits, followed by a complete bounded walk for address/substring matches and index lag. */
export async function searchCustomers(args: SearchCustomersArgs, identity: AppSyncIdentity | undefined | null, injected?: DirectoryStore): Promise<CustomerSearchPage> {
  assertOffice(identity);
  const owner = callerSub(identity);
  if (!owner) throw new Error("A signed-in owner is required");
  if (typeof args.query !== "string" || !args.query.trim() || args.query.length > 200 || !normalizeCustomerSearchQuery(args.query)) {
    throw new Error("Enter a name, phone, email, or service address (up to 200 characters).");
  }
  const query = args.query.trim();
  const limit = args.limit ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_MAX_RESULTS) throw new Error(`Search limit must be between 1 and ${SEARCH_MAX_RESULTS}`);
  const binding = createHash("sha256").update(JSON.stringify([owner, normalizeCustomerSearchQuery(query)])).digest("hex");
  const cursor = args.nextToken ? readCursor(args.nextToken, binding) : initialCursor(binding);
  const store = injected ?? directoryStore();
  if (!args.nextToken) {
    const lookup = indexedLookup(query);
    if (lookup) {
      // The derived table is an accelerator, so rollout/throttling cannot disable authoritative search.
      // Validation and source failures remain hard errors; their cursors must never advance.
      let candidates: string[];
      try { candidates = await store.lookup(lookup, limit); } catch { candidates = []; }
      const ids = [...new Set(candidates)];
      if (ids.length > limit) throw new Error("Customer search index exceeded its requested page");
      const rows = new Map((await store.current(ids)).map((row) => [row.id, row]));
      const hits = ids.flatMap((id) => { const row = rows.get(id); const hit = row ? currentSearchHit(row, query) : null; return hit ? [hit] : []; });
      if (hits.length) {
        cursor.seeds = hits.map((hit) => hit.id);
        return { items: hits, nextToken: continuation(cursor) };
      }
    }
  }
  const items = new Map<string, CustomerSearchHit>();
  const seeds = new Set(cursor.seeds);
  let requests = 0, evaluated = 0;
  while (items.size < limit && requests < SEARCH_MAX_REQUESTS && evaluated < SEARCH_MAX_EVALUATED && cursor.partitions.some((part) => !part.done)) {
    while (cursor.partitions[cursor.next].done) cursor.next = (cursor.next + 1) % 3;
    const part = cursor.partitions[cursor.next];
    const pageLimit = Math.min(limit - items.size, SEARCH_MAX_EVALUATED - evaluated);
    const page = await store.page(STATUSES[cursor.next], part.key, pageLimit);
    requests++; evaluated += pageLimit;
    if (page.ids.length > pageLimit || (page.nextKey && !validKey(page.nextKey, STATUSES[cursor.next]))) throw new Error("Customer search source returned an invalid page");
    if (page.nextKey && JSON.stringify(page.nextKey) === JSON.stringify(part.key)) throw new Error("Search continuation did not advance. Start the search again.");
    const rows = await store.current(page.ids);
    for (const row of rows) {
      if (!page.ids.includes(row.id)) throw new Error("Customer search verification returned an unexpected record");
      if (seeds.has(row.id)) continue;
      const hit = currentSearchHit(row, query);
      if (hit) items.set(hit.id, hit);
    }
    part.key = page.nextKey;
    part.done = !page.nextKey;
    cursor.next = (cursor.next + 1) % 3;
  }
  return { items: [...items.values()], nextToken: continuation(cursor) };
}
