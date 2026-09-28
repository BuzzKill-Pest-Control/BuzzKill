import { Link } from "react-router-dom";
import { COMPANY } from "../../amplify/functions/shared/company";
import { OFFICE_PHONE, OFFICE_TEL } from "../lib/contactInfo";
import { PUBLIC_REVIEWS, REVIEW_LINKS, THUMBTACK_RATING } from "../data/reviews";

/**
 * The public reviews, quoted from the listing where they were published, with
 * links to read them at the source and to leave a Google review. Visible to
 * visitors; kept out of Organization review markup on purpose.
 */
export default function Reviews() {
  return (
    <>
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Reviews</div>
          <h1 className="bk-h1-lower">What Our Customers Say</h1>
          <p className="bk-body-lead">
            {COMPANY.serviceDisplayName} is rated {THUMBTACK_RATING.value} on
            Thumbtack from {THUMBTACK_RATING.count} reviews. The reviews below
            are quoted from that public listing, where you can read them at the
            source.
          </p>
          <p className="bk-p">
            <span className="bk-announce-stars" aria-label={`${THUMBTACK_RATING.value} star rating`}>
              ★★★★★
            </span>{" "}
            <strong>{THUMBTACK_RATING.value}</strong> on Thumbtack ({THUMBTACK_RATING.count} reviews)
          </p>
        </div>
      </section>

      <section className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <ul className="bk-bullets bk-review-list">
            {PUBLIC_REVIEWS.map((r) => (
              <li key={`${r.author}-${r.date}`}>
                <blockquote className="bk-review">
                  <p className="bk-p">&ldquo;{r.text}&rdquo;</p>
                  <footer className="bk-p">
                    <strong>{r.author}</strong>, {r.source},{" "}
                    {new Date(`${r.date}T12:00:00Z`).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </footer>
                </blockquote>
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 28 }}>
            <a
              href={REVIEW_LINKS.thumbtack}
              target="_blank"
              rel="noopener noreferrer"
              className="bk-btn bk-btn-primary"
            >
              Read our reviews on Thumbtack
            </a>
            <a
              href={REVIEW_LINKS.leaveGoogleReview}
              target="_blank"
              rel="noopener noreferrer"
              className="bk-btn bk-btn-outline"
            >
              Leave a Google review
            </a>
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
