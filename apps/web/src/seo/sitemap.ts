/**
 * The sitemap, generated from the route registry at build time so it can only
 * ever list pages that exist, on the canonical host, without noindex pages.
 * No lastmod: the build has no truthful per-page date, and a made-up one is
 * ignored by search engines at best.
 */
import { absoluteUrl } from "./canonical";
import { indexablePages, type PageMeta } from "./pages";

function priorityFor(page: PageMeta): string {
  switch (page.kind) {
    case "home":
      return "1.0";
    case "audience":
      return "0.9";
    case "service":
    case "about":
    case "contact":
      return "0.8";
    case "area":
      return "0.7";
    case "city":
      return "0.6";
    default:
      return "0.5";
  }
}

export function sitemapUrls(pages: PageMeta[] = indexablePages()): string[] {
  return pages.map((p) => absoluteUrl(p.path));
}

export function renderSitemap(pages: PageMeta[] = indexablePages()): string {
  const entries = pages.map((p) => {
    const loc = absoluteUrl(p.path);
    return `  <url>\n    <loc>${loc}</loc>\n    <priority>${priorityFor(p)}</priority>\n  </url>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    "</urlset>",
    "",
  ].join("\n");
}
