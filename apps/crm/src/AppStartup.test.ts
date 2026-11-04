// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import AppStartup from "./AppStartup";
import ScreenErrorBoundary from "./components/ScreenErrorBoundary";
vi.mock("./App", () => ({ default: ({ backendReady }: { backendReady: boolean }) => createElement("p", null, backendReady ? "Configured app" : "Not configured") }));
vi.mock("./lib/backend", () => ({ connectBackend: vi.fn() }));
vi.mock("./lib/monitoring", () => ({ captureRenderFailure: vi.fn() }));
let root: Root, container: HTMLDivElement;
beforeEach(() => { vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.spyOn(console, "error").mockImplementation(() => {}); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container); });
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it.each([true, false])("paints a pending configuration placeholder and then handles configured=%s once under StrictMode", async (ready) => {
  let resolve!: (value: boolean) => void; const connect = vi.fn(() => new Promise<boolean>((yes) => { resolve = yes; }));
  await act(async () => root.render(createElement(StrictMode, null, createElement(AppStartup, { connect }))));
  expect(container.textContent).toContain("Starting BuzzKill"); expect(connect).toHaveBeenCalledTimes(1);
  await act(async () => resolve(ready)); expect(container.textContent).toBe(ready ? "Configured app" : "Not configured");
});
it("turns a rejected configuration load into a monitored, recoverable root error", async () => {
  const connect = vi.fn().mockRejectedValue(new Error("configuration chunk unavailable"));
  await act(async () => root.render(createElement(ScreenErrorBoundary, { resetKey: "startup", children: createElement(AppStartup, { connect }) })));
  expect(container.textContent).toContain("This screen didn't load"); expect(container.querySelector("button")?.textContent).toBe("Reload");
});
