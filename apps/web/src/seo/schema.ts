/**
 * Schema.org JSON-LD for the site: one connected graph, one business entity,
 * one founder, every page linked back to both.
 *
 * Identity rules (tested in schema.test.ts):
 *  - Exactly one business node, typed `HomeAndConstructionBusiness` (the
 *    most specific LocalBusiness subtype in the schema.org vocabulary that
 *    covers pest control; `PestControl` is not a schema.org type), with the
 *    stable id `${SITE_ORIGIN}/#organization`. Nothing else is ever typed
 *    Organization or LocalBusiness, and no page or city gets its own
 *    business node.
 *  - Exactly one Person node for Jake Greasley, whose legal name is Jacob
 *    Charles Greasley. The organization's `founder` and the person's
 *    `worksFor` reference each other by id.
 *  - Every fact in the graph is visible on the site (the About page carries
 *    the legal name, formation date, founder, address, and service area).
 *    Ratings, reviews, prices, hours, coordinates, and licence numbers are
 *    deliberately absent: none is verified as structured data yet.
 */
import {
  COMPANY,
  SITE_ORIGIN,
  founderProfileUrls,
} from "../../amplify/functions/shared/company";
import { absoluteUrl, assetUrl } from "./canonical";
import type { CityEntry } from "../data/cities";

export type JsonLdNode = Record<string, unknown>;
export type JsonLdGraph = {
  "@context": "https://schema.org";
  "@graph": JsonLdNode[];
};

export const ORGANIZATION_ID = `${SITE_ORIGIN}/#organization`;
/** The business node's type: a real schema.org LocalBusiness subtype. */
export const ORGANIZATION_TYPE = "HomeAndConstructionBusiness";
export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
export const LOGO_ID = `${SITE_ORIGIN}/#logo`;
/** Stable local Person id; sameAs connects it to Jake's external identity pages. */
export const PERSON_ID = absoluteUrl("/about") + "#jake-greasley";

export type Crumb = { name: string; url: string };
export type FAQItem = { q: string; a: string };

/** Massachusetts and Rhode Island as schema.org places (State is an
 *  AdministrativeArea), each pinned to its Wikidata entity. */
export function areaServedNodes(): JsonLdNode[] {
  return COMPANY.serviceArea.map((s) => ({
    "@type": "State",
    name: s.name,
    sameAs: s.sameAs,
  }));
}

export function postalAddressNode(): JsonLdNode {
  return { "@type": "PostalAddress", ...COMPANY.address };
}

export function organizationNode(): JsonLdNode {
  return {
    "@type": ORGANIZATION_TYPE,
    "@id": ORGANIZATION_ID,
    // The descriptive name citations use, the brand as alternateName, and the
    // legal entity as legalName: three fields, three facts, never merged.
    name: COMPANY.serviceDisplayName,
    alternateName: COMPANY.brandName,
    legalName: COMPANY.legalName,
    brand: { "@type": "Brand", name: COMPANY.brandName },
    identifier: {
      "@type": "PropertyValue",
      propertyID: COMPANY.registrations.massachusetts.label,
      name: COMPANY.registrations.massachusetts.registry,
      value: COMPANY.registrations.massachusetts.id,
    },
    url: `${SITE_ORIGIN}/`,
    logo: { "@id": LOGO_ID },
    image: { "@id": LOGO_ID },
    description: COMPANY.description,
    foundingDate: COMPANY.foundingDate,
    telephone: COMPANY.phone.e164,
    email: COMPANY.email.address,
    address: postalAddressNode(),
    areaServed: areaServedNodes(),
    founder: { "@id": PERSON_ID },
    sameAs: [...COMPANY.socialProfiles],
  };
}

export function logoNode(): JsonLdNode {
  return {
    "@type": "ImageObject",
    "@id": LOGO_ID,
    url: assetUrl(COMPANY.logo.path),
    contentUrl: assetUrl(COMPANY.logo.path),
    width: COMPANY.logo.width,
    height: COMPANY.logo.height,
    caption: COMPANY.name,
  };
}

export function personNode(): JsonLdNode {
  const f = COMPANY.founder;
  return {
    "@type": "Person",
    "@id": PERSON_ID,
    name: f.name,
    givenName: f.givenName,
    additionalName: f.additionalName,
    familyName: f.familyName,
    alternateName: [...f.alternateNames],
    jobTitle: f.role,
    url: absoluteUrl("/about") + "#jake-greasley",
    worksFor: { "@id": ORGANIZATION_ID },
    // Jake's own verified profiles; the company's pages stay on the org node.
    sameAs: founderProfileUrls(),
  };
}

export function websiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_ORIGIN}/`,
    name: COMPANY.name,
    inLanguage: "en-US",
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/** The site-wide entity graph: shipped in the static HTML shell on every
 *  route, so the business identity is server-rendered regardless of which
 *  page the client router draws. */
export function siteGraph(): JsonLdGraph {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode(), logoNode(), personNode(), websiteNode()],
  };
}

export type WebPageType =
  | "WebPage"
  | "AboutPage"
  | "ContactPage"
  | "CollectionPage";

export function webPageNode(opts: {
  canonicalUrl: string;
  title: string;
  description: string;
  type?: WebPageType;
  image?: string;
  hasBreadcrumb?: boolean;
  /** For the About page: the page is about the organization itself. */
  mainEntityId?: string;
}): JsonLdNode {
  const node: JsonLdNode = {
    "@type": opts.type ?? "WebPage",
    "@id": `${opts.canonicalUrl}#webpage`,
    url: opts.canonicalUrl,
    name: opts.title,
    description: opts.description,
    inLanguage: "en-US",
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": ORGANIZATION_ID },
  };
  if (opts.image) node.primaryImageOfPage = { "@type": "ImageObject", url: assetUrl(opts.image) };
  if (opts.hasBreadcrumb) node.breadcrumb = { "@id": `${opts.canonicalUrl}#breadcrumb` };
  if (opts.mainEntityId) node.mainEntity = { "@id": opts.mainEntityId };
  return node;
}

export function breadcrumbNode(canonicalUrl: string, items: Crumb[]): JsonLdNode {
  return {
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function serviceNode(opts: {
  canonicalUrl: string;
  name: string;
  description: string;
  /** Defaults to both states. A city page narrows to its city. */
  areaServed?: JsonLdNode[];
}): JsonLdNode {
  return {
    "@type": "Service",
    "@id": `${opts.canonicalUrl}#service`,
    name: opts.name,
    description: opts.description,
    url: opts.canonicalUrl,
    serviceType: "Pest control",
    provider: { "@id": ORGANIZATION_ID },
    areaServed: opts.areaServed ?? areaServedNodes(),
  };
}

/** The city a service-area page is about, contained in its state. Never a
 *  business location: the only address in the graph is Marlborough. */
export function cityPlaceNode(city: CityEntry): JsonLdNode {
  const state = COMPANY.serviceArea.find((s) => s.abbr === city.stateAbbr);
  return {
    "@type": "City",
    name: city.city,
    containedInPlace: {
      "@type": "State",
      name: city.state,
      ...(state ? { sameAs: state.sameAs } : {}),
    },
  };
}

export function faqNode(canonicalUrl: string, items: FAQItem[]): JsonLdNode {
  return {
    "@type": "FAQPage",
    "@id": `${canonicalUrl}#faq`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
}

/**
 * Serialise for a `<script type="application/ld+json">` body. JSON is not
 * HTML-safe: `</script>` inside a string would end the element early, and a
 * `<!--` could open a comment. Escaping those characters as \u sequences keeps
 * the JSON valid and the document intact.
 */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
