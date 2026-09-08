import { describe, expect, it } from "vitest";
import { COMPANY, founderProfileUrls } from "../../amplify/functions/shared/company";
import { CITIES } from "../data/cities";
import { computeHead } from "./head";
import { allPages } from "./pages";
import {
  ORGANIZATION_ID,
  ORGANIZATION_TYPE,
  PERSON_ID,
  WEBSITE_ID,
  serializeJsonLd,
  siteGraph,
  type JsonLdNode,
} from "./schema";

/** LocalBusiness subtypes that exist in the schema.org vocabulary and could
 *  plausibly describe this company. `PestControl` is not one of them. */
const APPROVED_BUSINESS_TYPES = new Set([
  "HomeAndConstructionBusiness",
  "LocalBusiness",
  "ProfessionalService",
]);

type Node = JsonLdNode & { "@type"?: string | string[]; "@id"?: string };

function typesOf(node: Node): string[] {
  const t = node["@type"];
  return Array.isArray(t) ? t : t ? [t] : [];
}

/** Every node in the site graph plus every page graph: the whole published set. */
function everyNode(): Node[] {
  const nodes: Node[] = [...(siteGraph()["@graph"] as Node[])];
  for (const page of allPages()) {
    nodes.push(...(computeHead(page.path).pageGraph["@graph"] as Node[]));
  }
  return nodes;
}

function walk(value: unknown, visit: (key: string, v: unknown) => void, key = ""): void {
  if (Array.isArray(value)) {
    value.forEach((v) => walk(v, visit, key));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      visit(k, v);
      walk(v, visit, k);
    }
  } else {
    visit(key, value);
  }
}

describe("the business entity", () => {
  const graph = siteGraph()["@graph"] as Node[];
  const org = graph.find((n) => n["@id"] === ORGANIZATION_ID)!;
  const person = graph.find((n) => n["@id"] === PERSON_ID)!;
  const website = graph.find((n) => n["@id"] === WEBSITE_ID)!;

  it("is exactly one HomeAndConstructionBusiness node with the stable id", () => {
    const businesses = everyNode().filter((n) =>
      typesOf(n).some((t) =>
        ["PestControl", "PestControlService", "Organization", "LocalBusiness", "HomeAndConstructionBusiness", "ProfessionalService"].includes(t),
      ),
    );
    expect(businesses).toHaveLength(1);
    expect(businesses[0]["@id"]).toBe("https://www.pestbuzzkill.com/#organization");
    expect(typesOf(org)).toEqual(["HomeAndConstructionBusiness"]);
    expect(ORGANIZATION_TYPE).toBe("HomeAndConstructionBusiness");
  });

  it("uses a real schema.org type and never the invented PestControl types", () => {
    expect(APPROVED_BUSINESS_TYPES.has(String(org["@type"]))).toBe(true);
    for (const n of everyNode()) {
      for (const t of typesOf(n)) {
        expect(t).not.toMatch(/^PestControl(Service)?$/);
      }
    }
    expect(serializeJsonLd(everyNode())).not.toMatch(/"PestControl(Service)?"/);
  });

  it("keeps the brand, the descriptive name, and the legal entity apart", () => {
    expect(org.name).toBe(COMPANY.serviceDisplayName);
    expect(org.alternateName).toBe(COMPANY.brandName);
    expect(org.brand).toEqual({ "@type": "Brand", name: "BuzzKill" });
    expect(org.legalName).toBe(COMPANY.legalName);
    expect(new Set([org.name, org.alternateName, org.legalName]).size).toBe(3);
  });

  it("carries the Massachusetts entity identifier", () => {
    expect(org.identifier).toEqual({
      "@type": "PropertyValue",
      propertyID: "Massachusetts entity ID",
      name: COMPANY.registrations.massachusetts.registry,
      value: "001941986",
    });
  });

  it("uses the legal formation date, never the planning milestone, as foundingDate", () => {
    expect(org.foundingDate).toBe("2026-01-16");
    expect(String(org.foundingDate)).not.toMatch(/2025/);
    expect(COMPANY.planning.began).toBe("late 2025");
  });

  it("carries the canonical NAP facts", () => {
    expect(org.name).toBe("BuzzKill Pest Control");
    expect(org.legalName).toBe("BuzzKill Pest Control LLC");
    expect(org.foundingDate).toBe("2026-01-16");
    expect(org.telephone).toBe("+15082589294");
    expect(org.email).toBe("info@pestbuzzkill.com");
    expect(org.url).toBe("https://www.pestbuzzkill.com/");
    expect(org.address).toEqual({
      "@type": "PostalAddress",
      streetAddress: "420 Lakeside Ave, Suite 104",
      addressLocality: "Marlborough",
      addressRegion: "MA",
      postalCode: "01752",
      addressCountry: "US",
    });
    expect(org.description).toBe(COMPANY.description);
  });

  it("serves Massachusetts and Rhode Island and nothing else", () => {
    const names = (org.areaServed as Node[]).map((a) => a.name);
    expect(names).toEqual(["Massachusetts", "Rhode Island"]);
    for (const a of org.areaServed as Node[]) expect(typesOf(a)).toEqual(["State"]);
  });

  it("links only BuzzKill's own profiles, never a same-name company or the founder's pages", () => {
    const sameAs = org.sameAs as string[];
    expect(sameAs).toEqual([...COMPANY.socialProfiles]);
    for (const url of founderProfileUrls()) expect(sameAs).not.toContain(url);
    for (const url of sameAs) {
      expect(url).not.toMatch(/buzzkillpestcontrol\.(net|biz|com)|buzzkill-pestcontrol\.com|buzz-kill/i);
    }
  });

  it("names its founder by id, and the founder works for it", () => {
    expect(org.founder).toEqual({ "@id": PERSON_ID });
    expect(person.worksFor).toEqual({ "@id": ORGANIZATION_ID });
    expect(website.publisher).toEqual({ "@id": ORGANIZATION_ID });
  });

  it("has a logo the page can actually serve", () => {
    const logo = graph.find((n) => n["@id"] === org.logo!["@id" as keyof typeof org.logo])!;
    expect(logo.url).toBe("https://www.pestbuzzkill.com/images/logo.png");
    expect(logo.width).toBe(2500);
    expect(logo.height).toBe(980);
  });
});

describe("the founder", () => {
  const graph = siteGraph()["@graph"] as Node[];
  const person = graph.find((n) => n["@id"] === PERSON_ID)!;

  it("is exactly one Person, never an Organization", () => {
    const people = everyNode().filter((n) => typesOf(n).includes("Person"));
    expect(people).toHaveLength(1);
    expect(typesOf(person)).toEqual(["Person"]);
    expect(person["@id"]).toBe("https://www.pestbuzzkill.com/about#jake-greasley");
  });

  it("resolves Jake, Jacob, and Jacob Charles Greasley to one person", () => {
    expect(person.name).toBe("Jake Greasley");
    expect(person.givenName).toBe("Jacob");
    expect(person.additionalName).toBe("Charles");
    expect(person.familyName).toBe("Greasley");
    expect(person.alternateName).toEqual(["Jacob Greasley", "Jacob Charles Greasley"]);
    expect(person.jobTitle).toBe("Founder");
    expect(person.url).toBe("https://www.pestbuzzkill.com/about#jake-greasley");
  });

  it("links the complete list of Jake's own verified profiles, and no company page", () => {
    const expected = founderProfileUrls();
    expect(expected).toHaveLength(12);
    expect(person.sameAs).toEqual(expected);
    for (const url of person.sameAs as string[]) {
      expect(url).toMatch(/^https:\/\//);
      expect(COMPANY.socialProfiles as readonly string[]).not.toContain(url);
      expect(url).not.toMatch(/buzzkill/i);
    }
    expect(person.sameAs).toContain("https://www.linkedin.com/in/jake-greasley");
    expect(person.sameAs).toContain("https://github.com/JakeGreasleyGIM");
    expect(person.sameAs).toContain("https://www.marketscreener.com/insider/JAKE-GREASLEY-A3LLV6/");
  });

  it("claims no credentials or awards that are not verified", () => {
    for (const k of ["hasCredential", "award", "honorificPrefix", "knowsAbout"]) {
      expect(person).not.toHaveProperty(k);
    }
  });

  it("stays on the About page until jakegreasley.com is live", () => {
    expect(person["@id"]).not.toMatch(/jakegreasley\.com/);
  });
});

describe("every published node", () => {
  it("never carries ratings, reviews, prices, hours, coordinates, or unverified relationships", () => {
    const banned = new Set([
      "aggregateRating", "review", "reviews", "ratingValue", "reviewCount",
      "priceRange", "openingHours", "openingHoursSpecification", "geo",
      "parentOrganization", "subOrganization", "owns", "ownedBy", "numberOfEmployees",
      "award", "hasCredential", "slogan", "potentialAction",
    ]);
    walk(everyNode(), (key) => {
      expect(banned.has(key), `forbidden property "${key}" in graph`).toBe(false);
    });
  });

  it("references only the one organization and the one person by id", () => {
    walk(everyNode(), (key, v) => {
      // A bare `{ "@id": ... }` reference (FAQPage.mainEntity is a list of
      // Question nodes, not a reference, and is skipped here).
      const isRef = v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 1 && "@id" in v;
      if (isRef && ["provider", "publisher", "founder", "worksFor", "about", "mainEntity", "isPartOf"].includes(key)) {
        expect([ORGANIZATION_ID, PERSON_ID, WEBSITE_ID]).toContain((v as Node)["@id"]);
      }
    });
  });

  it("stays inside Massachusetts and Rhode Island", () => {
    const states = new Set<string>();
    walk(everyNode(), (key, v) => {
      if (key === "@type" && v === "State") return;
    });
    for (const n of everyNode()) {
      walk(n, (_k, v) => {
        if (v && typeof v === "object" && (v as Node)["@type"] === "State") {
          states.add(String((v as Node).name));
        }
      });
    }
    expect([...states].sort()).toEqual(["Massachusetts", "Rhode Island"]);
  });

  it("uses no trademark symbols and no unrelated company", () => {
    const text = serializeJsonLd(everyNode());
    expect(text).not.toMatch(/[™®]|\\u2122|\\u00ae/);
    expect(text).not.toMatch(/Obscurion/i);
  });

  it("never places the company in Framingham (the state record's old mailing address)", () => {
    walk(everyNode(), (key, v) => {
      if (key === "addressLocality" || key === "streetAddress" || key === "postalCode") {
        expect(String(v)).not.toMatch(/Framingham|0170[12]/);
      }
    });
  });

  it("puts the only postal address in Marlborough", () => {
    const addresses: Node[] = [];
    walk(everyNode(), (_k, v) => {
      if (v && typeof v === "object" && (v as Node)["@type"] === "PostalAddress") addresses.push(v as Node);
    });
    expect(addresses).toHaveLength(1);
    expect(addresses[0].addressLocality).toBe("Marlborough");
  });

  it("marks each city as a served place inside its state, not a location", () => {
    for (const city of CITIES) {
      const graph = computeHead(`/pest-control/${city.slug}`).pageGraph["@graph"] as Node[];
      const service = graph.find((n) => typesOf(n).includes("Service"))!;
      const area = (service.areaServed as Node[])[0];
      expect(typesOf(area)).toEqual(["City"]);
      expect(area.name).toBe(city.city);
      expect((area.containedInPlace as Node).name).toBe(city.state);
      expect(service.provider).toEqual({ "@id": ORGANIZATION_ID });
      expect(graph.some((n) => n["@type"] === "PostalAddress")).toBe(false);
    }
  });
});

describe("serializeJsonLd", () => {
  it("is valid JSON that cannot break out of a script element", () => {
    const out = serializeJsonLd({ a: "</script><!--", b: "x y" });
    expect(out).not.toContain("</script");
    expect(out).not.toContain("<!--");
    expect(JSON.parse(out)).toEqual({ a: "</script><!--", b: "x y" });
  });
});
