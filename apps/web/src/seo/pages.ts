/**
 * The route registry: every URL the site publishes, with the metadata search
 * engines and social crawlers read for it.
 *
 * This is the single source for page titles, descriptions, canonical paths,
 * breadcrumbs, Service nodes, FAQ markup, and index/noindex. The client head
 * manager (components/SEO.tsx), the build-time sitemap and prerender
 * (scripts/postbuild.mts), and the regression tests all read it, so a page
 * cannot have one title in the tab and another in the sitemap.
 *
 * pages.test.ts checks that every static route in App.tsx is registered here
 * and vice versa, so adding a route without metadata fails the build.
 */
import { CITIES, CITY_BY_SLUG, type CityEntry } from "../data/cities";
import { CONDO_FAQS, HOME_FAQS, INUNIT_FAQS, cityFaqs } from "../data/faqs";
import { COMPANY } from "../../amplify/functions/shared/company";
import { canonicalPathFor, normalizePath } from "./canonical";
import type { Crumb, FAQItem, WebPageType } from "./schema";

export type PageKind =
  | "home"
  | "about"
  | "contact"
  | "audience"
  | "service"
  | "area"
  | "city"
  | "info"
  | "legal"
  | "funnel"
  | "landing"
  | "notfound";

export type PageMeta = {
  /** Canonical path (no trailing slash; "/" for home). */
  path: string;
  kind: PageKind;
  /** Page title without the site suffix (the home page is the exception and
   *  carries its full title). */
  title: string;
  description: string;
  /** Social image path; defaults to the site image. */
  image?: string;
  /** `true`: noindex,nofollow. `"follow"`: noindex,follow (reachable, crawled
   *  for links, not indexed). Either way excluded from the sitemap. */
  noindex?: boolean | "follow";
  /** Trail after Home. Home is added automatically; the page itself is last. */
  breadcrumb?: Crumb[];
  /** A Service node for a page that describes one service the company sells. */
  service?: { name: string; description: string };
  /** FAQ items rendered on the page AND published as FAQPage markup. */
  faq?: FAQItem[];
  webPageType?: WebPageType;
  /** City service-area pages narrow `areaServed` to their city. */
  city?: CityEntry;
};

export const SITE_TITLE_SUFFIX = ` | ${COMPANY.name}`;

/** The <title> for a page: "Page | BuzzKill Pest Control", home as-is. */
export function fullTitle(meta: Pick<PageMeta, "title" | "kind">): string {
  return meta.kind === "home" ? meta.title : `${meta.title}${SITE_TITLE_SUFFIX}`;
}

const AREA = "Massachusetts and Rhode Island";

function page(meta: PageMeta): PageMeta {
  return meta;
}

/** Static routes, keyed by canonical path. Order is the sitemap order. */
export const STATIC_PAGES: PageMeta[] = [
  page({
    path: "/",
    kind: "home",
    title: "BuzzKill Pest Control in Marlborough, MA | Residential & Commercial Pest Control",
    description: `${COMPANY.description} Instant online quotes for homes, condominiums, HOAs, and businesses.`,
    faq: HOME_FAQS,
  }),

  // Audience landing pages
  page({
    path: "/residential",
    kind: "audience",
    title: "Residential Pest Control for MA & RI Homes",
    description: `Professional residential pest control for homes across ${AREA}: ants, rodents, termites, mosquitoes, wildlife, and more. Get an instant quote.`,
    breadcrumb: [{ name: "Residential", url: "/residential" }],
    service: {
      name: "Residential Pest Control",
      description: `Professional residential pest control for homes across ${AREA}, covering ants, rodents, termites, mosquitoes, and wildlife.`,
    },
  }),
  page({
    path: "/communities",
    kind: "audience",
    title: "Community Pest Control for HOAs & Condos in MA & RI",
    description: `Proactive pest control for condominiums, HOAs, and shared communities across ${AREA}. Common-area programs with board-friendly reporting and optional in-unit service.`,
    breadcrumb: [{ name: "Communities", url: "/communities" }],
    service: {
      name: "Community & HOA Pest Control",
      description: `Proactive pest control for condominiums, HOAs, and shared communities across ${AREA}. Common-area programs with board-friendly reporting.`,
    },
  }),
  page({
    path: "/property-managers",
    kind: "audience",
    title: "Pest Control for Property Managers in MA & RI Communities",
    description: `BuzzKill partners with property managers across ${AREA} to reduce resident complaints, protect shared spaces, and keep communities running smoothly.`,
    breadcrumb: [{ name: "Property Managers", url: "/property-managers" }],
    service: {
      name: "Pest Control for Property Managers",
      description: `Proactive pest control programs for property managers across ${AREA}. Dependable service, clear communication, and community-focused protection.`,
    },
  }),

  // Community / HOA pages
  page({
    path: "/communities/common-areas",
    kind: "service",
    title: "Common Area Pest Protection for MA & RI Communities",
    description: `Professional pest control for community common areas across ${AREA}, built for HOA boards, property managers, and condo associations.`,
    breadcrumb: [
      { name: "Communities", url: "/communities" },
      { name: "Common Area Protection", url: "/communities/common-areas" },
    ],
    service: {
      name: "Common Area Pest Protection",
      description: `Pest control services for community common areas, HOA properties, and shared spaces across ${AREA}.`,
    },
  }),
  page({
    path: "/communities/in-unit",
    kind: "service",
    title: "In Unit Pest Control Services for MA & RI Communities",
    description: `Professional in unit pest control for apartments, condominiums, and HOA communities across ${AREA}. Coordinated with management. Respectful of every resident.`,
    breadcrumb: [
      { name: "Communities", url: "/communities" },
      { name: "In Unit Service", url: "/communities/in-unit" },
    ],
    service: {
      name: "In Unit Pest Control Services",
      description: `Professional in unit pest control for apartments, condominiums, and HOA communities across ${AREA}.`,
    },
  }),
  page({
    path: "/communities/hoa-resources",
    kind: "service",
    title: "HOA & Board Resources for Community Pest Control in MA & RI",
    description: `Proactive pest protection for HOA boards and property managers across ${AREA}. Better decisions. Stronger communities.`,
    breadcrumb: [
      { name: "Communities", url: "/communities" },
      { name: "HOA & Board Resources", url: "/communities/hoa-resources" },
    ],
    service: {
      name: "HOA & Board Pest Control Resources",
      description: `Proactive pest protection programs for HOA boards and property managers across ${AREA}.`,
    },
  }),
  page({
    path: "/communities/for-owners",
    kind: "service",
    title: "Pest Control for Unit Owners in MA & RI Condos & HOAs",
    description: `Professional pest control for unit owners across ${AREA}. Know the price. Book in minutes.`,
    breadcrumb: [
      { name: "Communities", url: "/communities" },
      { name: "For Unit Owners", url: "/communities/for-owners" },
    ],
    service: {
      name: "Pest Control for Unit Owners",
      description: `Professional pest control for individual unit owners in condominiums and HOA communities across ${AREA}.`,
    },
  }),

  // Services: general pest
  page({
    path: "/services/general-pest",
    kind: "service",
    title: "Ant & Spider Control Services in MA & RI",
    description: `Professional ant and spider control for homes across ${AREA}. A licensed and insured team and targeted treatments. Get an instant quote.`,
    breadcrumb: [
      { name: "Residential", url: "/residential" },
      { name: "Ant & Spider Control", url: "/services/general-pest" },
    ],
    service: {
      name: "Ant & Spider Control Services",
      description: `Professional ant and spider pest control for ${AREA} homes by a licensed and insured team.`,
    },
  }),
  page({
    path: "/services/cockroach",
    kind: "service",
    title: "Cockroach Control Services in MA & RI",
    description: `Professional cockroach control for ${AREA} homes. We treat infestations at the source and help keep them from coming back. Get an instant quote.`,
    breadcrumb: [
      { name: "Residential", url: "/residential" },
      { name: "Cockroach Control", url: "/services/cockroach" },
    ],
    service: {
      name: "Cockroach Control Services",
      description: `Professional cockroach control for ${AREA} homes, treating infestations at the source with a licensed and insured team.`,
    },
  }),
  page({
    path: "/services/flea-silverfish",
    kind: "service",
    title: "Flea & Silverfish Control Services in MA & RI",
    description: `Professional flea and silverfish control for ${AREA} homes. We target where they breed and help keep them from returning. Get an instant quote.`,
    breadcrumb: [
      { name: "Residential", url: "/residential" },
      { name: "Flea & Silverfish Control", url: "/services/flea-silverfish" },
    ],
    service: {
      name: "Flea & Silverfish Control Services",
      description: `Professional flea and silverfish control for ${AREA} homes, targeting where they breed with a licensed and insured team.`,
    },
  }),
  page({
    path: "/services/wasp-hornet-bee",
    kind: "service",
    title: "Wasp, Hornet & Bee Removal Services in MA & RI",
    description: `Professional wasp, hornet, and bee nest removal for ${AREA} homes by a licensed and insured team, so you can enjoy your yard again. Get an instant quote.`,
    breadcrumb: [
      { name: "Residential", url: "/residential" },
      { name: "Wasp & Hornet Removal", url: "/services/wasp-hornet-bee" },
    ],
    service: {
      name: "Wasp, Hornet & Bee Removal Services",
      description: `Professional wasp, hornet, and bee nest removal for ${AREA} homes by a licensed and insured team.`,
    },
  }),

  // Services: rodent
  page({
    path: "/services/rodent-control",
    kind: "service",
    title: "Rodent Control Services in MA & RI",
    description: `Professional rodent control for ${AREA} homes. We remove mice and rats and seal the entry points they use. Get an instant quote.`,
    breadcrumb: [
      { name: "Residential", url: "/residential" },
      { name: "Rodent Control", url: "/services/rodent-control" },
    ],
    service: {
      name: "Rodent Control Services",
      description: `Professional mouse and rat control for ${AREA} homes, removing rodents and sealing entry points with a licensed and insured team.`,
    },
  }),
  page({
    path: "/services/rodent-control/entry-sealing",
    kind: "service",
    title: "Rodent Entry Point Sealing in MA & RI",
    description: `Professional rodent entry point sealing for ${AREA} homes. We find and seal the gaps mice and rats use to get inside. Get an instant quote.`,
    breadcrumb: [
      { name: "Rodent Control", url: "/services/rodent-control" },
      { name: "Entry Point Sealing", url: "/services/rodent-control/entry-sealing" },
    ],
    service: {
      name: "Rodent Entry Point Sealing",
      description: `Professional rodent exclusion and entry point sealing for ${AREA} homes, sealing the gaps mice and rats use to get inside.`,
    },
  }),
  page({
    path: "/services/rodent-control/attic",
    kind: "service",
    title: "Attic Rodent Control in MA & RI",
    description: `Professional attic rodent control for ${AREA} homes. We remove mice and rats from your attic and help keep them out. Get an instant quote.`,
    breadcrumb: [
      { name: "Rodent Control", url: "/services/rodent-control" },
      { name: "Attic Rodent Control", url: "/services/rodent-control/attic" },
    ],
    service: {
      name: "Attic Rodent Control",
      description: `Professional attic rodent control for ${AREA} homes, removing rodents from attic spaces with a licensed and insured team.`,
    },
  }),
  page({
    path: "/services/rodent-control/attic-restoration",
    kind: "service",
    title: "Attic Restoration Services in MA & RI",
    description: `Professional attic restoration for ${AREA} homes. We remove damaged insulation, nesting material, and contamination left behind by rodents. Get an instant quote.`,
    breadcrumb: [
      { name: "Rodent Control", url: "/services/rodent-control" },
      { name: "Attic Restoration", url: "/services/rodent-control/attic-restoration" },
    ],
    service: {
      name: "Attic Restoration Services",
      description: `Professional attic restoration for ${AREA} homes. Removal of damaged insulation, nesting material, and rodent contamination by a licensed and insured team.`,
    },
  }),

  // Services: mosquito & tick
  page({
    path: "/services/mosquito-tick",
    kind: "service",
    title: "Mosquito & Tick Control Services in MA & RI",
    description: `Professional mosquito and tick control for ${AREA} yards. Our seasonal program reduces activity so you can enjoy your outdoor spaces. Get an instant quote.`,
    breadcrumb: [
      { name: "Residential", url: "/residential" },
      { name: "Mosquito & Tick Control", url: "/services/mosquito-tick" },
    ],
    service: {
      name: "Mosquito & Tick Control Services",
      description: `Professional seasonal mosquito and tick control for ${AREA} properties, reducing activity around families, pets, and outdoor spaces.`,
    },
  }),
  page({
    path: "/services/mosquito-tick/tick",
    kind: "service",
    title: "Tick Control Program in MA & RI",
    description: `Professional tick control for ${AREA} yards. Our seasonal program reduces tick activity around your family, pets, and outdoor spaces. Get an instant quote.`,
    breadcrumb: [
      { name: "Mosquito & Tick", url: "/services/mosquito-tick" },
      { name: "Tick Program", url: "/services/mosquito-tick/tick" },
    ],
    service: {
      name: "Tick Control Program",
      description: `Professional seasonal tick control for ${AREA} properties, reducing tick activity around families, pets, and outdoor spaces.`,
    },
  }),

  // Services: termite
  page({
    path: "/services/termite",
    kind: "service",
    title: "Termite Inspection & Control in MA & RI",
    description: `Professional termite inspection and control for ${AREA} homes. We inspect for hidden activity and help protect your home's structure. Get an instant quote.`,
    breadcrumb: [
      { name: "Residential", url: "/residential" },
      { name: "Termite Control", url: "/services/termite" },
    ],
    service: {
      name: "Termite Inspection & Control",
      description: `Professional termite inspection and control for ${AREA} homes, inspecting for hidden activity and helping protect home structures, performed by a licensed and insured team.`,
    },
  }),
  page({
    path: "/services/termite/treatment",
    kind: "service",
    title: "Termite Treatment Plans in MA & RI",
    description: `Professional termite treatment for ${AREA} homes. Licensed, targeted treatment plans built to help protect your home's structure.`,
    breadcrumb: [
      { name: "Termite", url: "/services/termite" },
      { name: "Treatment", url: "/services/termite/treatment" },
    ],
    service: {
      name: "Termite Treatment",
      description: `Professional termite treatment for ${AREA} homes. Licensed, targeted treatment plans built to help protect the home's structure.`,
    },
  }),
  page({
    path: "/services/termite/wood-boring",
    kind: "service",
    title: "Wood-Boring Insect Control in MA & RI",
    description: `Professional wood-boring insect control for ${AREA} homes. Not every wood-destroying insect is a termite. We identify the pest and recommend the right treatment. Get an instant quote.`,
    breadcrumb: [
      { name: "Termite", url: "/services/termite" },
      { name: "Wood-Boring Insects", url: "/services/termite/wood-boring" },
    ],
    service: {
      name: "Wood-Boring Insect Control",
      description: `Professional wood-boring insect control for ${AREA} homes, identifying carpenter ants, powderpost beetles, and other wood-destroying insects and recommending the right treatment.`,
    },
  }),

  // Services: wildlife
  page({
    path: "/services/wildlife",
    kind: "service",
    title: "Wildlife Removal Services for Squirrels, Raccoons & Bats in MA & RI",
    description: `Responsible wildlife removal for homes across ${AREA}. Squirrel, raccoon, and bat exclusion by a licensed and insured team. Get an instant quote.`,
    breadcrumb: [
      { name: "Residential", url: "/residential" },
      { name: "Wildlife Removal", url: "/services/wildlife" },
    ],
    service: {
      name: "Wildlife Removal Services",
      description: `Responsible wildlife removal for ${AREA} homes. Squirrel, raccoon, and bat exclusion by a licensed and insured team.`,
    },
  }),
  page({
    path: "/services/wildlife/humane-removal",
    kind: "service",
    title: "Humane Wildlife Removal Services in MA & RI",
    description: `Licensed humane wildlife removal and exclusion for ${AREA} homes, using humane methods and sealing the entry points animals use.`,
    breadcrumb: [
      { name: "Wildlife", url: "/services/wildlife" },
      { name: "Humane Removal", url: "/services/wildlife/humane-removal" },
    ],
    service: {
      name: "Humane Wildlife Removal",
      description: `Licensed humane wildlife removal and exclusion for ${AREA} homes.`,
    },
  }),

  // Company
  page({
    path: "/about",
    kind: "about",
    title: "About BuzzKill Pest Control",
    description: `${COMPANY.description} Founded by Jake Greasley. Learn who we are, where we work, and how to reach us.`,
    breadcrumb: [{ name: "About", url: "/about" }],
    webPageType: "AboutPage",
  }),
  page({
    path: "/service-areas",
    kind: "area",
    title: "Service Areas | Pest Control Across Massachusetts & Rhode Island",
    description: `BuzzKill Pest Control serves homes, HOAs, and businesses across ${AREA} from Marlborough, MA. Find your town and get an instant quote.`,
    breadcrumb: [{ name: "Service Areas", url: "/service-areas" }],
    webPageType: "CollectionPage",
  }),
  page({
    path: "/locations/massachusetts",
    kind: "area",
    title: "Massachusetts Pest Control Service Area",
    description: "Residential, commercial, condo, and HOA pest control across Massachusetts from BuzzKill Pest Control in Marlborough, MA. A licensed and insured team and instant online quotes.",
    breadcrumb: [
      { name: "Service Areas", url: "/service-areas" },
      { name: "Massachusetts", url: "/locations/massachusetts" },
    ],
  }),
  page({
    path: "/locations/rhode-island",
    kind: "area",
    title: "Rhode Island Pest Control Service Area",
    description: "Residential, commercial, condo, and HOA pest control across Rhode Island from BuzzKill Pest Control, a Massachusetts company registered to work in Rhode Island. Instant online quotes.",
    breadcrumb: [
      { name: "Service Areas", url: "/service-areas" },
      { name: "Rhode Island", url: "/locations/rhode-island" },
    ],
  }),
  page({
    path: "/reviews",
    kind: "info",
    title: "Customer Reviews",
    description: `What customers say about BuzzKill Pest Control, with links to the public review listings for the Marlborough, Massachusetts company serving ${AREA}.`,
    breadcrumb: [{ name: "Reviews", url: "/reviews" }],
  }),
  page({
    path: "/careers",
    kind: "info",
    title: "Careers at BuzzKill Pest Control",
    description: `Join the BuzzKill Pest Control team in Marlborough, Massachusetts. Explore careers serving homes and communities across ${AREA}.`,
    breadcrumb: [{ name: "Careers", url: "/careers" }],
    // Placeholder page, see /reviews.
    noindex: true,
  }),
  page({
    path: "/contact",
    kind: "contact",
    title: "Contact Us",
    description: `Questions or ready to get started? Reach BuzzKill Pest Control in Marlborough, Massachusetts by phone, email, or the contact form. Serving ${AREA}.`,
    breadcrumb: [{ name: "Contact", url: "/contact" }],
    webPageType: "ContactPage",
  }),
  page({
    path: "/licensed-insured",
    kind: "info",
    title: "Licensed & Insured",
    description: `BuzzKill Pest Control is licensed and registered in ${AREA}. View our state credentials and request our Certificate of Insurance.`,
    breadcrumb: [{ name: "Licensed & Insured", url: "/licensed-insured" }],
  }),

  // Legacy audience URLs (distinct content, still linked from the footer)
  page({
    path: "/condo-services",
    kind: "service",
    title: "HOA & Condo Common-Area Pest Control",
    description: `Reliable common-area pest control for condominiums, HOAs, and multi-unit communities in ${AREA}. Preventative programs with board-friendly documentation.`,
    breadcrumb: [{ name: "Condo Services", url: "/condo-services" }],
    service: {
      name: "HOA & Condo Common-Area Pest Control",
      description: "Preventative pest control for HOA-owned areas, building exteriors, basements, utility rooms, and shared spaces in multi-unit residential communities.",
    },
    faq: CONDO_FAQS,
  }),
  page({
    path: "/in-unit-services",
    kind: "service",
    title: "In-Unit Pest Control for Condo Owners",
    description: `Optional in-unit pest control for condo owners in ${AREA}. See your price and book online, with pricing that can be lower on days a BuzzKill technician is already scheduled nearby.`,
    breadcrumb: [{ name: "In-Unit Services", url: "/in-unit-services" }],
    service: {
      name: "In-Unit Pest Control for Condo Owners",
      description: "Optional in-unit pest control for condo owners, coordinated with HOA common-area service visits whenever possible, with pricing that can be lower on days we are already working nearby.",
    },
    faq: INUNIT_FAQS,
  }),

  // Legal (indexable so the policies are discoverable and self-canonical)
  page({
    path: "/privacy-policy",
    kind: "legal",
    title: "Privacy Policy",
    description: "BuzzKill Pest Control LLC privacy policy. Learn how we collect, use, and protect your information when you use our services or visit our website.",
    breadcrumb: [{ name: "Privacy Policy", url: "/privacy-policy" }],
  }),
  page({
    path: "/terms-of-service",
    kind: "legal",
    title: "Terms of Service",
    description: "BuzzKill Pest Control LLC terms of service. Review the terms governing use of our website and pest control services.",
    breadcrumb: [{ name: "Terms of Service", url: "/terms-of-service" }],
  }),

  // Booking funnel: the quote entry is a real page; the rest are private steps.
  page({
    path: "/quote",
    kind: "funnel",
    title: "Instant Pest Control Quote | Book Online",
    description: `Get an instant price for pest control in ${AREA} and book your visit online in minutes.`,
    breadcrumb: [{ name: "Instant Quote", url: "/quote" }],
  }),
  page({ path: "/book", kind: "funnel", title: "Book Your Visit", description: "Complete your BuzzKill Pest Control booking.", noindex: true }),
  page({ path: "/cancel", kind: "funnel", title: "Cancel Your Appointment", description: "Cancel or reschedule a BuzzKill Pest Control appointment.", noindex: true }),

  // Paid landing pages: never compete with the organic pages.
  page({ path: "/lp/quote", kind: "landing", title: "Get Your Instant Pest Control Quote", description: `See your pest control price in seconds and book online. Serving ${AREA}.`, noindex: true }),
  page({ path: "/lp/protect", kind: "landing", title: "Stop Pest Complaints Before They Escalate", description: "Professional HOA and condo pest control that protects your community, your residents, and your property.", noindex: true }),
  page({ path: "/lp/call", kind: "landing", title: "Talk to a Pest Control Specialist", description: "Talk through your HOA or condo pest situation with BuzzKill Pest Control.", noindex: true }),
];

/** Dynamic-segment routes and the registry entry that governs them. */
export const DYNAMIC_ROUTES: Record<string, PageMeta> = {
  "/track/:token": page({
    path: "/track",
    kind: "funnel",
    title: "Track Your Technician",
    description: "Live technician tracking for your BuzzKill Pest Control visit.",
    noindex: true,
  }),
  "/quote/instant": page({ path: "/quote/instant", kind: "funnel", title: "Instant Quote", description: "Instant pest control quote.", noindex: false }),
  "/quote/contact-me": page({ path: "/quote/contact-me", kind: "funnel", title: "Request a Quote", description: "Request a pest control quote.", noindex: false }),
};

export const NOT_FOUND_PAGE: PageMeta = page({
  path: "/404",
  kind: "notfound",
  title: "Page Not Found",
  description: "That page does not exist on pestbuzzkill.com.",
  noindex: true,
});

const STATE_REGION: Record<string, string> = {
  MA: "Greater Boston, MetroWest, and Central Massachusetts",
  RI: "Rhode Island",
};

/** The registry entry for a city service-area page. */
export function cityPageMeta(city: CityEntry): PageMeta {
  const name = city.city;
  const abbr = city.stateAbbr;
  return page({
    path: `/pest-control/${city.slug}`,
    kind: "city",
    title: `${name} Pest Control | HOA & Condo Service in ${abbr}`,
    description: `HOA and condo pest control in ${name}, ${abbr}. BuzzKill Pest Control is based in Marlborough, MA and serves ${name}: common-area pest management for boards and property managers, with in-unit service available to condo owners on request.`,
    // Templated town pages: reachable for visitors, crawled for their links,
    // never indexed and never in the sitemap (they differ mainly by town name).
    noindex: "follow",
    breadcrumb: [
      { name: "Service Areas", url: "/service-areas" },
      { name: `${name}, ${abbr}`, url: `/pest-control/${city.slug}` },
    ],
    service: {
      name: `Pest Control in ${name}, ${abbr}`,
      description: `HOA, condo, residential, and commercial pest control in ${name}, ${abbr}. BuzzKill Pest Control is based in Marlborough, Massachusetts and serves ${name} as part of its ${STATE_REGION[abbr] ?? city.state} service area.`,
    },
    faq: cityFaqs(city),
    city,
  });
}

const STATIC_BY_PATH: Map<string, PageMeta> = new Map(
  STATIC_PAGES.map((p) => [p.path, p]),
);

/**
 * The page a canonical path names, or undefined for a URL the site does not
 * publish (the caller renders the not-found page).
 */
export function resolvePage(pathname: string): PageMeta | undefined {
  const canonical = canonicalPathFor(pathname);
  const direct = STATIC_BY_PATH.get(canonical);
  if (direct) return direct;
  const raw = normalizePath(pathname);
  if (DYNAMIC_ROUTES[raw]) return DYNAMIC_ROUTES[raw];
  if (raw === "/track" || raw.startsWith("/track/")) return DYNAMIC_ROUTES["/track/:token"];
  const city = raw.match(/^\/pest-control\/([a-z0-9-]+)$/);
  if (city) {
    const entry = CITY_BY_SLUG[city[1]];
    return entry ? cityPageMeta(entry) : undefined;
  }
  return undefined;
}

/** Every page the site publishes: static routes plus one page per city. */
export function allPages(): PageMeta[] {
  return [...STATIC_PAGES, ...CITIES.map(cityPageMeta)];
}

/** The sitemap: canonical, indexable pages only. */
export function indexablePages(): PageMeta[] {
  return allPages().filter((p) => !p.noindex);
}

/**
 * The static route paths the registry expects App.tsx to declare, so the
 * test can diff them against the router. Aliases and redirects are listed
 * separately because they are routes without pages of their own.
 */
export const REDIRECT_ROUTES: Readonly<Record<string, string>> = {
  "/request-quote": "/quote",
  "/residential/general-pest": "/services/general-pest",
  "/residential/cockroach": "/services/cockroach",
  "/residential/flea-silverfish": "/services/flea-silverfish",
  "/residential/wasp-hornet-bee": "/services/wasp-hornet-bee",
  "/residential/rodent-control": "/services/rodent-control",
  "/residential/rodent-control/entry-sealing": "/services/rodent-control/entry-sealing",
  "/residential/rodent-control/attic": "/services/rodent-control/attic",
  "/residential/rodent-control/attic-restoration": "/services/rodent-control/attic-restoration",
  "/residential/mosquito-tick": "/services/mosquito-tick",
  "/residential/mosquito-tick/tick": "/services/mosquito-tick/tick",
  "/residential/termite": "/services/termite",
  "/residential/termite/treatment": "/services/termite/treatment",
  "/residential/termite/wood-boring": "/services/termite/wood-boring",
  "/residential/wildlife": "/services/wildlife",
  "/residential/wildlife/humane-removal": "/services/wildlife/humane-removal",
};
