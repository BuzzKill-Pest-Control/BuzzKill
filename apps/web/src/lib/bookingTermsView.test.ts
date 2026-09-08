import { describe, expect, it } from "vitest";
import { bookingTermsFor, bookingTermsPayload } from "../../amplify/functions/shared/bookingTerms";
import { acceptanceAfterPaymentModeChange, termsTextFor } from "./bookingTermsView";

/**
 * The checkout shows exactly the server's text for the offer and payment
 * method on screen, and a change of payment method always clears acceptance.
 */
describe("termsTextFor", () => {
  const eligible = bookingTermsPayload({ offSeason: false, planOnly: false, invoiceEligible: true });
  const residential = bookingTermsPayload({ offSeason: false, planOnly: false, invoiceEligible: false });
  const offSeason = bookingTermsPayload({ offSeason: true, planOnly: true, invoiceEligible: true });

  it("matches what the backend derives for the same offer and method", () => {
    expect(termsTextFor(eligible, { recurring: false, payMode: "CARD" })).toBe(
      bookingTermsFor({ recurring: false, offSeason: false, paymentMethod: "CARD" }),
    );
    expect(termsTextFor(eligible, { recurring: true, payMode: "CARD" })).toBe(
      bookingTermsFor({ recurring: true, offSeason: false, paymentMethod: "CARD" }),
    );
    expect(termsTextFor(eligible, { recurring: false, payMode: "INVOICE" })).toBe(
      bookingTermsFor({ recurring: false, offSeason: false, paymentMethod: "INVOICE" }),
    );
    expect(termsTextFor(eligible, { recurring: true, payMode: "INVOICE" })).toBe(
      bookingTermsFor({ recurring: true, offSeason: false, paymentMethod: "INVOICE" }),
    );
    expect(termsTextFor(offSeason, { recurring: true, payMode: "INVOICE" })).toBe(
      bookingTermsFor({ recurring: true, offSeason: true, paymentMethod: "INVOICE" }),
    );
    expect(termsTextFor(offSeason, { recurring: true, payMode: "CARD" })).toBe(
      bookingTermsFor({ recurring: true, offSeason: true, paymentMethod: "CARD" }),
    );
  });

  it("changes with the payment mode", () => {
    const card = termsTextFor(eligible, { recurring: false, payMode: "CARD" });
    const invoice = termsTextFor(eligible, { recurring: false, payMode: "INVOICE" });
    expect(card).not.toBe(invoice);
    expect(card).toMatch(/charges your card/);
    expect(card).not.toMatch(/invoice/i);
    expect(invoice).toMatch(/invoices you/);
    expect(invoice).not.toMatch(/card/i);
  });

  it("never shows invoice text for a quote the server did not mark invoice-eligible", () => {
    expect(termsTextFor(residential, { recurring: false, payMode: "INVOICE" })).toBe(residential.text);
    expect(termsTextFor(residential, { recurring: true, payMode: "INVOICE" })).toBe(residential.recurringText);
  });
});

describe("acceptanceAfterPaymentModeChange", () => {
  it("clears acceptance in both directions", () => {
    expect(acceptanceAfterPaymentModeChange("CARD", "INVOICE")).toBe(false);
    expect(acceptanceAfterPaymentModeChange("INVOICE", "CARD")).toBe(false);
  });
});
