import { describe, expect, it } from "vitest";
import { customerMatchesSearch, isSearchReturn, searchQueryFromHistory, withSearchQuery } from "./customerSearch";

const customer = {
  displayName: "José Rivera", contactName: "Dana Smith", email: "dana.rivera@example.com",
  phone: "+1 (508) 258-9294", serviceStreet: "420 Lakeside Ave", serviceUnit: "104",
  serviceCity: "Marlborough", serviceState: "MA", serviceZip: "01752",
};

describe("customer contact and service-address search", () => {
  it.each([
    "jose", "DANA SMITH", "DANA.RIVERA@EXAMPLE.COM", "420 Lakeside", "Unit 104",
    "Lakeside Marlborough", "MA 01752", "104 420", "5082589294", "1-508-258-9294", "9294",
  ])("matches %s across available contact and address facts", (query) => {
    expect(customerMatchesSearch(customer, query)).toBe(true);
  });

  it("matches a country-prefixed query to a stored national number", () => {
    expect(customerMatchesSearch({ phone: "5082589294" }, "+1 (508) 258-9294")).toBe(true);
  });

  it.each(["someone else", "Dana 617", "unknown@example.com", "---", "+", "5558880000"])(
    "does not turn %s into an empty-digit or partial-word match", (query) => {
      expect(customerMatchesSearch(customer, query)).toBe(false);
    }
  );

  it("handles missing contact fields while preserving ordinary blank tab filtering", () => {
    expect(customerMatchesSearch({ displayName: "No contact" }, "508")).toBe(false);
    expect(customerMatchesSearch({ displayName: "No contact" }, "no contact")).toBe(true);
    expect(customerMatchesSearch(customer, "  ")).toBe(true);
  });
});

describe("private, user-scoped search history", () => {
  it("retains a lookup only for the same signed-in user", () => {
    const state = withSearchQuery({ previous: "kept" }, "owner-1", "5082589294");
    expect(searchQueryFromHistory(state, "owner-1")).toBe("5082589294");
    expect(searchQueryFromHistory(state, "owner-2")).toBe("");
    expect(searchQueryFromHistory(state, "")).toBe("");
    expect(state).toMatchObject({ previous: "kept" });
  });

  it.each([null, "old state", {}, { customerSearch: { ownerSub: "owner-1", query: 1 } }])(
    "ignores malformed history %o", (state) => {
      expect(searchQueryFromHistory(state, "owner-1")).toBe("");
    }
  );

  it("honors a record's search return only for its signed-in user", () => {
    const state = { customerSearchReturn: { ownerSub: "owner-1" } };
    expect(isSearchReturn(state, "owner-1")).toBe(true);
    expect(isSearchReturn(state, "owner-2")).toBe(false);
    expect(isSearchReturn(state, "")).toBe(false);
    expect(isSearchReturn(null, "owner-1")).toBe(false);
  });
});
