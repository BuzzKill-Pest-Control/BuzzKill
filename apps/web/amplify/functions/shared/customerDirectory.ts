import { createHash } from "node:crypto";
import type { AppSyncIdentity } from "aws-lambda";
import { assertOffice, callerSub } from "./authz";
import { dataClient } from "./dataClient";
import { deriveLeadStage, type LeadFacts } from "./leadStage";
import {
  customerMatchesSearch,
  normalizeCustomerSearchQuery,
  type CustomerSearchHit,
  type CustomerSearchPage,
  type SearchableCustomer,
} from "./customerSearch";

const STATUSES = ["ACTIVE", "INACTIVE", "LEAD"] as const;
export const SEARCH_MAX_REQUESTS = 6;
export const SEARCH_MAX_EVALUATED = 150;
export const SEARCH_MAX_RESULTS = 50;

// Request only contact/lookup facts. Billing, notes, portal access and other
// protected customer details are never fetched or returned by this endpoint.
export const CUSTOMER_SEARCH_FIELDS = [
  "id", "displayName", "contactName", "email", "phone", "status",
  "serviceStreet", "serviceUnit", "serviceCity", "serviceState", "serviceZip",
  "convertedAt", "doNotContact", "lostReason", "conversionReviewBookingId",
  "bookingLinkDeliveredAt", "qualificationStatus", "lastReachedAt", "lastAttemptedAt",
] as const;

type SearchRow = SearchableCustomer & LeadFacts & { id: string; displayName: string };
type Partition = { done: boolean; token: string | null };
type Cursor = { v: 1; binding: string; next: number; partitions: Partition[] };
export type SearchCustomersArgs = { query: string; limit?: number | null; nextToken?: string | null };
type ReadPage = (
  status: typeof STATUSES[number], token: string | undefined, limit: number
) => Promise<{ data: SearchRow[] | null; nextToken?: string | null; errors?: { message: string }[] }>;

function initialCursor(binding: string): Cursor {
  return { v: 1, binding, next: 0, partitions: STATUSES.map(() => ({ done: false, token: null })) };
}

function readCursor(token: string | null | undefined, binding: string): Cursor {
  if (!token) return initialCursor(binding);
  const invalid = () => new Error("This search continuation is invalid. Start the search again.");
  if (token.length > 40_000 || !/^[A-Za-z0-9_-]+$/.test(token)) throw invalid();
  let cursor: Cursor;
  try { cursor = JSON.parse(Buffer.from(token, "base64url").toString("utf8")); }
  catch { throw invalid(); }
  if (!cursor || cursor.v !== 1 || cursor.binding !== binding ||
      !Number.isInteger(cursor.next) || cursor.next < 0 || cursor.next >= STATUSES.length ||
      !Array.isArray(cursor.partitions) || cursor.partitions.length !== STATUSES.length ||
      cursor.partitions.some((part) => !part || typeof part.done !== "boolean" ||
        !(part.token === null || (typeof part.token === "string" && part.token.length <= 8_000)) ||
        (part.done && part.token !== null))) throw invalid();
  return {
    v: 1, binding, next: cursor.next,
    partitions: cursor.partitions.map((part) => ({ done: part.done, token: part.token })),
  };
}

function hit(row: SearchRow): CustomerSearchHit | null {
  if (!STATUSES.includes(row.status as typeof STATUSES[number])) return null;
  return {
    id: row.id, displayName: row.displayName,
    status: row.status as CustomerSearchHit["status"],
    contactName: row.contactName ?? null, email: row.email ?? null, phone: row.phone ?? null,
    serviceStreet: row.serviceStreet ?? null, serviceUnit: row.serviceUnit ?? null,
    serviceCity: row.serviceCity ?? null, serviceState: row.serviceState ?? null,
    serviceZip: row.serviceZip ?? null,
    leadStage: row.status === "LEAD" ? deriveLeadStage(row) : null,
  };
}

async function defaultReadPage(status: typeof STATUSES[number], token: string | undefined, limit: number) {
  const client = await dataClient();
  return client.models.Customer.listCustomerByStatusAndDisplayName(
    { status }, { limit, nextToken: token, selectionSet: CUSTOMER_SEARCH_FIELDS }
  );
}

/** Bounded work and output, with explicit continuation even for sparse matches. */
export async function searchCustomers(
  args: SearchCustomersArgs,
  identity: AppSyncIdentity | undefined | null,
  readPage: ReadPage = defaultReadPage
): Promise<CustomerSearchPage> {
  assertOffice(identity);
  const owner = callerSub(identity);
  if (!owner) throw new Error("A signed-in owner is required");
  if (typeof args.query !== "string" || !args.query.trim() || args.query.length > 200 ||
      !normalizeCustomerSearchQuery(args.query)) throw new Error("Enter a name, phone, email, or service address (up to 200 characters).");
  const query = args.query.trim();
  const limit = args.limit ?? 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > SEARCH_MAX_RESULTS) {
    throw new Error(`Search limit must be between 1 and ${SEARCH_MAX_RESULTS}`);
  }
  // Bind continuations to this caller and lookup. This is not an authority
  // token: the office role check above is required for every page independently.
  const binding = createHash("sha256").update(JSON.stringify([owner, normalizeCustomerSearchQuery(query)])).digest("hex");
  const cursor = readCursor(args.nextToken, binding);
  const items = new Map<string, CustomerSearchHit>();
  let requests = 0;
  let evaluated = 0;
  while (items.size < limit && requests < SEARCH_MAX_REQUESTS && evaluated < SEARCH_MAX_EVALUATED &&
      cursor.partitions.some((part) => !part.done)) {
    while (cursor.partitions[cursor.next].done) cursor.next = (cursor.next + 1) % STATUSES.length;
    const part = cursor.partitions[cursor.next];
    const pageLimit = Math.min(limit - items.size, SEARCH_MAX_EVALUATED - evaluated);
    const page = await readPage(STATUSES[cursor.next], part.token ?? undefined, pageLimit);
    requests++;
    // Conservatively charge the requested evaluated limit, not just matches or
    // returned rows; filtered/empty pages still consume the work budget.
    evaluated += pageLimit;
    if (page.errors?.length) throw new Error(page.errors.map((error) => error.message).join("; "));
    if ((page.data?.length ?? 0) > pageLimit) throw new Error("Search page exceeded its requested limit");
    if (page.nextToken && (typeof page.nextToken !== "string" || page.nextToken.length > 8_000)) {
      throw new Error("Search returned an invalid continuation. Start the search again.");
    }
    if (page.nextToken && page.nextToken === part.token) throw new Error("Search continuation did not advance. Start the search again.");
    for (const row of page.data ?? []) {
      if (!customerMatchesSearch(row, query)) continue;
      const selected = hit(row);
      if (selected) items.set(selected.id, selected);
    }
    part.token = page.nextToken || null;
    part.done = !part.token;
    cursor.next = (cursor.next + 1) % STATUSES.length;
  }
  const nextToken = cursor.partitions.some((part) => !part.done)
    ? Buffer.from(JSON.stringify(cursor)).toString("base64url") : null;
  return { items: [...items.values()], nextToken };
}
