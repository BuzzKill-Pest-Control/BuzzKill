import { Link } from "react-router-dom";
import ContactForm from "../components/ContactForm";
import FAQ from "../components/FAQ";
import Icon from "../components/Icon";

export default function CondoServices() {
  return (
    <>
      {/* Page hero */}
      <section className="page-hero">
        <div className="inner">
          <span className="eye">Condo &amp; HOA services</span>
          <h1>
            HOA &amp; condo common-area <em>pest control.</em>
          </h1>
          <p className="intro">
            Reliable common-area pest control for condominiums, HOAs, and
            multi-unit residential communities. Designed to reduce pest
            pressure at the building level—so issues don't keep cycling back
            from shared spaces.
          </p>
        </div>
      </section>

      {/* What's covered */}
      <section className="band">
        <div className="container">
          <div className="split">
            <div className="split-image">
              <img
                src="/images/condo-hero.jpg"
                alt="Condo building serviced by BuzzKill"
              />
            </div>
            <div>
              <span className="eye">What's covered</span>
              <h3>A service scope built around your building.</h3>
              <p>
                Every community is different, but common-area service often
                includes:
              </p>
              <ul className="check-list">
                <li>Building exterior perimeter monitoring and treatment</li>
                <li>Basements and foundation areas</li>
                <li>Trash and recycling rooms, compactors, dumpsters</li>
                <li>Mechanical / utility rooms and pest-travel chase areas</li>
                <li>Hallways and common corridors as appropriate</li>
                <li>Entry points and pressure zones identified on inspection</li>
              </ul>
              <p style={{ marginTop: 16, color: "var(--color-fg-muted)" }}>
                We'll tailor scope to your building layout and association
                needs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Preventative program */}
      <section className="band band-alt">
        <div className="container">
          <div className="section-head">
            <span className="eye">Preventative program</span>
            <h2>
              A program <em>built for shared living.</em>
            </h2>
            <p className="intro">
              Condo pest control requires a different mindset than
              single-family homes. Our approach emphasizes:
            </p>
          </div>
          <div className="grid-3">
            <div className="feature">
              <div className="icon">
                <Icon name="cal" className="" />
              </div>
              <span className="eye">Cadence</span>
              <h3>Consistent scheduling</h3>
              <p>
                Monthly, bi-monthly, or quarterly service plans to maintain
                control and reduce recurring issues.
              </p>
            </div>
            <div className="feature">
              <div className="icon">
                <Icon name="doc" className="" />
              </div>
              <span className="eye">Records</span>
              <h3>Monitoring &amp; documentation</h3>
              <p>
                We track pest activity patterns and provide board-friendly
                notes that help you make informed decisions.
              </p>
            </div>
            <div className="feature">
              <div className="icon">
                <Icon name="leaf" className="" />
              </div>
              <span className="eye">Insight</span>
              <h3>Practical recommendations</h3>
              <p>
                We'll flag conditions that attract pests—trash handling,
                storage clutter, entry points, moisture issues—and recommend
                improvements that reduce pressure over time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="band band-dark">
        <div className="container">
          <div className="section-head">
            <span className="eye">How it works</span>
            <h2>
              How owner participation <em>fits in.</em>
            </h2>
            <p className="intro">
              Owner in-unit service is optional—but when they opt in, we group
              everything onsite during the same visit window.
            </p>
          </div>
          <div className="grid-4">
            <div className="step">
              <div className="num">1</div>
              <h3>We provide a scheduling link</h3>
              <p>
                Prior to each common-area visit, BuzzKill provides a
                property-specific scheduling and payment link.
              </p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h3>Manager shares it with owners</h3>
              <p>
                The property manager can send it as an announcement to owners
                who may want in-unit service.
              </p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h3>Owners book online</h3>
              <p>
                Owners who want service schedule and pay online—no HOA
                coordination or handling required.
              </p>
            </div>
            <div className="step">
              <div className="num">4</div>
              <h3>We group visits onsite</h3>
              <p>
                In-unit appointments are grouped during the scheduled
                common-area service window.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What boards get */}
      <section className="band">
        <div className="container-narrow">
          <div className="section-head left">
            <span className="eye">For boards &amp; property managers</span>
            <h2>
              What your association <em>actually gets.</em>
            </h2>
          </div>
          <ul className="check-list">
            <li>Predictable common-area service schedule</li>
            <li>Clear communication and professional onsite presence</li>
            <li>Documentation suitable for HOA records</li>
            <li>A simple owner upsell option (without HOA handling payments)</li>
            <li>An approach aligned with resident comfort and safety</li>
          </ul>
        </div>
      </section>

      {/* FAQ */}
      <section className="band band-alt">
        <div className="container-narrow">
          <div className="section-head">
            <span className="eye">Questions</span>
            <h2>
              HOA &amp; common-area <em>FAQs.</em>
            </h2>
          </div>
          <FAQ
            items={[
              {
                q: "Do you require owner participation?",
                a: "No. Owner participation is optional. The HOA contract remains separate from any owner in-unit service.",
              },
              {
                q: "Can you service multiple buildings within a community?",
                a: "Yes. We can set up one program that covers all buildings and common areas, with a single schedule and a single point of contact.",
              },
              {
                q: "Do you provide reports or notes after service?",
                a: "Yes—service notes are provided in a format that works for property management and board records.",
              },
            ]}
          />
        </div>
      </section>

      {/* Contact */}
      <section className="band" id="contact">
        <div className="container">
          <div className="contact">
            <div className="contact-info">
              <span className="eye">Request a proposal</span>
              <h2>Ready to set up common-area service?</h2>
              <p>
                Share a few details and we'll put together a clean program for
                your community, including a scheduling link for interested
                owners.
              </p>
              <Link to="/in-unit-services" className="btn btn-link">
                Learn about in-unit service{" "}
                <Icon name="arrow" className="lu arr" />
              </Link>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
