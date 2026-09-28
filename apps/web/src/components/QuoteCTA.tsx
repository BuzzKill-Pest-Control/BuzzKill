import { Link } from "react-router-dom";
import { OFFICE_PHONE_PRETTY, OFFICE_TEL } from "../lib/contactInfo";

type QuoteCTAProps = {
  eyebrow?: string;
  title?: string;
  intro?: string;
};

/**
 * The site's single service-request entry point, replacing the old
 * multi-step lead form. The /quote funnel prices every service for every
 * property type on the spot and books online — homes, communities, and
 * commercial alike. Only the rare unpriceable case (unresolvable address,
 * fully booked month, research fallback) is captured for a specialist
 * call, so every prospect type still funnels through the same door.
 *
 * Keeps `id="form"` so every page's scroll-to-form CTA still lands here.
 */
export default function QuoteCTA({
  eyebrow = "Get Started",
  title = "See Your Price in Seconds",
  intro = "Tell us about your pest problem and get an instant quote for most services, then pick a day and book online.",
}: QuoteCTAProps) {
  return (
    <section className="bk-section bk-section-light" id="form">
      <div className="bk-container bk-narrow bk-center">
        <div className="bk-eyebrow">{eyebrow}</div>
        <h2 className="bk-h2">{title}</h2>
        <p className="bk-body-lead">{intro}</p>
        <p className="bk-p" style={{ maxWidth: 560, margin: "0 auto" }}>
          Termites, wildlife, condo &amp; HOA, or commercial? Same quote flow,
          with instant pricing for most services and a day picker for every open date.
        </p>
        <div
          style={{
            display: "flex",
            gap: 14,
            justifyContent: "center",
            flexWrap: "wrap",
            marginTop: 28,
          }}
        >
          <Link to="/quote/instant" className="bk-btn bk-btn-primary" data-track-id="quote_cta_primary">
            Get My Instant Quote &rarr;
          </Link>
          <a href={OFFICE_TEL} className="bk-btn bk-btn-outline" data-track-id="quote_cta_phone">
            Or call {OFFICE_PHONE_PRETTY}
          </a>
        </div>

        {/* Trust bar */}
        <div className="bk-form-trust">
          {["Licensed & Insured", "MA • RI", "Price in seconds", "Book online"].map(
            (t, i) => (
              <div key={i} className="bk-form-trust__item">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                {t}
              </div>
            ),
          )}
        </div>
      </div>
    </section>
  );
}
