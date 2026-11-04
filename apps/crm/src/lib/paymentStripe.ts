import { loadStripe } from "@stripe/stripe-js/pure";
import type { Stripe } from "@stripe/stripe-js";

/** Reuse the SDK across open sheets. Failed/null loads are retryable, and
 * importing this module alone never loads Stripe's external script. */
export function createPaymentStripeLoader(load: (key: string) => Promise<Stripe | null>) {
  const pending = new Map<string, Promise<Stripe>>();
  return (key: string): Promise<Stripe> => {
    let request = pending.get(key);
    if (!request) {
      request = Promise.resolve().then(() => load(key)).then((stripe) => {
        if (!stripe) throw new Error("Could not connect to payment setup. Please try again.");
        return stripe;
      }).catch((error) => { pending.delete(key); throw error; });
      pending.set(key, request);
    }
    return request;
  };
}
export const loadPaymentStripe = createPaymentStripeLoader(loadStripe);
