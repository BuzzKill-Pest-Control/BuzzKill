import { isMigrationPreview } from "../shared/migrationPreview";
import { defineFunction } from "@aws-amplify/backend";

export const leadSweep = defineFunction({
  environment: { BUZZKILL_MIGRATION_PREVIEW: String(isMigrationPreview()) },
  name: "lead-sweep",
  entry: "./handler.ts",
  timeoutSeconds: 120,
  ...(isMigrationPreview() ? {} : { schedule: "0/15 * * * ? *" }),
});
