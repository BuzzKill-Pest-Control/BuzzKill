import { describe, expect, it } from "vitest";
import {
  isSearchReturn, searchQueryFromHistory, searchResumeFromHistory, withSearchQuery, withSearchResume,
} from "./customerSearch";

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

  it("keeps only a clicked id/page token and drops it when the lookup changes", () => {
    const state = withSearchResume(null, "owner-1", "Shared", { cursor: "page-2", customerId: "later" });
    expect(searchResumeFromHistory(state, "owner-1", "Shared")).toEqual({ cursor: "page-2", customerId: "later" });
    expect(searchResumeFromHistory(state, "owner-2", "Shared")).toBeNull();
    expect(searchResumeFromHistory(state, "owner-1", "Another query")).toBeNull();
    expect(searchResumeFromHistory(withSearchQuery(state, "owner-1", "Another query"), "owner-1", "Another query")).toBeNull();
    expect(Object.keys(state.customerSearch).sort()).toEqual(["ownerSub", "query", "resume"]);
  });

  it("ignores malformed or oversized saved page tokens", () => {
    const state = (resume: unknown) => ({ customerSearch: { ownerSub: "owner-1", query: "Shared", resume } });
    for (const resume of [{}, { cursor: "page-2", customerId: "" }, { cursor: 1, customerId: "later" },
      { cursor: "x".repeat(40_001), customerId: "later" }]) {
      expect(searchResumeFromHistory(state(resume), "owner-1", "Shared")).toBeNull();
    }
  });
});
