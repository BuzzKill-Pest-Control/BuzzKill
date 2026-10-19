import { isArticleLink, type Article, type ArticleInline } from "../../lib/articles";

function Prose({ content }: { content: ArticleInline[] }) {
  return <>{content.map((segment, index) => segment.href && isArticleLink(segment.href)
    ? <a key={index} href={segment.href} rel={segment.href.startsWith("https:") ? "noopener noreferrer" : undefined}>{segment.text}</a>
    : <span key={index}>{segment.text}</span>)}</>;
}

/** Text-only React rendering is shared by the browser and static build. */
export default function ArticleBody({ article }: { article: Article }) {
  return <div className="bk-article-prose">
    {article.body.map((block, index) => {
      if (block.type === "heading") return <h2 key={index} id={block.id}>{block.text}</h2>;
      if (block.type === "paragraph") return <p key={index}><Prose content={block.content} /></p>;
      const List = block.ordered ? "ol" : "ul";
      return <List key={index}>{block.items.map((item, i) => <li key={i}><Prose content={item} /></li>)}</List>;
    })}
    <section className="bk-article-sources" aria-labelledby="article-sources">
      <h2 id="article-sources">Sources &amp; further reading</h2>
      <ol>{article.sources.map((source) => <li key={source.url}><a href={source.url} rel="noopener noreferrer">{source.title}</a></li>)}</ol>
    </section>
  </div>;
}
