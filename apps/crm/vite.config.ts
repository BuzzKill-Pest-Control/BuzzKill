import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const migrationPreview = process.env.BUZZKILL_MIGRATION_PREVIEW === "true";
const previewDefines = migrationPreview ? {
  "import.meta.env.VITE_GOOGLE_MAPS_API_KEY": JSON.stringify(""),
  "import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY": JSON.stringify(""),
  "import.meta.env.VITE_LEAD_INTAKE_URL": JSON.stringify(""),
  "import.meta.env.VITE_BOOKING_API_URL": JSON.stringify(""),
} : {};

export default defineConfig({
  // The default Stripe entrypoint loads its external script on import, even
  // without a key. The pure entrypoint waits for an explicit loadStripe call.
  resolve: { alias: migrationPreview ? [{ find: /^@stripe\/stripe-js$/, replacement: "@stripe/stripe-js/pure" }] : [] },
  define: {
    ...previewDefines,
    "import.meta.env.VITE_BUZZKILL_MIGRATION_PREVIEW": JSON.stringify(String(migrationPreview)),
  },
  plugins: [react()],
  server: { port: 5174 },
});
