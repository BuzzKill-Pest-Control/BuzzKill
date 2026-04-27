import Hero from "../components/Hero";
import NumberedSteps from "../components/NumberedSteps";
import ServiceSection from "../components/ServiceSection";
import FAQ from "../components/FAQ";
import ContactForm from "../components/ContactForm";

export default function CondoServices() {
  const goToForm = () => {
    const el = document.getElementById("form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Hero
        image="/images/condo-hero.jpg"
        eyebrow="HOA Common-Area Service"
        headline={<>Condo Services</>}
        sub="Preventative pest control for HOA-owned areas and building exteriors — scheduled, documented, and built around shared-living realities."
        primaryCta={{ label: "Request HOA Proposal", onClick: goToForm }}
      />

      <NumberedSteps
        eyebrow="What's Included"
        title="Common-Area Coverage"
        steps={[
          {
            title: "Exterior perimeter",
            body: "Foundation, dumpster pads, doorways, and entry points—the front line of building-wide pressure.",
          },
          {
            title: "Shared interiors",
            body: "Basements, utility rooms, trash chutes, common hallways, mechanical rooms.",
          },
          {
            title: "Reporting",
            body: "Visit summaries delivered to the board and property manager after every service.",
          },
        ]}
      />

      <ServiceSection
        image="/images/hero-home-3.jpg"
        eyebrow="Preventative Program"
        title="A Program Built for Shared Living"
        body="Condo pest control requires a different mindset than single-family homes. Our approach emphasizes consistent scheduling, monitoring, and practical recommendations that reduce pressure over time."
        bullets={[
          "Monthly, bi-monthly, or quarterly service plans",
          "Monitoring and pattern tracking",
          "Board-friendly documentation",
          "Practical recommendations on conditions that attract pests",
        ]}
        cta={{ label: "Request Proposal", onClick: goToForm }}
      />

      <FAQ
        eyebrow="HOA Questions"
        title="Common-Area FAQs"
        items={[
          {
            q: "Do you require owner participation?",
            a: "No. Owner participation is optional. The HOA contract remains separate from any owner in\u2011unit service.",
          },
          {
            q: "Can you service multiple buildings within a community?",
            a: "Yes. We can set up one program that covers all buildings and common areas, with a single schedule and a single point of contact.",
          },
          {
            q: "Do you provide reports or notes after service?",
            a: "Yes—service notes are provided in a format that works for property management and board records.",
          },
        ]}
      />

      <ContactForm
        eyebrow="Request a Proposal"
        title="Start a Common-Area Program"
        intro="Share a few details about your community and we'll put together a clean program—plus a scheduling link for interested owners."
      />
    </>
  );
}
