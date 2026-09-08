import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COMPANY, SITE_ORIGIN } from "../../amplify/functions/shared/company";
import { CITIES } from "../data/cities";
import { absoluteUrl } from "./canonical";
import { computeHead } from "./head";
import {
  DYNAMIC_ROUTES,
  REDIRECT_ROUTES,
  STATIC_PAGES,
  allPages,
  cityPageMeta,
  fullTitle,
  indexablePages,
  resolvePage,
} from "./pages";
import { renderSitemap, sitemapUrls } from "./sitemap";

const here = dirname(fileURLToPath(import.meta.url));
const appSource = readFileSync(join(here, "..", "App.tsx"), "utf8");
const robots = readFileSync(join(here, "..", "..", "public", "robots.txt"), "utf8");

/** Every literal `path="..."` the router declares. */
const ROUTER_PATHS = [...appSource.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);

describe("the route registry matches the router", () => {
  it("registers metadata for every static route App.tsx declares", () => {
    const known = new Set([
      ...STATIC_PAGES.map((p) => p.path),
      ...Object.keys(DYNAMIC_ROUTES),
      ...Object.keys(REDIRECT_ROUTES),
      "*",
    ]);
    const unregistered = ROUTER_PATHS.filter((p) => !p.includes(":") && !known.has(p));
    expect(unregistered).toEqual([]);
  });

  it("declares a route for every registered static page", () => {
    const routed = new Set(ROUTER_PATHS);
    const missing = STATIC_PAGES.map((p) => p.path).filter((p) => !routed.has(p));
    expect(missing).toEqual([]);
  });

  it("redirects every alias from the registry, not from hand-written routes", () => {
    expect(appSource).toContain("REDIRECT_ROUTES");
    for (const alias of Object.keys(REDIRECT_ROUTES)) {
      expect(ROUTER_PATHS).not.toContain(alias);
    }
  });

  it("has a not-found route", () => {
    expect(ROUTER_PATHS).toContain("*");
  });

  it("has a page for every city", () => {
    for (const city of CITIES) {
      expect(resolvePage(`/pest-control/${city.slug}`)?.city?.slug).toBe(city.slug);
    }
    expect(resolvePage("/pest-control/nowhere-zz")).toBeUndefined();
  });
});

describe("every registered page", () => {
  const pages = allPages();

  it("has a unique canonical path with no trailing slash", () => {
    const paths = pages.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) {
      expect(p === "/" || !p.endsWith("/")).toBe(true);
      expect(p).toBe(p.toLowerCase());
    }
  });

  it("has a title and a description within search-result limits", () => {
    for (const p of pages) {
      expect(p.title.trim().length, p.path).toBeGreaterThan(5);
      expect(fullTitle(p).length, p.path).toBeLessThanOrEqual(120);
      expect(p.description.trim().length, p.path).toBeGreaterThan(40);
      expect(p.description.length, p.path).toBeLessThanOrEqual(320);
    }
  });

  it("uses no trademark symbols and no unrelated company", () => {
    for (const p of pages) {
      const text = JSON.stringify(p);
      expect(text, p.path).not.toMatch(/[™®]/);
      expect(text, p.path).not.toMatch(/Obscurion/i);
      expect(text, p.path).not.toMatch(/bed ?bugs?/i);
    }
  });

  it("makes no unverified safety, guarantee, or reputation claims in its metadata", () => {
    const banned = /\b(pet-?safe|child-?safe|kid-?safe|non-?toxic|chemical-?free|eco-?friendly|harmless|guaranteed?|100%|same-?day|24\/7|top-?rated|#1|five-?star|5-?star|family[- ]owned|years? in business|most trusted)\b/i;
    for (const p of pages) {
      expect(`${p.title} ${p.description} ${p.service?.description ?? ""}`, p.path).not.toMatch(banned);
    }
  });

  it("names only Massachusetts and Rhode Island as its geography", () => {
    const otherStates = /\b(Connecticut|New Hampshire|Vermont|Maine|New York|nationwide)\b/i;
    for (const p of pages) {
      expect(`${p.title} ${p.description}`, p.path).not.toMatch(otherStates);
    }
  });
});

describe("canonical URLs", () => {
  it("are self-referential on every indexable page", () => {
    for (const p of indexablePages()) {
      const head = computeHead(p.path);
      expect(head.canonicalUrl).toBe(absoluteUrl(p.path));
      expect(head.canonicalUrl.startsWith(SITE_ORIGIN)).toBe(true);
      expect(head.robots).toMatch(/^index/);
    }
  });

  it("send only the home page to the home page", () => {
    const root = `${SITE_ORIGIN}/`;
    for (const p of allPages()) {
      if (p.path === "/") continue;
      expect(computeHead(p.path).canonicalUrl, p.path).not.toBe(root);
    }
  });

  it("keep unique legal, about, contact, service, and location pages on their own URL", () => {
    for (const path of ["/about", "/contact", "/privacy-policy", "/terms-of-service", "/services/termite", "/communities/common-areas", "/locations/massachusetts", "/locations/rhode-island"]) {
      expect(computeHead(path).canonicalUrl).toBe(`${SITE_ORIGIN}${path}`);
    }
  });

  it("mark private booking states, ad landing pages, and placeholders noindex", () => {
    for (const path of ["/book", "/cancel", "/track/abc123", "/lp/quote", "/lp/protect", "/lp/call", "/careers"]) {
      expect(computeHead(path).robots, path).toBe("noindex, nofollow");
    }
    expect(computeHead("/reviews").robots).toMatch(/^index/);
  });

  it("keep the tracking page's canonical free of the token", () => {
    const head = computeHead("/track/abc123");
    expect(head.canonicalUrl).toBe(`${SITE_ORIGIN}/track`);
    expect(head.jsonLd).not.toContain("abc123");
  });

  it("mark every templated city page noindex,follow and keep the state pages indexable", () => {
    for (const city of CITIES) {
      const head = computeHead(`/pest-control/${city.slug}`);
      expect(head.robots, city.slug).toBe("noindex, follow");
      expect(head.canonicalUrl, city.slug).toBe(`${SITE_ORIGIN}/pest-control/${city.slug}`);
    }
    expect(computeHead("/locations/massachusetts").robots).toMatch(/^index/);
    expect(computeHead("/locations/rhode-island").robots).toMatch(/^index/);
  });
});

describe("the sitemap", () => {
  const urls = sitemapUrls();
  const xml = renderSitemap();

  it("lists only canonical, indexable pages on the canonical host", () => {
    expect(urls.length).toBe(35);
    for (const u of urls) {
      expect(u.startsWith(`${SITE_ORIGIN}/`)).toBe(true);
      expect(u === `${SITE_ORIGIN}/` || !u.endsWith("/")).toBe(true);
      expect(u).not.toMatch(/index\.html|\?|#/);
    }
    expect(new Set(urls).size).toBe(urls.length);
    for (const p of allPages().filter((p) => p.noindex)) {
      expect(urls).not.toContain(absoluteUrl(p.path));
    }
    expect(urls).toContain(`${SITE_ORIGIN}/about`);
    expect(urls).toContain(`${SITE_ORIGIN}/reviews`);
    expect(urls).toContain(`${SITE_ORIGIN}/privacy-policy`);
    expect(urls).toContain(`${SITE_ORIGIN}/terms-of-service`);
    expect(urls).toContain(`${SITE_ORIGIN}/locations/massachusetts`);
    expect(urls).toContain(`${SITE_ORIGIN}/locations/rhode-island`);
    // No templated city page is offered to search engines.
    for (const city of CITIES) {
      expect(urls, city.slug).not.toContain(`${SITE_ORIGIN}/pest-control/${city.slug}`);
    }
    expect(urls.some((u) => u.includes("/pest-control/"))).toBe(false);
  });

  it("is well-formed XML on the www host only", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs).toEqual(urls);
    expect(xml).not.toMatch(/<loc>https:\/\/pestbuzzkill\.com|<loc>http:\/\//);
  });

  it("is the sitemap robots.txt points at", () => {
    expect(robots).toContain(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`);
    expect(robots).not.toMatch(/Disallow: \/lp\//);
  });
});

describe("city pages", () => {
  it("say BuzzKill is based in Marlborough and serves the town, never that it works from an office there", () => {
    const meta = cityPageMeta(CITIES.find((c) => c.slug === "framingham-ma")!);
    expect(meta.noindex).toBe("follow");
    expect(meta.description).toContain("based in Marlborough, MA and serves Framingham");
    expect(meta.service?.description).toContain("based in Marlborough, Massachusetts and serves Framingham");
    expect(meta.faq?.[0].a).toContain("based in Marlborough, Massachusetts");
    for (const text of [meta.description, meta.service?.description ?? "", ...(meta.faq ?? []).map((f) => f.a)]) {
      expect(text).not.toMatch(/served from|work from our|dispatch(ed)? from|local office|local team in/i);
    }
  });
});

describe("company facts", () => {
  it("are the canonical NAP record", () => {
    expect(COMPANY.legalName).toBe("BuzzKill Pest Control LLC");
    expect(COMPANY.name).toBe("BuzzKill Pest Control");
    expect(COMPANY.foundingDate).toBe("2026-01-16");
    expect(COMPANY.address.streetAddress).toBe("420 Lakeside Ave, Suite 104");
    expect(COMPANY.address.addressLocality).toBe("Marlborough");
    expect(COMPANY.address.postalCode).toBe("01752");
    expect(COMPANY.phone.href).toBe("tel:+15082589294");
    expect(COMPANY.phone.display).toBe("508-258-9294");
    expect(COMPANY.email.href).toBe("mailto:info@pestbuzzkill.com");
    expect(COMPANY.serviceArea.map((s) => s.abbr)).toEqual(["MA", "RI"]);
    expect(COMPANY.founder.name).toBe("Jake Greasley");
    expect(COMPANY.founder.alternateNames).toContain("Jacob Charles Greasley");
  });
});
