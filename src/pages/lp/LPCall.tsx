/**
 * Landing Page 3: "Talk to a Specialist"
 *
 * Conversion strategy: MINIMAL FRICTION / PHONE-FIRST
 * - Hypothesis: HOA board members and PMs prefer talking to a person
 * - Primary CTA: Click-to-call (one tap on mobile)
 * - Secondary: ultra-short 3-field form (name, phone, address)
 * - No pricing, no complex forms — just get them on the phone
 * - Speed to lead: fastest path from ad click to conversation
 *
 * Best for: Mobile traffic, urgent pest situations, senior board members
 * Google Ads match: "pest control near me", "emergency pest control HOA"
 */
import { useState } from "react";
import type { FormEvent } from "react";
import { submitLead } from "../../lib/leadIntake";
import SEO from "../../components/SEO";

export default function LPCall() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const [first, ...rest] = name.trim().split(" ");
    try {
      await submitLead({
        propertyType: "Association",
        first: first || name,
        last: rest.join(" ") || "",
        email: "",
        phone,
        addr: address,
        city: "",
        state: "",
        zip: "",
        sqft: "",
        units: "",
        freq: "Monthly",
        company: "",
      });
      setSubmitted(true);
    } catch {
      // Even on error, show success — we'll get the lead from CloudWatch
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bk-black)", color: "#fff" }}>
      <SEO
        title="Talk to a Pest Control Specialist Now"
        description="Get expert advice on your HOA or condo pest situation. One call, one plan, done."
        noindex
      />

      {/* Minimal header */}
      <div style={{ padding: "16px 24px", textAlign: "center" }}>
        <img src="/images/logo.png" alt="BuzzKill Pest Control" style={{ height: 44, margin: "0 auto" }} />
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 24px 80px", textAlign: "center" }}>
        {!submitted ? (
          <>
            {/* Eyebrow */}
            <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--bk-green)", fontWeight: 700, marginBottom: 20 }}>
              HOA &amp; Condo Pest Control
            </div>

            {/* Headline */}
            <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(30px, 7vw, 48px)", fontWeight: 700, textTransform: "uppercase", lineHeight: 1.05, margin: "0 0 16px" }}>
              Let&rsquo;s Fix This.<br />
              <span style={{ color: "var(--bk-green)" }}>Call Now.</span>
            </h1>

            <p style={{ fontSize: 17, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", margin: "0 0 32px" }}>
              Speak with a specialist who knows condo and HOA pest control. Get a plan for your community in minutes, not days.
            </p>

            {/* Primary CTA: Phone */}
            <a
              href="tel:508-258-9294"
              className="bk-btn bk-btn-primary"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                width: "100%",
                padding: "18px 24px",
                fontSize: 20,
                fontWeight: 800,
                marginBottom: 12,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
              508-258-9294
            </a>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "0 0 40px" }}>
              Mon–Fri 7am–6pm &bull; Free consultation
            </p>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, margin: "0 0 32px" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Ultra-short callback form */}
            <div style={{ textAlign: "left" }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 20, fontWeight: 700, textTransform: "uppercase", marginBottom: 16, textAlign: "center" }}>
                Request a Callback
              </h2>
              <form onSubmit={handleSubmit}>
                <input
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 16, marginBottom: 12 }}
                />
                <input
                  required
                  type="tel"
                  placeholder="Phone Number *"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 16, marginBottom: 12 }}
                />
                <input
                  placeholder="Property Address (optional)"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 16, marginBottom: 16 }}
                />
                <button type="submit" disabled={submitting} className="bk-btn bk-btn-primary" style={{ width: "100%", padding: "14px 24px", fontSize: 16 }}>
                  {submitting ? "Sending..." : "Have Us Call You"}
                </button>
              </form>
            </div>

            {/* Trust bar */}
            <div style={{ marginTop: 40, display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap" }}>
              {["Licensed & Insured", "MA • RI", "HOA Specialists"].map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bk-green)" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                  {t}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--bk-green)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 24, marginTop: 20 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--bk-black)" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
            </div>
            <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>We&rsquo;ll Call You Shortly</h2>
            <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", marginBottom: 32 }}>
              A BuzzKill specialist will reach out to <strong style={{ color: "#fff" }}>{phone}</strong> to discuss your community&rsquo;s needs.
            </p>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)" }}>
              Can&rsquo;t wait? Call us now:
            </p>
            <a href="tel:508-258-9294" className="bk-btn bk-btn-primary" style={{ display: "inline-flex", gap: 8, padding: "14px 32px", fontSize: 18, marginTop: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" /></svg>
              508-258-9294
            </a>
          </>
        )}
      </div>
    </div>
  );
}
