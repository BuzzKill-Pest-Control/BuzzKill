// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate, type Location, type NavigateFunction } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Customers from "./Customers";
import Leads from "./Leads";
import Schedule from "./Schedule";
import { activateNavigationOwner, writeNavigationValue } from "../lib/navigationMemory";

const mocks = vi.hoisted(() => ({
  owner: "alice",
  auth: null as null | ((event: { payload: { event: string } }) => void),
  byStatus: vi.fn(),
}));
vi.mock("aws-amplify/utils", () => ({ Hub: { listen: (_: string, listener: typeof mocks.auth) => { mocks.auth = listener; } } }));
vi.mock("../lib/auth", () => ({ useRoles: () => ({ sub: mocks.owner, owner: true, office: true, finance: true, groups: [] }) }));
vi.mock("../lib/api", async (original) => {
  const actual = await original<typeof import("../lib/api")>();
  const list = async () => ({ data: [], nextToken: null });
  return { ...actual, api: () => ({ models: {
    Customer: { listCustomerByStatusAndDisplayName: mocks.byStatus, list },
    CustomerGroup: { list }, Technician: { list }, Route: { listRouteByDate: list },
    Job: { listJobByScheduledDate: list, list },
  } }) };
});

let root: Root;
let container: HTMLDivElement;
let navigate: NavigateFunction;
let location: Location;
let scrollY = 0;

function button(text: string): HTMLButtonElement {
  const node = [...container.querySelectorAll("button")].find((b) => b.textContent?.trim() === text);
  if (!node) throw new Error(`Missing button ${text}`);
  return node;
}
function search(): HTMLInputElement { return container.querySelector('input[placeholder^="Search"]')!; }
async function input(node: HTMLInputElement, value: string) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(node, value);
    node.dispatchEvent(new Event(node.type === "date" ? "change" : "input", { bubbles: true }));
  });
}
async function go(to: string | number) { await act(async () => { navigate(to as string); }); }
function Screens() {
  navigate = useNavigate();
  location = useLocation();
  return createElement(Routes, null,
    createElement(Route, { path: "/customers", element: createElement(Customers) }),
    createElement(Route, { path: "/leads", element: createElement(Leads) }),
    createElement(Route, { path: "/schedule", element: createElement(Schedule) }),
    createElement(Route, { path: "/customers/:id", element: createElement("p", null, "Customer record") }),
    createElement(Route, { path: "/other", element: createElement("p", null, "Another tab") }),
  );
}
async function mount(path: string) {
  await act(async () => root.render(createElement(MemoryRouter, { initialEntries: [path] }, createElement(Screens))));
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  sessionStorage.clear();
  mocks.owner = "alice";
  mocks.byStatus.mockReset().mockImplementation(async ({ status }: { status: string }) => ({
    data: status === "LEAD" ? [
      { id: "new", status, displayName: "New lead", leadOwnerSub: "alice" },
      { id: "attempted", status, displayName: "Attempted lead", leadOwnerSub: "alice", lastAttemptedAt: "2026-10-01T12:00:00Z" },
    ] : [{ id: status.toLowerCase(), status, displayName: `${status} customer`, email: "dana@example.com" }],
    nextToken: null,
  }));
  scrollY = 0;
  vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
  vi.spyOn(window, "scrollTo").mockImplementation((x: number | ScrollToOptions, y?: number) => {
    scrollY = typeof x === "number" ? y ?? 0 : x.top ?? 0;
  });
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("remembered office navigation", () => {
  it("restores the specific customer history entry, query and scroll through Back/Forward", async () => {
    await mount("/customers");
    await act(async () => button("Inactive").click());
    await input(search(), "dana@example.com");
    scrollY = 420;
    await go("/customers/inactive");
    expect(scrollY).toBe(0);
    await go("/customers");
    expect(search().value).toBe("dana@example.com");
    await act(async () => button("Active").click());
    await input(search(), "ACTIVE");
    scrollY = 88;
    await go(-1);
    await go(-1);
    expect(search().value).toBe("dana@example.com");
    expect(button("Inactive").className).toContain("seg-on");
    expect(scrollY).toBe(420);
    await go(1);
    await go(1);
    expect(search().value).toBe("ACTIVE");
    expect(scrollY).toBe(88);
    expect(location.search).toBe("");
    expect(JSON.stringify(location)).not.toContain("dana@example.com");
  });

  it("restores owner/stage filters after leaving and returning to the lead inbox", async () => {
    await mount("/leads");
    await act(async () => container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
    await act(async () => button("Attempted (1)").click());
    expect(container.textContent).not.toContain("New leadAction");
    await go("/customers/attempted");
    await go(-1);
    expect(container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.checked).toBe(true);
    expect(button("Attempted (1)").className).toContain("btn-primary");
    expect(container.querySelectorAll(".list-row").length).toBe(1);
  });

  it("jumps to a date and restores the selected day/week on browser Back", async () => {
    await mount("/schedule");
    await input(container.querySelector('input[type="date"]')!, "2027-03-17");
    expect(container.textContent).toContain("Showing Wednesday, March 17");
    await go("/other");
    await go("/schedule");
    await input(container.querySelector('input[type="date"]')!, "2027-04-20");
    await go(-1);
    await go(-1);
    expect(container.querySelector<HTMLInputElement>('input[type="date"]')!.value).toBe("2027-03-17");
    expect(container.textContent).toContain("Showing Wednesday, March 17");
    await act(async () => button("Next week ›").click());
    expect(container.querySelector<HTMLInputElement>('input[type="date"]')!.value).toBe("2027-03-24");
  });

  it("falls back safely for malformed saved filters and dates", async () => {
    activateNavigationOwner("alice");
    writeNavigationValue("alice", "schedule", "2026-02-30");
    await mount("/schedule?date=not-a-date");
    expect(container.querySelector<HTMLInputElement>('input[type="date"]')!.value).not.toBe("2026-02-30");
    writeNavigationValue("alice", "customers", { tab: "BROKEN", query: "private" });
    await go("/customers");
    expect(button("Active").className).toContain("seg-on");
    expect(search().value).toBe("");
  });

  it("purges customer search on sign-out and account switch", async () => {
    await mount("/customers");
    await input(search(), "dana@example.com");
    await go("/other");
    mocks.auth?.({ payload: { event: "signedOut" } });
    expect(JSON.stringify(sessionStorage)).not.toContain("dana@example.com");
    mocks.owner = "bob";
    await go("/customers");
    expect(search().value).toBe("");
  });
});
