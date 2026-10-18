import { Link } from "react-router-dom";
import { ARTICLES, articleDate, articlePath, articleWordCount, type Article } from "../../lib/articles";

export default function BlogIndex({ articles = ARTICLES }: { articles?: readonly Article[] }) {
  return <>
    <section className="bk-section bk-section-dark bk-blog-hero">
      <div className="bk-container">
        <nav className="bk-blog-breadcrumb" aria-label="Breadcrumb"><Link to="/">Home</Link><span aria-hidden="true">/</span><span>Blog</span></nav>
        <div className="bk-blog-intro">
          <div><p className="bk-eyebrow">The BuzzKill Blog</p><h1 className="bk-h1-lower">Know more.<br /><span>Worry less.</span></h1></div>
          <p className="bk-body-lead">Practical reading for homeowners, community boards, and property managers. Understand pest problems and make informed decisions about your property.</p>
        </div>
        <p className="bk-blog-audience">Homes <span aria-hidden="true">/</span> Communities <span aria-hidden="true">/</span> Property managers</p>
      </div>
    </section>
    <section className="bk-section bk-section-cream" aria-labelledby="latest-articles">
      <div className="bk-container">
        <div className="bk-blog-section-heading"><div><p className="bk-eyebrow">From the field</p><h2 className="bk-h2" id="latest-articles">Latest articles</h2></div><span className="bk-blog-count">{articles.length} {articles.length === 1 ? "article" : "articles"}</span></div>
        {articles.length ? <div className="bk-article-grid">{articles.map((article) => <article className="bk-article-card" key={article.slug}>
          <Link to={articlePath(article)} className="bk-article-card-image" tabIndex={-1} aria-hidden="true"><img src={article.image.src} alt="" width={article.image.width} height={article.image.height} loading="lazy" /></Link>
          <div className="bk-article-card-content"><p className="bk-eyebrow">{article.topic}</p><h3><Link to={articlePath(article)}>{article.title}</Link></h3><p>{article.description}</p><div className="bk-article-meta"><time dateTime={article.publishedAt}>{articleDate(article.publishedAt)}</time><span>{Math.ceil(articleWordCount(article) / 220)} min read</span></div><Link to={articlePath(article)} className="bk-article-read">Read article <span aria-hidden="true">↗</span><span className="bk-blog-sr-only">: {article.title}</span></Link></div>
        </article>)}</div> : <div className="bk-blog-empty"><span className="bk-blog-empty-mark" aria-hidden="true">BK.</span><div><p className="bk-eyebrow">Good information starts here</p><h3>No articles published yet.</h3><p>While we get the blog ready, explore our pest control services or talk with our team about your property.</p><div className="bk-blog-actions"><Link to="/services/general-pest" className="bk-btn bk-btn-primary">Explore our services</Link><Link to="/contact" className="bk-article-read">Talk to BuzzKill <span aria-hidden="true">↗</span></Link></div></div></div>}
      </div>
    </section>
  </>;
}
