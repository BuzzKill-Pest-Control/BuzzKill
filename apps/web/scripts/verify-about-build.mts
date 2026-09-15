/** Exercise the real build over HTTP with the proposed ordered Amplify rules.
 * This local smoke test does not replace verification on Amplify after deploy. */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { computeHead } from "../src/seo/head";

type Rule = { source: string; target: string; status: string };
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const rules: Rule[] = JSON.parse(readFileSync(new URL("../hosting/amplify-custom-rules.json", import.meta.url), "utf8"));
const shell = readFileSync(join(dist, "index.html"), "utf8");
const about = readFileSync(join(dist, "about.html"), "utf8");
const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function targetFor(path: string): string {
  for (const rule of rules) {
    // The retained domain redirect does not apply to this local HTTP server.
    if (rule.source.startsWith("https://")) continue;
    if (rule.status === "404-200") {
      return existsSync(join(dist, path)) ? path : rule.target;
    }
    if (rule.source === path || (rule.source.startsWith("</") && new RegExp(rule.source.slice(2, -2)).test(path))) {
      return rule.target;
    }
  }
  throw new Error(`No hosting rule handles ${path}`);
}

const server = createServer((req, res) => {
  const path = new URL(req.url!, "http://localhost").pathname;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(readFileSync(join(dist, targetFor(path))));
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
  for (const path of ["/", "/book", "/track/example", "/residential", "/unknown-route"]) {
    assert.equal(await (await fetch(`${origin}${path}`)).text(), shell, `${path} retains its existing SPA routing`);
  }
  console.log("About build HTTP checks passed: route metadata, visible founder content, links, client boot, query strings, and unchanged SPA routes.");
} finally {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
