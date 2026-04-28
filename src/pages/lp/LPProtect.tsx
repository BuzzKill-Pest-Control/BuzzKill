/**
 * Landing Page 2: "Protect Your Community"
 *
 * Conversion strategy: PROBLEM → PAIN → SOLUTION + SOCIAL PROOF + URGENCY
 * - Opens with the pain of uncontrolled pest issues in HOAs
 * - Shows consequences of inaction (complaints, health, property value)
 * - Social proof: number of communities served, trust signals
 * - Urgency: seasonal messaging, limited capacity
 * - Single CTA: Request a free assessment
 *
 * Best for: HOA board members reacting to a complaint, worried PMs
 * Google Ads match: "pest problem condo", "HOA pest complaint", "pest control HOA"
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { submitLead } from "../../lib/leadIntake";
import SEO from "../../components/SEO";

export default function LPProtect() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState({ first: "", last: "", email: "", phone: "", addr: "", city: "", state: "MA", zip: "", company: "", units: "" });

  const update = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData({ ...data, [k]: e.target.value });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const result = await submitLead({ propertyType: "Association", ...data, sqft: "", freq: "Monthly" });
      if (result.ok) setSubmitted(true);
      else setError("error" in result.body ? String(result.body.error) : "Something went wrong.");
    } catch {
      setError("Network error. Please call 508-258-9294.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bk-black)", color: "#fff" }}>
      <SEO
        title="Stop Pest Complaints Before They Escalate"
        description="Professional HOA and condo pest control that protects your community, your residents, and your property value. Free assessment."
        noindex
      />

      {/* Dark header */}
      <div style={{ padding: "16px 24px", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <img src="/images/logo.png" alt="BuzzKill Pest Control" style={{ height: 48, margin: "0 auto" }} />
      </div>

      {/* Hero — problem statement */}
      <section style={{ padding: "64px 24px 48px", textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
        <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--bk-green)", fontWeight: 700, marginBottom: 16 }}>
          For HOA Boards &amp; Property Managers
        </div>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(32px, 6vw, 52px)", fontWeight: 700, textTransform: "uppercase", lineHeight: 1.05, margin: "0 0 20px" }}>
          Pest Complaints Don&rsquo;t Solve Themselves
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.65, color: "rgba(255,255,255,0.75)", maxWidth: 560, margin: "0 auto" }}>
          When pests show up in one unit, they&rsquo;re already in the walls. One-off treatments don&rsquo;t fix building-wide problems. <strong style={{ color: "#fff" }}>Your community needs a plan.</strong>
        </p>
      </section>

      {/* Pain points */}
      <section style={{ padding: "0 24px 56px", maxWidth: 800, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
          {[
            { num: "67%", text: "of condo pest issues originate in shared spaces, not individual units" },
            { num: "3x", text: "more expensive to treat reactively than with a preventative program" },
            { num: "#1", text: "resident complaint category for HOA boards — ahead of parking and noise" },
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "24px 20px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--bk-green)", lineHeight: 1, marginBottom: 8 }}>{s.num}</div>
              <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.65)", margin: 0 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Solution + trust */}
      <section style={{ background: "var(--bk-neutral-900)", padding: "56px 24px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, textTransform: "uppercase", marginBottom: 20 }}>
            Building-Wide Protection.<br />
            <span style={{ color: "var(--bk-green)" }}>Not Band-Aid Treatments.</span>
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginTop: 32 }}>
            {[
              "Common areas, basements, exteriors — covered",
              "Optional discounted in-unit service for owners",
              "Board-friendly documentation and scheduling",
              "Licensed & insured in MA, NH, and RI",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--bk-green)" strokeWidth="3" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}><path d="M20 6L9 17l-5-5" /></svg>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Urgency bar */}
      <div style={{ background: "var(--bk-green)", padding: "14px 24px", textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--bk-black)", letterSpacing: "0.02em" }}>
          Peak pest season is here. We&rsquo;re booking new communities now for spring/summer coverage.
        </p>
      </div>

      {/* Form or success */}
      <section style={{ padding: "56px 24px 80px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {submitted ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bk-green)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--bk-black)" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
              </div>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>We&rsquo;ll Be in Touch</h2>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)" }}>
                A BuzzKill specialist will contact you within one business day to discuss your community&rsquo;s needs and schedule a free assessment.
              </p>
            </div>
          ) : (
            <>
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
                  Request a Free Assessment
                </h2>
                <p style={{ fontSize: 15, color: "rgba(255,255,255,0.6)" }}>
                  We&rsquo;ll evaluate your property and build a custom plan. No obligation.
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ background: "var(--bk-neutral-800)", borderRadius: "var(--radius-lg)", padding: 28, border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="bk-field" style={{ marginBottom: 14 }}>
                  <input required placeholder="Association / Property Name" value={data.company} onChange={update("company")} style={{ width: "100%", padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <input required placeholder="First Name *" value={data.first} onChange={update("first")} style={{ padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                  <input required placeholder="Last Name *" value={data.last} onChange={update("last")} style={{ padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <input required type="email" placeholder="Email *" value={data.email} onChange={update("email")} style={{ padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                  <input required type="tel" placeholder="Phone *" value={data.phone} onChange={update("phone")} style={{ padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                </div>
                <div className="bk-field" style={{ marginBottom: 14 }}>
                  <input required placeholder="Property Address *" value={data.addr} onChange={update("addr")} style={{ width: "100%", padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <input required placeholder="City *" value={data.city} onChange={update("city")} style={{ padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                  <input required placeholder="ST *" maxLength={2} value={data.state} onChange={(e) => setData({ ...data, state: e.target.value.toUpperCase().slice(0, 2) })} style={{ padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                  <input required placeholder="Zip *" value={data.zip} onChange={update("zip")} style={{ padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                </div>
                <div className="bk-field" style={{ marginBottom: 20 }}>
                  <input placeholder="Approx. Unit Count" inputMode="numeric" value={data.units} onChange={update("units")} style={{ width: "100%", padding: "12px 14px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 15 }} />
                </div>

                {error && (
                  <div style={{ background: "rgba(229,57,53,0.15)", border: "1px solid #E53935", color: "#ff8a80", borderRadius: 6, padding: "10px 14px", fontSize: 14, marginBottom: 16 }}>{error}</div>
                )}

                <button type="submit" disabled={submitting} className="bk-btn bk-btn-primary" style={{ width: "100%", padding: "14px 24px", fontSize: 16 }}>
                  {submitting ? "Submitting..." : "Get My Free Assessment"}
                </button>

                <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 14 }}>
                  No obligation. No pressure. Just a plan that works.
                </p>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
