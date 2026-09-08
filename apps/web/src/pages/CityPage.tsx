import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
import { CITY_BY_SLUG } from "../data/cities";
import FAQ from "../components/FAQ";
import QuoteCTA from "../components/QuoteCTA";
import { cityFaqs } from "../data/faqs";

export default function CityPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const city = slug ? CITY_BY_SLUG[slug] : undefined;

  if (!city) return <Navigate to="/404" replace />;

  const { city: name, state, stateAbbr } = city;
  const fullLocation = `${name}, ${stateAbbr}`;

  const goToForm = () => {
    const el = document.getElementById("form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* Hero */}
      <section className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Pest Control in {fullLocation}</div>
          <h1 className="bk-h1-lower">
            {name} Pest Control
          </h1>
          <p className="bk-body-lead">
            BuzzKill Pest Control is based in Marlborough, Massachusetts, and
            provides professional pest management for condominiums, HOAs, and
            shared living communities in <strong>{fullLocation}</strong>. We specialize in common-area pest
            control for boards and property managers. Unit owners can add
            optional in-unit service, with pricing that can be lower on days we
            are already working nearby.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
            <button type="button" className="bk-btn bk-btn-primary" onClick={goToForm}>
              Request a Free Quote
            </button>
            <button
              type="button"
              className="bk-btn bk-btn-outline"
              onClick={() => navigate("/communities")}
            >
              HOA Services
            </button>
          </div>
        </div>
      </section>

      {/* Why BuzzKill in this city */}
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Why BuzzKill</div>
          <h2 className="bk-h2">
            Condo &amp; HOA Pest Control in {name}
          </h2>
          <p className="bk-body-lead">
            Most pest issues in {name} condos and HOAs don't respect unit
            boundaries. That's why we focus on building-wide prevention and
            consistent service, not one-off reactions. BuzzKill is based in
            Marlborough, Massachusetts, serves {name} under the {state}{" "}
            credentials listed on our{" "}
            <Link to="/licensed-insured">Licensed &amp; Insured</Link> page,
            and plans every visit around the pest pressures common to the{" "}
            {stateAbbr === "MA"
              ? "Greater Boston, MetroWest, and Central Massachusetts"
              : "Rhode Island"}{" "}
            area.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="bk-section bk-section-light">
        <div className="bk-container">
          <h2 className="bk-h2 bk-center">
            Our Services in {fullLocation}
          </h2>
          <div className="bk-why-grid" style={{ marginTop: 48 }}>
            <div className="bk-why-item">
              <h3 className="bk-h4">HOA Common-Area Pest Control</h3>
              <p className="bk-p">
                Scheduled service for basements, utility rooms, trash areas,
                hallways, exterior perimeters, and shared spaces in {name}{" "}
                condominiums.
              </p>
            </div>
            <div className="bk-why-item">
              <h3 className="bk-h4">In-Unit Service for Owners</h3>
              <p className="bk-p">
                Optional pest control for individual units. {name} unit owners
                can get their own instant quote and book online at any time,
                with pricing that can be lower on days we are already working
                nearby.
              </p>
            </div>
            <div className="bk-why-item">
              <h3 className="bk-h4">Preventative Programs</h3>
              <p className="bk-p">
                Monthly, bi-monthly, or quarterly service plans designed to
                reduce recurring pest pressure across your entire {name}{" "}
                property.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bk-section bk-section-dark">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow" style={{ color: "var(--bk-green)" }}>How It Works</div>
          <h2 className="bk-h2 bk-on-dark">
            Simple, Efficient Pest Control for {name} Communities
          </h2>
          <ul className="bk-bullets">
            <li>
              Your {name} association receives consistent, scheduled pest
              control for common areas, done professionally, with minimal
              disruption.
            </li>
            <li>
              {name} unit owners who want in-unit treatment can get their own
              instant quote and book online at any time.
            </li>
            <li>
              Common-area service and any in-unit visits are handled by the same
              local team, so the whole community benefits from a building-wide
              approach.
            </li>
          </ul>
        </div>
      </section>

      {/* Why choose us */}
      <section className="bk-section bk-section-cream">
        <div className="bk-container">
          <h2 className="bk-h2 bk-center">
            Why {name} Property Managers Choose BuzzKill
          </h2>
          <div className="bk-why-grid" style={{ marginTop: 48 }}>
            <div className="bk-why-item">
              <h3 className="bk-h4">Condo-Specific Expertise</h3>
              <p className="bk-p">
                We understand shared walls, common infrastructure, and the
                recurring pest patterns in {name} multi-unit buildings.
              </p>
            </div>
            <div className="bk-why-item">
              <h3 className="bk-h4">Built for Occupied Homes</h3>
              <p className="bk-p">
                Methods and products appropriate for occupied {name} homes.
                We follow all label directions and {state} regulatory
                requirements.
              </p>
            </div>
            <div className="bk-why-item">
              <h3 className="bk-h4">Professional Communication</h3>
              <p className="bk-p">
                Clear scheduling, consistent service, and board-friendly
                documentation for your {name} HOA records.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ
        eyebrow={fullLocation}
        title="FAQs"
        items={cityFaqs(city)}
      />

      {/* Instant quote CTA */}
      <QuoteCTA
        eyebrow={`Pest Control in ${fullLocation}`}
        title={`Get an Instant Quote for ${name}`}
        intro={`Tell us about your ${name} property, see your price in seconds, then book online.`}
      />
    </>
  );
}
