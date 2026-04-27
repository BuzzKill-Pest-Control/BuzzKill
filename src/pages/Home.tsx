import { useNavigate } from "react-router-dom";
import Hero from "../components/Hero";
import ServiceSection from "../components/ServiceSection";
import NumberedSteps from "../components/NumberedSteps";
import WhyUs from "../components/WhyUs";
import FAQ from "../components/FAQ";
import ContactForm from "../components/ContactForm";

export default function Home() {
  const navigate = useNavigate();
  const goToForm = () => {
    const el = document.getElementById("form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Hero
        image="/images/hero-home-1.jpg"
        eyebrow="Massachusetts HOA & Condo Pest Control"
        headline={
          <>
            Safe for Families.
            <br />
            <em>Tough on Pests.</em>
          </>
        }
        sub="Professional pest control for condominiums, HOAs, and shared living communities — built for building-wide prevention and owner convenience."
        primaryCta={{ label: "Request HOA Proposal", onClick: goToForm }}
        secondaryCta={{ label: "Schedule In\u2011Unit Service", onClick: goToForm }}
      />

      <ServiceSection
        image="/images/hero-home-2.jpg"
        eyebrow="What we do best"
        title="Condo & HOA Pest Control, Done the Smart Way"
        body={"Most pest issues in condos don't respect unit boundaries. That's why we focus on building-wide prevention and consistent service—not one\u2011off reactions."}
        bullets={[
          "HOA common-area pest control: basements, utility rooms, trash areas, exterior perimeter",
          "Optional in\u2011unit service for owners",
          "Preventative programs designed for shared living",
          "Clear reporting for boards and property managers",
        ]}
        cta={{
          label: "Learn About In\u2011Unit Service",
          onClick: () => navigate("/in-unit-services"),
        }}
      />

      <NumberedSteps
        eyebrow="The Model"
        title="How Our Condo & HOA Model Works"
        steps={[
          {
            title: "We service common areas",
            body: "Your association receives consistent, scheduled pest control for HOA-owned spaces—done professionally, with minimal disruption.",
          },
          {
            title: "Owners can add discounted in\u2011unit service",
            body: "About a week before our visit, owners can choose to schedule and pay online for in\u2011unit treatment during the same window.",
          },
          {
            title: "Everything is grouped onsite",
            body: "Owners get convenience and lower pricing. The community benefits from a stronger, building-wide approach.",
          },
        ]}
      />

      <WhyUs
        title="Why HOAs and Property Managers Choose BuzzKill"
        items={[
          {
            title: "Condo-specific expertise",
            body: "We understand shared walls, common infrastructure spaces, and recurring patterns that drive pest pressure in multi-unit buildings.",
          },
          {
            title: "Safety-first mindset",
            body: "We prioritize methods and products appropriate for occupied spaces and follow all label and regulatory requirements.",
          },
          {
            title: "Professional communication",
            body: "Clear scheduling, consistent service, and board-friendly documentation.",
          },
        ]}
      />

      <FAQ
        items={[
          {
            q: "Do you only work with condos and HOAs?",
            a: "Our primary focus is condos and HOAs, because that's where our model provides the most value.",
          },
          {
            q: "Is in\u2011unit service required?",
            a: "No. In\u2011unit service is optional and scheduled directly by the unit owner.",
          },
          {
            q: "Do you coordinate communication to owners?",
            a: "Yes—BuzzKill provides a scheduling/payment link and suggested announcement copy; your property manager can distribute it to owners.",
          },
          {
            q: "Can you service multiple buildings in a community?",
            a: "Yes. One program can cover all buildings and common areas with a single schedule and a single point of contact.",
          },
        ]}
      />

      <ContactForm />
    </>
  );
}
