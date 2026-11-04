import { defineFunction } from "@aws-amplify/backend";
import { isMigrationPreview } from "../shared/migrationPreview";

export const customerSearchIndexer = defineFunction({
  name: "customer-search-indexer",
  entry: "./handler.ts",
  resourceGroupName: "data",
  timeoutSeconds: 120,
  environment: { BUZZKILL_MIGRATION_PREVIEW: String(isMigrationPreview()) },
});
