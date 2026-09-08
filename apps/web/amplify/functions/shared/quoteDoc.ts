import { renderQuotePdf } from "./pdf";

/**
 * The quote PDF for a booking request that is ALREADY priced.
 *
 * Deliberately narrower than pricing-refresh's version, which also has to drive
 * a still-PENDING request through /quote-status and retry an eventually
 * consistent index read. Anything the office can see in a lead's quote history
 * has a price already, so this only has to render one — no repricing, no
 * re-poll, and therefore no way for opening a PDF to change a stored quote.
 */

/** Re-exported so existing importers keep working; `quoteJson` has exactly one
 *  shape and one parser, both in `./quoteSnapshot`. */
import { parseQuoteSnapshot } from "./quoteSnapshot";
export { parseQuoteSnapshot, type QuoteSnapshot } from "./quoteSnapshot";

export type QuotableBooking = {
  id: string;
  status?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  expiresAt?: string | null;
  createdAt?: string | null;
  quoteJson?: unknown;
  /** The catalog service id the request was quoted for. */
  service?: string | null;
};

/** Statuses that carry a real price worth printing. */
const PRINTABLE = new Set(["QUOTED", "PROCESSING", "BOOKED"]);

/**
 * Render the PDF, or null when there is genuinely nothing to print — a request
 * that never finished pricing, or whose stored snapshot has no service label.
 * Null is an honest "no document", never a blank or invented one.
 */
export async function renderQuotePdfForBooking(
  booking: QuotableBooking,
  offSeasonMessage?: string | null
): Promise<Uint8Array | null> {
  if (!PRINTABLE.has(String(booking.status ?? ""))) return null;
  const snap = parseQuoteSnapshot(booking.quoteJson);
  if (!snap.serviceLabel) return null;
  if (!snap.days?.length && !snap.offSeason && snap.baseCents == null) {
    return null;
  }

  const serviceAddress =
    [
      booking.street,
      booking.city,
      [booking.state, booking.zip].filter(Boolean).join(" ").trim(),
    ]
      .filter((p) => p && String(p).trim())
      .join(", ") || null;

  return renderQuotePdf({
    quoteRef: booking.id,
    // The date the customer was QUOTED, not the moment staff opened the PDF —
    // reprinting a quote must not silently restate when it was given.
    quotedAtIso: booking.createdAt ?? new Date().toISOString(),
    validThroughIso: booking.expiresAt ?? null,
    customerName: booking.name ?? "Customer",
    customerEmail: booking.email ?? null,
    customerPhone: booking.phone ?? null,
    serviceAddress,
    serviceState: booking.state ?? null,
    serviceLabel: snap.serviceLabel,
    // Coverage pictures come from the stored catalog id, never the label.
    serviceId: booking.service ?? null,
    // Plan-only quotes (community common-area, seasonal) carry no one-time.
    oneTimeCents: snap.planOnly ? null : (snap.baseCents ?? null),
    plan: snap.recurringOffer ?? null,
    planOnly: Boolean(snap.planOnly),
    offSeason: Boolean(snap.offSeason),
    offSeasonMessage: snap.offSeason ? (offSeasonMessage ?? null) : null,
  });
}
