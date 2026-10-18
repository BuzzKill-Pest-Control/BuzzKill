import { realpathSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { ARTICLES, type Article } from "../src/lib/articles";
import { resolvePage } from "../src/seo/pages";

/** Local prose links must point to a route this website actually publishes. */
export function validateArticleLinks(articles: readonly Article[]): void {
  for (const article of articles) {
    const segments = article.body.flatMap((block) => block.type === "paragraph" ? block.content : block.type === "list" ? block.items.flat() : []);
    for (const { href } of segments) {
      if (href?.startsWith("/") && !resolvePage(href.split("#")[0])) throw new Error(`Article ${article.slug}: internal link is not a published route (${href})`);
    }
  }
}

/** The public asset must be a bounded regular file inside this site's public tree. */
export function validateArticleAssets(publicRoot: string, articles: readonly Article[]): void {
  const root = realpathSync(publicRoot);
  for (const article of articles) {
    const file = realpathSync(resolve(root, `.${article.image.src}`));
    if (!file.startsWith(`${root}${sep}`)) throw new Error(`Article ${article.slug}: image escapes public directory`);
    const stat = statSync(file);
    if (!stat.isFile() || stat.size === 0 || stat.size > 10 * 1024 * 1024) throw new Error(`Article ${article.slug}: image must be a nonempty file of at most 10 MiB`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateArticleLinks(ARTICLES);
  validateArticleAssets(fileURLToPath(new URL("../public", import.meta.url)), ARTICLES);
  console.log(`Validated ${ARTICLES.length} published article(s) and their local images.`);
}
