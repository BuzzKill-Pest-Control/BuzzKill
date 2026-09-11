import { Link } from "react-router-dom";
import {
  COMPANY,
  SITE_DOMAIN,
  companyAddressLines,
  serviceAreaSentence,
} from "../../amplify/functions/shared/company";
import { OFFICE_EMAIL, OFFICE_MAILTO, OFFICE_PHONE, OFFICE_TEL } from "../lib/contactInfo";

/**
 * The company page: who BuzzKill is, who founded it, where it is, and where
 * it works. Every fact here is the visible counterpart of the JSON-LD entity
 * graph (src/seo/schema.ts), so nothing in the markup is claimed that a
 * visitor cannot read. The founder section's id is the Person entity's URL
 * fragment and must stay `jake-greasley`.
 */

const FORMED = new Date(`${COMPANY.foundingDate}T12:00:00Z`).toLocaleDateString("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

export default function AboutPage() {
  const [street, cityLine] = companyAddressLines();
  const founder = COMPANY.founder;
  return (
    <>
      {/* Intro */}
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">About {COMPANY.brandName}</div>
          <h1 className="bk-h1-lower">About {COMPANY.serviceDisplayName}</h1>
          <p className="bk-body-lead">{COMPANY.description}</p>
          <p className="bk-p">
            We protect homes, condominiums, HOA communities, and businesses.
            Every service follows the BuzzKill Method, our own way of working:
            we start by understanding your property and what is drawing pests
            to it, solve the problem at its source, and help protect the
            property so it stays that way. Most services can be priced and
            booked online in minutes.
          </p>
        </div>
      </section>

      {/* Founder */}
      <section id="jake-greasley" className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Our Founder</div>
          <h2 className="bk-h2">Founded by {founder.name}</h2>
          <p className="bk-body-lead">
            {COMPANY.brandName} was founded by {founder.name}, legally{" "}
            {founder.alternateNames[1]}. Jake, Jacob, and {founder.alternateNames[1]}{" "}
            are the same person.
          </p>
          <p className="bk-p">
            Jake began designing and planning {COMPANY.brandName} in{" "}
            {COMPANY.planning.began}. {COMPANY.legalName} was formed in
            Massachusetts on {FORMED}. He started the company to give
            homeowners, community boards, and property managers a pest control
            company that explains what it is doing and why, prices its work
            openly, and treats the causes of a pest problem rather than only the
            pests in view.
          </p>
          <p className="bk-p">Jake elsewhere online:</p>
          <ul className="bk-bullets bk-founder-links">
            <li>
              <a href="https://jakegreasley.com/" rel="me noopener noreferrer" target="_blank">
                Jake Greasley’s personal website
              </a>
            </li>
            {founder.sameAs.map((p) => (
              <li key={p.url}>
                <a href={p.url} rel="me noopener noreferrer" target="_blank">
                  {p.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Company facts */}
      <section className="bk-section bk-section-cream">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Company Details</div>
          <h2 className="bk-h2">The Company Behind the Name</h2>
          <p className="bk-p">
            {COMPANY.legalName} operates the {COMPANY.brandName} brand and
            provides the services described on this site as{" "}
            {COMPANY.serviceDisplayName}. It is a Massachusetts limited
            liability company formed on {FORMED}, and it is the company that
            provides and contracts for every service on this site.
          </p>
          <dl className="bk-credential-dl" style={{ marginTop: 24 }}>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Legal name</dt>
              <dd className="bk-credential-dd">{COMPANY.legalName}</dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Brand</dt>
              <dd className="bk-credential-dd">{COMPANY.brandName}</dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Services described as</dt>
              <dd className="bk-credential-dd">{COMPANY.serviceDisplayName}</dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">{COMPANY.registrations.massachusetts.label}</dt>
              <dd className="bk-credential-dd">{COMPANY.registrations.massachusetts.id}</dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Formed</dt>
              <dd className="bk-credential-dd">{FORMED}</dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Planning began</dt>
              <dd className="bk-credential-dd">{COMPANY.planning.began}</dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Founder</dt>
              <dd className="bk-credential-dd">
                {founder.name} ({founder.alternateNames[1]})
              </dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Office</dt>
              <dd className="bk-credential-dd">
                {street}
                <br />
                {cityLine}
              </dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Phone</dt>
              <dd className="bk-credential-dd">
                <a href={OFFICE_TEL}>{OFFICE_PHONE}</a>
              </dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Email</dt>
              <dd className="bk-credential-dd">
                <a href={OFFICE_MAILTO}>{OFFICE_EMAIL}</a>
              </dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Service area</dt>
              <dd className="bk-credential-dd">{serviceAreaSentence()}</dd>
            </div>
            <div className="bk-credential-row">
              <dt className="bk-credential-dt">Website</dt>
              <dd className="bk-credential-dd">{SITE_DOMAIN}</dd>
            </div>
          </dl>
          <p className="bk-p" style={{ marginTop: 24 }}>
            Our state pesticide credentials and insurance details are published
            on the <Link to="/licensed-insured">Licensed &amp; Insured</Link>{" "}
            page, with links to the state portals where they can be verified.
          </p>
        </div>
      </section>

      {/* Where we work */}
      <section className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">Where We Work</div>
          <h2 className="bk-h2">Serving Massachusetts and Rhode Island</h2>
          <p className="bk-p">
            {COMPANY.brandName} is based in Marlborough, Massachusetts, and
            serves properties across{" "}
            <Link to="/locations/massachusetts">Massachusetts</Link> and{" "}
            <Link to="/locations/rhode-island">Rhode Island</Link>. The full
            list of towns we serve is on the{" "}
            <Link to="/service-areas">Service Areas</Link> page.
          </p>
          <p className="bk-p">
            Other companies in other states also use the name Buzzkill Pest
            Control. They are not connected to us. If you are looking for the
            Marlborough, Massachusetts company, you are in the right place.
          </p>
        </div>
      </section>

      {/* Final CTA */}
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
                <Link to="/quote" className="bk-btn bk-schedule-cta">
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
