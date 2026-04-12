import { Link } from "react-router-dom";
import ContactForm from "../components/ContactForm";

export default function CondoServices() {
  return (
    <>
      {/* Hero */}
      <section className="page-hero">
        <div className="page-hero-overlay" />
        <img
          src="/images/condo-hero.jpg"
          alt="Condo pest control services"
          className="page-hero-bg"
        />
        <div className="page-hero-content">
          <h1>Condo Services</h1>
        </div>
      </section>

      {/* Intro */}
      <section className="section">
        <div className="section-inner section-narrow">
          <h2>HOA &amp; Condo Common-Area Pest Control</h2>
          <p>
            BuzzKill provides reliable common-area pest control for
            condominiums, HOAs, and multi-unit residential communities. Our
            programs are designed to reduce pest pressure at the building
            level—so issues don't keep cycling back from shared spaces.
          </p>
        </div>
      </section>

      {/* What's Covered */}
      <section className="section section-dark">
        <div className="section-inner section-narrow">
          <h2>What Common-Area Pest Control Covers</h2>
          <p>
            Every community is different, but common-area service often
            includes:
          </p>
          <ul className="check-list">
            <li>
              Building exterior perimeter monitoring and treatment as needed
            </li>
            <li>Basements and foundation areas</li>
            <li>
              Trash and recycling rooms, compactors, dumpsters (as applicable)
            </li>
            <li>
              Mechanical/utility rooms and chase areas where pests travel
            </li>
            <li>Hallways/common corridors (as appropriate)</li>
            <li>
              Entry points and pest pressure zones identified during inspection
            </li>
          </ul>
          <p>
            We'll tailor scope to your building layout and association needs.
          </p>
        </div>
      </section>

      {/* Preventative Program */}
      <section className="section">
        <div className="section-inner section-narrow">
          <h2>
            A Preventative Program{" "}
            <span className="highlight">Built for Shared Living</span>
          </h2>
          <p>
            Condo pest control requires a different mindset than single-family
            homes. Our approach emphasizes:
          </p>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Consistent scheduling</h3>
              <p>
                Monthly, bi-monthly, or quarterly service plans to maintain
                control and reduce recurring issues.
              </p>
            </div>
            <div className="feature-card">
              <h3>Monitoring and documentation</h3>
              <p>
                We track pest activity patterns and provide board-friendly notes
                that help you make informed decisions.
              </p>
            </div>
            <div className="feature-card">
              <h3>Practical recommendations</h3>
              <p>
                We'll flag conditions that attract pests (trash handling, clutter
                in storage areas, entry points, moisture issues) and recommend
                improvements that help reduce pressure over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section section-dark">
        <div className="section-inner section-narrow">
          <h2>How It Works</h2>
          <div className="steps-grid">
            <div className="step-card">
              <span className="step-number">1</span>
              <p>
                Prior to the common-area visit, BuzzKill provides a
                property-specific scheduling + payment link
              </p>
            </div>
            <div className="step-card">
              <span className="step-number">2</span>
              <p>
                The property manager can send it as an announcement to owners
              </p>
            </div>
            <div className="step-card">
              <span className="step-number">3</span>
              <p>Owners who want service schedule and pay online</p>
            </div>
            <div className="step-card">
              <span className="step-number">4</span>
              <p>
                In-unit appointments are grouped onsite during the scheduled
                visit window
              </p>
            </div>
          </div>
          <p>
            This improves building-wide results while offering owners
            convenience and a discount.
          </p>
        </div>
      </section>

      {/* What Boards Get */}
      <section className="section">
        <div className="section-inner section-narrow">
          <h2>What Boards and Property Managers Get</h2>
          <ul className="check-list">
            <li>Predictable common-area service schedule</li>
            <li>Clear communication and professional onsite presence</li>
            <li>Documentation suitable for HOA records</li>
            <li>
              A simple owner upsell option (without the HOA handling payments)
            </li>
            <li>
              An approach aligned with resident comfort and safety
            </li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-dark">
        <div className="section-inner section-narrow">
          <h2>HOA / Common-Area FAQs</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary>Do you require owner participation?</summary>
              <p>
                No. Owner participation is optional. The HOA contract remains
                separate from any owner in-unit service.
              </p>
            </details>
            <details className="faq-item">
              <summary>
                Can you service multiple buildings within a community?
              </summary>
              <p>
                Yes. We can set up one program that covers all buildings and
                common areas, with clear scheduling.
              </p>
            </details>
            <details className="faq-item">
              <summary>
                Do you provide reports or notes after service?
              </summary>
              <p>
                Yes—service notes are provided in a format that works for
                property management and board records.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA + Form */}
      <section className="section" id="contact">
        <div className="section-inner">
          <div className="contact-section">
            <div className="contact-info">
              <h2>Request an HOA Proposal</h2>
              <p>
                Ready to set up professional common-area pest control for your
                community? Get in touch.
              </p>
              <div className="hero-ctas" style={{ marginTop: "1.5rem" }}>
                <Link to="/in-unit-services" className="btn btn-link">
                  Learn About In-Unit Service &rarr;
                </Link>
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
