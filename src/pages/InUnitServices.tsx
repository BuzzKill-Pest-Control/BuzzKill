import { Link } from "react-router-dom";
import ContactForm from "../components/ContactForm";

export default function InUnitServices() {
  return (
    <>
      {/* Hero */}
      <section className="page-hero">
        <div className="page-hero-overlay" />
        <img
          src="/images/inunit-1.jpg"
          alt="In-unit pest control service"
          className="page-hero-bg"
        />
        <div className="page-hero-content">
          <h1>In-Unit Services</h1>
        </div>
      </section>

      {/* Intro */}
      <section className="section">
        <div className="section-inner section-narrow">
          <p className="lead-text">
            If BuzzKill is already scheduled to service your community's common
            areas, you may be able to book discounted in-unit pest control
            during the same visit window.
          </p>
        </div>
      </section>

      {/* Simple */}
      <section className="section section-dark">
        <div className="section-inner section-narrow">
          <h2>It's Simple</h2>
          <div className="steps-grid">
            <div className="step-card">
              <span className="step-number">1</span>
              <h3>Schedule online</h3>
            </div>
            <div className="step-card">
              <span className="step-number">2</span>
              <h3>Pay online</h3>
            </div>
            <div className="step-card">
              <span className="step-number">3</span>
              <h3>We arrive during the scheduled window</h3>
              <p>and complete the service efficiently</p>
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="section">
        <div className="section-inner section-split">
          <div className="section-image">
            <img
              src="/images/inunit-2.jpg"
              alt="Pest inspection in progress"
            />
          </div>
          <div className="section-text">
            <h2>What In-Unit Service Typically Includes</h2>
            <ul className="check-list">
              <li>
                Inspection of key pest activity areas (kitchen, bath, entry
                points)
              </li>
              <li>Targeted treatment where appropriate</li>
              <li>Guidance on prevention and best practices</li>
              <li>Follow-up recommendations if needed</li>
              <li>
                Methods prioritize occupied homes; follow label directions and
                re-entry guidance
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Preparing */}
      <section className="section section-dark">
        <div className="section-inner section-narrow">
          <h2>Preparing for Your Appointment</h2>
          <ul className="check-list">
            <li>Ensure access to kitchen/bath areas</li>
            <li>Move small items away from baseboards if possible</li>
            <li>Keep pets secured during the visit</li>
            <li>Follow instructions in confirmation email</li>
          </ul>
        </div>
      </section>

      {/* Why Schedule */}
      <section className="section">
        <div className="section-inner section-narrow">
          <h2>
            Why Schedule During the{" "}
            <span className="highlight">HOA Service Window?</span>
          </h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Discounted pricing</h3>
              <p>Grouped appointments save time and reduce cost.</p>
            </div>
            <div className="feature-card">
              <h3>Better results</h3>
              <p>
                Building-wide results improve when common areas and units are
                treated together.
              </p>
            </div>
            <div className="feature-card">
              <h3>Convenient scheduling</h3>
              <p>No waiting weeks for an appointment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section section-dark">
        <div className="section-inner section-narrow">
          <h2>In-Unit FAQs</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary>
                Do I need in-unit service if the HOA treats common areas?
              </summary>
              <p>
                Not always. It's most beneficial if you're actively seeing pest
                activity or the building has recurring pressure.
              </p>
            </details>
            <details className="faq-item">
              <summary>How much does it cost?</summary>
              <p>
                Pricing varies by service type and issue. HOA-onsite pricing is
                shown during the booking process.
              </p>
            </details>
            <details className="faq-item">
              <summary>Is it safe for kids and pets?</summary>
              <p>
                Our methods prioritize occupied homes. All products are applied
                per label directions and regulations.
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
              <h2>Schedule In-Unit Service</h2>
              <p>
                Ready to book discounted in-unit pest control? Fill out the form
                and we'll get you set up.
              </p>
              <div className="hero-ctas" style={{ marginTop: "1.5rem" }}>
                <Link to="/condo-services" className="btn btn-link">
                  Learn About HOA/Common-Area Services &rarr;
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
