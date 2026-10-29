// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkQueue from "./Work";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  list: vi.fn(),
  office: true,
  item: {
    id: "recovery-1", kind: "LEAD_LIFECYCLE_RECOVERY", status: "OPEN",
    customerId: "lead-1", relatedId: "office-job:job-1",
    title: "Saved job needs lead cleanup", detail: "Job already exists.",
    dueAt: "2026-10-06T15:00:00Z", ownerTeam: "SALES", ownerSub: null,
  },
}));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../lib/auth", () => ({ useRoles: () => ({ office: mocks.office, finance: false, owner: false }) }));
vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();
  return {
    ...actual,
    updateOwnedWork: mocks.update,
    listWorkItems: mocks.list,
    listWorkEvents: async () => ({ data: [], nextToken: null }),
    api: () => ({ models: { BookingRequest: { list: async () => ({ data: [], nextToken: null }) } } }),
  };
});
let container: HTMLDivElement;
let root: Root;
const retryButton = () => Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Finish lead cleanup");
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.office = true;
  mocks.list.mockReset().mockResolvedValue({ data: [mocks.item], nextToken: null });
  mocks.update.mockReset().mockResolvedValue({ data: JSON.stringify({ workItemId: "recovery-1", status: "RESOLVED" }) });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
describe("saved office job lead recovery", () => {
  it("retries the existing recovery item and refreshes after confirmed closure", async () => {
    await act(async () => root.render(createElement(WorkQueue)));
    await act(async () => retryButton()!.click());
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ workItemId: "recovery-1", action: "RETRY_OFFICE_JOB_LEAD" });
    expect(mocks.list).toHaveBeenCalledTimes(2);
  });
  it.each([
    { workItemId: "recovery-1", status: "OPEN", warning: "Lead cleanup still needs attention." },
    { workItemId: "recovery-1", status: "OPEN" },
    { refused: "This recovery item does not match the saved job." },
  ])("keeps incomplete or refused cleanup visible: %o", async (response) => {
    mocks.update.mockResolvedValue({ data: JSON.stringify(response) });
    await act(async () => root.render(createElement(WorkQueue)));
    await act(async () => retryButton()!.click());
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(retryButton()).toBeDefined();
  });
  it("does not offer job cleanup for unrelated lead recovery", async () => {
    mocks.list.mockResolvedValue({ data: [{ ...mocks.item, relatedId: "other-action" }], nextToken: null });
    await act(async () => root.render(createElement(WorkQueue)));
    expect(retryButton()).toBeUndefined();
  });
  it("does not offer the action without office access", async () => {
    mocks.office = false;
    await act(async () => root.render(createElement(WorkQueue)));
    expect(retryButton()).toBeUndefined();
  });
});
