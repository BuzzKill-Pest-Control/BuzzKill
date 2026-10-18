import collection from "../content/articles/articles.json";
import { COMPANY } from "../../amplify/functions/shared/company";

export type ArticleInline = { text: string; href?: string };
export type ArticleBlock =
  | { type: "paragraph"; content: ArticleInline[] }
  | { type: "heading"; text: string; id: string }
  | { type: "list"; items: ArticleInline[][]; ordered?: boolean };
export type Article = {
  slug: string;
  title: string;
  description: string;
  topic: string;
  author: string;
  publishedAt: string;
  updatedAt?: string;
  image: { src: string; alt: string; width: number; height: number; credit: string; sourceUrl: string };
  body: ArticleBlock[];
  sources: { title: string; url: string }[];
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const fail = (message: string): never => { throw new Error(`Article content: ${message}`); };
const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fail("expected an object");
  return value as Record<string, unknown>;
};
function keys(value: Record<string, unknown>, allowed: string[]) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) fail(`unsupported field ${key}`);
}
function text(value: unknown, label: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value !== value.trim() || value.length > max || [...value].some((c) => c.charCodeAt(0) < 32 && ![9, 10, 13].includes(c.charCodeAt(0)))) return fail(`invalid ${label}`);
  return value;
}
/** Links are prose data, never HTML, embeds, protocols, or protocol-relative URLs. */
export function isArticleLink(value: unknown): value is string {
  if (typeof value !== "string" || /[\s\\<>"'`]/.test(value)) return false;
  if (/^\/(?!\/)[a-z0-9/-]*(?:#[a-z0-9-]+)?$/.test(value) && !value.includes("..")) return true;
  try {
    if (!value.startsWith("https://")) return false;
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch { return false; }
}
function link(value: unknown): string {
  if (!isArticleLink(value)) return fail("links must be local paths or credential-free HTTPS URLs");
  return value;
}
function inline(value: unknown): ArticleInline[] {
  if (!Array.isArray(value) || !value.length || value.length > 200) return fail("invalid paragraph content");
  return value.map((entry) => {
    const v = object(entry);
    keys(v, ["text", "href"]);
    // Inline segments can intentionally carry leading/trailing spaces.
    if (typeof v.text !== "string" || !v.text.trim() || v.text.length > 15000) return fail("invalid prose");
    return { text: v.text, ...(v.href === undefined ? {} : { href: link(v.href) }) };
  });
}
function date(value: unknown, label: string, now: number): string {
  const s = text(value, label);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2})$/.test(s) || !Number.isFinite(Date.parse(s)) || Date.parse(s) > now) return fail(`${label} must be a released timestamp with timezone`);
  // Date.parse normalizes dates such as February 30; reject those explicitly.
  const day = s.slice(0, 10);
  if (new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) !== day) return fail(`invalid ${label}`);
  return s;
}
export function articleText(article: Pick<Article, "body">): string {
  return article.body.map((block) => block.type === "heading" ? block.text : block.type === "paragraph" ? block.content.map((s) => s.text).join("") : block.items.map((item) => item.map((s) => s.text).join("")).join(" ")).join(" ");
}
export function articleWordCount(article: Pick<Article, "body">): number {
  return articleText(article).match(/\S+/g)?.length ?? 0;
}
/** Fail the build on malformed, duplicate, unsafe or unreleased public content. */
export function validateArticles(input: unknown, now = Date.now()): Article[] {
  if (!Array.isArray(input)) return fail("collection must be an array");
  const slugs = new Set<string>();
  const articles = input.map((entry): Article => {
    const v = object(entry);
    keys(v, ["slug", "title", "description", "topic", "author", "publishedAt", "updatedAt", "image", "body", "sources"]);
    const slug = text(v.slug, "slug", 100);
    if (!SLUG.test(slug) || slugs.has(slug)) return fail(`invalid or duplicate slug ${slug}`);
    slugs.add(slug);
    const image = object(v.image);
    keys(image, ["src", "alt", "width", "height", "credit", "sourceUrl"]);
    if (typeof image.src !== "string" || !new RegExp(`^/images/blog/${slug}/[a-z0-9-]+\\.(?:webp|jpg|jpeg|png|avif)$`).test(image.src)) return fail("image must be an article-scoped local raster asset");
    if (!Number.isInteger(image.width) || !Number.isInteger(image.height) || Number(image.width) < 1 || Number(image.height) < 1 || Number(image.width) > 10000 || Number(image.height) > 10000) return fail("invalid image dimensions");
    if (!Array.isArray(v.body) || !v.body.length || v.body.length > 200) return fail("invalid body");
    const headingIds = new Set<string>();
    const body = v.body.map((block): ArticleBlock => {
      const b = object(block);
      if (b.type === "paragraph") { keys(b, ["type", "content"]); return { type: "paragraph", content: inline(b.content) }; }
      if (b.type === "heading") {
        keys(b, ["type", "text", "id"]);
        const id = text(b.id, "heading id", 100);
        if (!SLUG.test(id) || headingIds.has(id) || ["article-title", "article-sources", "article-contents", "main-content"].includes(id)) return fail("invalid or duplicate heading id");
        headingIds.add(id);
        return { type: "heading", text: text(b.text, "heading", 200), id };
      }
      if (b.type === "list") {
        keys(b, ["type", "items", "ordered"]);
        if (!Array.isArray(b.items) || !b.items.length || b.items.length > 100 || (b.ordered !== undefined && typeof b.ordered !== "boolean")) return fail("invalid list");
        return { type: "list", items: b.items.map(inline), ordered: b.ordered as boolean | undefined };
      }
      return fail("only paragraph, heading and list blocks are supported");
    });
    if (!headingIds.size) return fail("at least one heading is required");
    if (!Array.isArray(v.sources) || !v.sources.length || v.sources.length > 50) return fail("supporting sources are required");
    const sources = v.sources.map((source) => { const s = object(source); keys(s, ["title", "url"]); const url = link(s.url); if (!url.startsWith("https://")) fail("sources must use HTTPS"); return { title: text(s.title, "source title"), url }; });
    const publishedAt = date(v.publishedAt, "publishedAt", now);
    if (v.author !== COMPANY.name) return fail(`author must use the company editorial byline (${COMPANY.name})`);
    const updatedAt = v.updatedAt === undefined ? undefined : date(v.updatedAt, "updatedAt", now);
    if (updatedAt && Date.parse(updatedAt) < Date.parse(publishedAt)) return fail("updatedAt cannot precede publication");
    const article: Article = {
      slug, title: text(v.title, "title", 90), description: text(v.description, "description", 200),
      topic: text(v.topic, "topic", 70), author: text(v.author, "author", 100), publishedAt, ...(updatedAt ? { updatedAt } : {}),
      image: { src: image.src, alt: text(image.alt, "image alternative text", 300), width: Number(image.width), height: Number(image.height), credit: text(image.credit, "image credit"), sourceUrl: link(image.sourceUrl) },
      body, sources,
    };
    const count = articleWordCount(article);
    if (count < 1000 || count > 2000) return fail(`${slug} must contain 1,000–2,000 words`);
    return article;
  });
  return articles.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt) || a.slug.localeCompare(b.slug));
}

export const ARTICLES: readonly Article[] = validateArticles(collection);
export function findArticle(slug: string, articles: readonly Article[] = ARTICLES): Article | undefined {
  return articles.find((article) => article.slug === slug);
}
export function articlePath(article: Pick<Article, "slug">): string { return `/blog/${article.slug}`; }
export function articleDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "America/New_York" });
}
