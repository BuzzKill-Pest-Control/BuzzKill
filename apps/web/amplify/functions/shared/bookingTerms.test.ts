import { describe, expect, it } from "vitest";
import {
  BOOKING_TERMS_VERSION,
  CANCEL_FULL_REFUND_DAYS,
  INVOICE_NET_TERMS,
  INVOICE_NET_TERMS_LABEL,
  OFF_SEASON_MESSAGE,
  VISIT_CANCELLATION_SENTENCE,
  bookingTermsFor,
  bookingTermsKindFor,
  bookingTermsPayload,
} from "./bookingTerms";
import { COMPANY } from "./company";

/**
 * The checkout terms are built per offer and per payment method: a customer
 * paying by card reads only card terms, a customer choosing to be invoiced
 * reads only invoice terms. These tests pin every sentence the business
 * relies on.
 */
const CARD_SENTENCE = /charges your card/;
const INVOICE_SENTENCE = /invoices you .* payable on Net 30 terms/;

describe("BOOKING_TERMS_VERSION", () => {
  it("was bumped for payment-method terms", () => {
    expect(BOOKING_TERMS_VERSION).toBe("2026-09-08.1");
    expect(BOOKING_TERMS_VERSION > "2026-09-08").toBe(true);
    expect(INVOICE_NET_TERMS).toBe("NET_30");
    expect(INVOICE_NET_TERMS_LABEL).toBe("Net 30");
  });
});

describe("bookingTermsKindFor", () => {
  it("chooses the off-season enrollment over everything else", () => {
    expect(bookingTermsKindFor({ recurring: true, offSeason: true })).toBe("RECURRING_OFF_SEASON");
    expect(bookingTermsKindFor({ recurring: false, offSeason: true })).toBe("RECURRING_OFF_SEASON");
    expect(bookingTermsKindFor({ recurring: true, offSeason: false })).toBe("RECURRING");
    expect(bookingTermsKindFor({ recurring: false, offSeason: false })).toBe("ONE_TIME");
  });
});

const ALL = [
  { label: "one-time card", input: { recurring: false, offSeason: false, paymentMethod: "CARD" as const } },
  { label: "one-time invoice", input: { recurring: false, offSeason: false, paymentMethod: "INVOICE" as const } },
  { label: "recurring card", input: { recurring: true, offSeason: false, paymentMethod: "CARD" as const } },
  { label: "recurring invoice", input: { recurring: true, offSeason: false, paymentMethod: "INVOICE" as const } },
  { label: "off-season card", input: { recurring: true, offSeason: true, paymentMethod: "CARD" as const } },
  { label: "off-season invoice", input: { recurring: true, offSeason: true, paymentMethod: "INVOICE" as const } },
];

describe("card terms", () => {
  for (const { label, input } of ALL.filter((a) => a.input.paymentMethod === "CARD")) {
    it(`${label}: describe only a card payment`, () => {
      const text = bookingTermsFor(input);
      expect(text).toMatch(CARD_SENTENCE);
      expect(text).not.toMatch(/invoice/i);
      expect(text).toContain(COMPANY.legalName);
    });
  }
});

describe("invoice terms", () => {
  for (const { label, input } of ALL.filter((a) => a.input.paymentMethod === "INVOICE")) {
    it(`${label}: describe only an invoice, payable on Net 30 terms`, () => {
      const text = bookingTermsFor(input);
      expect(text).toMatch(INVOICE_SENTENCE);
      expect(text).not.toMatch(/card/i);
      expect(text).toContain(COMPANY.legalName);
    });
  }
  it("state the initial amount is invoiced when the booking or enrollment is made", () => {
    expect(bookingTermsFor(ALL[1].input)).toContain("invoices you the amount shown when the booking is made");
    expect(bookingTermsFor(ALL[3].input)).toContain("invoices you the amount shown when the booking is made. The invoice is payable on Net 30 terms. That amount is the plan's initial fee");
    expect(bookingTermsFor(ALL[5].input)).toContain("invoices you your first monthly payment when the enrollment is made");
  });
});

describe("ordinary recurring-plan terms (either method)", () => {
  for (const method of ["CARD", "INVOICE"] as const) {
    const text = bookingTermsFor({ recurring: true, offSeason: false, paymentMethod: method });
    it(`${method}: initial fee, billing after the first completed visit, cancel any time, refund rule`, () => {
      expect(text).toContain("That amount is the plan's initial fee");
      expect(text).toContain("Monthly billing for the plan begins after your first completed visit.");
      expect(text).toContain("You may cancel the plan at any time.");
      expect(text).toContain(VISIT_CANCELLATION_SENTENCE);
      expect(text).not.toMatch(/12[- ]month|twelve[- ]month|initial (term|period)|minimum term/i);
    });
  }
});

describe("off-season seasonal-plan terms (either method)", () => {
  for (const method of ["CARD", "INVOICE"] as const) {
    const text = bookingTermsFor({ recurring: true, offSeason: true, paymentMethod: method });
    it(`${method}: immediate year-round billing, April to October, April confirmation, cancel any time`, () => {
      expect(text).toContain("Monthly billing starts immediately and continues year-round.");
      expect(text).toContain("Treatments occur once per month from April through October");
      expect(text).toContain("confirm your first April treatment date");
      expect(text).toContain("You may cancel the plan at any time.");
      expect(text).toContain(VISIT_CANCELLATION_SENTENCE);
      expect(text).not.toMatch(/after your first completed visit|begins after|starts after/i);
    });
  }
  it("charges the first monthly payment at enrollment on card, invoices it on invoice", () => {
    expect(bookingTermsFor({ recurring: true, offSeason: true, paymentMethod: "CARD" })).toContain(
      `${COMPANY.legalName} charges your card your first monthly payment today, at enrollment.`,
    );
    expect(bookingTermsFor({ recurring: true, offSeason: true, paymentMethod: "INVOICE" })).toContain(
      `${COMPANY.legalName} invoices you your first monthly payment when the enrollment is made. The invoice is payable on Net 30 terms.`,
    );
  });
});

describe("one-time terms", () => {
  it("keep the refund rule and no plan language", () => {
    const text = bookingTermsFor({ recurring: false, offSeason: false, paymentMethod: "CARD" });
    expect(text).toContain(`more than ${CANCEL_FULL_REFUND_DAYS} whole days`);
    expect(text).not.toMatch(/monthly billing|cancel the plan/i);
  });
});

describe("bookingTermsPayload", () => {
  it("carries card variants always and invoice variants only for invoice-eligible quotes", () => {
    const residential = bookingTermsPayload({ offSeason: false, planOnly: false, invoiceEligible: false });
    expect(residential.version).toBe(BOOKING_TERMS_VERSION);
    expect(residential.text).toBe(bookingTermsFor({ recurring: false, offSeason: false, paymentMethod: "CARD" }));
    expect(residential.recurringText).toBe(bookingTermsFor({ recurring: true, offSeason: false, paymentMethod: "CARD" }));
    expect(residential.invoiceText).toBeUndefined();
    expect(residential.invoiceRecurringText).toBeUndefined();

    const commercial = bookingTermsPayload({ offSeason: false, planOnly: false, invoiceEligible: true });
    expect(commercial.invoiceText).toBe(bookingTermsFor({ recurring: false, offSeason: false, paymentMethod: "INVOICE" }));
    expect(commercial.invoiceRecurringText).toBe(bookingTermsFor({ recurring: true, offSeason: false, paymentMethod: "INVOICE" }));

    const community = bookingTermsPayload({ offSeason: true, planOnly: true, invoiceEligible: true });
    expect(community.text).toBe(bookingTermsFor({ recurring: true, offSeason: true, paymentMethod: "CARD" }));
    expect(community.recurringText).toBeUndefined();
    expect(community.invoiceText).toBe(bookingTermsFor({ recurring: true, offSeason: true, paymentMethod: "INVOICE" }));
    expect(community.invoiceRecurringText).toBeUndefined();
  });
  it("is deterministic, so a stored acceptance can be regenerated", () => {
    for (const { input } of ALL) expect(bookingTermsFor(input)).toBe(bookingTermsFor(input));
  });
});

describe("house style", () => {
  it("uses no dash in the middle of a sentence and no trademark symbol", () => {
    for (const { input } of ALL) {
      const text = bookingTermsFor(input);
      expect(text).not.toMatch(/[—–]| - /);
      expect(text).not.toMatch(/[™®]/);
    }
    expect(OFF_SEASON_MESSAGE).not.toMatch(/[—–]| - /);
  });
});
