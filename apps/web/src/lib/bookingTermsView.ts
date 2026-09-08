/**
 * Which of the server-supplied terms the checkout shows, and what a change of
 * payment method does to the acceptance checkbox. Pure, so the rules the
 * page relies on are tested without React.
 */
import type { BookingTerms } from "./bookingApi";

export type PaymentMode = "CARD" | "INVOICE";

/**
 * The exact terms for the current offer and payment method. Invoice terms are
 * only available when the server included them (an invoice-eligible quote);
 * a request for INVOICE on a quote without them falls back to the card text
 * only because the server will refuse the invoice booking itself.
 */
export function termsTextFor(
  terms: BookingTerms,
  selection: { recurring: boolean; payMode: PaymentMode },
): string {
  if (selection.payMode === "INVOICE") {
    if (selection.recurring && terms.invoiceRecurringText) return terms.invoiceRecurringText;
    if (terms.invoiceText) return terms.invoiceText;
  }
  if (selection.recurring && terms.recurringText) return terms.recurringText;
  return terms.text;
}

/**
 * Whether acceptance survives a change of payment method: it never does. The
 * customer must re-read and re-accept the terms for the method they now hold.
 */
export function acceptanceAfterPaymentModeChange(previous: PaymentMode, next: PaymentMode): boolean {
  void previous;
  void next;
  return false;
}
