/**
 * Runs after `vite build` (see package.json "build") on EVERY build.
 *
 * 1. Writes dist/sitemap.xml from the route registry, so the sitemap can only
 *    contain canonical, indexable pages on the canonical host.
 *
 * 2. Writes one static HTML file per route (dist/<path>.html) carrying that
 *    route's own head: title, description, robots, self-referential canonical,
 *    social tags, and page JSON-LD. Amplify serves `<path>.html` for a clean
 *    `/<path>` request without a redirect. Also writes dist/404.html (noindex
 *    not-found page) and dist/track.html (noindex tracking shell for the
 *    `/track/<token>` rewrite). The root stays dist/index.html.
 *
 * The hosting rules that make Amplify serve these files are listed in
 * docs/seo-canonical-entity-handoff-2026-09-07.md.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { artifactHtml, routeArtifacts } from "../src/seo/artifacts";
import { indexablePages } from "../src/seo/pages";
import { renderSitemap } from "../src/seo/sitemap";

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, "..", "dist");

if (!existsSync(join(dist, "index.html"))) {
  console.error("postbuild: dist/index.html not found; run vite build first");
  process.exit(1);
}

writeFileSync(join(dist, "sitemap.xml"), renderSitemap());
console.log(`postbuild: sitemap.xml written with ${indexablePages().length} URLs`);

const shell = readFileSync(join(dist, "index.html"), "utf8");
let written = 0;
for (const artifact of routeArtifacts()) {
  const target = join(dist, artifact.file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, artifactHtml(shell, artifact));
  written += 1;
}
console.log(`postbuild: wrote ${written} route files (index.html, <route>.html, 404.html, track.html)`);
