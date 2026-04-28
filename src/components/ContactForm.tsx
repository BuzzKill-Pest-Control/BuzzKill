import { useState } from "react";
import type { FormEvent } from "react";
import { submitLead } from "../lib/leadIntake";

type PropertyType = "Association" | "Residential";

type ContactFormProps = {
  eyebrow?: string;
  title?: string;
  intro?: string;
};

export default function ContactForm({
  eyebrow = "Contact Us Today",
  title = "Start Service",
  intro = "This form creates a FieldRoutes customer + lead. You'll receive a confirmation email after submission.",
}: ContactFormProps) {
  const [type, setType] = useState<PropertyType>("Association");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [quote, setQuote] = useState<{ amount: number; frequency: string } | null>(null);
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const result = await submitLead({ propertyType: type, ...data });
      if (result.ok) {
        const body = result.body as { monthlyCharge?: number; frequency?: string };
        if (body.monthlyCharge) {
          setQuote({ amount: body.monthlyCharge, frequency: body.frequency ?? data.freq });
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

  if (submitted) {
    const fmtPrice = quote
      ? `$${quote.amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`
      : null;

    return (
      <section className="bk-section bk-section-light" id="form">
        <div className="bk-container bk-narrow bk-confirm">
          <div className="bk-eyebrow">Confirmation</div>
          <h2 className="bk-h2">Request received.</h2>

          {fmtPrice && (
            <div
              style={{
                background: "#F7F7F4",
                borderLeft: "4px solid #7ED321",
                padding: "20px 24px",
                margin: "24px 0",
                borderRadius: "0 8px 8px 0",
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "#5FA517",
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                Your Estimated Quote
              </div>
              <div
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#0A0A0A",
                  lineHeight: 1.1,
                }}
              >
                {fmtPrice}
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 400,
                    color: "#6E6E6E",
                    marginLeft: 4,
                  }}
                >
                  / service
                </span>
              </div>
              <div style={{ fontSize: 14, color: "#4A4A4A", marginTop: 4 }}>
                {type === "Association" ? "Association / HOA" : "Residential"}{" "}
                &bull; {quote?.frequency} service
              </div>
            </div>
          )}

          <p className="bk-body-lead">
            Thanks{data.first ? `, ${data.first}` : ""}! A confirmation and
            quote have been sent to {data.email || "your email"}. We'll follow
            up within one business day to finalize your service agreement and
            schedule your first appointment.
          </p>
          <button
            type="button"
            className="bk-btn bk-btn-outline"
            onClick={() => {
              setSubmitted(false);
              setQuote(null);
            }}
          >
            Submit Another
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bk-section bk-section-light" id="form">
      <div className="bk-container bk-narrow">
        <div className="bk-eyebrow">{eyebrow}</div>
        <h2 className="bk-h2">{title}</h2>
        <p className="bk-body-lead">{intro}</p>

        <form className="bk-form" onSubmit={handleSubmit}>
          <div className="bk-field bk-full">
            <label>Association or Residential?</label>
            <div className="bk-segmented" role="radiogroup" aria-label="Property type">
              {(["Association", "Residential"] as PropertyType[]).map((opt) => (
                <button
                  type="button"
                  key={opt}
                  className={`bk-seg ${type === opt ? "is-active" : ""}`}
                  aria-pressed={type === opt}
                  onClick={() => setType(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {type === "Residential" && (
            <div className="bk-field bk-full">
              <label htmlFor="sqft">Square Footage</label>
              <input
                id="sqft"
                inputMode="numeric"
                value={data.sqft}
                onChange={update("sqft")}
                placeholder="3200"
              />
              <div className="bk-help">Whole numbers only</div>
            </div>
          )}

          {type === "Association" && (
            <>
              <div className="bk-field">
                <label htmlFor="units">Unit Count</label>
                <input
                  id="units"
                  inputMode="numeric"
                  value={data.units}
                  onChange={update("units")}
                  placeholder="48"
                />
                <div className="bk-help">Whole numbers only</div>
              </div>
              <div className="bk-field">
                <label htmlFor="company">Association / Company Name</label>
                <input
                  id="company"
                  value={data.company}
                  onChange={update("company")}
                  placeholder="Brookfield Condominium Trust"
                />
              </div>
            </>
          )}

          <div className="bk-field">
            <label htmlFor="first">First Name *</label>
            <input
              id="first"
              value={data.first}
              onChange={update("first")}
              required
            />
          </div>
          <div className="bk-field">
            <label htmlFor="last">Last Name *</label>
            <input
              id="last"
              value={data.last}
              onChange={update("last")}
              required
            />
          </div>

          <div className="bk-field">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              value={data.email}
              onChange={update("email")}
              required
            />
          </div>
          <div className="bk-field">
            <label htmlFor="phone">Phone *</label>
            <input
              id="phone"
              type="tel"
              value={data.phone}
              onChange={update("phone")}
              required
            />
          </div>

          <div className="bk-field bk-full">
            <label htmlFor="addr">Service Address *</label>
            <input
              id="addr"
              value={data.addr}
              onChange={update("addr")}
              required
            />
          </div>

          <div className="bk-field">
            <label htmlFor="city">City *</label>
            <input
              id="city"
              value={data.city}
              onChange={update("city")}
              required
            />
          </div>
          <div className="bk-field bk-third">
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
              placeholder="MA"
              maxLength={2}
              required
            />
            <div className="bk-help">2-letter code</div>
          </div>
          <div className="bk-field bk-third">
            <label htmlFor="zip">Zip *</label>
            <input
              id="zip"
              inputMode="numeric"
              value={data.zip}
              onChange={update("zip")}
              required
            />
          </div>

          <div className="bk-field bk-full">
            <label htmlFor="freq">Service Frequency</label>
            <select id="freq" value={data.freq} onChange={update("freq")}>
              <option>Monthly</option>
              <option>Every 2 Months</option>
              <option>Every 3 Months</option>
            </select>
          </div>

          {errorMsg && (
            <div
              className="bk-full"
              role="alert"
              style={{
                background: "#FFF4F2",
                border: "1px solid #E53935",
                color: "#7A1A0F",
                borderRadius: 6,
                padding: "12px 14px",
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {errorMsg}
            </div>
          )}

          <div className="bk-full bk-submit-row">
            <button
              type="submit"
              className="bk-btn bk-btn-primary"
              disabled={submitting}
              aria-busy={submitting}
              style={
                submitting
                  ? { opacity: 0.7, cursor: "not-allowed" }
                  : undefined
              }
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
