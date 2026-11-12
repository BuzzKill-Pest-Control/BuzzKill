import { deriveLeadStage, type LeadFacts } from "./leadStage";
import {
  customerMatchesSearch,
  type CustomerSearchHit,
  type SearchableCustomer,
} from "./customerSearch";

export const CUSTOMER_SEARCH_FIELDS = [
  "id",
  "displayName",
  "contactName",
  "email",
  "phone",
  "status",
  "mergedIntoId",
  "serviceStreet",
  "serviceUnit",
  "serviceCity",
  "serviceState",
  "serviceZip",
  "convertedAt",
  "doNotContact",
  "lostReason",
  "conversionReviewBookingId",
  "bookingLinkDeliveredAt",
  "qualificationStatus",
  "lastReachedAt",
  "lastAttemptedAt",
] as const;
export type SearchRow = SearchableCustomer &
  LeadFacts & { id: string; displayName: string; mergedIntoId?: string | null };

/** Index entries never supply displayed facts; every hit is rebuilt from a fresh authoritative customer read. */
export function currentSearchHit(
  row: SearchRow,
  query: string,
): CustomerSearchHit | null {
  if (
    !row ||
    !row.id ||
    typeof row.displayName !== "string" ||
    row.mergedIntoId ||
    !["ACTIVE", "INACTIVE", "LEAD"].includes(row.status ?? "") ||
    !customerMatchesSearch(row, query)
  )
    return null;
  return {
    id: row.id,
    displayName: row.displayName,
    status: row.status as CustomerSearchHit["status"],
    contactName: row.contactName ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    serviceStreet: row.serviceStreet ?? null,
    serviceUnit: row.serviceUnit ?? null,
    serviceCity: row.serviceCity ?? null,
    serviceState: row.serviceState ?? null,
    serviceZip: row.serviceZip ?? null,
    leadStage: row.status === "LEAD" ? deriveLeadStage(row) : null,
  };
}
