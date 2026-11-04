// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkQueue from "./Work";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  list: vi.fn(),
  bookings: vi.fn(),
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
    api: () => ({ models: { BookingRequest: { listBookingRequestByStatus: mocks.bookings } } }),
  };
});
vi.mock("../lib/workQueueReads", () => ({
  WORK_PAGE_SIZE: 50,
  readWorkPage: async (...args: unknown[]) => {
    const page = await mocks.list(...args);
    return { items: page.data, nextToken: page.nextToken };
  },
  readResolvedWork: async () => [],
  readWorkHistory: async () => [],
  mergeWorkPages: (prior: unknown[], next: unknown[]) => [...prior, ...next],
}));
let container: HTMLDivElement;
let root: Root;
const retryButton = () => Array.from(container.querySelectorAll("button")).find((b) => b.textContent === "Finish lead cleanup");
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.office = true;
  mocks.list.mockReset().mockResolvedValue({ data: [mocks.item], nextToken: null });
  mocks.bookings.mockReset().mockResolvedValue({ data: [], nextToken: null });
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
  it("keeps core work visible when the optional payment read fails", async () => {
    mocks.bookings.mockRejectedValue(new Error("Payment data unavailable"));
    await act(async () => root.render(createElement(WorkQueue)));
    expect(container.textContent).toContain("Saved job needs lead cleanup");
    expect(retryButton()).toBeDefined();
    expect(container.textContent).toContain("Payments in flight: Payment data unavailable");
  });
  it("queries both status indexes through every page, dedupes transitions and preserves aging/order", async () => {
    const ago = (days: number) => new Date(Date.now() - days * 86400_000).toISOString();
    mocks.bookings.mockImplementation(async ({ status }: { status: string }, { nextToken }: { nextToken?: string }) => {
      if (status === "PROCESSING") return nextToken ? {
        data: [
          { id: "old-processing", status, name: "Old processing", updatedAt: ago(60), processingStartedAt: ago(60) },
          { id: "transition", status, name: "Outdated transition", updatedAt: ago(3) },
        ], nextToken: null,
      } : { data: [{ id: "processing", status, name: "Current processing", updatedAt: ago(1) }], nextToken: "processing-page-2" };
      return nextToken ? {
        data: [
          { id: "old-failure", status, name: "Old failure", updatedAt: ago(30) },
          { id: "transition", status, name: "Newest transition", updatedAt: ago(2) },
          { id: "unknown", status, name: "Unknown age" },
        ], nextToken: null,
      } : { data: [{ id: "recent", status, name: "Recent failure", updatedAt: ago(1) }], nextToken: "failure-page-2" };
    });
    await act(async () => root.render(createElement(WorkQueue)));
    for (const status of ["PROCESSING", "PAYMENT_FAILED"]) {
      expect(mocks.bookings).toHaveBeenCalledWith({ status }, { limit: 500, nextToken: undefined });
      expect(mocks.bookings).toHaveBeenCalledWith({ status }, { limit: 500, nextToken: status === "PROCESSING" ? "processing-page-2" : "failure-page-2" });
    }
    expect(mocks.bookings).toHaveBeenCalledTimes(4);
    const card = [...container.querySelectorAll("section.card")].find((node) => node.textContent?.includes("Payments in flight (5)"))!;
    expect(card).toBeDefined();
    const payments = [...card.querySelectorAll(".list-row")].map((node) => node.textContent);
    expect(payments[0]).toContain("Unknown age");
    expect(payments[1]).toContain("Old processing");
    expect(payments[2]).toContain("Newest transition");
    expect(card.textContent).toContain("Current processing"); expect(card.textContent).toContain("Recent failure");
    expect(card.textContent).not.toContain("Old failure"); expect(card.textContent).not.toContain("Outdated transition");
  });
  it("retains known payments and core work if one indexed page fails during refresh", async () => {
    mocks.bookings.mockImplementation(async ({ status }: { status: string }) => ({ data: status === "PROCESSING" ? [{ id: "known", status, name: "Known payment" }] : [], nextToken: null }));
    await act(async () => root.render(createElement(WorkQueue)));
    mocks.bookings.mockImplementation(async ({ status }: { status: string }) => status === "PAYMENT_FAILED" ? {
      data: [{ id: "partial", status, name: "Incomplete payment" }], errors: [{ message: "Payment page unavailable" }],
    } : { data: [], nextToken: null });
    await act(async () => container.querySelector<HTMLButtonElement>('[aria-label="Refresh owned work"]')!.click());
    expect(container.textContent).toContain("Known payment");
    expect(container.textContent).not.toContain("Incomplete payment");
    expect(container.textContent).toContain("Saved job needs lead cleanup");
    expect(container.textContent).toContain("Payments in flight: Payment page unavailable");
  });
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
