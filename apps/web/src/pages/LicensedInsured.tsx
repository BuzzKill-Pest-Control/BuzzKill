import { Link } from "react-router-dom";
import {
  holderLabel,
  isoToday,
  publicCredentials,
  publicStatus,
  type Credential,
} from "../../amplify/functions/shared/credentials";
import { OFFICE_EMAIL, OFFICE_MAILTO, OFFICE_PHONE, OFFICE_TEL } from "../lib/contactInfo";

/**
 * The credentials page renders the same structured records the agreements
 * and PDFs print (amplify/functions/shared/credentials.ts), so a number, a
 * holder, a status, or a date can only ever be published one way. Both
 * Massachusetts pesticide credentials name their holder, Jacob Greasley, because
 * they are his credentials, not company licences; the MassWildlife Problem
 * Animal Control Permit names Nathaniel C Wiggin; the Rhode Island registration
 * names BuzzKill Pest Control LLC. Status is date-aware: nothing reads Active
 * past its stated expiration without renewal data.
 */

const ShieldIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

const DocIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 15l2 2 4-4" />
  </svg>
);

const InsuranceIcon = () => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M12 12m-3 0a3 3 0 106 0 3 3 0 10-6 0" />
    <path d="M2 10h2M20 10h2" />
  </svg>
);

type CredentialCardProps = {
  icon: React.ReactNode;
  title: string;
  details: { label: string; value: React.ReactNode }[];
  verifyUrl?: string;
  verifyLabel?: string;
  accent?: boolean;
};

function CredentialCard({
  icon,
  title,
  details,
  verifyUrl,
  verifyLabel = "Verify Credential",
  accent,
}: CredentialCardProps) {
  return (
    <div className={`bk-credential-card${accent ? " bk-credential-card--accent" : ""}`}>
      <div className="bk-credential-head">
        {icon}
        <h3 className="bk-credential-title">{title}</h3>
      </div>

      <dl className="bk-credential-dl">
        {details.map((d, i) => (
          <div key={i} className="bk-credential-row">
            <dt className="bk-credential-dt">{d.label}</dt>
            <dd className="bk-credential-dd">{d.value}</dd>
          </div>
        ))}
      </dl>

      {verifyUrl && (
        <div className="bk-credential-verify">
          <a
            href={verifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bk-btn bk-btn-outline"
          >
            {verifyLabel} &rarr;
          </a>
        </div>
      )}
    </div>
  );
}

const DATE = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

/** The rows a credential record renders, in display order. */
function detailsFor(c: Credential, asOf: string): CredentialCardProps["details"] {
  const rows: CredentialCardProps["details"] = [
    { label: c.numberLabel ?? (c.jurisdiction === "RI" ? "Registration #" : "License #"), value: c.number },
    { label: "Type", value: c.type },
    { label: c.holder.kind === "company" ? "Registrant" : "Holder", value: holderLabel(c) },
  ];
  if (c.category) rows.push({ label: "Category", value: c.category });
  rows.push({ label: "Agency", value: c.issuer });
  if (c.issuedOn) rows.push({ label: "Issued", value: DATE(c.issuedOn) });
  // An expiration is shown only when the issuer supplied one; none is invented.
  if (c.validThrough) rows.push({ label: "Valid through", value: DATE(c.validThrough) });
  const status = publicStatus(c, asOf);
  rows.push({
    label: "Status",
    value: status === "Active" ? <span className="bk-credential-status">{status}</span> : status,
  });
  if (c.verifyInstructions) rows.push({ label: "How to verify", value: c.verifyInstructions });
  return rows;
}

export default function LicensedInsured() {
  const asOf = isoToday();
  const credentials = publicCredentials(asOf);
  // The permit documents its individual holder, not a relationship to BuzzKill.
  const personalPermits = credentials.filter((c) => c.id === "MA_PROBLEM_ANIMAL_CONTROL");
  const pestControlCredentials = credentials.filter((c) => c.id !== "MA_PROBLEM_ANIMAL_CONTROL");
  return (
    <>
      {/* Hero */}
      <section className="bk-section bk-section-light">
        <div className="bk-container bk-credentials-layout">
          <div className="bk-credentials-content">
            <div className="bk-eyebrow">Credentials</div>
            <h1 className="bk-h1-lower">Licensed &amp; Insured</h1>
            <p className="bk-body-lead">
              BuzzKill Pest Control carries insurance and works under the
              pesticide credentials listed below. The Massachusetts pesticide
              credentials are held personally by our founder, Jacob Greasley;
              the Rhode Island registration is held by BuzzKill Pest Control
              LLC. Each card identifies the holder and issuing agency and links
              to an official lookup or contact page. A personal wildlife permit
              is presented separately with instructions for contacting its issuer.
            </p>
          </div>
          <div className="bk-credentials-visual">
            <img
              src="/images/licensed-insured-consult.png"
              alt=""
              aria-hidden="true"
              className="bk-credentials-photo"
            />
          </div>
        </div>
      </section>

      {/* Credentials grid */}
      <section className="bk-section bk-section-cream">
        <div className="bk-container" style={{ maxWidth: 880 }}>
          <h2 className="bk-h2">Pest Control Credentials &amp; Insurance</h2>
          <div className="bk-credential-grid">
            {pestControlCredentials.map((c) => (
              <CredentialCard
                key={c.id}
                icon={c.jurisdiction === "RI" ? <ShieldIcon /> : <DocIcon />}
                title={c.title}
                accent={c.primaryForDocuments}
                details={detailsFor(c, asOf)}
                verifyUrl={c.verifyUrl}
                verifyLabel={c.verifyLabel}
              />
            ))}

            <CredentialCard
              icon={<InsuranceIcon />}
              title="Insurance"
              details={[
                {
                  label: "Coverage",
                  value:
                    "General liability and pesticide/herbicide coverage",
                },
                {
                  label: "COI",
                  value:
                    "Certificate of Insurance available on request for HOA boards and property managers",
                },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="bk-section bk-section-light">
        <div className="bk-container" style={{ maxWidth: 880 }}>
          <h2 className="bk-h2">Personal Wildlife Permit</h2>
          <p className="bk-p">
            This permit is held by the named individual and is presented
            separately from BuzzKill&rsquo;s pesticide credentials and company
            registration.
          </p>
          <div className="bk-credential-grid">
            {personalPermits.map((c) => (
              <CredentialCard
                key={c.id}
                icon={<DocIcon />}
                title={c.title}
                details={detailsFor(c, asOf)}
                verifyUrl={c.verifyUrl}
                verifyLabel={c.verifyLabel}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Schedule Inspection CTA */}
      <section className="bk-schedule-section">
        <div className="bk-schedule-inner">
          <div className="bk-schedule-card">
            <div className="bk-schedule-brand">
              <div className="bk-schedule-logo-badge">
                <Link to="/"><img src="/images/logo.png" alt="BuzzKill Pest Control" /></Link>
              </div>
              <p className="bk-schedule-tagline">Licensed &amp; Insured</p>
            </div>
            <div className="bk-schedule-content">
              <p className="bk-schedule-eyebrow">Need a Certificate of Insurance?</p>
              <h2 className="bk-schedule-title">Request It and We&rsquo;ll Email It to You</h2>
              <p className="bk-schedule-sub">HOA boards and property managers can request our COI at any time.</p>
              <div className="bk-com-cta-row">
                <a
                  href={`${OFFICE_MAILTO}?subject=COI%20Request&body=Hi%20BuzzKill%2C%0A%0AI%20would%20like%20to%20request%20a%20Certificate%20of%20Insurance%20for%20our%20property.%0A%0AProperty%20Name%3A%20%0AProperty%20Address%3A%20%0AContact%20Name%3A%20%0APhone%3A%20%0A%0AThank%20you!`}
                  className="bk-btn bk-schedule-cta"
                >
                  Request Certificate of Insurance
                </a>
                <a href={OFFICE_TEL} className="bk-btn bk-btn-outline-light bk-com-talk-btn">
                  Call {OFFICE_PHONE}
                </a>
              </div>
              <p className="bk-schedule-sub" style={{ marginTop: 12 }}>
                Questions about a credential? Email <a href={OFFICE_MAILTO}>{OFFICE_EMAIL}</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
