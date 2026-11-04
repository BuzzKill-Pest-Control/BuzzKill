import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Stripe } from "@stripe/stripe-js";
const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@stripe/stripe-js/pure", () => ({ loadStripe: mocks.load }));
import { createPaymentStripeLoader, loadPaymentStripe } from "./paymentStripe";
beforeEach(() => mocks.load.mockReset());
describe("explicit pure Stripe loader", () => {
  it("does not call Stripe at import time and shares a successful explicit request", async () => {
    expect(mocks.load).not.toHaveBeenCalled(); const stripe = {} as Stripe; mocks.load.mockResolvedValue(stripe);
    const a = loadPaymentStripe("pk_test_explicit"), b = loadPaymentStripe("pk_test_explicit"); expect(a).toBe(b);
    expect(await a).toBe(stripe); expect(await loadPaymentStripe("pk_test_explicit")).toBe(stripe); expect(mocks.load).toHaveBeenCalledTimes(1);
  });
  it.each(["null", "failure"])("permits an explicit retry after %s without looping", async (kind) => {
    const stripe = {} as Stripe, load = vi.fn().mockImplementationOnce(() => kind === "null" ? Promise.resolve(null) : Promise.reject(new Error("offline"))).mockResolvedValueOnce(stripe);
    const get = createPaymentStripeLoader(load); await expect(get("pk_test_retry")).rejects.toThrow(); expect(load).toHaveBeenCalledTimes(1);
    expect(await get("pk_test_retry")).toBe(stripe); expect(load).toHaveBeenCalledTimes(2);
  });
});
