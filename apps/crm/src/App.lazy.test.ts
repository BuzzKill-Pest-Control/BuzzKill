// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  signedIn: false, google: true, authProps: {} as Record<string, unknown>,
  roles: { sub: "owner", loading: false, office: true, finance: true, owner: true, tech: false, customer: false, groups: [] },
  dashboardImports: 0, leadsImports: 0, leadsMounts: 0, staffImports: 0,
  resolveDashboard: null as null | (() => void),
}));
vi.mock("@aws-amplify/ui-react", () => ({
  Authenticator: ({ children, ...props }: { children: React.ReactNode }) => { mocks.authProps = props; return mocks.signedIn ? children : createElement("p", null, "Sign in"); },
  useAuthenticator: () => ({ toForgotPassword: vi.fn() }),
}));
vi.mock("./lib/auth", () => ({ RolesProvider: ({ children }: { children: React.ReactNode }) => children, useRoles: () => mocks.roles, myGroupIds: () => [] }));
vi.mock("./lib/backend", () => ({ isGoogleSignInEnabled: () => mocks.google }));
vi.mock("./components/InstallBanner", () => ({ default: () => null }));
vi.mock("./lib/monitoring", () => ({ captureRenderFailure: vi.fn() }));
vi.mock("./office/Dashboard", async () => {
  mocks.dashboardImports++; await new Promise<void>((resolve) => { mocks.resolveDashboard = resolve; });
  return { default: () => createElement("p", null, "Dashboard page") };
});
vi.mock("./office/Leads", () => { mocks.leadsImports++; return { default: () => { mocks.leadsMounts++; return createElement("p", null, "Leads page"); } }; });
vi.mock("./office/Staff", () => { mocks.staffImports++; return { default: () => createElement("p", null, "Staff page") }; });
vi.mock("./tech/Today", () => ({ default: () => createElement("p", null, "Tech today") }));
import App from "./App";
let root: Root, container: HTMLDivElement;
async function render() { await act(async () => root.render(createElement(App, { backendReady: true }))); }
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected network request"); }));
  mocks.signedIn = false; mocks.roles = { sub: "owner", loading: false, office: true, finance: true, owner: true, tech: false, customer: false, groups: [] };
  window.history.replaceState(null, "", "/dashboard"); container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
it("loads no screens before authentication and preserves configured Google sign-in", async () => {
  await render(); expect(container.textContent).toBe("Sign in"); expect(mocks.dashboardImports).toBe(0); expect(mocks.leadsImports).toBe(0);
  expect(mocks.authProps.socialProviders).toEqual(["google"]);
});
it("keeps the real tab shell usable during the first route load and preloads another tab only on intent", async () => {
  mocks.signedIn = true; await render(); expect(container.textContent).toContain("Loading screen");
  const nav = container.querySelector("nav"); expect(nav).not.toBeNull(); expect(mocks.leadsImports).toBe(0);
  await act(async () => { mocks.resolveDashboard!(); }); expect(container.textContent).toContain("Dashboard page");
  const leads = container.querySelector<HTMLAnchorElement>('a[href="/leads"]')!;
  await act(async () => leads.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }))); await act(async () => { await vi.dynamicImportSettled(); });
  expect(mocks.leadsImports).toBe(1); expect(mocks.leadsMounts).toBe(0);
  await act(async () => leads.click()); expect(container.textContent).toContain("Leads page"); expect(container.querySelector("nav")).toBe(nav);
});
it("does not import an unauthorized route before redirecting to an allowed screen", async () => {
  mocks.signedIn = true; mocks.roles = { ...mocks.roles, office: false, finance: false, owner: false, tech: true };
  window.history.replaceState(null, "", "/staff"); await render(); await act(async () => { await vi.dynamicImportSettled(); });
  expect(container.textContent).toContain("Tech today"); expect(mocks.staffImports).toBe(0);
  expect(container.querySelector('a[href="/staff"]')).toBeNull();
});
