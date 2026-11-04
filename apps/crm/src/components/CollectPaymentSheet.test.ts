// @vitest-environment jsdom
import { act, createElement, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CollectPaymentSheet from "./CollectPaymentSheet";
const mocks = vi.hoisted(() => ({
  load: vi.fn(), setup: vi.fn(), saved: vi.fn(), close: vi.fn(), confirm: vi.fn(),
  stripeModuleLoads: 0, elementError: null as (() => void) | null, elements: {}, stripe: {} as Record<string, unknown>,
}));
vi.mock("../lib/paymentStripe", () => ({ loadPaymentStripe: mocks.load }));
vi.mock("../lib/api", () => ({
  api: () => ({ mutations: { createSetupIntent: mocks.setup } }),
  opResult: (result: { data: unknown }) => typeof result.data === "string" ? JSON.parse(result.data) : result.data,
}));
vi.mock("../lib/monitoring", () => ({ captureRenderFailure: vi.fn() }));
vi.mock("@stripe/react-stripe-js", async () => {
  const { createElement } = await import("react"); mocks.stripeModuleLoads++;
  return {
    Elements: ({ children, options }: { children: React.ReactNode; options: { clientSecret: string } }) => createElement("div", { "data-secret": options.clientSecret }, children),
    PaymentElement: ({ onLoadError }: { onLoadError: () => void }) => { mocks.elementError = onLoadError; return createElement("div", null, "Payment fields"); },
    useStripe: () => mocks.stripe, useElements: () => mocks.elements,
  };
});
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>((yes) => { resolve = yes; }); return { promise, resolve }; }
let root: Root, container: HTMLDivElement;
const button = (text: string) => [...container.querySelectorAll("button")].find((node) => node.textContent === text)!;
async function render(open: boolean, customerId = "a", strict = false) {
  await act(async () => {
    const sheet = createElement(CollectPaymentSheet, { open, customerId, onSaved: mocks.saved, onClose: mocks.close });
    root.render(createElement(MemoryRouter, null, strict ? createElement(StrictMode, null, sheet) : sheet));
  });
  await act(async () => { await vi.dynamicImportSettled(); });
}
const secret = () => container.querySelector("[data-secret]")?.getAttribute("data-secret");
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", "pk_test_mocked");
  HTMLElement.prototype.scrollIntoView = vi.fn();
  vi.stubGlobal("fetch", vi.fn(() => { throw new Error("Unexpected live payment request"); }));
  mocks.stripe = { confirmSetup: mocks.confirm }; mocks.load.mockReset().mockResolvedValue(mocks.stripe);
  mocks.setup.mockReset().mockResolvedValue({ data: JSON.stringify({ clientSecret: "setup-secret" }) });
  mocks.confirm.mockReset().mockResolvedValue({}); mocks.saved.mockReset(); mocks.close.mockReset(); mocks.elementError = null;
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("open-only payment lifecycle", () => {
  it("does not import Stripe UI, load its SDK or create an intent while closed; reopening creates a fresh setup", async () => {
    await render(false); expect(mocks.stripeModuleLoads).toBe(0); expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.setup).not.toHaveBeenCalled();
    await render(true); expect(mocks.load).toHaveBeenCalledTimes(1); expect(mocks.setup).toHaveBeenCalledExactlyOnceWith({ customerId: "a" }); expect(secret()).toBe("setup-secret");
    await render(false); expect(container.querySelector('[role="dialog"]')).toBeNull(); expect(mocks.setup).toHaveBeenCalledTimes(1);
    await render(true); expect(mocks.setup).toHaveBeenCalledTimes(2); expect(secret()).toBe("setup-secret");
  });
  it("shares the initial StrictMode effect replay without duplicate intents", async () => {
    await render(true, "a", true); expect(mocks.setup).toHaveBeenCalledTimes(1); expect(secret()).toBe("setup-secret");
  });
  it("ignores an old customer's late setup after changing the open sheet's customer", async () => {
    const old = deferred<{ data: string }>(); mocks.setup.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ data: JSON.stringify({ clientSecret: "new-secret" }) });
    await render(true); await render(true, "b"); expect(secret()).toBe("new-secret");
    await act(async () => old.resolve({ data: JSON.stringify({ clientSecret: "old-secret" }) }));
    expect(secret()).toBe("new-secret"); expect(mocks.setup.mock.calls.map((call) => call[0].customerId)).toEqual(["a", "b"]);
  });
  it("discards a closed attempt before reopening the same customer's setup", async () => {
    const old = deferred<{ data: string }>(); mocks.setup.mockReturnValueOnce(old.promise).mockResolvedValueOnce({ data: JSON.stringify({ clientSecret: "reopened-secret" }) });
    await render(true); await render(false); await render(true);
    await act(async () => old.resolve({ data: JSON.stringify({ clientSecret: "closed-secret" }) }));
    expect(secret()).toBe("reopened-secret"); expect(mocks.saved).not.toHaveBeenCalled();
  });
  it.each(["sdk", "intent", "graphql", "missing-secret"])("shows %s failure without looping and permits explicit retry", async (kind) => {
    if (kind === "sdk") mocks.load.mockRejectedValueOnce(new Error("SDK unavailable"));
    if (kind === "intent") mocks.setup.mockRejectedValueOnce(new Error("Setup unavailable"));
    if (kind === "graphql") mocks.setup.mockResolvedValueOnce({ data: null, errors: [{ message: "Setup unavailable" }] });
    if (kind === "missing-secret") mocks.setup.mockResolvedValueOnce({ data: {} });
    await render(true); expect(container.querySelector('[role="alert"]')).not.toBeNull(); expect(mocks.setup).toHaveBeenCalledTimes(1); expect(mocks.saved).not.toHaveBeenCalled();
    await act(async () => button("Try again").click()); expect(mocks.setup).toHaveBeenCalledTimes(2); expect(secret()).toBe("setup-secret");
  });
  it("surfaces a declined confirmation, refuses double submission, and calls saved only after success", async () => {
    const pending = deferred<{ error: { message: string } }>(); mocks.confirm.mockReturnValueOnce(pending.promise).mockResolvedValueOnce({});
    await render(true); await act(async () => { button("Save payment method").click(); button("Save payment method").click(); });
    expect(mocks.confirm).toHaveBeenCalledTimes(1); expect(mocks.saved).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ error: { message: "Card declined" } })); expect(container.textContent).toContain("Card declined");
    await act(async () => button("Save payment method").click()); expect(mocks.saved).toHaveBeenCalledTimes(1);
  });
  it("does not notify a closed sheet when an in-flight confirmation completes", async () => {
    const pending = deferred<Record<string, unknown>>(); mocks.confirm.mockReturnValue(pending.promise);
    await render(true); await act(async () => button("Save payment method").click()); await render(false);
    await act(async () => pending.resolve({})); expect(mocks.saved).not.toHaveBeenCalled(); expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
  it("handles an embedded form load failure with an explicit retry", async () => {
    await render(true); await act(async () => mocks.elementError!()); expect(container.textContent).toContain("form could not load");
    await act(async () => button("Try again").click()); expect(mocks.setup).toHaveBeenCalledTimes(2); expect(secret()).toBe("setup-secret");
  });
  it("does not start Stripe or setup when payments are unconfigured/preview-disabled", async () => {
    vi.stubEnv("VITE_STRIPE_PUBLISHABLE_KEY", ""); await render(true);
    expect(mocks.load).not.toHaveBeenCalled(); expect(mocks.setup).not.toHaveBeenCalled(); expect(container.textContent).toContain("Payment setup is unavailable");
  });
});
