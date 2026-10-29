/** Exercise the real build over HTTP with the proposed ordered Amplify rules.
 * Model native missing-flat slash redirects and a terminal 404 fallback. Live
 * fallback status can be 200 or 404; this does not replace Amplify verification. */
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { computeHead } from "../src/seo/head";
import { ARTICLES, articlePath } from "../src/lib/articles";

type Rule = { source: string; target: string; status: string };
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const rules: Rule[] = JSON.parse(readFileSync(new URL("../hosting/amplify-custom-rules.json", import.meta.url), "utf8"));
const shell = readFileSync(join(dist, "index.html"), "utf8");
const about = readFileSync(join(dist, "about.html"), "utf8");
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function nativeFile(path: string): string | undefined {
  // Amplify's documented clean URL lookup precedes its missing-file fallback.
  for (const file of [path, path.endsWith("/") ? `${path}index.html` : `${path}.html`]) {
    if (existsSync(join(dist, file)) && statSync(join(dist, file)).isFile()) return file;
  }
}

function targetFor(path: string): { file: string; status: number } {
  for (const rule of rules) {
    // The retained domain redirect does not apply to this local HTTP server.
    if (rule.source.startsWith("https://")) continue;
    if (rule.status === "404-200") {
      const file = nativeFile(path);
      if (file) return { file, status: 200 };
      if (!path.endsWith("/") && !path.split("/").pop()!.includes(".")) return { file: `${path}/`, status: 301 };
      return { file: rule.target, status: 404 };
    }
    const article = rule.source === "/blog/<article>/" ? /^\/blog\/([^/]+)\/$/.exec(path)?.[1] : undefined;
    if (rule.source === path || article || (rule.source.startsWith("</") && new RegExp(rule.source.slice(2, -2)).test(path))) {
      return { file: article ? rule.target.replace("<article>", article) : rule.target, status: Number(rule.status) };
    }
  }
  throw new Error(`No hosting rule handles ${path}`);
}

const server = createServer((req, res) => {
  const requested = new URL(req.url!, "http://localhost"), path = requested.pathname;
  const result = targetFor(path);
  if (result.status === 301) { res.writeHead(301, { Location: result.file + requested.search }); res.end(); return; }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.statusCode = result.status;
  res.end(readFileSync(join(dist, result.file)));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const readChain = async (path: string) => {
    let url = new URL(path, origin);
    const search = url.search, seen = new Set<string>(), redirects: string[] = [];
    for (let hop = 0; hop <= 3; hop++) {
      assert.ok(!seen.has(url.href), `${path}: redirect loop at ${url.href}`);
      seen.add(url.href);
      const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(2000) });
      const html = await response.text();
      if (![301, 302, 307, 308].includes(response.status)) return { response, html, redirects, url };
      const location = response.headers.get("location");
      assert.ok(location, `${path}: redirect has no Location`);
      url = new URL(location, url);
      assert.equal(url.origin, origin, `${path}: redirect leaves the local origin`);
      assert.equal(url.search, search, `${path}: redirect loses the query`);
      redirects.push(url.href);
    }
    throw new Error(`${path}: redirect limit exceeded`);
  };
  const head = computeHead("/about");
  for (const path of ["/about", "/about/", "/about?utm_source=profile", "/about.html"]) {
    const { response, html, redirects } = await readChain(path);
    assert.equal(response.status, 200, path);
    assert.deepEqual(redirects, [], path);
    assert.equal(html, about, `${path} must serve the actual About artifact`);
    assert.equal((html.match(/<title>/g) ?? []).length, 1);
    assert.ok(html.includes(`<title>${escape(head.title)}</title>`));
    assert.ok(html.includes(`<meta name="description" content="${escape(head.description)}"`));
    assert.ok(html.includes(`<link rel="canonical" href="${head.canonicalUrl}"`));
    for (const family of ["og", "twitter"]) {
      const attribute = family === "og" ? "property" : "name";
      for (const [key, value] of Object.entries({ title: head.title, description: head.description, image: head.image })) {
        assert.ok(html.includes(`<meta ${attribute}="${family}:${key}" content="${escape(value)}"`));
      }
    }
    assert.ok(html.includes(`<meta property="og:url" content="${head.canonicalUrl}"`));
    const body = html.split("<body>")[1];
    assert.ok(body.includes("About BuzzKill Pest Control</h1>"));
    assert.ok(body.includes("Founded by Jake Greasley</h2>"));
    assert.ok(body.includes("Jacob Charles Greasley"));
    assert.ok(body.includes('href="https://jakegreasley.com/"'));
    assert.ok(html.includes('<script type="module"'), "the normal client app must still boot");
  }
  const blog = readFileSync(join(dist, "blog.html"), "utf8");
  for (const path of ["/blog", "/blog/", "/blog?utm_source=routing-test", "/blog/?utm_source=routing-test", "/blog.html"]) {
    const { response, html, redirects } = await readChain(path);
    assert.equal(response.status, 200, path); assert.deepEqual(redirects, [], path);
    assert.equal(html, blog, `${path} must serve the built Blog artifact`);
    assert.ok(blog.includes('href="https://www.pestbuzzkill.com/blog"'));
    assert.ok(blog.includes("The BuzzKill Blog"));
  }
  // The fixture-backed Vitest case exercises this even when the shipped list is
  // empty. On future builds, also inspect every real built article here.
  for (const article of ARTICLES) {
    const path = articlePath(article), html = readFileSync(join(dist, `${path}.html`), "utf8");
    assert.equal(readFileSync(join(dist, path, "index.html"), "utf8"), html, `${path}: both article artifacts must be byte-identical`);
    for (const variant of [path, `${path}/`, `${path}?utm_source=routing-test`, `${path}/?utm_source=routing-test`, `${path}.html`]) {
      const { response, html: received, redirects, url } = await readChain(variant);
      assert.equal(response.status, 200, variant);
      assert.deepEqual(redirects, [], variant);
      assert.equal(url.search, new URL(variant, origin).search, variant);
      assert.equal(received, html, `${variant} must serve the built article artifact`);
    }
  }
  for (const path of ["/", "/book", "/track/example", "/residential", "/blogger", "/unknown-route"]) {
    const { response, html, redirects } = await readChain(path);
    assert.equal(response.status, 200, path); assert.deepEqual(redirects, [], path);
    assert.equal(html, shell, `${path} retains its existing SPA routing`);
  }
  for (const path of ["/blog/unknown-article", "/blog/nested/unapproved"]) {
    for (const variant of [path, `${path}/`, `${path}?utm_source=kept`, `${path}/?utm_source=kept`]) {
      const { response, html, redirects } = await readChain(variant);
      assert.equal(response.status, 404, `${variant}: local native fallback model`);
      assert.equal(html, shell, `${variant}: existing missing-file fallback`);
      assert.equal(redirects.length, new URL(variant, origin).pathname.endsWith("/") ? 0 : 1, variant);
    }
  }
  console.log("About/Blog build HTTP checks passed: raw artifacts, metadata, visible content, direct .html/query/trailing variants, bounded missing-file chains, and unchanged SPA routes. Live fallback status still requires verification.");
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
