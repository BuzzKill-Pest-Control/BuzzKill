import { useEffect, useRef, useState } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { api, opResult } from "../lib/api";
import { confirmedMutation } from "../lib/queryCache";
import { loadPaymentStripe } from "../lib/paymentStripe";
import { toMessage, useAction } from "../lib/useAsync";
import { Button, ErrorNote, Spinner } from "../ui/kit";
import type { PaymentSetupProps } from "./CollectPaymentSheet";

/** Mounted only while open. Neither SDK loading nor SetupIntent creation
 * happens during module evaluation or for an always-mounted closed sheet. */
export default function PaymentSetup({ customerId, onSaved }: PaymentSetupProps) {
  const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined;
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState<{ stripe: Stripe; clientSecret: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef<{ customerId: string; attempt: number; promise: Promise<{ stripe: Stripe; clientSecret: string }> } | null>(null);
  useEffect(() => {
    let current = true;
    setReady(null); setError(null);
    if (!publishableKey) return;
    // Share a replayed StrictMode attempt instead of creating two intents.
    if (!started.current || started.current.customerId !== customerId || started.current.attempt !== attempt) {
      started.current = { customerId, attempt, promise: Promise.all([
        loadPaymentStripe(publishableKey),
        confirmedMutation(api().mutations.createSetupIntent({ customerId })),
      ]).then(([stripe, res]) => {
        const data = opResult<{ clientSecret?: string }>(res);
        if (!data?.clientSecret) throw new Error("Could not start payment setup. Please try again.");
        return { stripe, clientSecret: data.clientSecret };
      }) };
    }
    void started.current.promise.then((value) => { if (current) setReady(value); }, (reason) => {
      if (current) setError(toMessage(reason, "Could not start payment setup"));
    });
    return () => { current = false; };
  }, [customerId, attempt, publishableKey]);

  if (!publishableKey) return <ErrorNote error="Payment setup is unavailable right now. Please contact the BuzzKill office." />;
  const retry = () => { setReady(null); setError(null); setAttempt((value) => value + 1); };
  if (error) return <><ErrorNote error={error} /><Button onClick={retry}>Try again</Button></>;
  if (!ready) return <Spinner label="Connecting to payment setup…" />;
  return (
    <Elements stripe={ready.stripe} options={{ clientSecret: ready.clientSecret, appearance: { variables: { colorPrimary: "#176b2c" } } }}>
      <SetupForm onSaved={onSaved} onLoadError={() => setError("The payment form could not load. Please try again.")} />
    </Elements>
  );
}

function SetupForm({ onSaved, onLoadError }: { onSaved: () => void; onLoadError: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const save = useAction(async () => {
    if (!stripe || !elements) throw new Error("Payment setup is still loading");
    const result = await stripe.confirmSetup({ elements, redirect: "if_required" });
    if (result.error) throw new Error(result.error.message ?? "Could not save payment method");
  }, "Could not save payment method");
  const submit = async () => { if (await save.run() && mounted.current) onSaved(); };
  return (
    <div className="form-grid">
      <PaymentElement onLoadError={onLoadError} />
      <ErrorNote error={save.error} />
      <Button block loading={save.busy} onClick={() => void submit()}>Save payment method</Button>
      <p className="muted small">Stored securely with Stripe. BuzzKill never sees your card or account number.</p>
    </div>
  );
}
