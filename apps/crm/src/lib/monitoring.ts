import { initializeBrowserMonitoring } from "../../../web/src/lib/browserMonitoring";
export { captureRenderFailure } from "../../../web/src/lib/browserMonitoring";

export function initializeMonitoring() {
  return initializeBrowserMonitoring({
    appId: "buzzkill-crm",
    allowedHosts: ["app.pestbuzzkill.com"],
    routePatterns: [
      "/", "/welcome", "/dashboard", "/work", "/visit-changes", "/leads", "/customers", "/search",
      "/customers/:id", "/groups/:id", "/schedule", "/pricing", "/products", "/inventory", "/product-usage",
      "/market-rates", "/catalog", "/staff", "/promo-codes", "/tech", "/tech/job/:jobId", "/portal",
      "/portal/docs", "/portal/billing", "/portal/requests", "/portal/add-service", "/portal/group", "/more",
    ],
    dsn: import.meta.env.VITE_SENTRY_DSN,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    productionBuild: import.meta.env.PROD,
    preview: import.meta.env.VITE_BUZZKILL_MIGRATION_PREVIEW === "true",
  });
}
