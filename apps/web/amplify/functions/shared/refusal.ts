/**
 * Telling a person "no" is not a system failure.
 *
 * A guard that refuses a well-formed request from an authorized human — a
 * lapsed licence, a login the email already belongs to, a record that moved on
 * — is the product working. Thrown out of a Lambda, though, it is
 * indistinguishable from a crash: it counts as an invocation error and pages
 * the owner. That is exactly how a group login the office went on to create
 * six seconds later still woke someone up.
 *
 * So refusals travel as DATA. The handler returns `{ refused: "<message>" }`
 * and the screen shows those words; only genuine failures throw, and the alarm
 * gets its meaning back.
 *
 * Most guards can simply `return refusal("…")` at the point of refusal. Where
 * a guard sits inside bookkeeping that must run either way (a durable command
 * ledger, a released mutex), `throw new Refused("…")` instead and unwrap it in
 * the catch with `refusalFrom(err)` — the surrounding try/catch keeps working,
 * and an infrastructure error thrown from the same block still escapes and
 * still alarms.
 *
 * Pure leaf: zero imports (see docs/audit/PATTERNS.md, pattern 3).
 */

/** What a refused operation returns to its caller. */
export type Refusal = {
  /** The words the screen shows the person, verbatim. */
  refused: string;
  /**
   * Set when the caller can resolve the refusal by re-sending the same request
   * with an explicit confirmation (the group-login email collision is the one
   * that named this). A plain refusal is just shown.
   */
  offerReuse?: boolean;
};

/** Build a refusal envelope. */
export function refusal(message: string, opts?: { offerReuse?: boolean }): Refusal {
  return opts?.offerReuse ? { refused: message, offerReuse: true } : { refused: message };
}

/**
 * A refusal raised from inside a try block whose catch owns bookkeeping that
 * has to happen anyway. It is NOT an error condition — the catch is expected
 * to recognize it and return the envelope rather than rethrow.
 */
export class Refused extends Error {
  /** Marker the unwrapper matches on — survives a second copy of this leaf. */
  readonly isRefusal = true;
  readonly offerReuse: boolean;

  constructor(message: string, opts?: { offerReuse?: boolean }) {
    super(message);
    this.name = "Refused";
    this.offerReuse = Boolean(opts?.offerReuse);
  }
}

/**
 * The refusal envelope for a caught value, or null if it is a real error and
 * should keep propagating (and alarming).
 *
 * Matches on the marker property rather than `instanceof`: a bundled Lambda can
 * hold more than one copy of this leaf, and a refusal that fails an identity
 * check would silently become a page.
 */
export function refusalFrom(err: unknown): Refusal | null {
  if (
    err instanceof Error &&
    (err.name === "Refused" || (err as { isRefusal?: boolean }).isRefusal === true)
  ) {
    return refusal(err.message, {
      offerReuse: (err as { offerReuse?: boolean }).offerReuse === true,
    });
  }
  return null;
}
