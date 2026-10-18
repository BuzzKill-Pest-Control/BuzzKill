import { realpathSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { ARTICLES, type Article } from "../src/lib/articles";
import { resolvePage } from "../src/seo/pages";

/** Only the trusted build clock controls release; visitors always see the shipped collection. */
export function validateArticleRelease(articles: readonly Article[], now = Date.now()): void {
  if (!Number.isFinite(now)) throw new Error("Article release validation requires a valid build timestamp");
  for (const article of articles) {
    if (Date.parse(article.publishedAt) > now || (article.updatedAt && Date.parse(article.updatedAt) > now)) throw new Error(`Article ${article.slug}: publication and modification timestamps must be released before the build`);
  }
}

/** Local prose links must point to a route this website actually publishes. */
export function validateArticleLinks(articles: readonly Article[]): void {
  for (const article of articles) {
    const segments = article.body.flatMap((block) => block.type === "paragraph" ? block.content : block.type === "list" ? block.items.flat() : []);
    for (const { href } of segments) {
      if (href?.startsWith("/") && !resolvePage(href.split("#")[0])) throw new Error(`Article ${article.slug}: internal link is not a published route (${href})`);
    }
  }
}

/** Decode bounded local raster files; filename extensions and dimensions are not trusted. */
export async function validateArticleAssets(publicRoot: string, articles: readonly Article[]): Promise<void> {
  const root = realpathSync(publicRoot);
  for (const article of articles) {
    const file = realpathSync(resolve(root, `.${article.image.src}`));
    if (!file.startsWith(`${root}${sep}`)) throw new Error(`Article ${article.slug}: image escapes public directory`);
    const stat = statSync(file);
    if (!stat.isFile() || stat.size === 0 || stat.size > 10 * 1024 * 1024) throw new Error(`Article ${article.slug}: image must be a nonempty file of at most 10 MiB`);
    try {
      const image = sharp(file, { failOn: "warning", limitInputPixels: 25_000_000 });
      const metadata = await image.metadata();
      const expectedMediaType: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif" };
      if (metadata.mediaType !== expectedMediaType[extname(article.image.src)]) throw new Error("image type does not match its supported filename extension");
      if ((metadata.pages ?? 1) > 1) throw new Error("article images must contain a single static frame");
      // metadata() reads headers only. Full decoding is required to detect corrupt pixels.
      const { info } = await image.autoOrient().raw().toBuffer({ resolveWithObject: true });
      if (info.width !== article.image.width || info.height !== article.image.height) throw new Error(`image dimensions ${info.width}×${info.height} do not match declared ${article.image.width}×${article.image.height}`);
    } catch (error) {
      throw new Error(`Article ${article.slug}: invalid image (${error instanceof Error ? error.message : "decode failed"})`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  validateArticleRelease(ARTICLES);
  validateArticleLinks(ARTICLES);
  await validateArticleAssets(fileURLToPath(new URL("../public", import.meta.url)), ARTICLES);
  console.log(`Validated ${ARTICLES.length} published article(s) and their local images.`);
}
