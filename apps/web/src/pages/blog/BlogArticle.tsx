import { Link, useParams } from "react-router-dom";
import ArticleBody from "../../components/articles/ArticleBody";
import { ARTICLES, articleDate, articleWordCount, findArticle, type Article } from "../../lib/articles";
import NotFound from "../NotFound";

/** Exported view allows the build and browser to render the identical article. */
export function ArticlePage({ article }: { article: Article }) {
  const headings = article.body.filter((block) => block.type === "heading");
  return <article aria-labelledby="article-title">
    <header className="bk-section bk-section-dark bk-article-header"><div className="bk-container bk-article-width">
      <nav className="bk-blog-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><Link to="/blog">Blog</Link><span aria-hidden="true">/</span><span aria-current="page">Article</span></nav>
      <p className="bk-eyebrow">{article.topic}</p><h1 className="bk-h1-lower" id="article-title">{article.title}</h1><p className="bk-body-lead">{article.description}</p>
      <div className="bk-article-meta"><span>By {article.author}</span><time dateTime={article.publishedAt}>{articleDate(article.publishedAt)}</time><span>{Math.ceil(articleWordCount(article) / 220)} min read</span></div>
      {article.updatedAt && <p className="bk-article-updated">Updated <time dateTime={article.updatedAt}>{articleDate(article.updatedAt)}</time></p>}
    </div></header>
    <div className="bk-section bk-section-cream"><div className="bk-container bk-article-width">
      <figure className="bk-article-figure"><img src={article.image.src} alt={article.image.alt} width={article.image.width} height={article.image.height} /><figcaption>Image: <a href={article.image.sourceUrl} rel="noopener noreferrer">{article.image.credit}</a></figcaption></figure>
      <nav className="bk-article-contents" aria-labelledby="article-contents"><p className="bk-eyebrow" id="article-contents">In this article</p><ul>{headings.map((heading) => <li key={heading.id}><a href={`#${heading.id}`}>{heading.text}</a></li>)}<li><a href="#article-sources">Sources &amp; further reading</a></li></ul></nav>
      <ArticleBody article={article} />
      <div className="bk-article-end"><Link to="/blog" className="bk-article-read"><span aria-hidden="true">←</span> All articles</Link><Link to="/contact" className="bk-btn bk-btn-primary">Ask about your property</Link></div>
    </div></div>
  </article>;
}

export default function BlogArticle({ articles = ARTICLES }: { articles?: readonly Article[] }) {
  const { slug = "" } = useParams();
  const article = findArticle(slug, articles);
  return article ? <ArticlePage article={article} /> : <NotFound />;
}
