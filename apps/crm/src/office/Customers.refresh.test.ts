// @vitest-environment jsdom
import { act, createElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Customers from "./Customers";
const mocks = vi.hoisted(() => ({ customers: vi.fn(), groups: vi.fn(), create: vi.fn() }));
vi.mock("../lib/auth", () => ({ useRoles: () => ({ sub: "refresh-owner", office: true, owner: true }) }));
vi.mock("../lib/api", () => ({
  api: () => ({ models: { Customer: { listCustomerByStatusAndDisplayName: mocks.customers }, CustomerGroup: { list: mocks.groups, create: mocks.create } } }),
  listAll: async (load: () => Promise<{ data: unknown[] }>) => (await load()).data,
  unwrap: (result: { data: unknown }) => result.data,
}));
let container: HTMLDivElement, root: Root;
const button = (text: string) => Array.from(container.querySelectorAll("button")).find((b) => b.textContent === text)!;
beforeEach(() => {
  sessionStorage.clear();
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  mocks.customers.mockReset().mockResolvedValue({ data: [] }); mocks.groups.mockReset().mockResolvedValue({ data: [] }); mocks.create.mockReset();
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("customer directory refresh", () => {
  it("refreshes a visible list without replacing a group being drafted", async () => {
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(Customers))));
    expect(mocks.customers).toHaveBeenCalledTimes(1);
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(mocks.customers).toHaveBeenCalledTimes(2);
    await act(async () => button("Groups").click());
    await act(async () => button("+ Group").click());
    const name = Array.from(container.querySelectorAll("input")).find((input) => input.placeholder === "Northeast Property Management")!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "Draft Property Group"); name.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => { window.dispatchEvent(new Event("focus")); document.dispatchEvent(new Event("visibilitychange")); });
    expect(mocks.groups).toHaveBeenCalledTimes(1); expect(name.value).toBe("Draft Property Group"); expect(mocks.create).not.toHaveBeenCalled();
    expect(container.querySelector<HTMLButtonElement>('[aria-label="Refresh customers"]')!.disabled).toBe(true);
    expect(container.textContent).toContain("Updates paused during changes");
  });
});
