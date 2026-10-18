import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const { fixture } = vi.hoisted(() => ({ fixture: {
  slug: "synthetic-layout-preview",
  title: 'Article <preview> & "verification"',
  description: "A synthetic article used only to verify rendering, metadata, and safe links in the article pages.",
  topic: "Layout verification", author: "BuzzKill Pest Control", publishedAt: "2026-01-15T14:00:00Z",
  image: { src: "/images/blog/synthetic-layout-preview/preview.png", alt: "Synthetic layout test image", width: 1200, height: 800, credit: "Test fixture", sourceUrl: "https://example.org/image" },
  body: [
    { type: "heading", text: "Start with an observation", id: "observations" },
    { type: "paragraph", content: [{ text: "Synthetic fixture text for layout verification. ".repeat(180) }, { text: '<script>alert("fixture")</script>' }, { text: " Read the service page.", href: "/services/general-pest" }] },
    { type: "heading", text: "Record the next step", id: "next-step" },
    { type: "list", items: [[{ text: "A synthetic list item." }], [{ text: "A reference", href: "https://example.org/reference" }]] },
  ],
  sources: [{ title: "Synthetic supporting reference", url: "https://example.org/reference" }],
} }));
vi.mock("../content/articles/articles.json", () => ({ default: [fixture] }));

import { ARTICLES, articleWordCount, findArticle, validateArticles } from "./articles";
import ArticleBody from "../components/articles/ArticleBody";
import { computeHead, pageGraphFor, renderHeadTags } from "../seo/head";
import { articlePageMeta, resolvePage } from "../seo/pages";
import { artifactHtml, routeArtifacts } from "../seo/artifacts";
import { renderRouteBody } from "../seo/prerender";
import { renderShellHead } from "../seo/shell";
import { renderSitemap } from "../seo/sitemap";
import { validateArticleAssets, validateArticleLinks } from "../../scripts/validate-editorial-content.mts";

const SHELL = `<!doctype html><html><head>${renderShellHead()}</head><body><div id="root"></div></body></html>`;
const article = ARTICLES[0];
const clone = () => JSON.parse(JSON.stringify(fixture));

describe("article collection", () => {
  it("sorts released articles, preserves supported prose, and resolves only known slugs", () => {
    const newer = { ...clone(), slug: "newer-fixture", publishedAt: "2026-02-01T14:00:00Z", image: { ...fixture.image, src: "/images/blog/newer-fixture/preview.png" } };
    const result = validateArticles([fixture, newer]);
    expect(result.map((a) => a.slug)).toEqual(["newer-fixture", "synthetic-layout-preview"]);
    expect(articleWordCount(result[0])).toBeGreaterThanOrEqual(1000);
    expect(findArticle(fixture.slug)?.title).toBe(fixture.title);
    expect(findArticle("missing")).toBeUndefined();
    expect(validateArticles([])).toEqual([]);
  });

  it("rejects duplicates, malformed dates, future releases, executable blocks and unsafe links", () => {
    expect(() => validateArticles([fixture, fixture])).toThrow("duplicate slug");
    for (const publishedAt of ["2026-02-30T14:00:00Z", "2026-01-15", "2099-01-01T14:00:00Z"]) expect(() => validateArticles([{ ...clone(), publishedAt }])).toThrow();
    expect(() => validateArticles([{ ...clone(), updatedAt: "2026-01-01T12:00:00Z" }])).toThrow("precede");
    expect(() => validateArticles([{ ...clone(), slug: "../outside" }])).toThrow("slug");
    expect(() => validateArticles([{ ...clone(), body: [{ type: "html", html: "<script>" }] }])).toThrow("only paragraph");
    for (const href of ["javascript:alert(1)", "//example.org", "https://user:secret@example.org", "https:\\evil.example", "/../contact", "/%2fexample.org"]) {
      const value = clone(); value.body[1].content[0].href = href;
      expect(() => validateArticles([value]), href).toThrow("links");
    }
  });

  it("requires source evidence, bounded length, unique headings and article-scoped images", () => {
    expect(() => validateArticles([{ ...clone(), sources: [] }])).toThrow("sources");
    expect(() => validateArticles([{ ...clone(), image: { ...fixture.image, src: "/images/another-company.jpg" } }])).toThrow("article-scoped");
    const short = clone(); short.body[1].content[0].text = "Short text.";
    expect(() => validateArticles([short])).toThrow("1,000–2,000");
    const long = clone(); long.body[1].content[0].text = "Word ".repeat(2001);
    expect(() => validateArticles([long])).toThrow("1,000–2,000");
    const duplicateHeading = clone(); duplicateHeading.body.push(duplicateHeading.body[0]);
    expect(() => validateArticles([duplicateHeading])).toThrow("duplicate heading");
    expect(() => validateArticles([{ ...clone(), rawHtml: "<img>" }])).toThrow("unsupported field");
  });
});

describe("public article rendering and discovery", () => {
  it("ships full article prose, source links and safe escaped text before JavaScript", () => {
    const artifact = routeArtifacts().find((a) => a.path === `/blog/${fixture.slug}`)!;
    expect(artifact.file).toBe(`blog/${fixture.slug}.html`);
    const html = artifactHtml(SHELL, artifact, renderRouteBody(artifact.path));
    expect(html).toContain('id="article-title"');
    expect(html).toContain('id="observations"');
    expect(html).toContain('href="/services/general-pest"');
    expect(html).toContain('href="https://example.org/reference"');
    expect(html).toContain('alt="Synthetic layout test image"');
    expect(html).toContain('&lt;script&gt;alert(&quot;fixture&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>alert(');
    expect(html).toContain('<link rel="canonical" href="https://www.pestbuzzkill.com/blog/synthetic-layout-preview"');
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain('Article &lt;preview&gt; &amp; &quot;verification&quot;');
  });

  it("renders listing links and unknown article fallback; only published slugs enter the sitemap", () => {
    expect(renderRouteBody("/blog")).toContain(`href="/blog/${fixture.slug}"`);
    expect(renderRouteBody("/blog/missing")).toContain("We couldn");
    expect(resolvePage("/blog/missing")).toBeUndefined();
    expect(computeHead("/blog/missing").robots).toBe("noindex, nofollow");
    expect(resolvePage(`/BLOG/${fixture.slug}/`)?.title).toBe(fixture.title);
    const sitemap = renderSitemap();
    expect(sitemap).toContain(`<loc>https://www.pestbuzzkill.com/blog/${fixture.slug}</loc>`);
    expect(sitemap).not.toContain("/blog/missing");
  });

  it("provides article metadata, truthful dates and sources, and preserves deployment noindex", () => {
    const head = computeHead(`/blog/${fixture.slug}`);
    expect(head.ogType).toBe("article");
    expect(head.imageSize).toEqual({ width: 1200, height: 800 });
    expect(renderHeadTags(head, { includeCanonical: true })).toContain('property="og:image:alt" content="Synthetic layout test image"');
    const graph = pageGraphFor(articlePageMeta(article), head.canonicalUrl)["@graph"];
    expect(graph.find((node) => node["@type"] === "BlogPosting")).toMatchObject({ datePublished: fixture.publishedAt, dateModified: fixture.publishedAt, citation: ["https://example.org/reference"] });
    expect(head.jsonLd).not.toContain("<preview>");
    expect(computeHead(`/blog/${fixture.slug}`, {}, true).robots).toBe("noindex, nofollow");
  });

  it("does not turn a bypassed unsafe link into an active URL", () => {
    const unsafe = { ...article, body: [{ type: "paragraph" as const, content: [{ text: "Unsafe link", href: "javascript:alert(1)" }] }] };
    const html = renderToStaticMarkup(createElement(ArticleBody, { article: unsafe }));
    expect(html).not.toContain("javascript:");
    expect(html).toContain("Unsafe link");
  });

  it("rejects internal links to unpublished routes before release", () => {
    expect(() => validateArticleLinks([article])).not.toThrow();
    const broken = { ...article, body: [{ type: "paragraph" as const, content: [{ text: "Missing service", href: "/services/not-a-real-service" }] }] };
    expect(() => validateArticleLinks([broken])).toThrow("not a published route");
  });
});

describe("article assets", () => {
  it("rejects missing files and symlinks outside the site's public tree", () => {
    const directory = mkdtempSync(join(tmpdir(), "buzzkill-article-"));
    try {
      const root = join(directory, "public");
      mkdirSync(join(root, "images/blog/synthetic-layout-preview"), { recursive: true });
      expect(() => validateArticleAssets(root, [article])).toThrow();
      const outside = join(directory, "outside.png"); writeFileSync(outside, "fixture");
      const target = join(root, article.image.src); symlinkSync(outside, target);
      expect(() => validateArticleAssets(root, [article])).toThrow("escapes");
      rmSync(target); writeFileSync(target, "fixture image bytes");
      expect(() => validateArticleAssets(root, [article])).not.toThrow();
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
