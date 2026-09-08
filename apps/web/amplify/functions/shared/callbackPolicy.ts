/**
 * The guarantee, stated once.
 *
 * What the code implements (callbacks.ts, GL-10): only an ACTIVE service plan
 * qualifies, one-time work is ineligible, the request must name a completed
 * visit, a photo is required, one callback per original visit, the technician
 * records whether the activity was treatable and unexpected, and a qualifying
 * callback visit costs the customer nothing. Every place the website, the
 * agreement PDF, and the customer emails describe that promise reads this
 * sentence, and a test keeps the marketing pages on it.
 *
 * Pure: shared by the Lambdas and the Vite app.
 */

export const CALLBACK_RETURN_BUSINESS_DAYS = 7;

/** The customer-facing policy sentence. */
export const CALLBACK_POLICY_TEXT =
  "If covered pests return between scheduled visits while your service plan is active, request a callback. Qualifying callbacks are provided at no charge.";

/** A short card title to pair with the sentence. */
export const CALLBACK_POLICY_TITLE = "We Stand Behind Our Plans";

/** The rules the sentence rests on, for tests and for staff copy. */
export const CALLBACK_POLICY_RULES = {
  activePlansOnly: true,
  oneTimeServicesEligible: false,
  photoRequired: true,
  oneCallbackPerOriginalVisit: true,
  qualifyingCallbackCharge: 0,
  returnWithinBusinessDays: CALLBACK_RETURN_BUSINESS_DAYS,
} as const;

/**
 * Wording that overstates the policy and must not appear on public pages:
 * unconditional re-service, a 30-day window, or a blanket satisfaction
 * guarantee.
 */
export const FORBIDDEN_GUARANTEE_PATTERNS: readonly RegExp[] = [
  /so do we/i,
  /30[- ]day (re-?treatment )?guarantee/i,
  /day guarantee/i,
  /100% satisfaction/i,
  /guaranteed (removal|elimination|results)/i,
  /free callbacks? for (one-time|any)/i,
];
