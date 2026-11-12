import { describe, expect, it } from "vitest";
import { customerMatchesSearch } from "./customerSearch";

const customer = {
  displayName: "José Rivera",
  contactName: "Dana Smith",
  email: "dana.rivera@example.com",
  phone: "+1 (508) 258-9294",
  serviceStreet: "420 Lakeside Ave",
  serviceUnit: "104",
  serviceCity: "Marlborough",
  serviceState: "MA",
  serviceZip: "01752",
};

describe("customer contact and service-address search", () => {
  it.each([
    "jose",
    "DANA SMITH",
    "DANA.RIVERA@EXAMPLE.COM",
    "420 Lakeside",
    "Unit 104",
    "Lakeside Marlborough",
    "MA 01752",
    "104 420",
    "5082589294",
    "1-508-258-9294",
    "9294",
    "５０８２５８９２９４",
  ])("matches %s across available contact and address facts", (query) => {
    expect(customerMatchesSearch(customer, query)).toBe(true);
  });

  it("matches a country-prefixed query to a stored national number", () => {
    expect(
      customerMatchesSearch({ phone: "5082589294" }, "+1 (508) 258-9294"),
    ).toBe(true);
  });

  it.each([
    "someone else",
    "Dana 617",
    "unknown@example.com",
    "---",
    "+",
    "5558880000",
  ])("does not turn %s into an empty-digit or partial-word match", (query) => {
    expect(customerMatchesSearch(customer, query)).toBe(false);
  });

  it("handles missing contact fields while preserving ordinary blank tab filtering", () => {
    expect(customerMatchesSearch({ displayName: "No contact" }, "508")).toBe(
      false,
    );
    expect(
      customerMatchesSearch({ displayName: "No contact" }, "no contact"),
    ).toBe(true);
    expect(customerMatchesSearch(customer, "  ")).toBe(true);
  });
});
