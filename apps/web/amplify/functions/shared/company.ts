/**
 * The company, in one place.
 *
 * Every public surface that names, locates, or links BuzzKill reads from here:
 * the website header/footer, the contact and legal pages, the JSON-LD entity
 * graph, the sitemap and canonical URLs, the emailed receipts and reminders,
 * and the PDF agreements, quotes, and service reports. A fact that is not in
 * this file is not a fact the site may assert about the company.
 *
 * Three names, kept apart on purpose so the public qualifier can change later
 * without touching the legal entity:
 *   brandName          "BuzzKill"                  the brand
 *   serviceDisplayName "BuzzKill Pest Control"     how the services are described online
 *   legalName          "BuzzKill Pest Control LLC" the contracting entity
 * The repository holds no DBA/trade-name filing, so nothing here calls the
 * descriptive name a registered trade name.
 *
 * Nothing here may be inferred or rounded: no license numbers (those live in
 * credentials.ts with their holder), ratings, review counts, employee counts,
 * years in business, guarantees, or safety claims.
 *
 * Shared by the Lambdas and the Vite app (src/ imports it directly, the same
 * way it imports consentText and bookingTerms), so it must stay pure: no DOM,
 * no AWS SDK, no environment reads.
 */

/** The one canonical web origin. Apex and http variants 301 here. */
export const SITE_ORIGIN = "https://www.pestbuzzkill.com";
export const SITE_HOSTNAME = "www.pestbuzzkill.com";
export const SITE_DOMAIN = "pestbuzzkill.com";

export type FounderProfile = { url: string; label: string };

export const COMPANY = {
  /** The brand. */
  brandName: "BuzzKill",
  /** The descriptive, service-facing name used online and in citations. */
  serviceDisplayName: "BuzzKill Pest Control",
  /** Alias of serviceDisplayName for existing callers. */
  name: "BuzzKill Pest Control",
  /** Registered name of the contracting entity. */
  legalName: "BuzzKill Pest Control LLC",
  /** Public registrations of the legal entity. */
  registrations: {
    massachusetts: {
      label: "Massachusetts entity ID",
      id: "001941986",
      registry: "Massachusetts Secretary of the Commonwealth, Corporations Division",
    },
  },
  /** Massachusetts formation date of the LLC (ISO 8601). The only date that
   *  may be published as `foundingDate`. */
  foundingDate: "2026-01-16",
  /** When Jake began designing and planning the business. A story milestone,
   *  never a founding date: the legal company did not exist in 2025. */
  planning: { began: "late 2025" },
  /** The canonical one-sentence description used everywhere. */
  description:
    "BuzzKill Pest Control is a residential and commercial pest control company based in Marlborough, Massachusetts, serving Massachusetts and Rhode Island.",
  address: {
    streetAddress: "420 Lakeside Ave, Suite 104",
    addressLocality: "Marlborough",
    addressRegion: "MA",
    postalCode: "01752",
    addressCountry: "US",
  },
  phone: {
    /** Digits with dashes, as printed. */
    display: "508-258-9294",
    /** Parenthesised, for headers and buttons. */
    pretty: "(508) 258-9294",
    /** E.164, for tel: links and structured data. */
    e164: "+15082589294",
    href: "tel:+15082589294",
  },
  email: {
    address: "info@pestbuzzkill.com",
    href: "mailto:info@pestbuzzkill.com",
  },
  /** The two states served. Nothing else may be claimed. */
  serviceArea: [
    {
      name: "Massachusetts",
      abbr: "MA",
      /** Wikidata identifier, so the state resolves to one place entity. */
      sameAs: "https://www.wikidata.org/wiki/Q771",
    },
    {
      name: "Rhode Island",
      abbr: "RI",
      sameAs: "https://www.wikidata.org/wiki/Q1387",
    },
  ],
  founder: {
    /** Public name. */
    name: "Jake Greasley",
    givenName: "Jacob",
    additionalName: "Charles",
    familyName: "Greasley",
    /** The legal name and its short form, so all three resolve to one person. */
    alternateNames: ["Jacob Greasley", "Jacob Charles Greasley"],
    /** Stable local founder section; external identity pages belong in sameAs. */
    profilePath: "/about#jake-greasley",
    role: "Founder",
    /** Jake's own verified profiles. Personal only: the company's Instagram,
     *  Facebook, and LinkedIn pages belong to `socialProfiles`, never here. */
    sameAs: [
      { url: "https://jakegreasley.com/", label: "Jake Greasley’s personal website" },
      { url: "https://www.wikidata.org/wiki/Q141443360", label: "Wikidata" },
      { url: "https://www.linkedin.com/in/jake-greasley", label: "LinkedIn" },
      { url: "https://github.com/JakeGreasleyGIM", label: "GitHub" },
      { url: "https://www.instagram.com/jake.greasley/", label: "Instagram" },
      { url: "https://ma.exprealty.com/agents/1903443/Jacob+Greasley", label: "eXp Realty agent profile" },
      {
        url: "https://directories.apps.realtor/memberDetail/?personId=4940266&officeStreetCountry=US&memberLastName=Greasley",
        label: "National Association of Realtors member directory",
      },
      { url: "https://masslandlords.net/landlord/jacob-greasley/", label: "MassLandlords" },
      { url: "https://www.realtor.com/realestateagents/656d3c88398ad2f645a8b94b", label: "Realtor.com" },
      { url: "https://www.homes.com/real-estate-agents/jacob-greasley/kz9yngc/", label: "Homes.com" },
      { url: "https://www.showcase.com/p/jake-greasley/253290651/", label: "Showcase" },
      {
        url: "https://www.ratemyagent.com/real-estate-agent/jacob-greasley-b2ng7z/sales/overview",
        label: "RateMyAgent",
      },
      { url: "https://profile.realsatisfied.com/Jacob-Greasley", label: "RealSatisfied" },
      { url: "https://www.marketscreener.com/insider/JAKE-GREASLEY-A3LLV6/", label: "MarketScreener" },
    ] as readonly FounderProfile[],
  },
  /** Company profiles the footer links to. Only BuzzKill's own; never a
   *  same-name company elsewhere, and never the founder's personal pages. */
  socialProfiles: [
    "https://www.instagram.com/buzzkill_pestcontrol/",
    "https://www.facebook.com/people/BuzzKill-Pest-Control/61584954290487/",
    "https://www.linkedin.com/company/buzzkill-pest-control/",
  ],
  /** Public review sources. Read-only listings; the Google URL is a
   *  "leave a review" destination, not a page that displays reviews. */
  reviewSources: {
    thumbtackProfile:
      "https://www.thumbtack.com/ma/marlborough/exterminators/buzzkill-pest-control/service/583778090572914694",
    googleReviewSubmission: "https://g.page/r/CYyHi3DH59WEEAI/review",
  },
  logo: {
    path: "/images/logo.png",
    width: 2500,
    height: 980,
  },
  /** Default social-share image, with its real pixel size (platforms crop). */
  defaultImage: { path: "/images/hero-home-1.jpg", width: 2500, height: 1667 },
} as const;

/** "420 Lakeside Ave, Suite 104" / "Marlborough, MA 01752" */
export function companyAddressLines(): [string, string] {
  const a = COMPANY.address;
  return [a.streetAddress, `${a.addressLocality}, ${a.addressRegion} ${a.postalCode}`];
}

/** "420 Lakeside Ave, Suite 104, Marlborough, MA 01752" */
export function companyAddressOneLine(): string {
  return companyAddressLines().join(", ");
}

/** "Massachusetts and Rhode Island" */
export function serviceAreaSentence(): string {
  return COMPANY.serviceArea.map((s) => s.name).join(" and ");
}

/** The founder's profile URLs alone, in the published order. */
export function founderProfileUrls(): string[] {
  return COMPANY.founder.sameAs.map((p) => p.url);
}
