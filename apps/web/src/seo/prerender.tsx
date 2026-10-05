import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router-dom";
import AboutPage from "../pages/AboutPage";

/**
 * Build-only rendering of the existing About component. Its company/founder
 * copy and links have one source for both the initial HTML and the live app.
 * The client still mounts the normal app; this is not a separate hidden bio
 * or a hydration tree. Other routes retain their existing client rendering.
 */
export function renderRouteBody(path: string): string {
  if (path !== "/about") return "";
  return renderToStaticMarkup(
    <StaticRouter location={path}>
      <main id="main-content"><AboutPage /></main>
    </StaticRouter>,
  );
}
