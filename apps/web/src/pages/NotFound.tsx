import { Link } from "react-router-dom";
import { OFFICE_PHONE_PRETTY, OFFICE_TEL } from "../lib/contactInfo";

/**
 * The page for a URL the site does not publish. The hosting layer answers
 * every extension-less path with the shell and a 200, so without this a
 * mistyped address rendered an empty page that search engines could index;
 * the head manager marks this route noindex and the copy says what happened.
 */
export default function NotFound() {
  return (
    <section className="bk-section bk-section-cream">
      <div className="bk-container bk-narrow bk-center">
        <p className="bk-eyebrow">Page Not Found</p>
        <h1 className="bk-h1-lower">We couldn&rsquo;t find that page</h1>
        <p className="bk-body-lead">
          The link may be out of date, or the address may have a typo. The pages
          below cover most of what people are looking for.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginTop: 28 }}>
          <Link to="/" className="bk-btn bk-btn-primary">Back to Home</Link>
          <Link to="/quote/instant" className="bk-btn bk-btn-outline">Get an Instant Quote</Link>
          <Link to="/service-areas" className="bk-btn bk-btn-outline">Service Areas</Link>
        </div>
        <p className="bk-p" style={{ marginTop: 28 }}>
          Or call us at <a href={OFFICE_TEL}>{OFFICE_PHONE_PRETTY}</a>.
        </p>
      </div>
    </section>
  );
}
