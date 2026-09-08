/**
 * Canonical URLs, in one place.
 *
 * The hosting layer serves the SPA shell for every extension-less path, so the
 * browser can arrive at /About, /about/, /about/index.html, or an alias route
 * and still render the About page. Search engines must see exactly one URL
 * for it. This module is the single answer to "what is the canonical URL of
 * the page the visitor is on", used by the client head manager, the sitemap
 * generator, the JSON-LD graph, and the tests that keep them in agreement.
 */
import { SITE_ORIGIN } from "../../amplify/functions/shared/company";

export { SITE_ORIGIN };

/**
 * Routes that render another route's page. The left side is what the browser
 * may show; the right side is the only URL search engines are given.
 *
 * `/residential/<service>` duplicates `/services/<service>` (same component)
 * and is REDIRECTED client-side by App.tsx. The two quote doors are distinct
 * URLs on purpose (an ad or a bookmark lands on the tab it means), so they are
 * canonicalised but never redirected.
 */
export const ALIAS_PREFIXES: ReadonlyArray<readonly [string, string]> = [
  ["/residential/", "/services/"],
];

/** Paths that canonicalise to another page without redirecting. */
export const CANONICAL_OVERRIDES: Readonly<Record<string, string>> = {
  "/quote/instant": "/quote",
  "/quote/contact-me": "/quote",
};

/**
 * Normalise the shape of a path without changing which page it names:
 * decode, collapse repeated slashes, drop a trailing `index.html`, drop a
 * trailing slash (except the root), lower-case. Pure, so the same input always
 * yields the same output on the server, in the build, and in the browser.
 */
export function normalizePath(pathname: string): string {
  let p = pathname || "/";
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep the raw path; a malformed escape is still a path */
  }
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/");
  p = p.replace(/\/index\.html?$/i, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  p = p.toLowerCase();
  return p === "" ? "/" : p;
}

/** The canonical path for whatever path the browser shows. */
export function canonicalPathFor(pathname: string): string {
  const p = normalizePath(pathname);
  if (CANONICAL_OVERRIDES[p]) return CANONICAL_OVERRIDES[p];
  for (const [alias, target] of ALIAS_PREFIXES) {
    if (p.startsWith(alias)) return target + p.slice(alias.length);
  }
  return p;
}

/**
 * Absolute URL on the canonical origin. The root keeps its slash
 * (`https://www.pestbuzzkill.com/`); nothing else has a trailing slash.
 */
export function absoluteUrl(path: string): string {
  const p = normalizePath(path);
  return p === "/" ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${p}`;
}

/** The canonical absolute URL for the path the browser shows. */
export function canonicalUrlFor(pathname: string): string {
  return absoluteUrl(canonicalPathFor(pathname));
}

/** Absolute URL for a site asset such as an image, unless already absolute. */
export function assetUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_ORIGIN}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}
