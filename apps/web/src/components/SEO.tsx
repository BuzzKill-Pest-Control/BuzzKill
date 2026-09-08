/**
 * The document head, managed from the route.
 *
 * `SiteHead` sits once in App.tsx, inside the router. On every navigation it
 * resolves the path against the route registry (src/seo/pages.ts) and writes
 * the title, description, robots directive, self-referential canonical, Open
 * Graph and Twitter tags, and the page-level JSON-LD graph. A page never has
 * to remember to do this, and every page gets the same rules.
 *
 * `SEO` is the per-page override: a booking step that wants its own title, or
 * a private state that must be noindex. It registers overrides in context and
 * `SiteHead` merges them, so the order in which effects fire cannot leave a
 * stale title behind.
 *
 * The site-level entity graph (Organization, Person, WebSite) is NOT written
 * here: it ships in the static HTML shell for every route (see vite.config.ts)
 * so the business identity is present before any script runs.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { COMPANY } from "../../amplify/functions/shared/company";
import { normalizePath } from "../seo/canonical";
import { computeHead, type HeadOverrides, type HeadState } from "../seo/head";
import { resolvePage } from "../seo/pages";

type HeadContextValue = {
  overrides: HeadOverrides;
  setOverrides: (next: HeadOverrides | null) => void;
};

const HeadContext = createContext<HeadContextValue | null>(null);

/**
 * True when the HTML this document booted from was marked noindex: the staging
 * build stamps every page that way (amplify.yml), and the client must never
 * flip a deployment's own rule back to index.
 */
const BUILD_NOINDEX: boolean = (() => {
  try {
    const el = document.querySelector('meta[name="robots"]');
    return /noindex/i.test(el?.getAttribute("content") ?? "");
  } catch {
    return false;
  }
})();

export function HeadProvider({ children }: { children: ReactNode }) {
  const [overrides, setState] = useState<HeadOverrides>({});
  const value = useMemo<HeadContextValue>(
    () => ({
      overrides,
      setOverrides: (next) => setState(next ?? {}),
    }),
    [overrides],
  );
  return <HeadContext.Provider value={value}>{children}</HeadContext.Provider>;
}

function setMeta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const PAGE_JSON_LD_ID = "bk-jsonld";

function setPageJsonLd(json: string) {
  let el = document.getElementById(PAGE_JSON_LD_ID) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = PAGE_JSON_LD_ID;
    el.type = "application/ld+json";
    document.head.appendChild(el);
  }
  el.textContent = json;
}

/** Write a computed head into the live document. */
function applyHead(head: HeadState): void {
  document.title = head.title;
  setMeta("name", "description", head.description);
  setMeta("name", "robots", head.robots);
  setCanonical(head.canonicalUrl);

  setMeta("property", "og:type", head.ogType);
  setMeta("property", "og:site_name", COMPANY.name);
  setMeta("property", "og:locale", "en_US");
  setMeta("property", "og:title", head.title);
  setMeta("property", "og:description", head.description);
  setMeta("property", "og:url", head.canonicalUrl);
  setMeta("property", "og:image", head.image);
  if (head.imageSize) {
    setMeta("property", "og:image:width", String(head.imageSize.width));
    setMeta("property", "og:image:height", String(head.imageSize.height));
  } else {
    document.head.querySelector('meta[property="og:image:width"]')?.remove();
    document.head.querySelector('meta[property="og:image:height"]')?.remove();
  }

  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", head.title);
  setMeta("name", "twitter:description", head.description);
  setMeta("name", "twitter:image", head.image);

  setPageJsonLd(head.jsonLd);
}

/**
 * Route-driven head management plus URL normalisation. Render once, inside
 * the router and inside HeadProvider.
 */
export function SiteHead() {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const ctx = useContext(HeadContext);
  const overrides = ctx?.overrides;

  // A published page reached by a non-canonical spelling of its own URL
  // (trailing slash, upper case, /index.html) is moved to the canonical one,
  // so the address bar, the canonical tag, and the sitemap agree. Aliases
  // that render another page are redirected by App.tsx; the two quote doors
  // keep their own URLs on purpose.
  useEffect(() => {
    const normalized = normalizePath(pathname);
    if (normalized !== pathname && resolvePage(normalized)) {
      navigate(`${normalized}${search}${hash}`, { replace: true });
    }
  }, [pathname, search, hash, navigate]);

  useEffect(() => {
    applyHead(computeHead(pathname, overrides ?? {}, BUILD_NOINDEX));
  }, [pathname, overrides]);

  return null;
}

/**
 * Per-page overrides. Everything a page does not set comes from the registry.
 * Mount it anywhere below HeadProvider; the overrides clear on unmount.
 */
export default function SEO({ title, description, image, noindex }: HeadOverrides) {
  const ctx = useContext(HeadContext);
  const setOverrides = ctx?.setOverrides;
  useEffect(() => {
    setOverrides?.({ title, description, image, noindex });
    return () => setOverrides?.(null);
  }, [setOverrides, title, description, image, noindex]);
  return null;
}
