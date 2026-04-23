import { Link } from "react-router-dom";
import Icon from "../components/Icon";

export default function About() {
  return (
    <>
      {/* Page hero */}
      <section className="page-hero">
        <div className="inner">
          <span className="eye">About BuzzKill</span>
          <h1>
            Building-wide pest control, <em>done quietly and well.</em>
          </h1>
          <p className="intro">
            BuzzKill Pest Control was built to solve a common problem in shared
            living communities: pest issues that keep coming back because common
            areas and units are treated separately—or not treated consistently.
          </p>
        </div>
      </section>

      {/* Mission intro */}
      <section className="band">
        <div className="container-narrow">
          <p className="lead-text">
            We specialize in condo and HOA pest management with a model designed
            for building-wide prevention, professional communication, and owner
            convenience.
          </p>
        </div>
      </section>

      {/* Our Mission */}
      <section className="band band-alt">
        <div className="container-narrow">
          <div className="section-head left">
            <span className="eye">Our mission</span>
            <h2>
              Pest control that fits a <em>real community.</em>
            </h2>
          </div>
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
      <section className="band">
        <div className="container">
          <div className="section-head">
            <span className="eye">What's different</span>
            <h2>
              What makes BuzzKill <em>different.</em>
            </h2>
          </div>
          <div className="grid-3">
            <div className="feature">
              <div className="icon">
                <Icon name="building" className="" />
              </div>
              <span className="eye">Focus</span>
              <h3>Condo-first expertise</h3>
              <p>
                We focus on the areas where pests travel and hide in multi-unit
                buildings—shared spaces, utility areas, basements, and
                perimeter pressure zones.
              </p>
            </div>
            <div className="feature">
              <div className="icon">
                <Icon name="shield" className="" />
              </div>
              <span className="eye">Philosophy</span>
              <h3>Prevention over panic</h3>
              <p>
                Our programs are built around reducing pest pressure
                long-term, not just responding to complaints.
              </p>
            </div>
            <div className="feature">
              <div className="icon">
                <Icon name="cal" className="" />
              </div>
              <span className="eye">Coordination</span>
              <h3>Simple for owners</h3>
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
      <section className="band band-dark">
        <div className="container-narrow">
          <div className="section-head left">
            <span className="eye">Safety &amp; compliance</span>
            <h2>
              Careful methods, <em>clear guidance.</em>
            </h2>
          </div>
          <p>
            BuzzKill follows all applicable Massachusetts requirements and label
            directions for products used. We prioritize methods appropriate for
            occupied homes and shared communities and provide guidance as needed
            for residents.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="band band-alt">
        <div className="container-narrow cta-block">
          <p className="lead-text">
            If you're an HOA board member or property manager, we'll build a
            clean service plan for your community. If you're a condo owner, you
            can schedule in-unit service when available.
          </p>
          <div className="hero-ctas">
            <Link to="/condo-services" className="btn btn-primary">
              Condo Services <Icon name="arrow" className="lu arr" />
            </Link>
            <Link to="/in-unit-services" className="btn btn-secondary">
              In-Unit Services
            </Link>
            <Link to="/#contact" className="btn btn-dark">
              Request Proposal
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
