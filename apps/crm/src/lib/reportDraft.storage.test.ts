// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearAllDrafts, clearDraft, loadDraft, saveDraft } from "./reportDraft";

beforeEach(() => {
  vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
    throw new DOMException("Storage access denied", "SecurityError");
  });
});

afterEach(() => vi.restoreAllMocks());

it("reports an unsaved draft when browser storage access is denied", () => {
  expect(saveDraft("job-test", { note: "Draft" }, undefined, "tech-test")).toBe(false);
});

it("keeps the report usable without a local draft when storage access is denied", () => {
  expect(loadDraft("job-test", undefined, "tech-test")).toBeNull();
});

it("allows report completion when draft cleanup cannot access storage", () => {
  expect(() => clearDraft("job-test", undefined, "tech-test")).not.toThrow();
});

it("allows sign-out to continue when clearing drafts cannot access storage", () => {
  expect(() => clearAllDrafts()).not.toThrow();
});
