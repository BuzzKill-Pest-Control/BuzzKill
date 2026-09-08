import FAQ from "../components/FAQ";
import { INUNIT_FAQS } from "../data/faqs";
import QuoteCTA from "../components/QuoteCTA";

export default function InUnitServices() {
  const goToForm = () => {
    const el = document.getElementById("form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {/* Hero */}
      <section className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">For Unit Owners</div>
          <h1 className="bk-h1-lower">In-Unit Services</h1>
          <p className="bk-body-lead">
            {"If BuzzKill is already scheduled to service your community\u2019s common areas, you may be able to book in\u2011unit pest control on the same day, and days when we are already working nearby can price lower."}
          </p>
          <h2 className="bk-h3" style={{ marginTop: 24 }}>
            {"It\u2019s simple:"}
          </h2>
          <ul className="bk-bullets">
            <li>Schedule online</li>
            <li>Pay online</li>
            <li>We arrive on the scheduled day and complete the service efficiently.</li>
          </ul>
          <div style={{ display: "flex", gap: 14, marginTop: 24, flexWrap: "wrap" }}>
            <button type="button" className="bk-btn bk-btn-primary" onClick={goToForm}>
              {"Schedule In\u2011Unit Service"}
            </button>
          </div>
        </div>
      </section>

      {/* What In-Unit Service Typically Includes */}
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">What&rsquo;s Included</div>
          <h2 className="bk-h2">{"What In\u2011Unit Service Typically Includes"}</h2>
          <p className="bk-body-lead">
            {"In\u2011unit service is customized to the issue and unit layout, but commonly includes:"}
          </p>
          <ul className="bk-bullets">
            <li>Inspection of key pest activity areas (kitchen, bath, entry points)</li>
            <li>Targeted treatment where appropriate</li>
            <li>Guidance on prevention and best practices</li>
            <li>Follow-up recommendations if needed</li>
          </ul>
          <p className="bk-p">
            We prioritize methods that are appropriate for occupied homes and
            follow all label directions and any applicable re-entry guidance.
          </p>
        </div>
      </section>

      {/* Preparing for Your Appointment */}
      <section className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Get Ready</div>
          <h2 className="bk-h2">Preparing for Your Appointment</h2>
          <p className="bk-body-lead">To make service quick and effective:</p>
          <ul className="bk-bullets">
            <li>Ensure access to kitchen / bath areas</li>
            <li>Move small items away from baseboards if possible</li>
            <li>Keep pets secured during the visit</li>
            <li>Follow any instructions included in your confirmation email</li>
          </ul>
        </div>
      </section>

      {/* Why Schedule On The HOA Service Day? */}
      <section className="bk-section bk-section-dark">
        <div className="bk-container">
          <h2 className="bk-h2 bk-center bk-on-dark">
            Why Schedule On The HOA Service Day?
          </h2>
          <div className="bk-why-grid" style={{ marginTop: 48 }}>
            <div className="bk-why-item">
              <h3 className="bk-h4 bk-on-dark">Nearby and efficient</h3>
              <p className="bk-p bk-on-dark-soft">
                {"Because we\u2019re already onsite for common-area service, we can coordinate in\u2011unit appointments with that visit, which saves time, and days when we are already working nearby can price lower."}
              </p>
            </div>
            <div className="bk-why-item">
              <h3 className="bk-h4 bk-on-dark">Better building-wide results</h3>
              <p className="bk-p bk-on-dark-soft">
                When both common areas and select units are treated, the
                community often experiences improved overall control.
              </p>
            </div>
            <div className="bk-why-item">
              <h3 className="bk-h4 bk-on-dark">Convenient scheduling</h3>
              <p className="bk-p bk-on-dark-soft">
                {"Book your spot while BuzzKill is already scheduled at your community instead of arranging a separate visit."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How Scheduling Works */}
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Step-by-Step</div>
          <h2 className="bk-h2">How Scheduling Works</h2>
          <ul className="bk-bullets">
            <li>Enter your address and unit</li>
            <li>Pick an available service day</li>
            <li>Pay online</li>
            <li>Receive confirmation</li>
            <li>BuzzKill completes service onsite on the scheduled day</li>
          </ul>
        </div>
      </section>

      <FAQ
        eyebrow="in-unit"
        title="FAQs"
        items={INUNIT_FAQS}
      />

      <QuoteCTA />
    </>
  );
}
