import { describe, expect, it } from "vitest";
import { SITE_ORIGIN } from "../../amplify/functions/shared/company";
import { CITIES } from "../data/cities";
import { artifactFileFor, artifactHtml, routeArtifacts } from "./artifacts";
import { allPages, indexablePages } from "./pages";
import { renderShellHead } from "./shell";

/**
 * The production build writes one HTML file per route so the raw HTML the
 * host serves carries that route's own head. These tests run the same
 * generator the build runs, against a stand-in shell.
 */
const SHELL = `<!doctype html><html><head>${renderShellHead()}</head><body><div id="root"></div></body></html>`;
const artifacts = routeArtifacts();
const byFile = new Map(artifacts.map((a) => [a.file, a]));

function canonicalOf(html: string): string | null {
  return html.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null;
}
function robotsOf(html: string): string | null {
  return html.match(/<meta name="robots" content="([^"]+)"/)?.[1] ?? null;
}

describe("route artifacts", () => {
  it("map clean paths to concrete .html files, root to index.html", () => {
    expect(artifactFileFor("/")).toBe("index.html");
    expect(artifactFileFor("/about")).toBe("about.html");
    expect(artifactFileFor("/services/termite")).toBe("services/termite.html");
    expect(artifactFileFor("/quote/contact-me")).toBe("quote/contact-me.html");
  });

  it("exist for every registered route plus 404 and the tracking shell, and never a literal :token", () => {
    for (const page of allPages()) {
      if (page.path === "/track") continue;
      expect(byFile.has(artifactFileFor(page.path)), page.path).toBe(true);
    }
    expect(byFile.has("404.html")).toBe(true);
    expect(byFile.has("track.html")).toBe(true);
    expect([...byFile.keys()].some((f) => f.includes(":token"))).toBe(false);
    expect([...byFile.keys()].some((f) => f.startsWith("track/"))).toBe(false);
  });

  it("give every public page exactly one self-referential canonical and its own title", () => {
    for (const page of indexablePages()) {
      const html = artifactHtml(SHELL, byFile.get(artifactFileFor(page.path))!);
      const expected = page.path === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${page.path}`;
      expect((html.match(/rel="canonical"/g) ?? []).length, page.path).toBe(1);
      expect(canonicalOf(html), page.path).toBe(expected);
      expect(html.match(/<meta property="og:url" content="([^"]+)"/)?.[1], page.path).toBe(expected);
      expect(html, page.path).toContain(`<title>${page.title.replace(/&/g, "&amp;")}`);
      expect(robotsOf(html), page.path).toMatch(/^index, follow/);
      expect(html, page.path).toContain('id="bk-jsonld"');
      expect(html, page.path).toContain('id="bk-site-jsonld"');
    }
  });

  it("canonicalise the two quote doors to /quote with their own heads", () => {
    for (const path of ["/quote/instant", "/quote/contact-me"]) {
      const html = artifactHtml(SHELL, byFile.get(artifactFileFor(path))!);
      expect(canonicalOf(html)).toBe(`${SITE_ORIGIN}/quote`);
      expect(robotsOf(html)).toMatch(/^index, follow/);
    }
  });

  it("mark private booking steps, ad landing pages, and city pages noindex", () => {
    for (const path of ["/book", "/cancel", "/lp/quote", "/lp/protect", "/lp/call", "/careers"]) {
      expect(robotsOf(artifactHtml(SHELL, byFile.get(artifactFileFor(path))!)), path).toBe("noindex, nofollow");
    }
    for (const city of CITIES) {
      const html = artifactHtml(SHELL, byFile.get(artifactFileFor(`/pest-control/${city.slug}`))!);
      expect(robotsOf(html), city.slug).toBe("noindex, follow");
      expect(canonicalOf(html), city.slug).toBe(`${SITE_ORIGIN}/pest-control/${city.slug}`);
    }
  });

  it("ship a noindex 404 page and a noindex, token-free tracking shell", () => {
    for (const file of ["404.html", "track.html"]) {
      const html = artifactHtml(SHELL, byFile.get(file)!);
      expect(robotsOf(html), file).toBe("noindex, nofollow");
      expect(canonicalOf(html), file).toBeNull();
      expect(html, file).not.toMatch(/og:url|:token|token=/);
      expect(html, file).not.toContain('id="bk-jsonld"');
      expect(html, file).toContain('id="bk-site-jsonld"');
    }
    expect(artifactHtml(SHELL, byFile.get("404.html")!)).toContain("<title>Page Not Found");
    expect(artifactHtml(SHELL, byFile.get("track.html")!)).toContain("<title>Track Your Technician");
  });

  it("give the root file the home page's own self-referential canonical", () => {
    const html = artifactHtml(SHELL, byFile.get("index.html")!);
    expect(canonicalOf(html)).toBe(`${SITE_ORIGIN}/`);
    expect(html).toContain('<meta property="og:url" content="https://www.pestbuzzkill.com/" />');
    expect(html).toContain('id="bk-site-jsonld"');
    expect(html).toContain('id="bk-jsonld"');
  });

  it("write every dynamic concrete route as a file too", () => {
    expect(byFile.has("quote/instant.html")).toBe(true);
    expect(byFile.has("quote/contact-me.html")).toBe(true);
  });
});
