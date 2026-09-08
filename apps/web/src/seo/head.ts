/**
 * What the <head> of a page must say, computed once and applied by whichever
 * side is rendering: the client head manager (components/SEO.tsx) in the
 * browser, the build (vite.config.ts) for the HTML shell, and the prerender
 * (scripts/postbuild.mts) for per-route static HTML. Pure and DOM-free so a
 * test can assert on it directly.
 */
import { COMPANY } from "../../amplify/functions/shared/company";
import { absoluteUrl, assetUrl, canonicalPathFor } from "./canonical";
import {
  NOT_FOUND_PAGE,
  fullTitle,
  resolvePage,
  type PageMeta,
} from "./pages";
import {
  ORGANIZATION_ID,
  breadcrumbNode,
  cityPlaceNode,
  faqNode,
  serializeJsonLd,
  serviceNode,
  webPageNode,
  type JsonLdGraph,
} from "./schema";

export const ROBOTS_INDEX =
  "index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1";
export const ROBOTS_NOINDEX = "noindex, nofollow";
/** Reachable pages kept out of the index but still crawled for their links. */
export const ROBOTS_NOINDEX_FOLLOW = "noindex, follow";

export type HeadOverrides = {
  title?: string;
  description?: string;
  image?: string;
  noindex?: boolean;
};

export type HeadState = {
  /** The registry entry that governs this path (the not-found page if none). */
  page: PageMeta;
  /** True when the path is not a published page. */
  notFound: boolean;
  title: string;
  description: string;
  robots: string;
  canonicalUrl: string;
  ogType: "website";
  image: string;
  /** Pixel size of `image` when it is the site default; unknown otherwise. */
  imageSize?: { width: number; height: number };
  /** The page-level JSON-LD graph (WebPage, breadcrumb, service, FAQ). The
   *  site-level entity graph ships separately in the HTML shell. */
  pageGraph: JsonLdGraph;
  /** `pageGraph` serialised for a <script type="application/ld+json">. */
  jsonLd: string;
};

/** The page-level JSON-LD for a registry entry at its canonical URL. */
export function pageGraphFor(page: PageMeta, canonicalUrl: string): JsonLdGraph {
  const crumbs = page.breadcrumb
    ? [{ name: "Home", url: "/" }, ...page.breadcrumb]
    : undefined;
  const graph = [
    webPageNode({
      canonicalUrl,
      title: fullTitle(page),
      description: page.description,
      type: page.webPageType,
      image: page.image,
      hasBreadcrumb: Boolean(crumbs),
      mainEntityId: page.kind === "about" ? ORGANIZATION_ID : undefined,
    }),
  ];
  if (crumbs) graph.push(breadcrumbNode(canonicalUrl, crumbs));
  if (page.service) {
    graph.push(
      serviceNode({
        canonicalUrl,
        name: page.service.name,
        description: page.service.description,
        areaServed: page.city ? [cityPlaceNode(page.city)] : undefined,
      }),
    );
  }
  if (page.faq && page.faq.length > 0) graph.push(faqNode(canonicalUrl, page.faq));
  return { "@context": "https://schema.org", "@graph": graph };
}

/**
 * The head for a browser path. `overrides` are what a page may change at
 * runtime (a booking step's title, a noindex on a private state); `forceNoindex`
 * is the deployment's own rule (a staging build is never indexable).
 */
export function computeHead(
  pathname: string,
  overrides: HeadOverrides = {},
  forceNoindex = false,
): HeadState {
  const resolved = resolvePage(pathname);
  const page = resolved ?? NOT_FOUND_PAGE;
  const notFound = !resolved;
  // The tracking page is reached as /track/<token>; its canonical is the
  // tokenless path so no private token ever appears in metadata.
  const canonicalUrl = absoluteUrl(
    notFound ? pathname : page.path === "/track" ? "/track" : canonicalPathFor(pathname),
  );
  const noindex = forceNoindex || notFound || Boolean(page.noindex) || Boolean(overrides.noindex);
  const robots = noindex
    ? page.noindex === "follow" && !forceNoindex && !notFound && !overrides.noindex
      ? ROBOTS_NOINDEX_FOLLOW
      : ROBOTS_NOINDEX
    : ROBOTS_INDEX;
  const title = overrides.title
    ? `${overrides.title}${page.kind === "home" ? "" : ` | ${COMPANY.name}`}`
    : fullTitle(page);
  const description = overrides.description ?? page.description;
  const image = assetUrl(overrides.image ?? page.image ?? COMPANY.defaultImage.path);
  const isDefaultImage = !overrides.image && !page.image;
  const pageGraph = pageGraphFor(
    { ...page, title: overrides.title ?? page.title, description },
    canonicalUrl,
  );
  return {
    page,
    notFound,
    title,
    description,
    robots,
    canonicalUrl,
    ogType: "website",
    image,
    imageSize: isDefaultImage ? { width: COMPANY.defaultImage.width, height: COMPANY.defaultImage.height } : undefined,
    pageGraph,
    jsonLd: serializeJsonLd(pageGraph),
  };
}

/** The static <head> tags for a computed head, as HTML (used by the build). */
export function renderHeadTags(head: HeadState, opts: { includeCanonical: boolean }): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = [
    `<title>${esc(head.title)}</title>`,
    `<meta name="description" content="${esc(head.description)}" />`,
    `<meta name="robots" content="${esc(head.robots)}" />`,
  ];
  if (opts.includeCanonical) {
    lines.push(`<link rel="canonical" href="${esc(head.canonicalUrl)}" />`);
  }
  lines.push(
    `<meta property="og:type" content="${head.ogType}" />`,
    `<meta property="og:site_name" content="${esc(COMPANY.name)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${esc(head.title)}" />`,
    `<meta property="og:description" content="${esc(head.description)}" />`,
    `<meta property="og:image" content="${esc(head.image)}" />`,
  );
  if (head.imageSize) {
    lines.push(
      `<meta property="og:image:width" content="${head.imageSize.width}" />`,
      `<meta property="og:image:height" content="${head.imageSize.height}" />`,
    );
  }
  if (opts.includeCanonical) {
    lines.push(`<meta property="og:url" content="${esc(head.canonicalUrl)}" />`);
  }
  lines.push(
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(head.title)}" />`,
    `<meta name="twitter:description" content="${esc(head.description)}" />`,
    `<meta name="twitter:image" content="${esc(head.image)}" />`,
    `<meta name="geo.region" content="US-${COMPANY.address.addressRegion}" />`,
    `<meta name="geo.placename" content="${esc(`${COMPANY.address.addressLocality}, Massachusetts`)}" />`,
  );
  if (opts.includeCanonical) {
    lines.push(`<script type="application/ld+json" id="bk-jsonld">${head.jsonLd}</script>`);
  }
  return lines.join("\n    ");
}
