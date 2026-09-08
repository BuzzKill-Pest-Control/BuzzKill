/**
 * The static <head> for the HTML the server sends.
 *
 * Amplify Hosting serves one `index.html` for every extension-less path, so
 * the shell must be true for every page: the site-wide entity graph
 * (Organization, founder, WebSite), the home page's title and description as
 * the default, and no canonical or og:url (those name ONE page, and the
 * client writes the right one for the route it renders). A social crawler
 * that never runs JavaScript therefore sees the URL it was given, not the
 * home page, as the shared object.
 *
 * When per-route prerendering is enabled (scripts/postbuild.mts), each route
 * gets the full head including its canonical, og:url, and page graph.
 */
import { computeHead, renderHeadTags } from "./head";
import { serializeJsonLd, siteGraph } from "./schema";

export const SHELL_HEAD_START = "<!--bk:head:start-->";
export const SHELL_HEAD_END = "<!--bk:head:end-->";
export const SITE_JSON_LD_ID = "bk-site-jsonld";

export function siteJsonLdTag(): string {
  return `<script type="application/ld+json" id="${SITE_JSON_LD_ID}">${serializeJsonLd(siteGraph())}</script>`;
}

/** Head for the shared shell: home defaults, entity graph, no canonical. */
export function renderShellHead(): string {
  const head = computeHead("/");
  return [
    SHELL_HEAD_START,
    renderHeadTags(head, { includeCanonical: false }),
    siteJsonLdTag(),
    SHELL_HEAD_END,
  ].join("\n    ");
}

/** Head for one route's own HTML file: everything, canonical included. */
export function renderRouteHead(path: string): string {
  const head = computeHead(path);
  return [
    SHELL_HEAD_START,
    renderHeadTags(head, { includeCanonical: true }),
    siteJsonLdTag(),
    SHELL_HEAD_END,
  ].join("\n    ");
}

/** Replace the shell head block in built HTML with another head. */
export function swapShellHead(html: string, headHtml: string): string {
  const start = html.indexOf(SHELL_HEAD_START);
  const end = html.indexOf(SHELL_HEAD_END);
  if (start === -1 || end === -1 || end < start) {
    throw new Error("shell head markers not found in index.html");
  }
  return html.slice(0, start) + headHtml + html.slice(end + SHELL_HEAD_END.length);
}
