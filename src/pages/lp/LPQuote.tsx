/**
 * Landing Page 1: "Instant Quote Calculator"
 *
 * Conversion strategy: VALUE-FIRST / INSTANT GRATIFICATION
 * - Lead sees a price within 10 seconds of landing
 * - Interactive calculator creates investment (sunk-cost)
 * - Price reveal creates urgency to "lock it in"
 * - Minimal form after price is shown (progressive disclosure)
 *
 * Best for: Property managers comparison-shopping, price-sensitive leads
 * Google Ads match: "HOA pest control cost", "condo pest control pricing"
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { submitLead } from "../../lib/leadIntake";
import SEO from "../../components/SEO";

// Pricing logic (mirrors handler.ts)
const BASE: Record<string, number> = {
  "Association:Monthly": 110,
  "Association:Every 2 Months": 90,
  "Association:Every 3 Months": 70,
  "Residential:Monthly": 69,
  "Residential:Every 2 Months": 56,
  "Residential:Every 3 Months": 45,
};

const TIERS: Record<string, { threshold: number; tiers: { min: number; max: number; per: number; premium: number }[] }> = {
  "Association:Monthly": { threshold: 10, tiers: [{ min: 11, max: 25, per: 15, premium: 55 }, { min: 26, max: 50, per: 25, premium: 100 }, { min: 51, max: 100, per: 50, premium: 140 }, { min: 101, max: 0, per: 100, premium: 275 }] },
  "Association:Every 2 Months": { threshold: 10, tiers: [{ min: 11, max: 25, per: 15, premium: 40 }, { min: 26, max: 50, per: 25, premium: 80 }, { min: 51, max: 100, per: 50, premium: 115 }, { min: 101, max: 0, per: 100, premium: 150 }] },
  "Association:Every 3 Months": { threshold: 10, tiers: [{ min: 11, max: 25, per: 15, premium: 35 }, { min: 26, max: 50, per: 25, premium: 65 }, { min: 51, max: 100, per: 50, premium: 90 }, { min: 101, max: 0, per: 100, premium: 180 }] },
  "Residential:Monthly": { threshold: 1000, tiers: [{ min: 1001, max: 4000, per: 1000, premium: 15 }, { min: 4001, max: 0, per: 1000, premium: 23 }] },
  "Residential:Every 2 Months": { threshold: 1000, tiers: [{ min: 1001, max: 4000, per: 1000, premium: 13 }, { min: 4001, max: 0, per: 1000, premium: 19 }] },
  "Residential:Every 3 Months": { threshold: 1000, tiers: [{ min: 1001, max: 4000, per: 1000, premium: 10 }, { min: 4001, max: 0, per: 1000, premium: 15 }] },
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

function fmt(n: number) {
  return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

type Step = "calc" | "contact" | "done";

export default function LPQuote() {
  const [step, setStep] = useState<Step>("calc");
  const [type, setType] = useState<"Association" | "Residential">("Association");
  const [freq, setFreq] = useState("Monthly");
  const [cnt, setCnt] = useState("");
  const [price, setPrice] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState({ first: "", last: "", email: "", phone: "", addr: "", city: "", state: "MA", zip: "", company: "" });

  const cntNum = parseInt(cnt) || 0;
  const livePrice = cntNum > 0 ? calcPrice(type, freq, cntNum) : 0;

  function handleCalc(e: FormEvent) {
    e.preventDefault();
    if (cntNum <= 0) return;
    setPrice(livePrice);
    setStep("contact");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitLead({
        propertyType: type,
        ...data,
        units: type === "Association" ? cnt : "",
        sqft: type === "Residential" ? cnt : "",
        freq,
      });
      if (result.ok) setStep("done");
      else setError("error" in result.body ? String(result.body.error) : "Something went wrong. Call 508-258-9294.");
    } catch {
      setError("Network error. Please call 508-258-9294.");
    } finally {
      setSubmitting(false);
    }
  }

  const update = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData({ ...data, [k]: e.target.value });

  return (
    <div style={{ minHeight: "100vh", background: "var(--bk-cream)" }}>
      <SEO
        title="Get Your Instant Pest Control Quote"
        description="See your HOA or condo pest control price in seconds. No waiting, no sales calls — just your quote."
        noindex
      />

      {/* Minimal header — no nav escape routes */}
      <div style={{ background: "var(--bk-black)", padding: "16px 24px", textAlign: "center" }}>
        <img src="/images/logo.png" alt="BuzzKill Pest Control" style={{ height: 48, margin: "0 auto" }} />
      </div>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "48px 24px 80px" }}>

        {step === "calc" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <div className="bk-eyebrow" style={{ marginBottom: 8 }}>Instant Quote</div>
              <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 700, textTransform: "uppercase", margin: "0 0 12px", color: "var(--fg1)" }}>
                See Your Price in Seconds
              </h1>
              <p style={{ fontSize: 16, color: "var(--fg2)", maxWidth: 440, margin: "0 auto" }}>
                No sales calls. No waiting. Just your customized pest control quote — instantly.
              </p>
            </div>

            <form onSubmit={handleCalc} style={{ background: "var(--bk-white)", borderRadius: "var(--radius-lg)", padding: 28, border: "1px solid var(--border)" }}>
              <div className="bk-field bk-full" style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: "block" }}>Property Type</label>
                <div className="bk-segmented" role="radiogroup">
                  {(["Association", "Residential"] as const).map((opt) => (
                    <button type="button" key={opt} className={`bk-seg ${type === opt ? "is-active" : ""}`} onClick={() => setType(opt)}>
                      {opt === "Association" ? "HOA / Condo" : "Residential"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bk-field" style={{ marginBottom: 20 }}>
                <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: "block" }}>
                  {type === "Association" ? "Number of Units" : "Square Footage"}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={cnt}
                  onChange={(e) => setCnt(e.target.value)}
                  placeholder={type === "Association" ? "e.g. 48" : "e.g. 2400"}
                  required
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 16 }}
                />
              </div>

              <div className="bk-field" style={{ marginBottom: 24 }}>
                <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, display: "block" }}>Service Frequency</label>
                <select value={freq} onChange={(e) => setFreq(e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 16, background: "var(--bk-white)" }}>
                  <option>Monthly</option>
                  <option>Every 2 Months</option>
                  <option>Every 3 Months</option>
                </select>
              </div>

              {/* Live price preview */}
              {livePrice > 0 && (
                <div style={{ textAlign: "center", padding: "20px 0 4px", borderTop: "1px solid var(--border)" }}>
                  <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--bk-green-deep)", fontWeight: 700 }}>
                    Estimated Price
                  </div>
                  <div style={{ fontSize: 44, fontWeight: 800, color: "var(--fg1)", lineHeight: 1.1 }}>
                    {fmt(livePrice)}
                    <span style={{ fontSize: 16, fontWeight: 400, color: "var(--fg2)" }}> / service</span>
                  </div>
                </div>
              )}

              <button type="submit" className="bk-btn bk-btn-primary" style={{ width: "100%", marginTop: 20, padding: "14px 24px", fontSize: 16 }}>
                {livePrice > 0 ? `Lock In ${fmt(livePrice)} — Get Started` : "Calculate My Quote"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "var(--fg3)" }}>
              Licensed &amp; insured in MA, NH, and RI &bull; 508-258-9294
            </div>
          </>
        )}

        {step === "contact" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 28 }}>
              <div style={{ background: "var(--bk-white)", borderLeft: "4px solid var(--bk-green)", borderRadius: "0 8px 8px 0", padding: "20px 24px", display: "inline-block", marginBottom: 20 }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--bk-green-deep)", fontWeight: 700 }}>Your Quote</div>
                <div style={{ fontSize: 36, fontWeight: 800 }}>{fmt(price)}<span style={{ fontSize: 15, fontWeight: 400, color: "var(--fg2)" }}> / service</span></div>
              </div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 24, fontWeight: 700, textTransform: "uppercase", margin: "0 0 8px" }}>
                Almost There
              </h2>
              <p style={{ fontSize: 15, color: "var(--fg2)" }}>
                Enter your details and we&rsquo;ll send a formal quote with a service agreement within one business day.
              </p>
            </div>

            <form onSubmit={handleSubmit} style={{ background: "var(--bk-white)", borderRadius: "var(--radius-lg)", padding: 28, border: "1px solid var(--border)" }}>
              {type === "Association" && (
                <div className="bk-field" style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>Association Name</label>
                  <input value={data.company} onChange={update("company")} placeholder="Brookfield Condo Trust" style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 15 }} />
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div className="bk-field">
                  <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>First Name *</label>
                  <input required value={data.first} onChange={update("first")} style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 15 }} />
                </div>
                <div className="bk-field">
                  <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>Last Name *</label>
                  <input required value={data.last} onChange={update("last")} style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 15 }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div className="bk-field">
                  <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>Email *</label>
                  <input required type="email" value={data.email} onChange={update("email")} style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 15 }} />
                </div>
                <div className="bk-field">
                  <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>Phone *</label>
                  <input required type="tel" value={data.phone} onChange={update("phone")} style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 15 }} />
                </div>
              </div>
              <div className="bk-field" style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>Service Address *</label>
                <input required value={data.addr} onChange={update("addr")} style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 15 }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
                <div className="bk-field">
                  <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>City *</label>
                  <input required value={data.city} onChange={update("city")} style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 15 }} />
                </div>
                <div className="bk-field">
                  <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>State *</label>
                  <input required maxLength={2} value={data.state} onChange={(e) => setData({ ...data, state: e.target.value.toUpperCase().slice(0, 2) })} style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 15 }} />
                </div>
                <div className="bk-field">
                  <label style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: "block" }}>Zip *</label>
                  <input required value={data.zip} onChange={update("zip")} style={{ width: "100%", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--border)", fontSize: 15 }} />
                </div>
              </div>

              {error && (
                <div style={{ background: "#FFF4F2", border: "1px solid #E53935", color: "#7A1A0F", borderRadius: 6, padding: "10px 14px", fontSize: 14, marginBottom: 16 }}>{error}</div>
              )}

              <button type="submit" disabled={submitting} className="bk-btn bk-btn-primary" style={{ width: "100%", padding: "14px 24px", fontSize: 16 }}>
                {submitting ? "Submitting..." : "Get My Formal Quote & Agreement"}
              </button>
            </form>

            <button type="button" onClick={() => setStep("calc")} style={{ display: "block", margin: "16px auto 0", background: "none", border: 0, color: "var(--fg3)", fontSize: 13, cursor: "pointer" }}>
              &larr; Recalculate
            </button>
          </>
        )}

        {step === "done" && (
          <div style={{ textAlign: "center", paddingTop: 40 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bk-green)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--bk-black)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>You&rsquo;re All Set!</h2>
            <div style={{ background: "var(--bk-white)", borderLeft: "4px solid var(--bk-green)", borderRadius: "0 8px 8px 0", padding: "16px 24px", display: "inline-block", marginBottom: 20 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--bk-green-deep)", fontWeight: 700 }}>Your Estimated Quote</div>
              <div style={{ fontSize: 32, fontWeight: 800 }}>{fmt(price)}<span style={{ fontSize: 14, fontWeight: 400, color: "var(--fg2)" }}> / service</span></div>
            </div>
            <p style={{ fontSize: 16, color: "var(--fg2)", maxWidth: 420, margin: "0 auto 8px" }}>
              We&rsquo;ve sent a confirmation and quote to <strong>{data.email}</strong>. You&rsquo;ll receive a formal service agreement within one business day.
            </p>
            <p style={{ fontSize: 14, color: "var(--fg3)" }}>
              Questions? Call <a href="tel:508-258-9294" style={{ color: "var(--bk-green-deep)", fontWeight: 600 }}>508-258-9294</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
