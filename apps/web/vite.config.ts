import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { renderShellHead } from './src/seo/shell'

/**
 * Injects the static <head> into index.html at the `<!--bk:head-->` marker:
 * the home page's title and description as the site default, Open Graph and
 * Twitter defaults, and the site-wide JSON-LD entity graph (Organization,
 * founder, WebSite). It runs for `vite dev` and `vite build`, so the served
 * HTML always carries the business identity before any script executes.
 * Route-specific tags (canonical, og:url, page JSON-LD) are written by the
 * client head manager, and by scripts/postbuild.mts when prerendering.
 */
function shellHead(): Plugin {
  return {
    name: 'bk-shell-head',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!html.includes('<!--bk:head-->')) {
          throw new Error('index.html is missing the <!--bk:head--> marker')
        }
        const rendered = html.replace('<!--bk:head-->', renderShellHead())
        return process.env.BUZZKILL_MIGRATION_PREVIEW === "true"
          ? rendered.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, (script) =>
              /googletagmanager|clarity\.ms/.test(script) ? "" : script)
          : rendered
      },
    },
  }
}

const migrationPreview = process.env.BUZZKILL_MIGRATION_PREVIEW === "true";
const previewDefines = migrationPreview ? {
  "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(""),
  "import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY": JSON.stringify(""),
  "import.meta.env.VITE_LEAD_INTAKE_URL": JSON.stringify(""),
  "import.meta.env.VITE_BOOKING_API_URL": JSON.stringify(""),
} : {};

// https://vitejs.dev/config/
export default defineConfig({
  // The default Stripe entrypoint loads its external script on import, even
  // without a key. The pure entrypoint waits for an explicit loadStripe call.
  resolve: { alias: migrationPreview ? [{ find: /^@stripe\/stripe-js$/, replacement: "@stripe/stripe-js/pure" }] : [] },
  define: {
    ...previewDefines,
    "import.meta.env.VITE_BUZZKILL_MIGRATION_PREVIEW": JSON.stringify(String(migrationPreview)),
  },
  plugins: [react(), shellHead()],
  server: {
    watch: {
      // Plain glob (no path.resolve) — chokidar treats backslashes as glob
      // escapes, so a Windows-style resolved path never matches here.
      ignored: ['**/creative/**'],
    },
  },
})
