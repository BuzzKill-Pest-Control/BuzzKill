// @vitest-environment jsdom
import { act, createElement, StrictMode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAsync, type AsyncState } from "./useAsync";
import RefreshStatus from "../components/RefreshStatus";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
let container: HTMLDivElement, root: Root, latest: AsyncState<string>, renders: number;
function Harness({ load, filter = "a", suspended = false, auto = true }: { load: () => Promise<string>; filter?: string; suspended?: boolean; auto?: boolean }) {
  const [draft, setDraft] = useState("");
  latest = useAsync(load, [filter], "Read failed", { refreshOnResume: auto, suspended });
  renders++;
  return createElement("div", null,
    createElement("p", { "data-testid": "rows" }, latest.data ?? "empty"),
    createElement("input", { value: draft, onChange: (e: { target: { value: string } }) => setDraft(e.target.value) }),
    createElement(RefreshStatus, { state: latest, label: "records" }),
    latest.error ? createElement("p", { role: "alert" }, latest.error) : null);
}
const rows = () => container.querySelector('[data-testid="rows"]')!.textContent;
const button = () => container.querySelector("button")!;
async function focus() { await act(async () => window.dispatchEvent(new Event("focus"))); }
function visible(value: boolean) { Object.defineProperty(document, "visibilityState", { configurable: true, value: value ? "visible" : "hidden" }); }
function online(value: boolean) { Object.defineProperty(navigator, "onLine", { configurable: true, value }); }
async function render(props: Parameters<typeof Harness>[0], strict = false) {
  await act(async () => root.render(strict ? createElement(StrictMode, null, createElement(Harness, props)) : createElement(Harness, props)));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-03T16:00:00Z"));
  visible(true); online(true); renders = 0;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("operational read refresh", () => {
  it("keeps rows during refresh, prevents overlapping reads and timestamps only completion", async () => {
    const first = deferred<string>(), next = deferred<string>();
    const load = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(next.promise);
    await render({ load }); await focus(); expect(load).toHaveBeenCalledTimes(1);
    await act(async () => first.resolve("old")); const before = latest.lastUpdatedAt;
    vi.advanceTimersByTime(2000); await act(async () => button().click());
    expect(rows()).toBe("old"); expect(button().disabled).toBe(true); expect(latest.lastUpdatedAt).toBe(before);
    await focus(); expect(load).toHaveBeenCalledTimes(2);
    await act(async () => next.resolve("new"));
    expect(rows()).toBe("new"); expect(latest.lastUpdatedAt).toBe(Date.now()); expect(latest.loading).toBe(false);
  });
  it("coalesces a fast focus, visibility and online burst into one read", async () => {
    const load = vi.fn().mockResolvedValue("data"); await render({ load }); await focus();
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("online")); window.dispatchEvent(new Event("focus")); });
    expect(load).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1001); await focus(); expect(load).toHaveBeenCalledTimes(3);
  });
  it("waits for visible and online state and shows an offline indicator", async () => {
    const load = vi.fn().mockResolvedValue("data"); await render({ load });
    visible(false); await focus(); expect(load).toHaveBeenCalledTimes(1);
    online(false); await act(async () => window.dispatchEvent(new Event("offline")));
    visible(true); await focus(); expect(load).toHaveBeenCalledTimes(1);
    expect(button().disabled).toBe(true); expect(container.textContent).toContain("Offline");
    online(true); await act(async () => window.dispatchEvent(new Event("online")));
    expect(load).toHaveBeenCalledTimes(2); expect(button().disabled).toBe(false);
  });
  it("leaves ordinary form/detail reads opted out", async () => {
    const load = vi.fn().mockResolvedValue("data"); await render({ load, auto: false });
    await focus(); await act(async () => { document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("online")); });
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("pauses automatic and manual refresh while editing without losing draft input", async () => {
    const load = vi.fn().mockResolvedValue("data"); await render({ load, suspended: true });
    const input = container.querySelector("input")!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Unsaved service note"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await focus(); await act(async () => button().click());
    expect(load).toHaveBeenCalledTimes(1); expect(input.value).toBe("Unsaved service note"); expect(button().disabled).toBe(true);
    expect(container.textContent).toContain("Updates paused during changes");
    await render({ load, suspended: false }); vi.advanceTimersByTime(1001); await focus();
    expect(load).toHaveBeenCalledTimes(2); expect(input.value).toBe("Unsaved service note");
  });
  it("discards a background response that arrives during edits but permits explicit post-write reload", async () => {
    const pending = deferred<string>();
    const load = vi.fn().mockResolvedValueOnce("old").mockReturnValueOnce(pending.promise).mockResolvedValueOnce("saved");
    await render({ load }); const before = latest.lastUpdatedAt; await focus(); await render({ load, suspended: true });
    vi.advanceTimersByTime(2000); await act(async () => pending.resolve("new while editing"));
    expect(rows()).toBe("old"); expect(latest.lastUpdatedAt).toBe(before); expect(latest.loading).toBe(false);
    await act(async () => latest.reload()); expect(rows()).toBe("saved");
  });
  it("keeps old rows and the timestamp after refresh failure, then recovers manually", async () => {
    const load = vi.fn().mockResolvedValueOnce("old").mockRejectedValueOnce(new Error("No connection")).mockResolvedValueOnce("new");
    await render({ load }); const before = latest.lastUpdatedAt; vi.advanceTimersByTime(2000); await focus();
    expect(rows()).toBe("old"); expect(latest.error).toBe("No connection"); expect(latest.lastUpdatedAt).toBe(before);
    await act(async () => button().click()); expect(rows()).toBe("new"); expect(latest.error).toBeNull();
  });
  it("does not stamp an update for a failed initial read", async () => {
    await render({ load: vi.fn().mockRejectedValue(new Error("Unavailable")) });
    expect(latest.lastUpdatedAt).toBeNull(); expect(latest.error).toBe("Unavailable"); expect(button().disabled).toBe(false);
  });
  it.each(["success", "failure"])("discards an older filter's %s after a newer request", async (outcome) => {
    const old = deferred<string>(), current = deferred<string>();
    const load = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await render({ load, filter: "last week" }); await render({ load, filter: "this week" });
    await act(async () => current.resolve("current week")); const at = latest.lastUpdatedAt;
    vi.advanceTimersByTime(1000);
    await act(async () => outcome === "success" ? old.resolve("old week") : old.reject(new Error("old failure")));
    expect(rows()).toBe("current week"); expect(latest.error).toBeNull(); expect(latest.lastUpdatedAt).toBe(at);
  });
  it("removes event listeners and ignores completions after unmount", async () => {
    const old = deferred<string>(), load = vi.fn().mockReturnValue(old.promise);
    await render({ load }); await act(async () => root.unmount()); const count = renders;
    await focus(); await act(async () => old.resolve("too late")); expect(load).toHaveBeenCalledTimes(1); expect(renders).toBe(count);
    root = createRoot(container);
  });
  it("survives StrictMode effect replay and ignores its abandoned request", async () => {
    const abandoned = deferred<string>(), active = deferred<string>();
    const load = vi.fn().mockReturnValueOnce(abandoned.promise).mockReturnValueOnce(active.promise);
    await render({ load }, true); expect(load).toHaveBeenCalledTimes(2);
    await act(async () => active.resolve("active")); await act(async () => abandoned.resolve("abandoned"));
    expect(rows()).toBe("active"); expect(latest.loading).toBe(false); expect(latest.lastUpdatedAt).toBe(Date.now());
  });
});
