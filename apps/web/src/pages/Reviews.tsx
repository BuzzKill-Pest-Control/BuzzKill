import { Link } from "react-router-dom";
import { COMPANY } from "../../amplify/functions/shared/company";
import { OFFICE_PHONE, OFFICE_TEL } from "../lib/contactInfo";
export default function Reviews() {
  return (
    <>
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Reviews</div>
          <h1 className="bk-h1-lower">Share Your Experience</h1>
          <p className="bk-body-lead">
            Have you used {COMPANY.serviceDisplayName}? We'd appreciate your
            feedback about your service.
          </p>
        </div>
      </section>

      <section className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <h2 className="bk-h2">Leave a Google Review</h2>
          <p className="bk-p">
            Share your experience on Google to help other local customers learn
            about our service. If you have a question about a recent visit, you
            can also contact our team.
          </p>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
            <a
              href={COMPANY.reviewSources.googleReviewSubmission}
              target="_blank"
              rel="noopener noreferrer"
              className="bk-btn bk-btn-primary"
            >
              Leave a Google review
            </a>
            <Link to="/contact" className="bk-btn bk-btn-outline">Contact our team</Link>
          </div>
        </div>
      </section>

      <section className="bk-schedule-section">
        <div className="bk-schedule-inner">
          <div className="bk-schedule-card">
            <div className="bk-schedule-brand">
              <div className="bk-schedule-logo-badge">
                <Link to="/"><img src="/images/logo.png" alt={COMPANY.serviceDisplayName} /></Link>
              </div>
              <p className="bk-schedule-tagline">Licensed &amp; Insured</p>
            </div>
            <div className="bk-schedule-content">
              <p className="bk-schedule-eyebrow">Ready to Get Started?</p>
              <h2 className="bk-schedule-title">Get an Instant Quote</h2>
              <p className="bk-schedule-sub">Price your service online in minutes, or call and talk to us.</p>
              <div className="bk-com-cta-row">
                <Link to="/quote/instant" className="bk-btn bk-schedule-cta">
                  Get an Instant Quote
                </Link>
                <a href={OFFICE_TEL} className="bk-btn bk-btn-outline-light bk-com-talk-btn">
                  Call {OFFICE_PHONE}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
