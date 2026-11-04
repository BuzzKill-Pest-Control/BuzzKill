// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  activateNavigationOwner, clearNavigationMemory, parseCustomersView, parseLeadsView,
  parseScheduleDate, readNavigationValue, writeNavigationValue,
} from "./navigationMemory";

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("view state boundaries", () => {
  it("validates stored filters and real calendar days", () => {
    expect(parseCustomersView({ tab: "INACTIVE", query: "Oak Street" })).toEqual({ tab: "INACTIVE", query: "Oak Street" });
    expect(parseCustomersView({ tab: "LEAD", query: "" })).toBeNull();
    expect(parseCustomersView({ tab: { toString: 1 }, query: "" })).toBeNull();
    expect(parseCustomersView({ tab: "ACTIVE", query: 123 })).toBeNull();
    expect(parseLeadsView({ mineOnly: true, stageFilter: "ATTEMPTED" })).toEqual({ mineOnly: true, stageFilter: "ATTEMPTED" });
    expect(parseLeadsView({ mineOnly: "true", stageFilter: "ALL" })).toBeNull();
    expect(parseLeadsView({ mineOnly: false, stageFilter: "WON" })).toBeNull();
    expect(parseScheduleDate("2028-02-29")).toBe("2028-02-29");
    expect(parseScheduleDate("2026-02-29")).toBeNull();
    expect(parseScheduleDate("2026-02-30")).toBeNull();
    expect(parseScheduleDate("2026-13-01")).toBeNull();
    expect(parseScheduleDate("2026-1-1")).toBeNull();
    expect(parseScheduleDate("not-a-date")).toBeNull();
  });

  it("purges previous accounts and refuses late writes after sign-out", () => {
    sessionStorage.setItem("unrelated", "keep");
    activateNavigationOwner("alice");
    writeNavigationValue("alice", "customers", { tab: "ACTIVE", query: "private@example.com" });
    activateNavigationOwner("bob");
    expect(readNavigationValue("alice", "customers", parseCustomersView)).toBeNull();
    writeNavigationValue("alice", "customers", { tab: "ACTIVE", query: "late" });
    expect(JSON.stringify(sessionStorage)).not.toContain("private@example.com");
    expect(JSON.stringify(sessionStorage)).not.toContain('"query":"late"');
    clearNavigationMemory();
    writeNavigationValue("bob", "customers", { tab: "ACTIVE", query: "after sign-out" });
    expect(sessionStorage.length).toBe(1);
    expect(sessionStorage.getItem("unrelated")).toBe("keep");
  });

  it("ignores malformed saved values", () => {
    activateNavigationOwner("alice");
    writeNavigationValue("alice", "customers", { tab: "not-real", query: "x" });
    expect(readNavigationValue("alice", "customers", parseCustomersView)).toBeNull();
    sessionStorage.setItem("bk-view-v1:alice:customers", "{broken");
    expect(readNavigationValue("alice", "customers", parseCustomersView)).toBeNull();
  });

  it("bounds saved visits while keeping each recent view and scroll together", () => {
    activateNavigationOwner("alice");
    for (let i = 0; i < 60; i++) {
      writeNavigationValue("alice", `customers:entry:${i}`, { tab: "ACTIVE", query: `Visit ${i}` });
      writeNavigationValue("alice", `customers:scroll:${i}`, { context: "active", top: i });
    }
    expect(readNavigationValue("alice", "customers:entry:0", parseCustomersView)).toBeNull();
    expect(sessionStorage.getItem("bk-view-v1:alice:customers:scroll:0")).toBeNull();
    expect(readNavigationValue("alice", "customers:entry:59", parseCustomersView)?.query).toBe("Visit 59");
    expect(sessionStorage.length).toBeLessThanOrEqual(82);
  });

  it("allows navigation and sign-out when the sessionStorage getter is blocked", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => { throw new DOMException("Blocked", "SecurityError"); });
    expect(() => activateNavigationOwner("alice")).not.toThrow();
    expect(() => writeNavigationValue("alice", "customers", { tab: "ACTIVE", query: "x" })).not.toThrow();
    expect(readNavigationValue("alice", "customers", parseCustomersView)).toBeNull();
    expect(() => clearNavigationMemory()).not.toThrow();
  });
});
