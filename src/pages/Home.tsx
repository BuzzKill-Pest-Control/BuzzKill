import { Link } from "react-router-dom";
import ContactForm from "../components/ContactForm";
import FAQ from "../components/FAQ";
import Icon from "../components/Icon";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="dotgrid" aria-hidden="true" />
        <div className="inner">
          <div>
            <div className="hero-eyebrow">
              Condo &amp; HOA pest control · Massachusetts
            </div>
            <h1>
              Safe for families.{" "}
              <em>
                Tough on pests.<span className="dot" />
              </em>
            </h1>
            <p className="hero-sub">
              Professional pest control for condominiums, HOAs, and shared
              living communities—built for boards, built for convenience, built
              for peace of mind.
            </p>
            <div className="hero-ctas">
              <a href="#contact" className="btn btn-primary">
                Request HOA Proposal
                <Icon name="arrow" className="lu arr" />
              </a>
              <a href="#contact" className="btn btn-secondary">
                Schedule In-Unit Service
              </a>
            </div>
            <div className="hero-trust">
              <div className="trust-item">
                <span className="num">40+</span>
                <span className="lab">HOAs served</span>
              </div>
              <div className="trust-item">
                <span className="num">12yr</span>
                <span className="lab">avg. contract</span>
              </div>
              <div className="trust-item">
                <span className="num">MA</span>
                <span className="lab">licensed &amp; insured</span>
              </div>
            </div>
          </div>
          <div className="hero-media">
            <div className="frame">
              <img
                src="/images/hero-home-1.jpg"
                alt="Professional pest control for condominiums"
              />
            </div>
            <div className="sticker">
              <div className="s-icon">
                <Icon name="shield" className="" />
              </div>
              <div>
                <div className="s-title">Board-friendly reporting</div>
                <div className="s-sub">Clean docs after every visit</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The approach */}
      <section className="band band-alt">
        <div className="container-narrow">
          <div className="section-head">
            <span className="eye">The approach</span>
            <h2>
              Condo &amp; HOA pest control, <em>done the smart way.</em>
            </h2>
            <p className="intro">
              Most pest issues in condos don't respect unit boundaries. That's
              why we focus on building-wide prevention and consistent
              service—not one-off reactions.
            </p>
          </div>
        </div>
      </section>

      {/* What we do best */}
      <section className="band">
        <div className="container">
          <div className="split">
            <div className="split-image">
              <img
                src="/images/hero-home-2.jpg"
                alt="Pest control technician at work"
              />
            </div>
            <div>
              <span className="eye">What we do best</span>
              <h3>A single program that covers your whole community.</h3>
              <ul className="check-list">
                <li>
                  HOA common-area pest control — basements, utility rooms,
                  trash areas, exterior perimeter, common hallways
                </li>
                <li>Optional discounted in-unit service for owners</li>
                <li>Preventative programs designed for shared living</li>
                <li>Clear reporting for boards and property managers</li>
              </ul>
              <Link to="/in-unit-services" className="btn btn-link">
                Learn about in-unit service{" "}
                <Icon name="arrow" className="lu arr" />
              </Link>
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
              The BuzzKill model, <em>in three steps.</em>
            </h2>
          </div>
          <div className="grid-3">
            <div className="step">
              <div className="num">1</div>
              <h3>We service common areas</h3>
              <p>
                Your association receives consistent, scheduled pest control
                for common areas—done professionally, with minimal disruption.
              </p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h3>Owners add discounted in-unit service</h3>
              <p>
                About a week before our visit, owners can schedule and pay
                online for in-unit treatment during the same window.
              </p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h3>Everything is grouped onsite</h3>
              <p>
                Owners get convenience and lower pricing. The community
                benefits from a stronger, building-wide approach.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why choose BuzzKill */}
      <section className="band">
        <div className="container">
          <div className="section-head">
            <span className="eye">Why BuzzKill</span>
            <h2>
              Why boards and property managers <em>choose us.</em>
            </h2>
          </div>
          <div className="grid-3">
            <div className="feature">
              <div className="icon">
                <Icon name="building" className="" />
              </div>
              <span className="eye">Expertise</span>
              <h3>Condo-specific know-how</h3>
              <p>
                We understand shared walls, utility chases, and recurring
                pressure points that drive pest activity in multi-unit
                buildings.
              </p>
            </div>
            <div className="feature">
              <div className="icon">
                <Icon name="leaf" className="" />
              </div>
              <span className="eye">Safety</span>
              <h3>Safety-first mindset</h3>
              <p>
                We prioritize methods and products appropriate for occupied
                homes and follow all label and regulatory requirements.
              </p>
            </div>
            <div className="feature">
              <div className="icon">
                <Icon name="doc" className="" />
              </div>
              <span className="eye">Coordination</span>
              <h3>Professional communication</h3>
              <p>
                Clear scheduling, consistent presence, and documentation
                suitable for HOA records and board meetings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="band band-alt">
        <div className="container">
          <div className="section-head">
            <span className="eye">Services</span>
            <h2>
              Two programs, <em>one visit.</em>
            </h2>
          </div>
          <div className="services-duo">
            <div className="svc">
              <div className="img">
                <span className="tag">HOA Contract</span>
                <img
                  src="/images/hero-home-3.jpg"
                  alt="HOA common-area pest control"
                />
              </div>
              <div className="body">
                <h3>HOA Common-Area Pest Control</h3>
                <p>
                  Preventative service for HOA-owned areas and building
                  exteriors. Consistent scheduling, board-friendly
                  documentation, and recommendations that reduce pressure long
                  term.
                </p>
                <Link to="/condo-services" className="btn btn-primary">
                  Learn More <Icon name="arrow" className="lu arr" />
                </Link>
              </div>
            </div>
            <div className="svc">
              <div className="img">
                <span className="tag">Owner Add-on</span>
                <img
                  src="/images/hero-home-2.jpg"
                  alt="In-unit pest control service"
                />
              </div>
              <div className="body">
                <h3>In-Unit Service for Owners</h3>
                <p>
                  Optional, discounted in-unit service timed with your
                  community's common-area visit. Schedule and pay
                  online—no HOA coordination required.
                </p>
                <Link to="/in-unit-services" className="btn btn-secondary">
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="band">
        <div className="container-narrow">
          <div className="section-head">
            <span className="eye">Questions</span>
            <h2>
              BuzzKill <em>FAQs.</em>
            </h2>
          </div>
          <FAQ
            items={[
              {
                q: "Do you only work with condos and HOAs?",
                a: "Our primary focus is condos and HOAs, because that's where our model provides the most value. We can discuss other shared-living arrangements case-by-case.",
              },
              {
                q: "Is in-unit service required?",
                a: "No. In-unit service is optional and scheduled directly by the unit owner. HOA contracts and in-unit appointments are separate agreements.",
              },
              {
                q: "Do you coordinate communication to owners?",
                a: "Yes—BuzzKill provides a scheduling and payment link along with suggested announcement copy. Your property manager distributes it to owners.",
              },
              {
                q: "Can you service multiple buildings in a community?",
                a: "Yes. One program can cover all buildings and common areas with a single schedule and a single point of contact.",
              },
            ]}
          />
        </div>
      </section>

      {/* Contact */}
      <section className="band band-alt" id="contact">
        <div className="container">
          <div className="contact">
            <div className="contact-info">
              <span className="eye">Contact</span>
              <h2>Let's make your community pest-free.</h2>
              <p>
                Whether you're an HOA board member, a property manager, or a
                condo owner, we'll make it easy to get the right service.
              </p>
              <dl className="contact-dl">
                <div>
                  <dt>Office</dt>
                  <dd>
                    420 Lakeside Ave, Suite 104
                    <br />
                    Marlborough, MA 01752
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    <a href="tel:508-258-9294">508-258-9294</a>
                  </dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>
                    <a href="mailto:info@pestbuzzkill.com">
                      info@pestbuzzkill.com
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
            <ContactForm />
          </div>
        </div>
      </section>
    </>
  );
}
