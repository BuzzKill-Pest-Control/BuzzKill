// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Search from "./Search";
import CustomerDetail from "./CustomerDetail";

const mocks = vi.hoisted(() => ({ search: vi.fn(), get: vi.fn() }));
vi.mock("../lib/customerRecordReads", () => ({
  readCustomerRecord: async () => (await mocks.get()).data,
  readCustomerEssentials: async () => [],
  readCustomerPage: async () => ({ items: [], nextToken: null }),
  readCustomerDocuments: async () => [], readReportAmendments: async () => [],
  readLifecyclePage: async () => ({ items: [], nextToken: null }),
}));
vi.mock("../lib/auth", () => ({ useRoles: () => ({
  owner: true, office: true, finance: true, loading: false, groups: [], sub: "owner-1",
}) }));
vi.mock("../lib/api", async (original) => {
  const actual = await original<typeof import("../lib/api")>();
  const list = async () => ({ data: [], nextToken: null });
  const models = Object.fromEntries([
    "ServicePlan", "Job", "Agreement", "ServiceReport", "ServiceReportAmendment", "Invoice", "CustomerGroup",
  ].map((name) => [name, { list }]));
  return {
    ...actual,
    searchCustomers: mocks.search,
    api: () => ({
      models: { ...models, Customer: { get: mocks.get }, CustomerLifecycleCommand: { listCustomerLifecycleCommandByCustomerIdAndRequestedAt: list }, BookingRequest: { listBookingRequestByLeadCustomerId: list } },
      queries: { getPaymentMethodSummary: async () => ({ data: JSON.stringify({ hasPaymentMethod: false, label: null }) }) },
    }),
    listCustomerLifecycleEvents: async () => ({ data: [], readFailed: false }),
    listLifecycleCommands: async () => [],
    listLeadActivity: list,
  };
});

const first = { id: "first", status: "ACTIVE", displayName: "Shared First", leadStage: null };
const later = {
  id: "later", status: "ACTIVE", displayName: "Shared Later", leadStage: null,
  email: "later@example.com", serviceStreet: "12 Elm Street", serviceCity: "Providence",
};
let container: HTMLDivElement;
let root: Root;
let location: ReturnType<typeof useLocation>;
function Probe() { location = useLocation(); return null; }
function button(text: string) {
  const result = [...container.querySelectorAll("button")].find((node) => node.textContent?.trim() === text);
  if (!result) throw new Error(`Missing ${text}`);
  return result;
}
async function debounce() { await act(async () => { await vi.advanceTimersByTimeAsync(300); }); }

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.search.mockReset().mockImplementation(async ({ nextToken }) => ({
    data: JSON.stringify(nextToken
      ? { items: [later], nextToken: "page-3" }
      : { items: [first], nextToken: "page-2" }),
  }));
  mocks.get.mockReset().mockResolvedValue({ data: later });
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

it("returns a later-page result through the actual customer Back button with one bounded page request", async () => {
  await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ["/search"] },
    createElement(Probe), createElement(Routes, null,
      createElement(Route, { path: "/search", element: createElement(Search) }),
      createElement(Route, { path: "/customers/:id", element: createElement(CustomerDetail) }),
    )
  )));
  await act(async () => {
    const input = container.querySelector("input")!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Shared");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await debounce();
  await act(async () => button("Load more").click());
  expect(mocks.search).toHaveBeenCalledTimes(2);
  await act(async () => container.querySelector<HTMLAnchorElement>('a[href="/customers/later"]')!.click());
  expect(location.pathname).toBe("/customers/later");
  expect(container.querySelector("h1")?.textContent).toBe("Shared Later");
  await act(async () => container.querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click());
  await debounce();
  expect(location.pathname).toBe("/search");
  expect(location.search).toBe("");
  expect(mocks.search).toHaveBeenCalledTimes(3);
  expect(mocks.search).toHaveBeenLastCalledWith({ query: "Shared", limit: 25, nextToken: "page-2" });
  const restored = container.querySelector<HTMLAnchorElement>('a[href="/customers/later"]')!;
  expect(restored).not.toBeNull();
  expect(document.activeElement).toBe(restored);
  expect(location.state).toEqual({
    customerSearch: { ownerSub: "owner-1", query: "Shared", resume: { customerId: "later", cursor: "page-2" } },
  });
  expect(JSON.stringify(location.state)).not.toContain("later@example.com");
  await act(async () => button("Search again").click());
  await debounce();
  expect(mocks.search).toHaveBeenCalledTimes(4);
  expect(mocks.search).toHaveBeenLastCalledWith({ query: "Shared", limit: 25, nextToken: undefined });
  expect(container.querySelector("input")!.value).toBe("Shared");
});
