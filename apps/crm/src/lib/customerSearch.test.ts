import { describe, expect, it } from "vitest";
import { isSearchReturn, searchQueryFromHistory, withSearchQuery } from "./customerSearch";

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
