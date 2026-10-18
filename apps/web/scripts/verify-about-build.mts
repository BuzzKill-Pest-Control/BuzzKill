/** Exercise the real build over HTTP with the proposed ordered Amplify rules.
 * This local smoke test does not replace verification on Amplify after deploy. */
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
      return { file: nativeFile(path) ?? rule.target, status: 200 };
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
  res.end(readFileSync(join(dist, result.file)));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
try {
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const head = computeHead("/about");
  for (const path of ["/about", "/about/", "/about?utm_source=profile", "/about.html"]) {
    const response = await fetch(`${origin}${path}`);
    const html = await response.text();
    assert.equal(response.status, 200, path);
    assert.equal(response.redirected, false, path);
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
  for (const path of ["/blog", "/blog/", "/blog?utm_source=routing-test", "/blog.html"]) {
    const response = await fetch(`${origin}${path}`);
    assert.equal(response.status, 200, path); assert.equal(response.redirected, false, path);
    assert.equal(await response.text(), blog, `${path} must serve the built Blog artifact`);
    assert.ok(blog.includes('href="https://www.pestbuzzkill.com/blog"'));
    assert.ok(blog.includes("The BuzzKill Blog"));
  }
  // The fixture-backed Vitest case exercises this even when the shipped list is
  // empty. On future builds, also inspect every real built article here.
  for (const article of ARTICLES) {
    const path = articlePath(article), html = readFileSync(join(dist, `${path}.html`), "utf8");
    for (const variant of [path, `${path}/`, `${path}?utm_source=routing-test`, `${path}/?utm_source=routing-test`, `${path}.html`]) {
      const response = await fetch(`${origin}${variant}`);
      assert.equal(response.status, 200, variant);
      assert.equal(response.redirected, new URL(variant, origin).pathname.endsWith("/"), variant);
      assert.equal(new URL(response.url).search, new URL(variant, origin).search, variant);
      assert.equal(await response.text(), html, `${variant} must serve the built article artifact`);
    }
  }
  for (const path of ["/", "/book", "/track/example", "/residential", "/blogger", "/blog/unknown-article", "/unknown-route"]) {
    assert.equal(await (await fetch(`${origin}${path}`)).text(), shell, `${path} retains its existing SPA routing`);
  }
  console.log("About/Blog build HTTP checks passed: raw artifacts, metadata, visible content, direct .html and query variants, and unchanged SPA routes.");
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
