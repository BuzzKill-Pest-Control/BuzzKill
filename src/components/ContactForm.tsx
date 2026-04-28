import { useState } from "react";
import type { FormEvent } from "react";
import { submitLead } from "../lib/leadIntake";

type PropertyType = "Association" | "Residential";

type ContactFormProps = {
  eyebrow?: string;
  title?: string;
  intro?: string;
};

// Pricing logic mirrors the Lambda handler so we can show a live quote
const BASE: Record<string, number> = {
  "Association:Monthly": 110,
  "Association:Every 2 Months": 90,
  "Association:Every 3 Months": 70,
  "Residential:Monthly": 69,
  "Residential:Every 2 Months": 56,
  "Residential:Every 3 Months": 45,
};

const TIERS: Record<
  string,
  {
    threshold: number;
    tiers: { min: number; max: number; per: number; premium: number }[];
  }
> = {
  "Association:Monthly": {
    threshold: 10,
    tiers: [
      { min: 11, max: 25, per: 15, premium: 55 },
      { min: 26, max: 50, per: 25, premium: 100 },
      { min: 51, max: 100, per: 50, premium: 140 },
      { min: 101, max: 0, per: 100, premium: 275 },
    ],
  },
  "Association:Every 2 Months": {
    threshold: 10,
    tiers: [
      { min: 11, max: 25, per: 15, premium: 40 },
      { min: 26, max: 50, per: 25, premium: 80 },
      { min: 51, max: 100, per: 50, premium: 115 },
      { min: 101, max: 0, per: 100, premium: 150 },
    ],
  },
  "Association:Every 3 Months": {
    threshold: 10,
    tiers: [
      { min: 11, max: 25, per: 15, premium: 35 },
      { min: 26, max: 50, per: 25, premium: 65 },
      { min: 51, max: 100, per: 50, premium: 90 },
      { min: 101, max: 0, per: 100, premium: 180 },
    ],
  },
  "Residential:Monthly": {
    threshold: 1000,
    tiers: [
      { min: 1001, max: 4000, per: 1000, premium: 15 },
      { min: 4001, max: 0, per: 1000, premium: 23 },
    ],
  },
  "Residential:Every 2 Months": {
    threshold: 1000,
    tiers: [
      { min: 1001, max: 4000, per: 1000, premium: 13 },
      { min: 4001, max: 0, per: 1000, premium: 19 },
    ],
  },
  "Residential:Every 3 Months": {
    threshold: 1000,
    tiers: [
      { min: 1001, max: 4000, per: 1000, premium: 10 },
      { min: 4001, max: 0, per: 1000, premium: 15 },
    ],
  },
};

function calcPrice(type: string, freq: string, cnt: number): number {
  const key = `${type}:${freq}`;
  const base = BASE[key] ?? 0;
  const config = TIERS[key];
  if (!config || cnt <= config.threshold) return base;
  let prem = 0;
  for (const t of config.tiers) {
    if (cnt < t.min) break;
    const mx = t.max === 0 ? Infinity : t.max;
    const units = Math.min(cnt, mx) - t.min + 1;
    prem += Math.ceil(units / t.per) * t.premium;
  }
  return base + prem;
}

function fmt(n: number): string {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

const STEPS = [
  { num: 1, label: "Property" },
  { num: 2, label: "Contact" },
  { num: 3, label: "Address" },
];

export default function ContactForm({
  eyebrow = "Get Started",
  title = "Request a Free Quote",
  intro = "Tell us about your property and we'll send a custom quote within one business day.",
}: ContactFormProps) {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<PropertyType>("Association");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quote, setQuote] = useState<{
    amount: number;
    frequency: string;
  } | null>(null);
  const [data, setData] = useState({
    first: "",
    last: "",
    email: "",
    phone: "",
    addr: "",
    city: "",
    state: "MA",
    zip: "",
    units: "",
    sqft: "",
    freq: "Monthly",
    company: "",
  });

  const update =
    (k: keyof typeof data) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setData({ ...data, [k]: e.target.value });
    };

  // Live price preview from current form state
  const cntNum = parseInt(type === "Association" ? data.units : data.sqft) || 0;
  const livePrice = cntNum > 0 ? calcPrice(type, data.freq, cntNum) : 0;

  function nextStep() {
    setStep((s) => Math.min(s + 1, 3));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await submitLead({ propertyType: type, ...data });
      if (result.ok) {
        const body = result.body as {
          monthlyCharge?: number;
          frequency?: string;
        };
        if (body.monthlyCharge) {
          setQuote({
            amount: body.monthlyCharge,
            frequency: body.frequency ?? data.freq,
          });
        }
        setSubmitted(true);
      } else {
        const msg =
          ("error" in result.body && result.body.error) ||
          `Something went wrong (status ${result.status}). Please try again or call 508-258-9294.`;
        setErrorMsg(String(msg));
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Network error. Please try again or call 508-258-9294.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success state ──────────────────────────────────────────────────
  if (submitted) {
    const fmtPrice = quote ? fmt(quote.amount) : null;

    return (
      <section className="bk-section bk-section-light" id="form">
        <div className="bk-container bk-narrow bk-confirm">
          <div className="bk-form-success-icon" aria-hidden="true">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div className="bk-eyebrow">Confirmation</div>
          <h2 className="bk-h2">Request received.</h2>

          {fmtPrice && (
            <div className="bk-quote-card">
              <div className="bk-quote-card__label">Your Estimated Quote</div>
              <div className="bk-quote-card__price">
                {fmtPrice}
                <span className="bk-quote-card__per"> / service</span>
              </div>
              <div className="bk-quote-card__meta">
                {type === "Association" ? "Association / HOA" : "Residential"}{" "}
                &bull; {quote?.frequency} service
              </div>
            </div>
          )}

          <p className="bk-body-lead">
            Thanks{data.first ? `, ${data.first}` : ""}! A confirmation and
            agreement have been sent to{" "}
            <strong>{data.email || "your email"}</strong>. Sign the agreement
            to schedule your first appointment.
          </p>
          <button
            type="button"
            className="bk-btn bk-btn-outline"
            onClick={() => {
              setSubmitted(false);
              setQuote(null);
              setStep(1);
            }}
          >
            Submit Another
          </button>
        </div>
      </section>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────
  return (
    <section className="bk-section bk-section-light" id="form">
      <div className="bk-container bk-narrow">
        <div className="bk-eyebrow">{eyebrow}</div>
        <h2 className="bk-h2">{title}</h2>
        <p className="bk-body-lead">{intro}</p>

        <div className="bk-form-card">
          {/* Step indicator */}
          <div className="bk-stepper" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3}>
            {STEPS.map((s, i) => (
              <div
                key={s.num}
                className={`bk-stepper__step ${
                  step === s.num ? "is-active" : ""
                } ${step > s.num ? "is-done" : ""}`}
              >
                <div className="bk-stepper__num">
                  {step > s.num ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    s.num
                  )}
                </div>
                <div className="bk-stepper__label">{s.label}</div>
                {i < STEPS.length - 1 && (
                  <div className="bk-stepper__line" aria-hidden="true" />
                )}
              </div>
            ))}
          </div>

          <form className="bk-form-wizard" onSubmit={handleSubmit}>
            {/* ── STEP 1: Property ─────────────────────────────── */}
            {step === 1 && (
              <div className="bk-form-step">
                <h3 className="bk-form-step__title">Tell us about your property</h3>

                <div className="bk-field bk-full">
                  <label>Property type</label>
                  <div
                    className="bk-segmented bk-segmented--full"
                    role="radiogroup"
                    aria-label="Property type"
                  >
                    {(["Association", "Residential"] as PropertyType[]).map(
                      (opt) => (
                        <button
                          type="button"
                          key={opt}
                          className={`bk-seg ${type === opt ? "is-active" : ""}`}
                          aria-pressed={type === opt}
                          onClick={() => setType(opt)}
                        >
                          {opt === "Association" ? "Association / HOA" : opt}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                {type === "Association" ? (
                  <>
                    <div className="bk-field bk-full">
                      <label htmlFor="company">Association name</label>
                      <input
                        id="company"
                        value={data.company}
                        onChange={update("company")}
                        placeholder="Brookfield Condominium Trust"
                      />
                    </div>
                    <div className="bk-field bk-full">
                      <label htmlFor="units">Number of units</label>
                      <input
                        id="units"
                        inputMode="numeric"
                        value={data.units}
                        onChange={update("units")}
                        placeholder="48"
                      />
                    </div>
                  </>
                ) : (
                  <div className="bk-field bk-full">
                    <label htmlFor="sqft">Square footage</label>
                    <input
                      id="sqft"
                      inputMode="numeric"
                      value={data.sqft}
                      onChange={update("sqft")}
                      placeholder="2400"
                    />
                  </div>
                )}

                <div className="bk-field bk-full">
                  <label htmlFor="freq">Service frequency</label>
                  <select id="freq" value={data.freq} onChange={update("freq")}>
                    <option>Monthly</option>
                    <option>Every 2 Months</option>
                    <option>Every 3 Months</option>
                  </select>
                </div>

                {/* Live quote preview */}
                {livePrice > 0 && (
                  <div className="bk-quote-preview" aria-live="polite">
                    <div className="bk-quote-preview__label">Estimated price</div>
                    <div className="bk-quote-preview__price">
                      {fmt(livePrice)}
                      <span className="bk-quote-preview__per"> / service</span>
                    </div>
                  </div>
                )}

                <div className="bk-form-step__actions">
                  <button
                    type="button"
                    className="bk-btn bk-btn-primary"
                    onClick={nextStep}
                    disabled={
                      type === "Association" ? !data.units : !data.sqft
                    }
                  >
                    Continue &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Contact ──────────────────────────────── */}
            {step === 2 && (
              <div className="bk-form-step">
                <h3 className="bk-form-step__title">How can we reach you?</h3>

                <div className="bk-form-row">
                  <div className="bk-field">
                    <label htmlFor="first">First name *</label>
                    <input
                      id="first"
                      value={data.first}
                      onChange={update("first")}
                      autoComplete="given-name"
                      required
                    />
                  </div>
                  <div className="bk-field">
                    <label htmlFor="last">Last name *</label>
                    <input
                      id="last"
                      value={data.last}
                      onChange={update("last")}
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>

                <div className="bk-field bk-full">
                  <label htmlFor="email">Email *</label>
                  <input
                    id="email"
                    type="email"
                    value={data.email}
                    onChange={update("email")}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div className="bk-field bk-full">
                  <label htmlFor="phone">Phone *</label>
                  <input
                    id="phone"
                    type="tel"
                    value={data.phone}
                    onChange={update("phone")}
                    autoComplete="tel"
                    placeholder="(508) 555-0123"
                    required
                  />
                </div>

                <div className="bk-form-step__actions">
                  <button
                    type="button"
                    className="bk-btn bk-btn-outline"
                    onClick={prevStep}
                  >
                    &larr; Back
                  </button>
                  <button
                    type="button"
                    className="bk-btn bk-btn-primary"
                    onClick={nextStep}
                    disabled={
                      !data.first || !data.last || !data.email || !data.phone
                    }
                  >
                    Continue &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Address ──────────────────────────────── */}
            {step === 3 && (
              <div className="bk-form-step">
                <h3 className="bk-form-step__title">Where is the property?</h3>

                <div className="bk-field bk-full">
                  <label htmlFor="addr">Service address *</label>
                  <input
                    id="addr"
                    value={data.addr}
                    onChange={update("addr")}
                    autoComplete="street-address"
                    placeholder="123 Main Street"
                    required
                  />
                </div>

                <div className="bk-form-row bk-form-row--3">
                  <div className="bk-field">
                    <label htmlFor="city">City *</label>
                    <input
                      id="city"
                      value={data.city}
                      onChange={update("city")}
                      autoComplete="address-level2"
                      required
                    />
                  </div>
                  <div className="bk-field">
                    <label htmlFor="state">State *</label>
                    <input
                      id="state"
                      value={data.state}
                      onChange={(e) =>
                        setData({
                          ...data,
                          state: e.target.value.toUpperCase().slice(0, 2),
                        })
                      }
                      autoComplete="address-level1"
                      placeholder="MA"
                      maxLength={2}
                      required
                    />
                  </div>
                  <div className="bk-field">
                    <label htmlFor="zip">Zip *</label>
                    <input
                      id="zip"
                      inputMode="numeric"
                      value={data.zip}
                      onChange={update("zip")}
                      autoComplete="postal-code"
                      placeholder="01752"
                      required
                    />
                  </div>
                </div>

                {/* Recap card */}
                {livePrice > 0 && (
                  <div className="bk-quote-preview">
                    <div className="bk-quote-preview__label">
                      Your Estimated Quote
                    </div>
                    <div className="bk-quote-preview__price">
                      {fmt(livePrice)}
                      <span className="bk-quote-preview__per"> / service</span>
                    </div>
                    <div className="bk-quote-preview__meta">
                      {type === "Association"
                        ? "Association / HOA"
                        : "Residential"}{" "}
                      &bull; {data.freq} service
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="bk-form-error" role="alert">
                    {errorMsg}
                  </div>
                )}

                <div className="bk-form-step__actions">
                  <button
                    type="button"
                    className="bk-btn bk-btn-outline"
                    onClick={prevStep}
                  >
                    &larr; Back
                  </button>
                  <button
                    type="submit"
                    className="bk-btn bk-btn-primary"
                    disabled={submitting}
                    aria-busy={submitting}
                  >
                    {submitting ? "Submitting…" : "Get My Quote"}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Trust bar */}
        <div className="bk-form-trust">
          {[
            "Licensed & Insured",
            "MA • RI",
            "No Obligation",
            "Reply within 1 business day",
          ].map((t, i) => (
            <div key={i} className="bk-form-trust__item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
