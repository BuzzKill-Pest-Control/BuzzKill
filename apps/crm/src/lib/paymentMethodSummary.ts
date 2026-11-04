import { queryCache } from "./queryCache";

/** This query can repair Customer.paymentMethodLabel while adopting Stripe's
 * saved default. Invalidate directory reads only when that repair is indicated
 * or its outcome is uncertain; callers retain their existing result handling. */
export async function readPaymentMethodSummary<T extends { data?: unknown; errors?: readonly { message: string }[] }>(
  request: Promise<T>, originalLabel: string | null | undefined
): Promise<T> {
  const scope = queryCache.writeScope();
  const invalidate = () => {
    if (scope === queryCache.writeScope()) queryCache.invalidate(["customers"]);
  };
  let result: T;
  try { result = await request; }
  catch (error) { invalidate(); throw error; }
  let summary: unknown = result?.data;
  if (typeof summary === "string") { try { summary = JSON.parse(summary); } catch { summary = null; } }
  if (result?.errors?.length || !summary || typeof summary !== "object" || Array.isArray(summary)) invalidate();
  else {
    const value = summary as Record<string, unknown>;
    if (value.hasPaymentMethod === true && typeof value.label === "string") {
      if (value.label !== (originalLabel ?? null)) invalidate();
    } else if (!(value.hasPaymentMethod === false && value.label === null)) invalidate();
    // No saved method does not mean the server cleared its stored label.
  }
  return result;
}
