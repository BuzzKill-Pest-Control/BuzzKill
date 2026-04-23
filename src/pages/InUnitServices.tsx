import { Link } from "react-router-dom";
import ContactForm from "../components/ContactForm";
import FAQ from "../components/FAQ";
import Icon from "../components/Icon";

export default function InUnitServices() {
  return (
    <>
      {/* Page hero */}
      <section className="page-hero">
        <div className="inner">
          <span className="eye">In-unit services</span>
          <h1>
            Discounted in-unit service, <em>timed with your building.</em>
          </h1>
          <p className="intro">
            If BuzzKill is already scheduled to service your community's common
            areas, you may be able to book discounted in-unit pest control
            during the same visit window.
          </p>
        </div>
      </section>

      {/* Simple steps */}
      <section className="band">
        <div className="container">
          <div className="section-head">
            <span className="eye">It's simple</span>
            <h2>
              Three steps, <em>no phone tag.</em>
            </h2>
          </div>
          <div className="grid-3">
            <div className="step">
              <div className="num">1</div>
              <h3>Schedule online</h3>
              <p>Pick a service window during your building's next visit.</p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h3>Pay online</h3>
              <p>Secure checkout. Discounted HOA-onsite pricing is applied.</p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h3>We arrive on schedule</h3>
              <p>
                We arrive during the scheduled window and complete the service
                efficiently.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="band band-alt">
        <div className="container">
          <div className="split">
            <div className="split-image">
              <img
                src="/images/inunit-2.jpg"
                alt="Pest inspection in progress"
              />
            </div>
            <div>
              <span className="eye">What's included</span>
              <h3>What in-unit service typically includes.</h3>
              <ul className="check-list">
                <li>
                  Inspection of key pest activity areas — kitchen, bath, entry
                  points
                </li>
                <li>Targeted treatment where appropriate</li>
                <li>Guidance on prevention and best practices</li>
                <li>Follow-up recommendations if needed</li>
                <li>
                  Methods prioritize occupied homes; follow label directions
                  and re-entry guidance
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Preparing */}
      <section className="band band-dark">
        <div className="container-narrow">
          <div className="section-head left">
            <span className="eye">Preparing for your visit</span>
            <h2>
              A few small things <em>to have ready.</em>
            </h2>
          </div>
          <ul className="check-list">
            <li>Ensure access to kitchen and bath areas</li>
            <li>Move small items away from baseboards if possible</li>
            <li>Keep pets secured during the visit</li>
            <li>Follow instructions in your confirmation email</li>
          </ul>
        </div>
      </section>

      {/* Why schedule during HOA window */}
      <section className="band">
        <div className="container">
          <div className="section-head">
            <span className="eye">Why schedule onsite</span>
            <h2>
              Why schedule during the <em>HOA service window?</em>
            </h2>
          </div>
          <div className="grid-3">
            <div className="feature">
              <div className="icon">
                <Icon name="clock" className="" />
              </div>
              <span className="eye">Pricing</span>
              <h3>Discounted pricing</h3>
              <p>Grouped appointments save time and reduce cost.</p>
            </div>
            <div className="feature">
              <div className="icon">
                <Icon name="shield" className="" />
              </div>
              <span className="eye">Results</span>
              <h3>Better results</h3>
              <p>
                Building-wide results improve when common areas and units are
                treated together.
              </p>
            </div>
            <div className="feature">
              <div className="icon">
                <Icon name="cal" className="" />
              </div>
              <span className="eye">Convenience</span>
              <h3>Convenient scheduling</h3>
              <p>No waiting weeks for an appointment.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="band band-alt">
        <div className="container-narrow">
          <div className="section-head">
            <span className="eye">Questions</span>
            <h2>
              In-unit <em>FAQs.</em>
            </h2>
          </div>
          <FAQ
            items={[
              {
                q: "Do I need in-unit service if the HOA treats common areas?",
                a: "Not always. It's most beneficial if you're actively seeing pest activity or the building has recurring pressure.",
              },
              {
                q: "How much does it cost?",
                a: "Pricing varies by service type and issue. Discounted HOA-onsite pricing is shown during the booking process.",
              },
              {
                q: "Is it safe for kids and pets?",
                a: "Our methods prioritize occupied homes. All products are applied per label directions and regulations.",
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
              <span className="eye">Schedule</span>
              <h2>Schedule in-unit service.</h2>
              <p>
                Ready to book discounted in-unit pest control? Fill out the
                form and we'll get you set up for the next visit window.
              </p>
              <Link to="/condo-services" className="btn btn-link">
                Learn about HOA common-area services{" "}
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
