import { Link } from "react-router-dom";
import QuoteCTA from "./QuoteCTA";
import { CITIES } from "../data/cities";
import { holderLabel, isoToday, publicCredentials, publicStatus } from "../../amplify/functions/shared/credentials";

type Props = {
  stateAbbr: "MA" | "RI";
  stateName: string;
  intro: string;
};

/**
 * One state of the service area: what BuzzKill does there, the credential it
 * works under, and every town it serves, each linked to its own page. The
 * town list is the same registry the sitemap and the Service Areas directory
 * use, so the three can never disagree.
 */
export default function StateServiceArea({ stateAbbr, stateName, intro }: Props) {
  const towns = CITIES.filter((c) => c.stateAbbr === stateAbbr);
  // The same records the Licensed & Insured page and the agreements print,
  // with the date-aware status they carry there.
  const asOf = isoToday();
  const credentials = publicCredentials(asOf, stateAbbr);
  return (
    <>
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Service Area</div>
          <h1 className="bk-h1-lower">{stateName} Pest Control</h1>
          <p className="bk-body-lead">{intro}</p>
          <p className="bk-p">
            BuzzKill Pest Control is based in Marlborough, Massachusetts, and
            serves {stateName}. We do not keep a branch office in {stateName};
            technicians travel to your property, and scheduling is built
            around that drive.
          </p>
        </div>
      </section>

      <section className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Credentials in {stateName}</div>
          <h2 className="bk-h2">Credentials for {stateName}</h2>
          <ul className="bk-bullets">
            {credentials.map((c) => {
              const status = publicStatus(c, asOf);
              return (
                <li key={c.id}>
                  <strong>{c.title}.</strong> {c.number}, {c.holder.kind === "company" ? "registered to" : "held by"}{" "}
                  {holderLabel(c)}. Issued by {c.issuer}
                  {c.category ? ` (${c.category})` : ""}. Status: {status}.
                </li>
              );
            })}
          </ul>
          <p className="bk-p">
            Registration and license numbers, who holds each credential, and
            links to the state lookup portals are on our{" "}
            <Link to="/licensed-insured">Licensed &amp; Insured</Link> page.
          </p>
        </div>
      </section>

      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Towns We Serve</div>
          <h2 className="bk-h2">{stateName} Service Area</h2>
          <p className="bk-p">
            {towns.length} {stateName} {towns.length === 1 ? "community" : "communities"} have their own
            page. If your town is not listed, use the instant quote below: the
            quote checks your address against our current service area.
          </p>
          <ul className="bk-bullets" style={{ columns: 2, columnGap: 32 }}>
            {towns.map((t) => (
              <li key={t.slug}>
                <Link to={`/pest-control/${t.slug}`}>{t.city}, {t.stateAbbr}</Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <QuoteCTA
        eyebrow={`Pest Control in ${stateName}`}
        title="See Your Price in Seconds"
        intro={`Tell us about your ${stateName} property and get an instant quote, then book online.`}
      />
    </>
  );
}
