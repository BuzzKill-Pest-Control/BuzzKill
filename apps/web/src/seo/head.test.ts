import { describe, expect, it } from "vitest";
import { computeHead, renderHeadTags } from "./head";
import { ORGANIZATION_ID, WEBSITE_ID } from "./schema";
import { renderRouteHead, renderShellHead, swapShellHead } from "./shell";

type Node = Record<string, unknown> & { "@type"?: string; "@id"?: string };

describe("computeHead", () => {
  it("resolves non-canonical spellings to the canonical URL", () => {
    expect(computeHead("/about/").canonicalUrl).toBe("https://www.pestbuzzkill.com/about");
    expect(computeHead("/About").canonicalUrl).toBe("https://www.pestbuzzkill.com/about");
    expect(computeHead("/index.html").canonicalUrl).toBe("https://www.pestbuzzkill.com/");
    expect(computeHead("/residential/termite").canonicalUrl).toBe("https://www.pestbuzzkill.com/services/termite");
    expect(computeHead("/quote/instant").canonicalUrl).toBe("https://www.pestbuzzkill.com/quote");
  });

  it("marks an unpublished path as not found and noindex", () => {
    const head = computeHead("/no-such-page");
    expect(head.notFound).toBe(true);
    expect(head.robots).toBe("noindex, nofollow");
    expect(head.title).toContain("Page Not Found");
  });

  it("gives the tracking page a tokenless canonical", () => {
    expect(computeHead("/track/secret-token").canonicalUrl).toBe("https://www.pestbuzzkill.com/track");
    expect(computeHead("/track").robots).toBe("noindex, nofollow");
  });

  it("lets a page override its title and index state, never its canonical", () => {
    const head = computeHead("/quote", { title: "Your Instant Quote", noindex: true });
    expect(head.title).toBe("Your Instant Quote | BuzzKill Pest Control");
    expect(head.robots).toBe("noindex, nofollow");
    expect(head.canonicalUrl).toBe("https://www.pestbuzzkill.com/quote");
  });

  it("never lets the client upgrade a noindex deployment", () => {
    expect(computeHead("/about", {}, true).robots).toBe("noindex, nofollow");
  });

  it("builds a connected page graph for a service page", () => {
    const head = computeHead("/services/termite");
    const graph = head.pageGraph["@graph"] as Node[];
    const webPage = graph.find((n) => n["@type"] === "WebPage")!;
    const crumbs = graph.find((n) => n["@type"] === "BreadcrumbList")!;
    const service = graph.find((n) => n["@type"] === "Service")!;
    expect(webPage["@id"]).toBe("https://www.pestbuzzkill.com/services/termite#webpage");
    expect(webPage.isPartOf).toEqual({ "@id": WEBSITE_ID });
    expect(webPage.about).toEqual({ "@id": ORGANIZATION_ID });
    expect(webPage.breadcrumb).toEqual({ "@id": crumbs["@id"] });
    expect(service.provider).toEqual({ "@id": ORGANIZATION_ID });
    expect(service.url).toBe("https://www.pestbuzzkill.com/services/termite");
    expect((crumbs.itemListElement as Node[])[0].item).toBe("https://www.pestbuzzkill.com/");
    expect(graph.some((n) => n["@type"] === "FAQPage")).toBe(false);
    expect(JSON.parse(head.jsonLd)).toEqual(head.pageGraph);
  });

  it("types the About page as an AboutPage about the organization", () => {
    const graph = computeHead("/about").pageGraph["@graph"] as Node[];
    const page = graph.find((n) => n["@type"] === "AboutPage")!;
    expect(page.mainEntity).toEqual({ "@id": ORGANIZATION_ID });
  });

  it("publishes FAQ markup only where the page renders those FAQs", () => {
    const home = computeHead("/").pageGraph["@graph"] as Node[];
    expect(home.some((n) => n["@type"] === "FAQPage")).toBe(true);
    const contact = computeHead("/contact").pageGraph["@graph"] as Node[];
    expect(contact.some((n) => n["@type"] === "FAQPage")).toBe(false);
  });
});

describe("rendered head", () => {
  it("escapes attribute values", () => {
    const head = computeHead("/services/wasp-hornet-bee");
    const html = renderHeadTags(head, { includeCanonical: true });
    expect(html).toContain("Wasp, Hornet &amp; Bee");
    expect(html).toContain('<link rel="canonical" href="https://www.pestbuzzkill.com/services/wasp-hornet-bee" />');
    expect(html).toContain('<meta property="og:url" content="https://www.pestbuzzkill.com/services/wasp-hornet-bee" />');
  });

  it("gives the shared shell no canonical, no og:url, and the entity graph", () => {
    const shell = renderShellHead();
    expect(shell).not.toContain('rel="canonical"');
    expect(shell).not.toContain("og:url");
    expect(shell).toContain('id="bk-site-jsonld"');
    expect(shell).toContain('"@id":"https://www.pestbuzzkill.com/#organization"');
    expect(shell).toContain('"@id":"https://www.pestbuzzkill.com/about#jake-greasley"');
    expect(shell).toContain('<meta name="robots" content="index, follow');
  });

  it("gives a route file its own canonical and page graph, and swaps cleanly", () => {
    const route = renderRouteHead("/about");
    expect(route).toContain('href="https://www.pestbuzzkill.com/about"');
    expect(route).toContain('id="bk-jsonld"');
    const html = `<html><head>${renderShellHead()}</head><body></body></html>`;
    const swapped = swapShellHead(html, route);
    expect(swapped).toContain('href="https://www.pestbuzzkill.com/about"');
    expect(swapped.match(/bk:head:start/g)).toHaveLength(1);
    expect(() => swapShellHead("<html></html>", route)).toThrow();
  });
});
