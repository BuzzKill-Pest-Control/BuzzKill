import { displayAddress } from "./serviceAddress";

type SearchableCustomer = {
  displayName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  serviceStreet?: string | null;
  serviceUnit?: string | null;
  serviceCity?: string | null;
  serviceState?: string | null;
  serviceZip?: string | null;
};

function words(value: string): string {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^\p{L}\p{N}@]+/gu, " ").trim();
}

function phoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/** Match the facts the office has at hand, including formatted US numbers. */
export function customerMatchesSearch(customer: SearchableCustomer, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const tokens = words(trimmed).split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const text = words([
    customer.displayName, customer.contactName, customer.email, customer.phone,
    displayAddress(customer),
  ].filter(Boolean).join(" "));
  if (tokens.every((token) => text.includes(token))) return true;
  // Only numeric/punctuation queries use the phone fallback. Otherwise a
  // query such as "Dana 508" must match Dana as well as the area code.
  if (/\p{L}/u.test(trimmed)) return false;
  const digits = phoneDigits(trimmed);
  return Boolean(digits && phoneDigits(customer.phone ?? "").includes(digits));
}

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
