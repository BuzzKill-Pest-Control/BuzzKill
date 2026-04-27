import Hero from "../components/Hero";
import ServiceSection from "../components/ServiceSection";
import NumberedSteps from "../components/NumberedSteps";
import FAQ from "../components/FAQ";
import ContactForm from "../components/ContactForm";

export default function InUnitServices() {
  const goToForm = () => {
    const el = document.getElementById("form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Hero
        image="/images/inunit-1.jpg"
        eyebrow="For Unit Owners"
        headline={<>In&#8209;Unit Services</>}
        sub={"Optional, discounted in\u2011unit treatment scheduled the same day your community gets serviced — no extra trip charges, no coordination headache."}
        primaryCta={{ label: "Schedule In\u2011Unit Service", onClick: goToForm }}
      />

      <ServiceSection
        image="/images/inunit-2.jpg"
        eyebrow="How it works"
        title="Same Visit. Lower Price. Online Scheduling."
        body="About a week before our scheduled visit to your building, you'll receive a link to schedule and pay online. We'll already be onsite — so pricing is grouped and discounted."
        bullets={[
          "Online scheduling and payment",
          "Grouped onsite pricing — discounted vs. standalone visits",
          "Coordinated with your HOA service day",
          "Optional and owner-initiated",
        ]}
        cta={{ label: "Schedule Now", onClick: goToForm }}
      />

      <NumberedSteps
        eyebrow="It's Simple"
        title="Three Steps, No Phone Tag"
        steps={[
          {
            title: "Schedule online",
            body: "Pick a service window during your building's next visit.",
          },
          {
            title: "Pay online",
            body: "Secure checkout. Discounted HOA-onsite pricing is applied automatically.",
          },
          {
            title: "We arrive on schedule",
            body: "We arrive during the scheduled window and complete the service efficiently.",
          },
        ]}
      />

      <FAQ
        eyebrow="Owner Questions"
        title={"In\u2011Unit FAQs"}
        items={[
          {
            q: "Do I need in\u2011unit service if the HOA treats common areas?",
            a: "Not always. It's most beneficial if you're actively seeing pest activity or the building has recurring pressure.",
          },
          {
            q: "How much does it cost?",
            a: "Pricing varies by service type and issue. Discounted HOA-onsite pricing is shown during the booking process.",
          },
          {
            q: "Is it safe for kids and pets?",
            a: "Our methods prioritize occupied homes. All products are applied per label directions and regulations.",
          },
        ]}
      />

      <ContactForm
        eyebrow="Schedule"
        title={"Schedule In\u2011Unit Service"}
        intro={"Ready to book discounted in\u2011unit pest control? Fill out the form and we'll get you set up for the next visit window."}
      />
    </>
  );
}
