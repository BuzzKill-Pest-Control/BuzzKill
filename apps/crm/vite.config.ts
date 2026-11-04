import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { createMonitoringBuild } from "../../monitoring/build.mjs";

const migrationPreview = process.env.BUZZKILL_MIGRATION_PREVIEW === "true" || process.env.BUZZKILL_CUTOVER_PAUSED === "true";
const previewDefines = migrationPreview ? {
  "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(""),
  "import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY": JSON.stringify(""),
  "import.meta.env.VITE_LEAD_INTAKE_URL": JSON.stringify(""),
  "import.meta.env.VITE_BOOKING_API_URL": JSON.stringify(""),
} : {};

export default defineConfig(({ command, mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  const monitoring = createMonitoringBuild({
    env, command,
    branch: env.SENTRY_DEPLOYMENT_BRANCH || env.BUZZKILL_SOURCE_ENVIRONMENT || env.AWS_BRANCH,
    preview: migrationPreview,
    expectedProject: "buzzkill-crm",
    sentryPlugin: sentryVitePlugin,
  });
  return {
    define: {
      ...previewDefines,
      ...monitoring.define,
      "import.meta.env.VITE_BUZZKILL_PREVIEW_ADMIN_LOGIN": JSON.stringify(String(migrationPreview && process.env.BUZZKILL_PREVIEW_ADMIN_LOGIN === "true")),
      "import.meta.env.VITE_BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL": JSON.stringify(process.env.BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL ?? ""),
      "import.meta.env.VITE_BUZZKILL_MIGRATION_PREVIEW": JSON.stringify(String(migrationPreview)),
    },
    build: monitoring.build,
    plugins: [react(), ...monitoring.plugins],
    server: { port: 5174 },
  };
});
