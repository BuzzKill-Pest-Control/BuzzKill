import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";

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
import { validateArticleAssets, validateArticleLinks, validateArticleRelease } from "../../scripts/validate-editorial-content.mts";

const SHELL = `<!doctype html><html><head>${renderShellHead()}</head><body><div id="root"></div></body></html>`;
const article = ARTICLES[0];
const clone = () => JSON.parse(JSON.stringify(fixture));

it("serves full listing and fixture article HTML through the ordered hosting rules without swallowing existing SPA routes", async () => {
  const rules = JSON.parse(readFileSync(new URL("../../hosting/amplify-custom-rules.json", import.meta.url), "utf8")) as Array<{ source: string; target: string; status: string }>;
  const built = new Map(routeArtifacts().map((artifact) => [`/${artifact.file}`, artifactHtml(SHELL, artifact, renderRouteBody(artifact.path))]));
  const shell = built.get("/index.html")!;
  const targetFor = (path: string): { file: string; status: number } => {
    for (const rule of rules) {
      if (rule.source.startsWith("https://")) continue;
      if (rule.status === "404-200") {
        const native = [path, path.endsWith("/") ? `${path}index.html` : `${path}.html`].find((file) => built.has(file));
        return { file: native ?? rule.target, status: 200 };
      }
      const articleSlug = rule.source === "/blog/<article>/" ? /^\/blog\/([^/]+)\/$/.exec(path)?.[1] : undefined;
      if (rule.source === path || articleSlug || (rule.source.startsWith("</") && new RegExp(rule.source.slice(2, -2)).test(path))) {
        return { file: articleSlug ? rule.target.replace("<article>", articleSlug) : rule.target, status: Number(rule.status) };
      }
    }
    throw new Error(`No hosting rule handles ${path}`);
  };
  const server = createServer((request, response) => {
    const url = new URL(request.url!, "http://localhost"), target = targetFor(url.pathname);
    if (target.status === 301) { response.writeHead(301, { Location: target.file + url.search }); response.end(); return; }
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(built.get(target.file) ?? shell);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`, articlePath = `/blog/${article.slug}`;
    for (const [path, file] of [["/blog", "/blog.html"], [articlePath, `${articlePath}.html`]]) {
      const expected = built.get(file)!;
      expect(expected).toBeTruthy(); expect(expected).not.toBe(shell);
      for (const variant of [path, `${path}/`, `${path}?utm_source=routing-test`, `${path}/?utm_source=routing-test`, `${path}.html`]) {
        const response = await fetch(`${origin}${variant}`), html = await response.text();
        expect(response.status, variant).toBe(200);
        expect(response.redirected, variant).toBe(path === articlePath && new URL(variant, origin).pathname.endsWith("/"));
        expect(new URL(response.url).search, variant).toBe(new URL(variant, origin).search);
        expect(html, variant).toBe(expected);
        expect(html, variant).toContain(`href="https://www.pestbuzzkill.com${path}"`);
        expect(html, variant).toContain(path === "/blog" ? "The BuzzKill Blog" : "Sources &amp; further reading");
        if (path === articlePath) { expect(html).toContain("BlogPosting"); expect(html).toContain("Synthetic fixture text for layout verification."); }
      }
    }
    const redirect = await fetch(`${origin}${articlePath}/?utm_source=kept`, { redirect: "manual" });
    expect(redirect.status).toBe(301); expect(redirect.headers.get("location")).toBe(`${articlePath}?utm_source=kept`);
    for (const path of ["/", "/book", "/track/example", "/residential", "/blogger", "/blog/unknown-article", "/blog/nested/unapproved", "/unknown-route"]) {
      expect(await (await fetch(`${origin}${path}`)).text(), path).toBe(shell);
    }
    expect(await (await fetch(`${origin}/about`)).text()).toBe(built.get("/about.html"));
  } finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
});

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

  it("rejects duplicates, malformed dates, executable blocks and unsafe links", () => {
    expect(() => validateArticles([fixture, fixture])).toThrow("duplicate slug");
    for (const publishedAt of ["2026-02-30T14:00:00Z", "2026-01-15"]) expect(() => validateArticles([{ ...clone(), publishedAt }])).toThrow();
    expect(() => validateArticles([{ ...clone(), updatedAt: "2026-01-01T12:00:00Z" }])).toThrow("precede");
    expect(() => validateArticles([{ ...clone(), slug: "../outside" }])).toThrow("slug");
    expect(() => validateArticles([{ ...clone(), body: [{ type: "html", html: "<script>" }] }])).toThrow("only paragraph");
    for (const href of ["javascript:alert(1)", "//example.org", "https://user:secret@example.org", "https:\\evil.example", "/../contact", "/%2fexample.org"]) {
      const value = clone(); value.body[1].content[0].href = href;
      expect(() => validateArticles([value]), href).toThrow("links");
    }
  });

  it("keeps future publication and modification timestamps out of the build", () => {
    const buildTime = Date.parse("2026-10-18T12:00:00Z");
    expect(() => validateArticleRelease([article], buildTime)).not.toThrow();
    const future = validateArticles([{ ...clone(), publishedAt: "2026-10-19T12:00:00Z" }]);
    expect(() => validateArticleRelease(future, buildTime)).toThrow("released before the build");
    expect(() => validateArticleRelease([{ ...article, updatedAt: "2026-10-19T12:00:00Z" }], buildTime)).toThrow("released before the build");
  });

  it("loads the shipped collection and marketing registry even when a visitor's clock is years behind", async () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.parse("2001-01-01T00:00:00Z"));
    vi.resetModules();
    try {
      const clientArticles = await import("./articles");
      const clientPages = await import("../seo/pages");
      expect(clientArticles.findArticle(fixture.slug)?.title).toBe(fixture.title);
      expect(clientPages.resolvePage("/")?.kind).toBe("home");
      expect(clientPages.resolvePage(`/blog/${fixture.slug}`)?.title).toBe(fixture.title);
    } finally { clock.mockRestore(); }
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
  async function withImageFile(check: (root: string, target: string, candidate: typeof article) => Promise<void>, extension = "png") {
    const directory = mkdtempSync(join(tmpdir(), "buzzkill-article-"));
    try {
      const root = join(directory, "public");
      mkdirSync(join(root, "images/blog/synthetic-layout-preview"), { recursive: true });
      const candidate = { ...article, image: { ...article.image, src: `/images/blog/synthetic-layout-preview/preview.${extension}`, width: 120, height: 80 } };
      await check(root, join(root, candidate.image.src), candidate);
    } finally { rmSync(directory, { recursive: true, force: true }); }
  }

  const raster = () => sharp({ create: { width: 120, height: 80, channels: 3, background: "#72e000" } });

  it("rejects missing files and symlinks outside the site's public tree", async () => {
    await withImageFile(async (root, target, candidate) => {
      await expect(validateArticleAssets(root, [candidate])).rejects.toThrow();
      const outside = join(root, "..", "outside.png"); writeFileSync(outside, await raster().png().toBuffer());
      symlinkSync(outside, target);
      await expect(validateArticleAssets(root, [candidate])).rejects.toThrow("escapes");
    });
  });

  it.each(["png", "jpg", "jpeg", "webp", "avif"] as const)("decodes a valid %s raster and verifies its actual dimensions", async (extension) => {
    await withImageFile(async (root, target, candidate) => {
      writeFileSync(target, await raster().toFormat(extension === "jpg" ? "jpeg" : extension).toBuffer());
      await expect(validateArticleAssets(root, [candidate])).resolves.toBeUndefined();
    }, extension);
  });

  it("rejects arbitrary text disguised as a raster image", async () => {
    await withImageFile(async (root, target, candidate) => {
      writeFileSync(target, "fixture image bytes");
      await expect(validateArticleAssets(root, [candidate])).rejects.toThrow("invalid image");
    });
  });

  it("rejects corrupt pixel data even when the image headers still parse", async () => {
    await withImageFile(async (root, target, candidate) => {
      const valid = await raster().png().toBuffer();
      const truncated = valid.subarray(0, Math.floor(valid.length * 0.65));
      await expect(sharp(truncated).metadata()).resolves.toMatchObject({ width: 120, height: 80 });
      writeFileSync(target, truncated);
      await expect(validateArticleAssets(root, [candidate])).rejects.toThrow("invalid image");
    });
  });

  it("rejects a filename extension that contradicts the decoded format", async () => {
    await withImageFile(async (root, target, candidate) => {
      writeFileSync(target, await raster().jpeg().toBuffer());
      await expect(validateArticleAssets(root, [candidate])).rejects.toThrow("image type");
    });
  });

  it("rejects declared dimensions that differ from the decoded pixels", async () => {
    await withImageFile(async (root, target, candidate) => {
      writeFileSync(target, await raster().png().toBuffer());
      await expect(validateArticleAssets(root, [{ ...candidate, image: { ...candidate.image, width: 121 } }])).rejects.toThrow("dimensions 120×80 do not match declared 121×80");
    });
  });

  it("checks display dimensions after applying JPEG EXIF orientation", async () => {
    await withImageFile(async (root, target, candidate) => {
      writeFileSync(target, await raster().withMetadata({ orientation: 6 }).jpeg().toBuffer());
      const displayed = { ...candidate, image: { ...candidate.image, width: 80, height: 120 } };
      await expect(validateArticleAssets(root, [displayed])).resolves.toBeUndefined();
      await expect(validateArticleAssets(root, [candidate])).rejects.toThrow("dimensions 80×120 do not match declared 120×80");
    }, "jpg");
  });

  it("rejects files above the encoded size bound before decoding", async () => {
    await withImageFile(async (root, target, candidate) => {
      writeFileSync(target, Buffer.alloc(10 * 1024 * 1024 + 1));
      await expect(validateArticleAssets(root, [candidate])).rejects.toThrow("at most 10 MiB");
    });
  });
});
