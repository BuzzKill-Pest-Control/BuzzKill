import { displayAddress } from "./serviceAddress";

export type SearchableCustomer = {
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

export function normalizeCustomerSearchQuery(value: string): string {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "")
    .toLowerCase().replace(/[^\p{L}\p{N}@]+/gu, " ").trim();
}

function phoneDigits(value: string): string {
  const digits = value.normalize("NFKD").replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/** Match the facts the office has at hand, including formatted US numbers. */
export function customerMatchesSearch(customer: SearchableCustomer, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;
  const tokens = normalizeCustomerSearchQuery(trimmed).split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  const text = normalizeCustomerSearchQuery([
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


export type CustomerSearchHit = SearchableCustomer & {
  id: string;
  displayName: string;
  status: "ACTIVE" | "INACTIVE" | "LEAD";
  leadStage: import("./leadStage").LeadStage | null;
};
export type CustomerSearchPage = { items: CustomerSearchHit[]; nextToken: string | null };
