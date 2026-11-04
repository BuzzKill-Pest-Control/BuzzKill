import { initializeBrowserMonitoring } from "./browserMonitoring";

export function initializeMonitoring() {
  return initializeBrowserMonitoring({
    appId: "buzzkill-web",
    allowedHosts: ["pestbuzzkill.com", "www.pestbuzzkill.com"],
    routePatterns: [
      "/", "/quote", "/quote/instant", "/quote/contact-me", "/book", "/cancel", "/track/:token",
      "/lp/quote", "/lp/protect", "/lp/call", "/residential", "/communities", "/communities/common-areas",
      "/communities/in-unit", "/communities/hoa-resources", "/communities/for-owners", "/property-managers",
      "/services/general-pest", "/services/cockroach", "/services/flea-silverfish", "/services/wasp-hornet-bee",
      "/services/rodent-control", "/services/rodent-control/entry-sealing", "/services/rodent-control/attic",
      "/services/rodent-control/attic-restoration", "/services/mosquito-tick", "/services/mosquito-tick/tick",
      "/services/termite", "/services/termite/treatment", "/services/termite/wood-boring", "/services/wildlife",
      "/services/wildlife/humane-removal", "/about", "/service-areas", "/reviews", "/careers", "/contact",
      "/blog", "/blog/:slug", "/condo-services", "/in-unit-services", "/licensed-insured", "/privacy-policy",
      "/terms-of-service", "/pest-control/:slug", "/locations/massachusetts", "/locations/rhode-island",
    ],
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    productionBuild: import.meta.env.PROD,
    preview: import.meta.env.VITE_BUZZKILL_MIGRATION_PREVIEW === "true",
  });
}
