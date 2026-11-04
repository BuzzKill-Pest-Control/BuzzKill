// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: vi.fn(), listeners: new Set<(event: { payload: { event: string } }) => void>() }));
vi.mock("aws-amplify/auth", () => ({ fetchAuthSession: mocks.session }));
vi.mock("aws-amplify/utils", () => ({ Hub: { listen: (_: string, listener: (event: { payload: { event: string } }) => void) => {
  mocks.listeners.add(listener); return () => mocks.listeners.delete(listener);
} } }));
import { RolesProvider, useRoles, type Roles } from "./auth";
import { queryCache } from "./queryCache";
import { useAsync } from "./useAsync";
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }
const session = (sub: string, groups: string[]) => ({ tokens: { accessToken: { payload: { sub, "cognito:groups": groups } } } });
let root: Root, container: HTMLDivElement, roles: Roles;
const read = vi.fn();
function Screen() {
  roles = useRoles(); const state = useAsync(read, [], "No rows", { cacheKey: ["customers"] });
  return createElement("p", null, `${roles.sub}:${roles.groups.join(",")}:${state.data ?? "empty"}`);
}
const mount = async () => { await act(async () => root.render(createElement(RolesProvider, null, createElement(Screen)))); };
const emit = (event: string) => { for (const listener of [...mocks.listeners]) listener({ payload: { event } }); };
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); mocks.session.mockReset(); read.mockReset().mockResolvedValue("server rows"); queryCache.activate(null);
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); queryCache.activate(null); vi.unstubAllGlobals(); });
describe("authenticated read cache lifecycle", () => {
  it("waits for identity, then reads once and clears data on any Hub signout path", async () => {
    const pending = deferred<ReturnType<typeof session>>(); mocks.session.mockReturnValue(pending.promise); await mount();
    expect(read).not.toHaveBeenCalled(); await act(async () => pending.resolve(session("alice", ["OWNER"])));
    expect(read).toHaveBeenCalledTimes(1); expect(container.textContent).toContain("server rows");
    await act(async () => emit("signedOut")); expect(queryCache.identity()).toBeNull(); expect(container.textContent).toBe("::empty");
    expect(roles.owner).toBe(false); expect(read).toHaveBeenCalledTimes(1);
  });
  it("cannot reactivate an account from a pending role refresh after signout", async () => {
    const pending = deferred<ReturnType<typeof session>>(); mocks.session.mockReturnValue(pending.promise); await mount();
    await act(async () => emit("signedOut")); await act(async () => pending.resolve(session("alice", ["OWNER"])));
    expect(queryCache.identity()).toBeNull(); expect(roles.sub).toBe(""); expect(roles.owner).toBe(false); expect(read).not.toHaveBeenCalled();
  });
  it("clears on token refresh and reactivates once with current groups, without signed-out duplicate reads", async () => {
    const refreshed = deferred<ReturnType<typeof session>>();
    mocks.session.mockResolvedValueOnce(session("alice", ["OWNER"])).mockReturnValueOnce(refreshed.promise); await mount();
    const before = queryCache.scope(); expect(read).toHaveBeenCalledTimes(1);
    await act(async () => emit("tokenRefresh")); expect(queryCache.identity()).toBeNull(); expect(container.textContent).toContain("empty");
    expect(read).toHaveBeenCalledTimes(1); await act(async () => refreshed.resolve(session("alice", ["TECH"])));
    expect(queryCache.scope()).not.toBe(before); expect(roles.owner).toBe(false); expect(roles.tech).toBe(true); expect(read).toHaveBeenCalledTimes(2);
  });
  it("does not let an older account lookup override a newer signed-in account", async () => {
    const old = deferred<ReturnType<typeof session>>();
    mocks.session.mockReturnValueOnce(old.promise).mockResolvedValueOnce(session("bob", ["TECH"])); await mount();
    await act(async () => emit("signedIn")); await act(async () => old.resolve(session("alice", ["OWNER"])));
    expect(roles.sub).toBe("bob"); expect(roles.owner).toBe(false); expect(queryCache.identity()).toContain("bob"); expect(read).toHaveBeenCalledTimes(1);
  });
});
