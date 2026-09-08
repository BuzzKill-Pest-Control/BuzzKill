/**
 * The booking-funnel checkout terms (R17), built for the offer AND the payment
 * method the customer is accepting.
 *
 * Both Lambdas that speak about cancellation, booking-public (the /cancel
 * refund decision and its copy) and the Stripe webhook (the agreement PDF and
 * confirmation email via bookingFinalize), derive their policy from
 * CANCEL_FULL_REFUND_DAYS here, so the promise a customer accepts is the rule
 * the code enforces.
 *
 * There is no single text: a one-time visit, an ordinary recurring plan, and
 * an off-season seasonal enrollment bill differently, and a customer paying
 * by card reads only card terms while a customer choosing to be invoiced
 * reads only invoice terms. `bookingTermsFor` is deterministic, so the text
 * stored on the booking at acceptance is regenerated server-side from the
 * booking's own facts and the payment method actually submitted, never from
 * text a client sends. Bump BOOKING_TERMS_VERSION whenever any wording
 * changes: /book rejects a stale version and the UI re-renders and re-asks.
 */
import { COMPANY } from "./company";

export const CANCEL_FULL_REFUND_DAYS = 3;

/** The net terms an invoiced booking is issued on, and their customer label. */
export const INVOICE_NET_TERMS = "NET_30";
export const INVOICE_NET_TERMS_LABEL = "Net 30";

/** 2026-09-08.1: terms are built for the payment method the customer
 *  selected (card or invoice), so invoice customers never accept card-charge
 *  language and card customers never read invoice language. */
export const BOOKING_TERMS_VERSION = "2026-09-08.1";

export type BookingTermsKind = "ONE_TIME" | "RECURRING" | "RECURRING_OFF_SEASON";
export type PaymentMethod = "CARD" | "INVOICE";

export type BookingTermsInput = {
  /** The customer is booking the recurring plan (or the quote is plan-only). */
  recurring: boolean;
  /** GL-17: a seasonal plan enrolled outside April to October. */
  offSeason: boolean;
  /** How the customer chose to pay. Eligibility for INVOICE is enforced
   *  separately by the server; this only selects the wording. */
  paymentMethod: PaymentMethod;
};

export function bookingTermsKindFor(input: Pick<BookingTermsInput, "recurring" | "offSeason">): BookingTermsKind {
  if (input.offSeason) return "RECURRING_OFF_SEASON";
  return input.recurring ? "RECURRING" : "ONE_TIME";
}

/** The visit refund rule, worded once for the terms and the Terms page. */
export const VISIT_CANCELLATION_SENTENCE = `Cancel more than ${CANCEL_FULL_REFUND_DAYS} whole days before your visit for a full refund. Cancellations ${CANCEL_FULL_REFUND_DAYS} days or less before the visit are not refundable.`;

const CANCEL_LINK_SENTENCE =
  "Your cancellation link arrives in the booking confirmation email.";

/** The payment sentence for a method: card (charged now) or invoice (issued now, Net 30). */
function paymentSentence(
  method: PaymentMethod,
  what: string,
  when: "when you book" | "at enrollment",
): string {
  if (method === "INVOICE") {
    const made = when === "at enrollment" ? "when the enrollment is made" : "when the booking is made";
    return `${COMPANY.legalName} invoices you ${what} ${made}. The invoice is payable on ${INVOICE_NET_TERMS_LABEL} terms.`;
  }
  return `${COMPANY.legalName} charges your card ${what} today, ${when}.`;
}

/**
 * The exact terms for an offer and payment method. Paragraphs are separated
 * by a blank line; the UI renders the string as-is.
 */
export function bookingTermsFor(input: BookingTermsInput): string {
  const kind = bookingTermsKindFor(input);
  const method = input.paymentMethod;
  switch (kind) {
    case "ONE_TIME":
      return [
        paymentSentence(method, "the amount shown", "when you book"),
        VISIT_CANCELLATION_SENTENCE,
        CANCEL_LINK_SENTENCE,
      ].join("\n\n");
    case "RECURRING":
      return [
        `${paymentSentence(method, "the amount shown", "when you book")} That amount is the plan's initial fee (for community common-area plans, your first month).`,
        "Monthly billing for the plan begins after your first completed visit. You may cancel the plan at any time.",
        `For the initial visit you are booking: ${VISIT_CANCELLATION_SENTENCE}`,
        CANCEL_LINK_SENTENCE,
      ].join("\n\n");
    case "RECURRING_OFF_SEASON":
      return [
        paymentSentence(method, "your first monthly payment", "at enrollment"),
        `Monthly billing starts immediately and continues year-round. Treatments occur once per month from April through October, and ${COMPANY.brandName} will contact you to confirm your first April treatment date. You may cancel the plan at any time.`,
        `Once a treatment is scheduled: ${VISIT_CANCELLATION_SENTENCE}`,
        "Your cancellation link arrives in the enrollment confirmation email.",
      ].join("\n\n");
  }
}

export type BookingTermsPayload = {
  version: string;
  /** Card terms for the quote's default offer (the plan when plan-only or
   *  off-season, otherwise the one-time visit). */
  text: string;
  /** Card terms for the recurring plan when a one-time quote also offers one. */
  recurringText?: string;
  /** Invoice terms, present only when the quote is invoice-eligible. */
  invoiceText?: string;
  invoiceRecurringText?: string;
};

/**
 * What a quote response carries so the checkout can show, and /book can hold
 * the customer to, exactly the terms for the offer and payment method they
 * end up selecting. Invoice variants ride along only when the server has
 * decided the property kind may be invoiced.
 */
export function bookingTermsPayload(opts: {
  offSeason: boolean;
  planOnly: boolean;
  invoiceEligible?: boolean;
}): BookingTermsPayload {
  const planDefault = opts.offSeason || opts.planOnly;
  const card = {
    oneTime: bookingTermsFor({ recurring: false, offSeason: opts.offSeason, paymentMethod: "CARD" }),
    recurring: bookingTermsFor({ recurring: true, offSeason: opts.offSeason, paymentMethod: "CARD" }),
  };
  const payload: BookingTermsPayload = {
    version: BOOKING_TERMS_VERSION,
    text: planDefault ? card.recurring : card.oneTime,
    ...(planDefault ? {} : { recurringText: card.recurring }),
  };
  if (opts.invoiceEligible) {
    const invoice = {
      oneTime: bookingTermsFor({ recurring: false, offSeason: opts.offSeason, paymentMethod: "INVOICE" }),
      recurring: bookingTermsFor({ recurring: true, offSeason: opts.offSeason, paymentMethod: "INVOICE" }),
    };
    payload.invoiceText = planDefault ? invoice.recurring : invoice.oneTime;
    if (!planDefault) payload.invoiceRecurringText = invoice.recurring;
  }
  return payload;
}

/**
 * GL-17: the one customer-facing explanation of an off-season seasonal
 * enrollment, truthful about immediate year-round billing and about April
 * being a month, not a promised exact day. Shared so the funnel response
 * (booking-public) and the emailed quote PDF (pricing-refresh) say it
 * identically.
 */
export const OFF_SEASON_MESSAGE =
  "Mosquito season runs April through October. Enroll now and your plan starts today, billed monthly year-round, and we'll schedule your first treatment for April and confirm the exact day with you.";
