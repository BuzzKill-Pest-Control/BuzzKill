import { Link } from "react-router-dom";
import ContactForm from "../components/ContactForm";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-content">
          <h1>
            Safe for Families.{" "}
            <span className="highlight">Tough on Pests.</span>
          </h1>
          <p className="hero-subtitle">
            Built for condos. Built for convenience. Built for peace of mind.
          </p>
          <p className="hero-body">
            BuzzKill Pest Control provides professional pest control for
            condominiums, HOAs, and shared living communities across
            Massachusetts. We specialize in common-area pest management for
            boards and property managers—then offer optional, discounted in-unit
            service for owners when we're already onsite.
          </p>
          <div className="hero-ctas">
            <a href="#contact" className="btn btn-primary">
              Request HOA Proposal
            </a>
            <a href="#contact" className="btn btn-outline">
              Schedule In-Unit Service
            </a>
          </div>
        </div>
        <div className="hero-image">
          <img
            src="/images/hero-home-1.jpg"
            alt="Professional pest control for condominiums"
          />
        </div>
      </section>

      {/* Smart Way */}
      <section className="section">
        <div className="section-inner">
          <div className="section-text">
            <h2>
              Condo & HOA Pest Control,{" "}
              <span className="highlight">Done the Smart Way</span>
            </h2>
            <p>
              Most pest issues in condos don't respect unit boundaries. That's
              why we focus on building-wide prevention and consistent
              service—not one-off reactions.
            </p>
          </div>
        </div>
      </section>

      {/* What We Do Best */}
      <section className="section section-dark">
        <div className="section-inner section-split">
          <div className="section-image">
            <img
              src="/images/hero-home-2.jpg"
              alt="Pest control technician at work"
            />
          </div>
          <div className="section-text">
            <h2>What We Do Best</h2>
            <ul className="check-list">
              <li>
                HOA common-area pest control (basements, utility rooms, trash
                areas, exterior perimeter, common hallways, shared spaces)
              </li>
              <li>Optional in-unit service for owners</li>
              <li>Preventative programs designed for shared living</li>
              <li>Clear reporting for boards and property managers</li>
            </ul>
            <Link to="/in-unit-services" className="btn btn-link">
              Learn About In-Unit Service &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* How Our Model Works */}
      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">
            How Our Condo & HOA Model{" "}
            <span className="highlight">Works</span>
          </h2>
          <div className="steps-grid">
            <div className="step-card">
              <span className="step-number">1</span>
              <h3>We service common areas (HOA contract)</h3>
              <p>
                Your association receives consistent, scheduled pest control for
                common areas—done professionally, with minimal disruption.
              </p>
            </div>
            <div className="step-card">
              <span className="step-number">2</span>
              <h3>Owners can add discounted in-unit service</h3>
              <p>
                About a week before our scheduled visit, owners can choose to
                schedule and pay online for in-unit treatment during the same
                visit window.
              </p>
            </div>
            <div className="step-card">
              <span className="step-number">3</span>
              <h3>Everything is grouped onsite (efficient + affordable)</h3>
              <p>
                Owners get convenience and lower pricing. The community benefits
                from a stronger, building-wide approach.
              </p>
            </div>
          </div>
          <div className="section-cta">
            <Link to="/condo-services" className="btn btn-link">
              See HOA/Common-Area Services &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose BuzzKill */}
      <section className="section section-dark">
        <div className="section-inner">
          <h2 className="section-title">
            Why HOAs and Property Managers{" "}
            <span className="highlight">Choose BuzzKill</span>
          </h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Condo-specific expertise</h3>
              <p>
                We understand shared walls, common infrastructure spaces, and
                recurring patterns that drive pest pressure in multi-unit
                buildings.
              </p>
            </div>
            <div className="feature-card">
              <h3>Safety-first mindset</h3>
              <p>
                We prioritize methods and products appropriate for occupied
                spaces and follow all label and regulatory requirements.
              </p>
            </div>
            <div className="feature-card">
              <h3>Professional communication</h3>
              <p>
                Clear scheduling, consistent service, and board-friendly
                documentation.
              </p>
            </div>
          </div>
          <div className="section-cta">
            <Link to="/about" className="btn btn-link">
              Learn More &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">BuzzKill FAQs</h2>
          <div className="faq-list">
            <details className="faq-item">
              <summary>Do you only work with condos/HOAs?</summary>
              <p>
                Our primary focus is condos and HOAs, because that's where our
                model provides the most value.
              </p>
            </details>
            <details className="faq-item">
              <summary>Is in-unit service required?</summary>
              <p>
                No. In-unit service is optional and scheduled directly by the
                unit owner.
              </p>
            </details>
            <details className="faq-item">
              <summary>
                Do you coordinate communication to owners?
              </summary>
              <p>
                Yes—BuzzKill provides a scheduling/payment link and suggested
                announcement copy; your property manager can distribute it to
                owners.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section section-dark">
        <div className="section-inner">
          <div className="services-duo">
            <div className="service-card">
              <img src="/images/hero-home-3.jpg" alt="HOA common-area pest control" />
              <h3>HOA Common-Area Pest Control</h3>
              <p>
                Preventative service for HOA-owned areas and building exteriors.
              </p>
              <Link to="/condo-services" className="btn btn-outline">
                Learn More
              </Link>
            </div>
            <div className="service-card">
              <img src="/images/hero-home-2.jpg" alt="In-unit pest control" />
              <h3>In-Unit Pest Control for Owners</h3>
              <p>
                Optional, discounted in-unit service timed with common-area
                service days.
              </p>
              <Link to="/in-unit-services" className="btn btn-outline">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="section" id="contact">
        <div className="section-inner">
          <div className="contact-section">
            <div className="contact-info">
              <h2>Contact Us Today</h2>
              <p>
                Whether you're an HOA board member, a property manager, or a
                condo owner, we'll make it easy to get the right service.
              </p>
              <div className="contact-details">
                <div className="contact-item">
                  <strong>Address</strong>
                  <p>1257 Worcester Rd #1045<br />Framingham, MA 01701</p>
                </div>
                <div className="contact-item">
                  <strong>Phone</strong>
                  <a href="tel:508-258-9294">508-258-9294</a>
                </div>
                <div className="contact-item">
                  <strong>Email</strong>
                  <a href="mailto:info@pestbuzzkill.com">info@pestbuzzkill.com</a>
                </div>
              </div>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
