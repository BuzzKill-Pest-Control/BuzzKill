import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import AboutPage from "../pages/AboutPage";
import BlogIndex from "../pages/blog/BlogIndex";
import BlogArticle from "../pages/blog/BlogArticle";
import { Route, Routes } from "react-router-dom";

/**
 * Build-only rendering of the existing About component. Its company/founder
 * copy and links have one source for both the initial HTML and the live app.
 * The client still mounts the normal app; this is not a separate hidden bio
 * or a hydration tree. Blog routes also ship the full shared article body.
 */
export function renderRouteBody(path: string): string {
  if (path !== "/about" && path !== "/blog" && !path.startsWith("/blog/")) return "";
  return renderToStaticMarkup(
    <StaticRouter location={path}>
      <main id="main-content"><Routes>
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogIndex />} />
        <Route path="/blog/:slug" element={<BlogArticle />} />
      </Routes></main>
    </StaticRouter>,
  );
}
