// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, useParams } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Search from "./Search";

const mocks = vi.hoisted(() => ({ list: vi.fn(), office: true, sub: "owner-1" }));
vi.mock("../lib/auth", () => ({ useRoles: () => ({ office: mocks.office, sub: mocks.sub }) }));
vi.mock("../lib/api", async (importOriginal) => ({
  ...await importOriginal<typeof import("../lib/api")>(),
  api: () => ({ models: { Customer: { listCustomerByStatusAndDisplayName: mocks.list } } }),
}));

const active = { id: "active", status: "ACTIVE", displayName: "Shared Active", serviceCity: "Boston" };
const inactive = {
  id: "inactive", status: "INACTIVE", displayName: "Shared Inactive", phone: "+1 (508) 258-9294",
  serviceStreet: "420 Lakeside Ave", serviceUnit: "104", serviceCity: "Marlborough",
  serviceState: "MA", serviceZip: "01752",
};
const closedLead = {
  id: "closed", status: "LEAD", displayName: "Shared Closed Inquiry", email: "closed@example.com",
  lostReason: "CUSTOMER_DECLINED",
};

let container: HTMLDivElement;
let root: Root;
let seenLocation: ReturnType<typeof useLocation>;

function LocationProbe() { seenLocation = useLocation(); return null; }
function Record() {
  const navigate = useNavigate();
  const { id } = useParams();
  return createElement("div", null, `Record ${id}`, createElement("button", { onClick: () => navigate(-1) }, "Back to search"));
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
function rowLinks() { return Array.from(container.querySelectorAll<HTMLAnchorElement>("a.record-search-result")); }

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.office = true;
  mocks.sub = "owner-1";
  mocks.list.mockReset().mockImplementation(async ({ status }, { nextToken }) => {
    if (status === "ACTIVE") return nextToken
      ? { data: [active], nextToken: null }
      : { data: [], nextToken: "active-next-page" };
    return { data: status === "INACTIVE" ? [inactive] : [closedLead], nextToken: null };
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

describe("the office customer and lead directory", () => {
  it("finds active, inactive, and closed lead records across every index page without refetching per key", async () => {
    await act(async () => root.render(application()));
    expect(rowLinks()).toHaveLength(0);
    await typeQuery("Shared");
    expect(rowLinks().map((link) => link.getAttribute("href"))).toEqual([
      "/customers/active", "/customers/closed", "/customers/inactive",
    ]);
    expect(container.textContent).toContain("active");
    expect(container.textContent).toContain("inactive");
    expect(container.textContent).toContain("lead");
    expect(container.textContent).toContain("Lost");
    await typeQuery("5082589294");
    expect(rowLinks()).toHaveLength(1);
    expect(rowLinks()[0].textContent).toContain("420 Lakeside Ave, Unit 104, Marlborough, MA, 01752");
    expect(mocks.list).toHaveBeenCalledTimes(4);
    expect(mocks.list).toHaveBeenCalledWith({ status: "ACTIVE" }, { limit: 500, nextToken: "active-next-page" });
  });

  it("keeps the lookup on record→Back without putting contact details in a URL", async () => {
    await act(async () => root.render(application()));
    await typeQuery("closed@example.com");
    expect(seenLocation.pathname).toBe("/search");
    expect(seenLocation.search).toBe("");
    await act(async () => rowLinks()[0].click());
    expect(container.textContent).toContain("Record closed");
    await act(async () => container.querySelector("button")!.click());
    expect(container.querySelector("input")!.value).toBe("closed@example.com");
    expect(rowLinks()[0].getAttribute("href")).toBe("/customers/closed");
    expect(seenLocation.search).toBe("");
  });

  it("ignores a prior user's lookup state", async () => {
    await act(async () => root.render(application({ customerSearch: { ownerSub: "other-user", query: "private@example.com" } })));
    expect(container.querySelector("input")!.value).toBe("");
    expect(container.textContent).not.toContain("private@example.com");
    expect(rowLinks()).toHaveLength(0);
  });

  it("does not read the directory without office access", async () => {
    mocks.office = false;
    await act(async () => root.render(application()));
    expect(mocks.list).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Office access required");
  });

  it("does not present an incomplete page as a no-match result when any partition fails", async () => {
    mocks.list.mockRejectedValue(new Error("Directory temporarily unavailable"));
    await act(async () => root.render(application({ customerSearch: { ownerSub: "owner-1", query: "Shared" } })));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Directory temporarily unavailable");
    expect(container.textContent).not.toContain("No matches");
    expect(rowLinks()).toHaveLength(0);
    expect(Array.from(container.querySelectorAll("button")).some((button) => button.textContent === "Retry")).toBe(true);
  });
});
