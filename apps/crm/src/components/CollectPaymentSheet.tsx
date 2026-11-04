import { lazyScreen } from "../lib/lazyScreen";
import { Sheet } from "../ui/kit";

export type PaymentSetupProps = { customerId: string; onSaved: () => void };
const PaymentSetup = lazyScreen<PaymentSetupProps>(() => import("./PaymentSetup"));

/** Closed sheets do not import the payment UI, load Stripe or start setup. */
export default function CollectPaymentSheet({ customerId, open, onClose, onSaved }: PaymentSetupProps & {
  open: boolean; onClose: () => void;
}) {
  if (!open) return null;
  return (
    <Sheet open onClose={onClose} title="Payment method">
      <PaymentSetup.Screen key={customerId} customerId={customerId} onSaved={onSaved} />
    </Sheet>
  );
}
