// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation, useNavigate, type NavigateFunction } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lazyScreen } from "./lazyScreen";
vi.mock("./monitoring", () => ({ captureRenderFailure: vi.fn() }));
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }
let container: HTMLDivElement, root: Root;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.spyOn(console, "error").mockImplementation(() => {});
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("lazy screen boundaries", () => {
  it("imports only on render/intent, shares preloads, and keeps navigation mounted while loading", async () => {
    const pending = deferred<{ default: () => ReturnType<typeof createElement> }>(), load = vi.fn(() => pending.promise);
    const route = lazyScreen(load); expect(load).not.toHaveBeenCalled();
    let show!: (next: boolean) => void;
    function Shell() { const [open, setOpen] = useState(false); show = setOpen; return createElement("div", null,
      createElement("nav", null, "Tabs stay usable"), open ? createElement(route.Screen) : createElement("p", null, "Previous screen")); }
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(Shell)))); expect(load).not.toHaveBeenCalled();
    const preload = route.preload(); await act(async () => show(true)); expect(load).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain("Loading screen"); expect(container.querySelector("nav")).not.toBeNull();
    await act(async () => pending.resolve({ default: () => createElement("p", null, "Loaded route") })); await preload;
    expect(container.textContent).toContain("Loaded route"); expect(load).toHaveBeenCalledTimes(1);
  });
  it("recreates React.lazy on explicit retry after a rejected route import", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("chunk unavailable")).mockResolvedValueOnce({ default: () => createElement("p", null, "Recovered route") });
    const route = lazyScreen(load);
    await act(async () => root.render(createElement(MemoryRouter, null, createElement("div", null, createElement("nav", null, "Tabs"), createElement(route.Screen)))));
    expect(container.textContent).toContain("This screen didn't load"); expect(container.querySelector("nav")).not.toBeNull();
    await act(async () => container.querySelector<HTMLButtonElement>("button")!.click());
    expect(load).toHaveBeenCalledTimes(2); expect(container.textContent).toContain("Recovered route");
  });
  it("does not latch a failed intent preload or mount the prefetched screen", async () => {
    const render = vi.fn(() => createElement("p", null, "Ready"));
    const load = vi.fn().mockRejectedValueOnce(new Error("offline preload")).mockResolvedValueOnce({ default: render });
    const route = lazyScreen(load); await route.preload(); expect(render).not.toHaveBeenCalled();
    await act(async () => root.render(createElement(MemoryRouter, null, createElement(route.Screen)))); expect(load).toHaveBeenCalledTimes(2); expect(container.textContent).toBe("Ready");
  });
  it("clears a failed screen when moving to another record on the same route component", async () => {
    let navigate!: NavigateFunction;
    function Record() { const { pathname } = useLocation(); if (pathname.endsWith("broken")) throw new Error("bad record"); return createElement("p", null, "Healthy record"); }
    const route = lazyScreen(async () => ({ default: Record }));
    function Shell() { navigate = useNavigate(); return createElement(route.Screen); }
    await act(async () => root.render(createElement(MemoryRouter, { initialEntries: ["/customers/broken"] }, createElement(Shell))));
    expect(container.textContent).toContain("This screen didn't load");
    await act(async () => navigate("/customers/healthy")); expect(container.textContent).toBe("Healthy record");
  });
});
