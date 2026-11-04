// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Search from "./Search";
import { staffRoster } from "../lib/api";

const mocks = vi.hoisted(() => ({ search: vi.fn(), office: true, sub: "owner-1" }));
vi.mock("../lib/auth", () => ({ useRoles: () => ({ office: mocks.office, sub: mocks.sub }) }));
vi.mock("aws-amplify/data", () => ({ generateClient: () => ({ queries: { staffRoster: mocks.search } }) }));

const active = { id: "active", status: "ACTIVE", displayName: "Shared Active", serviceCity: "Boston", leadStage: null };
const inactive = {
  id: "inactive", status: "INACTIVE", displayName: "Shared Inactive", phone: "+1 (508) 258-9294",
  serviceStreet: "420 Lakeside Ave", serviceUnit: "104", serviceCity: "Marlborough",
  serviceState: "MA", serviceZip: "01752", leadStage: null,
};
const closed = {
  id: "closed", status: "LEAD", displayName: "Shared Closed Inquiry", email: "closed@example.com", leadStage: "LOST",
};
const response = (items: unknown[], nextToken: string | null = null) => ({ data: JSON.stringify({ items, nextToken }) });
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

let container: HTMLDivElement;
let root: Root;
let seenLocation: ReturnType<typeof useLocation>;
function LocationProbe() { seenLocation = useLocation(); return null; }
function Record() {
  const navigate = useNavigate();
  return createElement("div", null, `Record ${useParams().id}`,
    createElement("button", { onClick: () => navigate(-1) }, "Back to search"));
}
function application(state: unknown = null) {
  return createElement(MemoryRouter, { initialEntries: [{ pathname: "/search", state }] },
    createElement(LocationProbe),
    createElement(Routes, null,
      createElement(Route, { path: "/search", element: createElement(Search) }),
      createElement(Route, { path: "/customers/:id", element: createElement(Record) }),
    )
  );
}
async function typeQuery(value: string) {
  await act(async () => {
    const input = container.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function debounce() { await act(async () => { await vi.advanceTimersByTimeAsync(300); }); }
function rowLinks() { return Array.from(container.querySelectorAll<HTMLAnchorElement>("a.record-search-result")); }
function button(text: string) {
  const node = Array.from(container.querySelectorAll("button")).find((item) => item.textContent?.trim() === text);
  if (!node) throw new Error(`Missing ${text}`);
  return node;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.office = true;
  mocks.sub = "owner-1";
  mocks.search.mockReset().mockImplementation(async ({ query }) => response(
    query === "5082589294" ? [inactive] : query === "closed@example.com" ? [closed] : [active, closed, inactive]
  ));
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("bounded office directory search", () => {
  it("preserves the existing no-argument staff helper without customer lookup mode", async () => {
    await staffRoster();
    expect(mocks.search).toHaveBeenCalledExactlyOnceWith({});
  });

  it("debounces typing and renders lifecycle/status/contact matches from one bounded query", async () => {
    await act(async () => root.render(application()));
    await typeQuery("S");
    await typeQuery("Sha");
    await typeQuery("Shared");
    expect(mocks.search).not.toHaveBeenCalled();
    await debounce();
    expect(mocks.search).toHaveBeenCalledExactlyOnceWith({ lookup: "CUSTOMERS", query: "Shared", limit: 25, nextToken: undefined });
    expect(rowLinks().map((link) => link.getAttribute("href"))).toEqual([
      "/customers/active", "/customers/closed", "/customers/inactive",
    ]);
    expect(container.textContent).toContain("Lost");
    await typeQuery("5082589294");
    expect(rowLinks()).toHaveLength(0);
    await debounce();
    expect(rowLinks()).toHaveLength(1);
    expect(rowLinks()[0].textContent).toContain("420 Lakeside Ave, Unit 104, Marlborough, MA, 01752");
    expect(mocks.search).toHaveBeenCalledTimes(2);
  });

  it("does not claim no matches while an empty intermediate page has continuation", async () => {
    mocks.search.mockResolvedValueOnce(response([], "continue-1")).mockResolvedValueOnce(response([]));
    await act(async () => root.render(application()));
    await typeQuery("Someone");
    await debounce();
    expect(container.textContent).not.toContain("No matches");
    expect(container.textContent).toContain("More records remain to search");
    await act(async () => button("Search more records").click());
    expect(mocks.search).toHaveBeenLastCalledWith({ lookup: "CUSTOMERS", query: "Someone", limit: 25, nextToken: "continue-1" });
    expect(container.textContent).toContain("No matches");
  });

  it("ignores an old query completing after the new lookup", async () => {
    const old = deferred<ReturnType<typeof response>>();
    mocks.search.mockReturnValueOnce(old.promise).mockResolvedValueOnce(response([closed]));
    await act(async () => root.render(application()));
    await typeQuery("First");
    await debounce();
    await typeQuery("Second");
    await debounce();
    await act(async () => old.resolve(response([active], "old-token")));
    expect(rowLinks().map((link) => link.getAttribute("href"))).toEqual(["/customers/closed"]);
    expect(container.textContent).not.toContain("Load more");
  });

  it("ignores an old continuation when the query changes, including double taps", async () => {
    const more = deferred<ReturnType<typeof response>>();
    mocks.search.mockResolvedValueOnce(response([active], "page-2"))
      .mockReturnValueOnce(more.promise).mockResolvedValueOnce(response([closed]));
    await act(async () => root.render(application()));
    await typeQuery("First");
    await debounce();
    await act(async () => { button("Load more").click(); button("Load more").click(); });
    expect(mocks.search).toHaveBeenCalledTimes(2);
    await typeQuery("Second");
    await debounce();
    await act(async () => more.resolve(response([inactive], "old-token")));
    expect(rowLinks().map((link) => link.getAttribute("href"))).toEqual(["/customers/closed"]);
  });

  it("keeps loaded results and the continuation available after a page fails", async () => {
    mocks.search.mockResolvedValueOnce(response([active], "page-2"))
      .mockRejectedValueOnce(new Error("Directory temporarily unavailable"))
      .mockResolvedValueOnce(response([inactive]));
    await act(async () => root.render(application()));
    await typeQuery("Shared");
    await debounce();
    await act(async () => button("Load more").click());
    expect(rowLinks()).toHaveLength(1);
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Directory temporarily unavailable");
    await act(async () => button("Load more").click());
    expect(rowLinks()).toHaveLength(2);
    expect(mocks.search).toHaveBeenLastCalledWith({ lookup: "CUSTOMERS", query: "Shared", limit: 25, nextToken: "page-2" });
  });

  it("keeps lookup history on record→Back without putting contact details in URLs", async () => {
    await act(async () => root.render(application()));
    await typeQuery("closed@example.com");
    await debounce();
    expect(seenLocation.search).toBe("");
    await act(async () => rowLinks()[0].click());
    expect(container.textContent).toContain("Record closed");
    await act(async () => button("Back to search").click());
    expect(container.querySelector("input")!.value).toBe("closed@example.com");
    await debounce();
    expect(rowLinks()[0].getAttribute("href")).toBe("/customers/closed");
    expect(seenLocation.search).toBe("");
  });

  it("ignores a prior user's history and makes no blank lookup", async () => {
    await act(async () => root.render(application({ customerSearch: { ownerSub: "other-user", query: "private@example.com" } })));
    await debounce();
    expect(container.querySelector("input")!.value).toBe("");
    expect(mocks.search).not.toHaveBeenCalled();
  });

  it("does not query without office access", async () => {
    mocks.office = false;
    await act(async () => root.render(application({ customerSearch: { ownerSub: "owner-1", query: "Shared" } })));
    await debounce();
    expect(mocks.search).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Office access required");
  });

  it("offers retry rather than a false empty result on initial failure", async () => {
    mocks.search.mockRejectedValue(new Error("Directory temporarily unavailable"));
    await act(async () => root.render(application({ customerSearch: { ownerSub: "owner-1", query: "Shared" } })));
    await debounce();
    expect(container.textContent).not.toContain("No matches");
    expect(button("Retry")).toBeDefined();
  });

  it.each([
    { staff: [{ email: "private-staff@example.com" }] },
    { items: [{ email: "private-staff@example.com", status: "CONFIRMED" }], nextToken: null },
  ])("rejects a legacy or invalid staff-roster response rather than rendering customer matches", async (data) => {
    mocks.search.mockResolvedValue({ data: JSON.stringify(data) });
    await act(async () => root.render(application({ customerSearch: { ownerSub: "owner-1", query: "Shared" } })));
    await debounce();
    expect(container.textContent).not.toContain("private-staff@example.com");
    expect(container.textContent).not.toContain("No matches");
    expect(button("Retry")).toBeDefined();
  });
});
