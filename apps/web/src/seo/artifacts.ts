/**
 * The static HTML files a production build ships, one per route, so the raw
 * HTML Amplify serves for `/about` is `about.html` with the About page's own
 * title, description, robots directive, canonical, social tags, and page
 * JSON-LD, before any script runs.
 *
 * Amplify Hosting's clean-URL handling serves `/about.html` for a request to
 * `/about` without changing the address bar (and without a redirect), which
 * is why the files are `<path>.html` rather than `<path>/index.html`: the
 * directory form would 301 `/about` to `/about/` and break the slashless
 * canonical policy.
 *
 * Special files:
 *  - `index.html`   the root page (also the SPA shell for unknown paths until
 *                   the hosting rules serve 404.html instead)
 *  - `404.html`     a noindex not-found page for the hosting 404 rule
 *  - `track.html`   the noindex shell for `/track/<token>`, reached through a
 *                   narrow rewrite; no token ever appears in its head
 *
 * Pure: the build script and the tests both call this.
 */
import { computeHead, renderHeadTags } from "./head";
import { DYNAMIC_ROUTES, allPages, type PageMeta } from "./pages";
import { renderRouteHead, siteJsonLdTag, SHELL_HEAD_START, SHELL_HEAD_END, swapShellHead } from "./shell";

export type RouteArtifact = {
  /** The URL path the file answers (informational for `404.html`/`track.html`). */
  path: string;
  /** File name relative to dist/. The root page is `index.html`, which the
   *  hosting fallback rule also serves for unknown paths until 404.html is
   *  wired; it carries the home page's own head. */
  file: string;
  /** Why it exists. */
  kind: "page" | "not-found" | "tracking-shell";
  /** The head block written into the shell. */
  head: string;
};

/** Head for a path that is not a page: noindex, no page graph, no canonical. */
function renderShellOnlyHead(path: string): string {
  const head = computeHead(path);
  return [
    SHELL_HEAD_START,
    renderHeadTags(head, { includeCanonical: false }),
    siteJsonLdTag(),
    SHELL_HEAD_END,
  ].join("\n    ");
}

/** dist-relative file name for a route path: `/services/termite` -> `services/termite.html`. */
export function artifactFileFor(path: string): string {
  if (path === "/") return "index.html";
  return `${path.replace(/^\//, "")}.html`;
}

/** Every artifact the build writes, with its head. `pages` defaults to all. */
export function routeArtifacts(pages: PageMeta[] = allPages()): RouteArtifact[] {
  const out: RouteArtifact[] = [];
  // The concrete dynamic routes (the two quote doors) get their own files; the
  // tracking route is served through a rewrite to `track.html` below.
  const concrete = [
    ...pages,
    ...Object.values(DYNAMIC_ROUTES).filter((p) => p.path !== "/track"),
  ];
  for (const page of concrete) {
    if (page.path === "/track") continue;
    out.push({
      path: page.path,
      file: artifactFileFor(page.path),
      kind: "page",
      head: renderRouteHead(page.path),
    });
  }
  out.push({ path: "/404", file: "404.html", kind: "not-found", head: renderShellOnlyHead("/404") });
  out.push({ path: "/track", file: "track.html", kind: "tracking-shell", head: renderShellOnlyHead("/track") });
  return out;
}

/** The full HTML for an artifact, given the built shell. */
export function artifactHtml(shellHtml: string, artifact: RouteArtifact): string {
  return swapShellHead(shellHtml, artifact.head);
}
