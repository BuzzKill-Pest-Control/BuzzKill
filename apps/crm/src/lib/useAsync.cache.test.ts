// @vitest-environment jsdom
import { act, createElement, StrictMode, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { confirmedMutation, queryCache } from "./queryCache";
import { useAsync, type AsyncState } from "./useAsync";

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
type Props = { load: () => Promise<string>; filter?: string; suspended?: boolean; id?: string };
let container: HTMLDivElement, root: Root;
const states = new Map<string, AsyncState<string>>();
function Harness({ load, filter = "active", suspended = false, id = "a" }: Props) {
  const [draft, setDraft] = useState("");
  const state = useAsync(load, [filter], "Read failed", { cacheKey: ["customers", filter], refreshOnResume: true, suspended });
  states.set(id, state);
  return createElement("div", { "data-screen": id },
    createElement("p", null, state.data ?? "empty"),
    createElement("input", { value: draft, onChange: (e: { target: { value: string } }) => setDraft(e.target.value) }));
}
const latest = () => states.get("a")!;
const rows = () => container.querySelector("p")!.textContent;
const render = async (props: Props, strict = false) => {
  await act(async () => root.render(strict ? createElement(StrictMode, null, createElement(Harness, props)) : createElement(Harness, props)));
};
const focus = async () => { await act(async () => window.dispatchEvent(new Event("focus"))); };
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-03T16:00:00Z"));
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  queryCache.activate(null); queryCache.activate("alice", ["OWNER"]); states.clear();
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); queryCache.activate(null); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("cached operational reads", () => {
  it("renders fresh data immediately on remount and preserves its real read time", async () => {
    const load = vi.fn().mockResolvedValue("cached customer"); await render({ load }); const at = latest().lastUpdatedAt;
    await act(async () => root.render(createElement("p", null, "record"))); vi.advanceTimersByTime(5_000);
    await render({ load: vi.fn(() => { throw new Error("fresh Back must not fetch"); }) });
    expect(rows()).toBe("cached customer"); expect(latest().loading).toBe(false); expect(latest().lastUpdatedAt).toBe(at);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("keeps stale cached rows through a failed revalidation and refreshes explicitly inside the TTL", async () => {
    const old = "cached customer", pending = deferred<string>();
    const load = vi.fn().mockResolvedValueOnce(old).mockReturnValueOnce(pending.promise).mockResolvedValueOnce("authoritative customer");
    await render({ load }); const at = latest().lastUpdatedAt;
    await act(async () => root.render(createElement("p", null, "record"))); vi.advanceTimersByTime(30_001);
    await render({ load }); expect(rows()).toBe(old); expect(latest().loading).toBe(true);
    await act(async () => pending.reject(new Error("offline")));
    expect(rows()).toBe(old); expect(latest().error).toBe("offline"); expect(latest().lastUpdatedAt).toBe(at);
    await act(async () => latest().refresh()); expect(rows()).toBe("authoritative customer");
    await act(async () => latest().refresh()); expect(load).toHaveBeenCalledTimes(4);
  });
  it("skips fresh resume reads and revalidates when stale, visible and online", async () => {
    const load = vi.fn().mockResolvedValue("customer"); await render({ load }); await focus(); expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(30_001); Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    await focus(); expect(load).toHaveBeenCalledTimes(1);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false }); await focus(); expect(load).toHaveBeenCalledTimes(1);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true }); await focus(); expect(load).toHaveBeenCalledTimes(2);
  });
  it("deduplicates simultaneous consumers and StrictMode effect replay", async () => {
    const pending = deferred<string>(), load = vi.fn(() => pending.promise);
    await act(async () => root.render(createElement(StrictMode, null,
      createElement(Harness, { load }), createElement(Harness, { load, id: "b" }))));
    expect(load).toHaveBeenCalledTimes(1); await act(async () => pending.resolve("shared rows"));
    expect([...container.querySelectorAll("p")].map((p) => p.textContent)).toEqual(["shared rows", "shared rows"]);
  });
  it("separates keys, ignores older filters, and reuses the matching entry when returning", async () => {
    const old = deferred<string>(), load = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce("inactive rows");
    await render({ load }); await render({ load, filter: "inactive" }); expect(rows()).toBe("inactive rows");
    await act(async () => old.resolve("active rows")); expect(rows()).toBe("inactive rows");
    await render({ load, filter: "active" }); expect(rows()).toBe("active rows"); expect(load).toHaveBeenCalledTimes(2);
    await act(async () => latest().refresh()); expect(load).toHaveBeenCalledTimes(3);
  });
  it("supersedes an in-flight stale read when a confirmed write invalidates it", async () => {
    const old = deferred<string>(), current = deferred<string>();
    const load = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
    await render({ load }); await act(async () => { await confirmedMutation(Promise.resolve({ data: { id: "saved" } })); });
    expect(load).toHaveBeenCalledTimes(2); await act(async () => current.resolve("saved server rows"));
    await act(async () => old.resolve("pre-write rows")); expect(rows()).toBe("saved server rows"); expect(latest().loading).toBe(false);
  });
  it("defers invalidation during an edit and retains draft input while fetching authoritative rows afterward", async () => {
    const load = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("saved"); await render({ load, suspended: true });
    const input = container.querySelector("input")!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "Unsaved note"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => { await confirmedMutation(Promise.resolve({ data: { id: "saved" } })); });
    expect(load).toHaveBeenCalledTimes(1); expect(rows()).toBe("old"); expect(input.value).toBe("Unsaved note");
    await render({ load, suspended: false }); expect(rows()).toBe("saved"); expect(input.value).toBe("Unsaved note");
  });
  it("does not apply a background result that arrives during an edit", async () => {
    const pending = deferred<string>(); const load = vi.fn().mockResolvedValueOnce("old").mockReturnValueOnce(pending.promise).mockResolvedValueOnce("after edit");
    await render({ load }); const at = latest().lastUpdatedAt; await act(async () => latest().refresh()); await render({ load, suspended: true });
    await act(async () => pending.resolve("arrived during edit")); expect(rows()).toBe("old"); expect(latest().lastUpdatedAt).toBe(at);
    await render({ load, suspended: false }); expect(rows()).toBe("after edit");
  });
  it("keeps the old rows while a failed action reconciles uncertain effects, without inventing success", async () => {
    const reconcile = deferred<string>(); const load = vi.fn().mockResolvedValueOnce("unpaid").mockReturnValueOnce(reconcile.promise);
    await render({ load }); const at = latest().lastUpdatedAt;
    await act(async () => { await expect(confirmedMutation(Promise.resolve({ data: null, errors: [{ message: "payment refused" }] }))).rejects.toThrow("payment refused"); });
    expect(rows()).toBe("unpaid"); expect(latest().lastUpdatedAt).toBe(at);
    await act(async () => reconcile.resolve("still unpaid")); expect(rows()).toBe("still unpaid");
  });
  it("waits while signed out, clears visible data on logout, and fences same-account login ABA", async () => {
    queryCache.activate(null); const old = deferred<string>();
    const load = vi.fn().mockReturnValueOnce(old.promise).mockResolvedValueOnce("new session rows"); await render({ load });
    expect(load).not.toHaveBeenCalled(); await act(async () => queryCache.activate("alice", ["OWNER"])); expect(load).toHaveBeenCalledTimes(1);
    await act(async () => { queryCache.activate(null); queryCache.activate("alice", ["OWNER"]); });
    expect(rows()).toBe("new session rows"); await act(async () => old.resolve("private old session")); expect(rows()).toBe("new session rows");
    await act(async () => queryCache.activate(null)); expect(rows()).toBe("empty"); expect(load).toHaveBeenCalledTimes(2);
  });
  it("does not refetch for a new closure but does isolate changed permissions", async () => {
    const load = vi.fn().mockResolvedValue("owner rows"); await render({ load }); await render({ load: () => load() }); expect(load).toHaveBeenCalledTimes(1);
    await act(async () => queryCache.activate("alice", ["TECH"])); expect(load).toHaveBeenCalledTimes(2);
  });
});
