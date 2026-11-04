// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WorkQueue from "./Work";
import { queryCache } from "../lib/queryCache";

const mocks = vi.hoisted(() => ({ work: vi.fn(), events: vi.fn(), bookings: vi.fn(), update: vi.fn(), scan: vi.fn(), write: vi.fn() }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("../lib/auth", () => ({ useRoles: () => ({ owner: true, office: true, finance: true, sub: "owner" }) }));
vi.mock("../lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/api")>(),
  updateOwnedWork: mocks.update,
  api: () => ({ mutations: {
    resendEmailLog: mocks.write, rebookJob: mocks.write, retryBookingFinalization: mocks.write,
    resumePlanCancellation: mocks.write, resumeVisitChange: mocks.write,
  }, models: {
    WorkItem: { list: mocks.scan, listWorkItemByStatusAndDueAt: mocks.work },
    WorkEvent: { list: mocks.scan, listWorkEventByWorkItemIdAndOccurredAt: mocks.events },
    BookingRequest: { listBookingRequestByStatus: mocks.bookings },
  } }),
}));

const item = (id: string, overrides: Record<string, unknown> = {}) => ({
  id, kind: "LEAD_LIFECYCLE_RECOVERY", status: "OPEN", title: `Case ${id}`, detail: "Retained detail",
  relatedId: "other-action", dueAt: "2026-10-06T15:00:00Z", ownerTeam: "SALES", ownerEmail: "office@example.test",
  ownerSub: null, resolutionAction: "Review the source", updatedAt: "2026-10-06T15:00:00Z", ...overrides,
});
const event = (id: string, note = `History ${id}`) => ({
  id, workItemId: "one", occurredAt: `2026-10-06T15:0${id === "first" ? "0" : "1"}:00Z`,
  eventType: "CLAIMED", actorEmail: "office@example.test", note,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
let container: HTMLDivElement, root: Root;
const button = (label: string) => [...container.querySelectorAll("button")].find((node) => node.textContent === label)!;
async function click(label: string) { await act(async () => button(label).click()); }
async function history(open: boolean) {
  await act(async () => {
    const details = container.querySelector("details")!;
    details.open = open;
    details.dispatchEvent(new Event("toggle"));
  });
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.work.mockReset().mockResolvedValue({ data: [item("one")], nextToken: null });
  mocks.events.mockReset().mockResolvedValue({ data: [], nextToken: null });
  mocks.bookings.mockReset().mockResolvedValue({ data: [], nextToken: null });
  mocks.update.mockReset().mockResolvedValue({ data: JSON.stringify({ workItemId: "one" }) });
  mocks.scan.mockReset().mockRejectedValue(new Error("A table scan is forbidden"));
  mocks.write.mockReset();
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); queryCache.activate(null); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function render() { await act(async () => root.render(createElement(WorkQueue))); }

describe("bounded owned work reads", () => {
  it.each([
    ["EMAIL_FAILURE", "el-one", "Resend exact message"],
    ["NO_ACCESS", "job-one", "Rebook visit"],
    ["PAID_NOT_FINALIZED", "booking-one", "Retry finalization"],
    ["PLAN_CANCELLATION_RECOVERY", "plan-one", "Resume cancellation"],
    ["VISIT_CHANGE_RECOVERY", "job-one", "Resume visit change"],
  ])("invalidates cached operational lists only after the %s action returns", async (kind, relatedId, label) => {
    queryCache.activate("owner", ["OWNER"]);
    await queryCache.request(["schedule"], async () => "pre-action server rows").promise;
    const pending = deferred<{ data: string }>(); mocks.write.mockReturnValue(pending.promise);
    mocks.work.mockResolvedValue({ data: [item("one", { kind, relatedId })], nextToken: null });
    vi.spyOn(window, "confirm").mockReturnValue(true);
    await render(); await click(label);
    expect(mocks.write).toHaveBeenCalledTimes(1);
    expect(queryCache.read(["schedule"])?.data).toBe("pre-action server rows");
    expect(mocks.work).toHaveBeenCalledTimes(1);
    await act(async () => pending.resolve({ data: JSON.stringify({ resent: true, jobId: "new-job", status: "COMPLETED", outcome: "COMPLETED" }) }));
    expect(queryCache.read(["schedule"])).toBeNull();
    expect(mocks.work).toHaveBeenCalledTimes(2);
  });

  it("renders the first deadline-ordered open page without loading the archive or any history", async () => {
    mocks.work.mockResolvedValue({ data: [item("one")], nextToken: "open-2" });
    await render();
    expect(container.textContent).toContain("Case one");
    expect(container.textContent).toContain("Open (1+)");
    expect(container.textContent).toContain("1 open case shown · more available");
    expect(mocks.work).toHaveBeenCalledExactlyOnceWith({ status: "OPEN" }, { limit: 50, nextToken: undefined, sortDirection: "ASC" });
    expect(mocks.events).not.toHaveBeenCalled(); expect(mocks.scan).not.toHaveBeenCalled();
  });

  it("keeps continuation through empty pages, deduplicates cases and never labels an incomplete queue empty", async () => {
    mocks.work.mockResolvedValueOnce({ data: [], nextToken: "open-2" })
      .mockResolvedValueOnce({ data: [item("one")], nextToken: "open-3" })
      .mockResolvedValueOnce({ data: [item("one"), item("two")], nextToken: null });
    await render();
    expect(container.textContent).not.toContain("No exception work is open");
    await click("Load more open cases");
    expect(container.textContent).toContain("Case one");
    await click("Load more open cases");
    expect(container.textContent).toContain("2 open cases shown.");
    expect(container.textContent?.match(/Case one/g)).toHaveLength(1);
    expect(button("Load more open cases")).toBeUndefined();
    expect(mocks.work.mock.calls.map((call) => call[1].nextToken)).toEqual([undefined, "open-2", "open-3"]);
  });

  it("retains loaded cases and the cursor on a failed page so explicit retry cannot silently truncate work", async () => {
    mocks.work.mockResolvedValueOnce({ data: [item("one")], nextToken: "open-2" })
      .mockResolvedValueOnce({ data: [item("partial")], errors: [{ message: "Queue page unavailable" }], nextToken: null })
      .mockResolvedValueOnce({ data: [item("two")], nextToken: null });
    await render(); await click("Load more open cases");
    expect(container.textContent).toContain("Case one"); expect(container.textContent).not.toContain("Case partial");
    expect(container.textContent).toContain("Queue page unavailable");
    await click("Load more open cases");
    expect(container.textContent).toContain("Case two");
    expect(mocks.work.mock.calls[2][1].nextToken).toBe("open-2");
  });

  it("loads resolved metadata only on access, preserves global resolution order and exact override filtering beyond the rendered page", async () => {
    const archive = Array.from({ length: 52 }, (_, index) => item(`archive-${index}`, {
      status: "RESOLVED", resolvedAt: `2026-10-${String(index % 28 + 1).padStart(2, "0")}T12:00:00Z`,
      resolvedManualOverride: index === 51,
    }));
    const recent = item("recent-old-deadline", { status: "RESOLVED", dueAt: "2020-01-01T00:00:00Z", resolvedAt: "2026-11-01T12:00:00Z" });
    mocks.work.mockImplementation(async ({ status }: { status: string }, { nextToken }: { nextToken?: string }) => status === "OPEN"
      ? { data: [item("one")], nextToken: null }
      : nextToken ? { data: [recent, ...archive.slice(30)], nextToken: null } : { data: archive.slice(0, 30), nextToken: "archive-2" });
    await render(); expect(mocks.work).toHaveBeenCalledTimes(1);
    await click("Resolved history");
    expect(mocks.work).toHaveBeenCalledTimes(3); expect(mocks.events).not.toHaveBeenCalled();
    expect(container.textContent).toContain("50 of 53 resolved cases shown");
    expect(container.querySelector("section.card")?.textContent).toContain("Case recent-old-deadline");
    expect(container.textContent).toContain("Manager overrides only (1)");
    await click("Load more resolved cases"); expect(container.textContent).toContain("53 of 53 resolved cases shown");
    await act(async () => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    expect(container.textContent).toContain("1 of 1 resolved case shown");
    expect(container.textContent).toContain("Case archive-51");
    expect(mocks.work).toHaveBeenCalledTimes(3);
  });

  it("loads complete indexed history on expansion, caches collapse/reopen, and refreshes visible history after a confirmed action", async () => {
    mocks.events.mockImplementation(async (_keys: unknown, { nextToken }: { nextToken?: string }) => nextToken
      ? { data: [event("first")], nextToken: null } : { data: [], nextToken: "history-2" });
    await render(); await history(true);
    expect(mocks.events).toHaveBeenCalledTimes(2);
    expect(mocks.events).toHaveBeenCalledWith({ workItemId: "one" }, { limit: 100, nextToken: undefined, sortDirection: "ASC" });
    expect(container.textContent).toContain("Permanent history (1)"); expect(container.textContent).toContain("History first");
    await history(false); await history(true); expect(mocks.events).toHaveBeenCalledTimes(2);
    mocks.events.mockResolvedValue({ data: [event("first"), event("second", "New claim recorded")], nextToken: null });
    mocks.work.mockResolvedValue({ data: [item("one", { ownerSub: "owner" })], nextToken: null });
    await click("Assign to me");
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ workItemId: "one", action: "CLAIM" });
    expect(mocks.work).toHaveBeenCalledTimes(2); expect(mocks.events).toHaveBeenCalledTimes(3);
    expect(container.textContent).toContain("New claim recorded"); expect(container.textContent).toContain("Permanent history (2)");
  });

  it("preserves explicitly loaded queue depth when a page-two case is claimed", async () => {
    let claimed = false;
    mocks.work.mockImplementation(async (_keys: unknown, { nextToken }: { nextToken?: string }) => nextToken
      ? { data: [item("page-two", { ownerSub: claimed ? "owner" : null })], nextToken: null }
      : { data: [item("first", { ownerSub: "owner" })], nextToken: "open-2" });
    mocks.update.mockImplementation(async () => {
      claimed = true;
      return { data: JSON.stringify({ workItemId: "page-two" }) };
    });
    await render(); await click("Load more open cases"); await click("Assign to me");
    expect(mocks.update).toHaveBeenCalledExactlyOnceWith({ workItemId: "page-two", action: "CLAIM" });
    expect(mocks.work).toHaveBeenCalledTimes(4);
    const card = [...container.querySelectorAll("section.card")].find((node) => node.textContent?.includes("Case page-two"));
    expect(card?.textContent).toContain("Owner: you");
    expect(container.textContent).toContain("2 open cases shown.");
    expect(mocks.events).not.toHaveBeenCalled();
  });

  it("keeps payments and tabs usable while an archive is pending, including a switch back before it finishes", async () => {
    const archive = deferred<{ data: ReturnType<typeof item>[]; nextToken: null }>();
    mocks.work.mockImplementation(async ({ status }: { status: string }) => status === "OPEN"
      ? { data: [item("one")], nextToken: null } : archive.promise);
    mocks.bookings.mockImplementation(async ({ status }: { status: string }) => ({
      data: status === "PROCESSING" ? [{ id: "payment", name: "Independent payment", status }] : [], nextToken: null,
    }));
    await render(); await click("Resolved history");
    expect(container.textContent).toContain("Independent payment"); expect(button("Open")).toBeDefined();
    expect(container.querySelector('[aria-label="Refresh owned work"]')).not.toBeNull();
    await click("Open"); expect(container.textContent).toContain("Case one");
    await act(async () => archive.resolve({ data: [item("late-archive", { status: "RESOLVED" })], nextToken: null }));
    expect(container.textContent).toContain("Case one"); expect(container.textContent).not.toContain("Case late-archive");
  });

  it("shows a history failure instead of an empty ledger and retries only that case", async () => {
    mocks.events.mockResolvedValueOnce({ data: [], errors: [{ message: "History unavailable" }] })
      .mockResolvedValueOnce({ data: [event("first")], nextToken: null });
    await render(); await history(true);
    expect(container.textContent).toContain("History unavailable"); expect(container.textContent).not.toContain("No history recorded");
    await click("Retry history"); expect(container.textContent).toContain("History first"); expect(mocks.work).toHaveBeenCalledTimes(1);
  });

  it("resets history loading on close and ignores a superseded response after rapid reopen", async () => {
    const old = deferred<{ data: ReturnType<typeof event>[]; nextToken: null }>();
    mocks.events.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ data: [event("second", "Current history")], nextToken: null });
    await render(); await history(true);
    expect(container.textContent).toContain("Loading case history…");
    await history(false); expect(container.textContent).not.toContain("Loading case history…");
    await history(true); expect(container.textContent).toContain("Current history");
    await act(async () => old.resolve({ data: [event("first", "Superseded history")], nextToken: null }));
    expect(container.textContent).toContain("Current history"); expect(container.textContent).not.toContain("Superseded history");
    expect(container.textContent).not.toContain("Loading case history…");
  });

  it("does not claim an empty queue when its first indexed page fails", async () => {
    mocks.work.mockResolvedValue({ data: [], errors: [{ message: "Queue unavailable" }] });
    await render(); expect(container.textContent).toContain("Queue unavailable");
    expect(container.textContent).not.toContain("No exception work is open");
    expect(container.querySelector('[aria-label="Refresh owned work"]')).not.toBeNull();
  });

  it("discards an in-flight open continuation after switching to resolved history", async () => {
    const continuation = deferred<{ data: ReturnType<typeof item>[]; nextToken: null }>();
    mocks.work.mockResolvedValueOnce({ data: [item("one")], nextToken: "open-2" })
      .mockReturnValueOnce(continuation.promise)
      .mockResolvedValueOnce({ data: [item("closed", { status: "RESOLVED", resolvedAt: "2026-10-07T12:00:00Z" })], nextToken: null });
    await render(); await click("Load more open cases"); await click("Resolved history");
    await act(async () => continuation.resolve({ data: [item("late-open")], nextToken: null }));
    expect(container.textContent).toContain("Case closed"); expect(container.textContent).not.toContain("Case late-open");
  });
});
