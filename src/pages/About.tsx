import { useNavigate } from "react-router-dom";
import ServiceSection from "../components/ServiceSection";
import ContactForm from "../components/ContactForm";

export default function About() {
  const navigate = useNavigate();
  const goToForm = () => {
    const el = document.getElementById("form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <section className="bk-section bk-section-light">
        <div className="bk-container bk-narrow">
          <div className="bk-eyebrow">About BuzzKill</div>
          <h1 className="bk-h1-lower">about</h1>
          <p className="bk-body-lead">
            BuzzKill Pest Control was built to solve a common problem in shared
            living communities: pest issues that keep coming back because common
            areas and units are treated separately—or not treated consistently.
          </p>
          <p className="bk-p">
            We specialize in condo and HOA pest management with a model designed
            for building-wide prevention, professional communication, and owner
            convenience.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
            <button
              type="button"
              className="bk-btn bk-btn-primary"
              onClick={() => navigate("/condo-services")}
            >
              Condo Services
            </button>
            <button
              type="button"
              className="bk-btn bk-btn-outline"
              onClick={() => navigate("/in-unit-services")}
            >
              In&#8209;Unit Services
            </button>
          </div>
        </div>
      </section>

      <ServiceSection
        image="/images/about-hero.jpg"
        eyebrow="Our Mission"
        title="Pest Control That Works for Buildings"
        body="To deliver pest control that is safe for families, tough on pests, designed for condos and HOAs, and easy to schedule and manage."
        bullets={[
          "Condo-first expertise",
          "Prevention over panic",
          "Simple coordination for owners",
          "Massachusetts-licensed and label-compliant",
        ]}
        cta={{ label: "Get a Proposal", onClick: goToForm }}
        reversed
      />

      <ContactForm />
    </>
  );
}
