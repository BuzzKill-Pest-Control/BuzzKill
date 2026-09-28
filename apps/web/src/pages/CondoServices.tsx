import { useNavigate } from "react-router-dom";
import FAQ from "../components/FAQ";
import { CONDO_FAQS } from "../data/faqs";
import QuoteCTA from "../components/QuoteCTA";

export default function CondoServices() {
  const navigate = useNavigate();
  const goToForm = () => {
    const el = document.getElementById("form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* Hero */}
      <section className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">For HOA Boards &amp; Property Managers</div>
          <h1 className="bk-h1-lower">Condo Services</h1>
          <h2 className="bk-h2" style={{ marginTop: 24 }}>
            HOA &amp; Condo Common-Area Pest Control
          </h2>
          <p className="bk-body-lead">
            BuzzKill provides reliable common-area pest control for
            condominiums, HOAs, and multi-unit residential communities. Our
            programs are designed to reduce pest pressure at the building
            level, so issues don&rsquo;t keep cycling back from shared
            spaces.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
            <button type="button" className="bk-btn bk-btn-primary" onClick={goToForm}>
              Get Instant Quote
            </button>
          </div>
        </div>
      </section>

      {/* What Common-Area Pest Control Covers */}
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">What&rsquo;s Covered</div>
          <h2 className="bk-h2">What Common-Area Pest Control Covers</h2>
          <p className="bk-body-lead">
            Every community is different, but common-area service often
            includes:
          </p>
          <ul className="bk-bullets">
            <li>Building exterior perimeter monitoring and treatment as needed</li>
            <li>Basements and foundation areas</li>
            <li>Trash and recycling rooms, compactors, dumpsters (as applicable)</li>
            <li>Mechanical / utility rooms and chase areas where pests travel</li>
            <li>Hallways / common corridors (as appropriate)</li>
            <li>Entry points and pest pressure zones identified during inspection</li>
          </ul>
          <p className="bk-p">
            {"We\u2019ll tailor scope to your building layout and association needs."}
          </p>
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              className="bk-btn bk-btn-outline"
              onClick={() => navigate("/in-unit-services")}
            >
              {"Learn About In\u2011Unit Service"}
            </button>
          </div>
        </div>
      </section>

      {/* A Preventative Program Built for Shared Living */}
      <section className="bk-section bk-section-light">
        <div className="bk-container">
          <h2 className="bk-h2 bk-center">A Preventative Program Built for Shared Living</h2>
          <p className="bk-body-lead bk-center" style={{ maxWidth: 760, margin: "0 auto 28px" }}>
            Condo pest control requires a different mindset than single-family
            homes. Our approach emphasizes:
          </p>
          <div className="bk-why-grid" style={{ marginTop: 48 }}>
            <div className="bk-why-item">
              <h3 className="bk-h4">Consistent scheduling</h3>
              <p className="bk-p">
                {"Monthly, bi\u2011monthly, or quarterly service plans to maintain control and reduce recurring issues."}
              </p>
            </div>
            <div className="bk-why-item">
              <h3 className="bk-h4">Monitoring and documentation</h3>
              <p className="bk-p">
                We track pest activity patterns and provide board-friendly notes
                that help you make informed decisions.
              </p>
            </div>
            <div className="bk-why-item">
              <h3 className="bk-h4">Practical recommendations</h3>
              <p className="bk-p">
                {"We\u2019ll flag conditions that attract pests (trash handling, clutter in storage areas, entry points, moisture issues) and recommend improvements that help reduce pressure over time."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — owner add-on flow */}
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">How it works</div>
          <h2 className="bk-h2">Owner Add-On, Done Cleanly</h2>
          <ul className="bk-bullets">
            <li>Unit owners can get their own instant quote and book online at any time</li>
            <li>Property managers can share the instant quote link with owners</li>
            <li>Owners who want service schedule and pay online</li>
            <li>{"We coordinate in\u2011unit appointments with the community\u2019s scheduled service day whenever possible"}</li>
          </ul>
          <p className="bk-body-lead" style={{ marginTop: 16 }}>
            This helps improve building-wide results while giving owners a
            convenient way to book, with pricing that can be lower on days we
            are already working nearby.
          </p>
        </div>
      </section>

      {/* What Boards and Property Managers Get */}
      <section className="bk-section bk-section-dark">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow" style={{ color: "var(--bk-green)" }}>For Boards &amp; PMs</div>
          <h2 className="bk-h2 bk-on-dark">What Boards and Property Managers Get</h2>
          <ul className="bk-bullets">
            <li>Predictable common-area service schedule</li>
            <li>Clear communication and professional onsite presence</li>
            <li>Documentation suitable for HOA records</li>
            <li>A simple owner upsell option (without the HOA handling payments)</li>
            <li>An approach that follows product label directions and state regulations, with resident comfort in mind</li>
          </ul>
        </div>
      </section>

      <FAQ
        eyebrow="HOA / Common-Area"
        title="FAQs"
        items={CONDO_FAQS}
      />

      <QuoteCTA
        eyebrow="For HOA Boards & Property Managers"
        title="Start Your Instant Quote"
        intro="Tell us about your community in our instant quote form, see your common-area plan price in seconds, and lock in your first visit online."
      />
    </>
  );
}
