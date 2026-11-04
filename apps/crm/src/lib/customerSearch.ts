export {
  customerMatchesSearch,
  normalizeCustomerSearchQuery,
} from "../../../web/amplify/functions/shared/customerSearch";
export type {
  CustomerSearchHit,
  CustomerSearchPage,
} from "../../../web/amplify/functions/shared/customerSearch";

type SearchHistory = { customerSearch?: { ownerSub?: unknown; query?: unknown } };

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

export function isSearchReturn(state: unknown, ownerSub: string): boolean {
  if (!ownerSub || !state || typeof state !== "object") return false;
  const saved = (state as { customerSearchReturn?: { ownerSub?: unknown } }).customerSearchReturn;
  return saved?.ownerSub === ownerSub;
}
