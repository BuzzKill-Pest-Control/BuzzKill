export {
  customerMatchesSearch,
  normalizeCustomerSearchQuery,
} from "../../../web/amplify/functions/shared/customerSearch";
export type {
  CustomerSearchHit,
  CustomerSearchPage,
} from "../../../web/amplify/functions/shared/customerSearch";

type SearchHistory = { customerSearch?: { ownerSub?: unknown; query?: unknown } };
export type SearchResume = { cursor: string | null; customerId: string };

/** Contact details stay in per-entry browser state, never in a URL. */
export function searchQueryFromHistory(state: unknown, ownerSub: string): string {
  if (!ownerSub || !state || typeof state !== "object") return "";
  const saved = (state as SearchHistory).customerSearch;
  return saved?.ownerSub === ownerSub && typeof saved.query === "string"
    ? saved.query.slice(0, 200) : "";
}

export function withSearchQuery(state: unknown, ownerSub: string, query: string) {
  return {
    ...(state && typeof state === "object" && !Array.isArray(state) ? state : {}),
    customerSearch: { ownerSub, query: query.slice(0, 200) },
  };
}

/** Save only the clicked row's page token and id, never a directory snapshot. */
export function withSearchResume(
  state: unknown, ownerSub: string, query: string, resume: SearchResume
) {
  const next = withSearchQuery(state, ownerSub, query);
  return { ...next, customerSearch: { ...next.customerSearch, resume } };
}

export function searchResumeFromHistory(state: unknown, ownerSub: string, query: string): SearchResume | null {
  if (!ownerSub || !state || typeof state !== "object") return null;
  const saved = (state as { customerSearch?: { ownerSub?: unknown; query?: unknown; resume?: Partial<SearchResume> } }).customerSearch;
  const resume = saved?.resume;
  if (saved?.ownerSub !== ownerSub || saved.query !== query || !resume ||
      typeof resume.customerId !== "string" || !resume.customerId || resume.customerId.length > 200 ||
      !(resume.cursor === null || (typeof resume.cursor === "string" && resume.cursor.length > 0 && resume.cursor.length <= 40_000))) return null;
  return { cursor: resume.cursor, customerId: resume.customerId };
}

export function isSearchReturn(state: unknown, ownerSub: string): boolean {
  if (!ownerSub || !state || typeof state !== "object") return false;
  const saved = (state as { customerSearchReturn?: { ownerSub?: unknown } }).customerSearchReturn;
  return saved?.ownerSub === ownerSub;
}
