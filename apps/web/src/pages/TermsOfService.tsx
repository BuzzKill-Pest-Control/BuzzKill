import { COMPANY, SITE_HOSTNAME } from "../../amplify/functions/shared/company";
import { OFFICE_ADDRESS, OFFICE_EMAIL, OFFICE_MAILTO, OFFICE_PHONE, OFFICE_TEL } from "../lib/contactInfo";

export default function TermsOfService() {
  return (
    <>
    <section className="bk-legal">
      <div className="bk-container bk-narrow">
        <h1>Terms of Service</h1>
        <p className="bk-legal-meta">
          <strong>Effective Date:</strong> January 16, 2026 &nbsp;|&nbsp;{" "}
          <strong>Last Updated:</strong> September 7, 2026
        </p>

        <p>
          These Terms of Service ("Terms") govern your use of the BuzzKill Pest
          Control website ({SITE_HOSTNAME}) and our pest control services.
          By using the Site or scheduling Services, you agree to these Terms.
        </p>

        <h2>1. Definitions</h2>
        <p>
          "Company" refers to {COMPANY.legalName}, the Massachusetts limited
          liability company that operates the {COMPANY.brandName} brand,
          provides the services described as {COMPANY.serviceDisplayName}, and
          contracts for the Services. "You" refers to any user of the Site.
          "Services" refers to pest control and related offerings.
        </p>

        <h2>2. Site Use &amp; Eligibility</h2>
        <p>
          Users must be 18 or older and legally able to enter contracts.
          Prohibited activities include unauthorized access, data scraping,
          submitting false information, and violating laws through the Site.
        </p>

        <h2>3. Quotes, Scheduling &amp; Service Requests</h2>
        <ul>
          <li>
            Online quotes are priced from the property details you enter, and
            when you book online your card is charged the amount shown. Quotes
            prepared by our office are estimates subject to change after
            inspection or scope clarification
          </li>
          <li>
            Online bookings are confirmed at checkout and by the confirmation
            email you receive. Contact-form, email, and phone requests require
            confirmation from our office, and a request alone does not guarantee
            a booking
          </li>
          <li>
            Customers must provide safe access, secure pets, and follow prep
            instructions
          </li>
        </ul>

        <h2>4. Service Limitations</h2>
        <p>
          Pest control outcomes vary due to factors outside our control,
          including sanitation and weather. No guaranteed pest elimination unless
          expressly stated in a written service agreement.
        </p>

        <h2>5. Payments &amp; Billing</h2>
        <ul>
          <li>
            For online bookings, your card is charged the amount shown when you
            book. Other charges are due per the invoice unless stated otherwise
          </li>
          <li>
            Third-party payment processors handle online transactions
          </li>
          <li>Late payments may incur fees per invoice terms</li>
          <li>
            Refunds for online bookings follow the cancellation policy in
            Section 7. Other refund eligibility depends on services rendered and
            written plan terms
          </li>
        </ul>

        <h2>6. Subscriptions &amp; Plans</h2>
        <p>
          Auto-renewal applies until canceled per plan documentation. Charges
          occur per schedule. Price changes follow applicable law.
        </p>

        <h2>7. Cancellations &amp; Rescheduling</h2>
        {/*
          Mirrors the enforced booking policy: CANCEL_FULL_REFUND_DAYS in
          amplify/functions/shared/bookingTerms.ts, which is the same text a
          customer accepts at online checkout and the /cancel flow enforces.
          Keep this sentence identical to VISIT_CANCELLATION_SENTENCE if that constant
          ever changes.
        */}
        <p>
          Cancel more than 3 whole days before your visit for a full refund.
          Cancellations 3 days or less before the visit are not refundable. This
          is the same policy shown and accepted at checkout when you book online.
        </p>

        <h2>8. Customer Responsibilities</h2>
        <p>
          Customers represent property ownership or authorization and must
          disclose relevant conditions (allergies, animals, aquariums). Follow
          post-service instructions and protect fragile items.
        </p>

        <h2>9. Content &amp; Reviews</h2>
        <p>
          User submissions grant the Company a non-exclusive license to use
          content for business purposes. Unlawful or defamatory content is
          prohibited.
        </p>

        <h2>10. Intellectual Property</h2>
        <p>
          Site content is protected by law. Copying or modification without
          permission is restricted.
        </p>

        <h2>11. Third-Party Services</h2>
        <p>
          The Company disclaims responsibility for linked services or their
          practices.
        </p>

        <h2>12. Disclaimers</h2>
        <p>
          THE SITE IS PROVIDED "AS IS" AND "AS AVAILABLE." ALL IMPLIED
          WARRANTIES ARE DISCLAIMED TO THE MAXIMUM EXTENT ALLOWED BY LAW.
        </p>

        <h2>13. Liability Limits</h2>
        <p>
          Indirect or consequential damages are excluded. Total liability is
          capped at amounts paid for Services within 3 months prior (minimum
          $100).
        </p>

        <h2>14. Indemnification</h2>
        <p>
          Users agree to defend the Company against claims arising from Site
          misuse or Terms violations.
        </p>

        <h2>15. Dispute Resolution</h2>
        <p>
          These Terms are governed by Massachusetts law. Disputes shall be heard
          in Massachusetts courts.
        </p>

        <h2>16. Changes to Terms</h2>
        <p>
          Updates are posted on the Site and become effective upon posting.
          Continued use signals acceptance.
        </p>

        <h2>Contact</h2>
        <p>
          {COMPANY.legalName}
          <br />
          {OFFICE_ADDRESS}
          <br />
          <a href={OFFICE_TEL}>{OFFICE_PHONE}</a>
          <br />
          <a href={OFFICE_MAILTO}>{OFFICE_EMAIL}</a>
        </p>
      </div>
    </section>
    </>
  );
}
