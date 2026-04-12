import { Link } from "react-router-dom";

export default function About() {
  return (
    <>
      {/* Hero */}
      <section className="page-hero">
        <div className="page-hero-overlay" />
        <img
          src="/images/about-hero.jpg"
          alt="BuzzKill Pest Control team"
          className="page-hero-bg"
        />
        <div className="page-hero-content">
          <h1>About</h1>
        </div>
      </section>

      {/* Mission */}
      <section className="section">
        <div className="section-inner section-narrow">
          <p className="lead-text">
            BuzzKill Pest Control was built to solve a common problem in shared
            living communities: pest issues that keep coming back because common
            areas and units are treated separately—or not treated consistently.
          </p>
          <p>
            We specialize in condo and HOA pest management with a model designed
            for building-wide prevention, professional communication, and owner
            convenience.
          </p>
        </div>
      </section>

      {/* Our Mission */}
      <section className="section section-dark">
        <div className="section-inner section-narrow">
          <h2>Our Mission</h2>
          <p>To deliver pest control that is:</p>
          <ul className="check-list">
            <li>Safe for families</li>
            <li>Tough on pests</li>
            <li>Designed for condos and HOAs</li>
            <li>Easy to schedule and manage</li>
          </ul>
        </div>
      </section>

      {/* Differentiators */}
      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">
            What Makes BuzzKill{" "}
            <span className="highlight">Different</span>
          </h2>
          <div className="features-grid">
            <div className="feature-card">
              <h3>Condo-first expertise</h3>
              <p>
                We focus on the areas where pests travel and hide in multi-unit
                buildings—shared spaces, utility areas, basements, and perimeter
                pressure zones.
              </p>
            </div>
            <div className="feature-card">
              <h3>Prevention over panic</h3>
              <p>
                Our programs are built around reducing pest pressure long-term,
                not just responding to complaints.
              </p>
            </div>
            <div className="feature-card">
              <h3>Simple coordination for owners</h3>
              <p>
                When we're already onsite for HOA service, owners can schedule
                discounted in-unit service online—without burdening the HOA or
                property manager with payments or manual scheduling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Safety */}
      <section className="section section-dark">
        <div className="section-inner section-narrow">
          <h2>Safety &amp; Compliance</h2>
          <p>
            BuzzKill follows all applicable Massachusetts requirements and label
            directions for products used. We prioritize methods appropriate for
            occupied homes and shared communities and provide guidance as needed
            for residents.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="section-inner section-narrow cta-block">
          <p className="lead-text">
            If you're an HOA board member or property manager, we'll build a
            clean service plan for your community. If you're a condo owner, you
            can schedule in-unit service when available.
          </p>
          <div className="hero-ctas">
            <Link to="/condo-services" className="btn btn-primary">
              Condo Services
            </Link>
            <Link to="/in-unit-services" className="btn btn-outline">
              In-Unit Services
            </Link>
            <a href="/#contact" className="btn btn-outline">
              Contact / Request Proposal
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
