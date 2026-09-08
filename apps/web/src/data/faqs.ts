/**
 * FAQ content that is BOTH rendered on a page and published as FAQPage
 * structured data. Kept here (not inside the page component) so the head
 * manager, the build-time prerender, and the page all read the same items:
 * a FAQ in the markup that is not on the page is a markup violation.
 *
 * Answers about safety, pesticides, or outcomes state only what BuzzKill
 * actually does (label directions, state regulations, clear guidance), never
 * that a treatment is "safe" or that one visit is a permanent fix.
 */
import type { FAQItem } from "../seo/schema";
import type { CityEntry } from "./cities";
import { COMPANY } from "../../amplify/functions/shared/company";

export const HOME_FAQS: FAQItem[] = [
  {
    q: "How do I know which pest control service I need?",
    a: "You don’t have to figure it out on your own. Whether you’re dealing with ants, rodents, termites, mosquitoes, or something you can’t identify, BuzzKill will help match your property with the right pest control service. Most services can be quoted instantly online, so you can get started without waiting for a call.",
  },
  {
    q: "Are your pest control treatments safe for children and pets?",
    a: "We take that question seriously, and we answer it with what we actually do rather than a blanket promise. Every product we use is applied according to its label directions and Massachusetts or Rhode Island regulations, and our technicians plan each visit around how your household actually lives. Before we start, we explain what we are applying, where, and any steps to take before, during, and after the visit.",
  },
  {
    q: "Can I get an instant quote online?",
    a: "Absolutely. Most of our residential pest control services include an instant online quote, allowing you to see pricing, choose a plan, and schedule your service in just a few clicks. A few specialized services may require additional information before pricing can be provided.",
  },
  {
    q: "Will one treatment solve the problem permanently?",
    a: "Every pest problem is different. Some issues can be resolved with a single visit, while others benefit from ongoing pest management to help prevent pests from returning. We identify what’s attracting pests, treat the problem at its source, and recommend the best plan to help keep your property protected.",
  },
];

export const CONDO_FAQS: FAQItem[] = [
  { q: "Do you require owner participation?", a: "No. Owner participation is optional. The HOA contract remains separate from any owner in‑unit service." },
  { q: "Can you service multiple buildings within a community?", a: "Yes. We can set up one program that covers all buildings and common areas, with clear scheduling." },
  { q: "Do you provide reports or notes after service?", a: "Yes, service notes are provided in a format that works for property management and board records." },
];

export const INUNIT_FAQS: FAQItem[] = [
  { q: "Do I need in‑unit service if the HOA treats common areas?", a: "Not always. But in‑unit service can help if you’re actively seeing pest activity, or if your building has recurring pressure." },
  { q: "How much does it cost?", a: "Pricing varies by service type and issue. Your exact price is shown online before you book, and days when we are already working nearby can price lower." },
  { q: "Is it safe for kids and pets?", a: "We prioritize methods suitable for occupied homes and apply all products according to label directions and state regulations. You’ll receive any guidance needed for your specific service." },
];

/** The three questions every city page answers, in the city's own words. */
export function cityFaqs(city: CityEntry): FAQItem[] {
  const { city: name, stateAbbr } = city;
  return [
    {
      q: `Do you service condos and HOAs in ${name}?`,
      a: `Yes. BuzzKill is based in Marlborough, Massachusetts and provides professional pest control for condominiums, HOAs, and multi-unit communities in ${name}, ${stateAbbr} and surrounding areas.`,
    },
    {
      q: "Is in-unit service required?",
      a: `No. In-unit service is optional and scheduled directly by ${name} unit owners. The HOA contract covers common areas only.`,
    },
    {
      q: `How do I get a quote for my ${name} property?`,
      a: `Use the instant quote on this page: enter your property details, see your price in seconds, and book online. Homes, condo and HOA communities, and commercial properties all price instantly. Or call us at ${COMPANY.phone.display}.`,
    },
  ];
}
