import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Both apps must consume outputs from the completed second-phase backend. */
export function assertMigrationReleaseReady(env, readOutputs) {
  if (env.BUZZKILL_MIGRATION_BOOTSTRAP === "true") {
    throw new Error("Migration bootstrap cannot publish a frontend. Deploy the full preview API first.");
  }
  const preview = env.BUZZKILL_MIGRATION_PREVIEW === "true";
  let outputs;
  try {
    outputs = readOutputs();
  } catch (error) {
    if (preview) throw error;
    return;
  }
  if (outputs?.custom?.migrationApiReady === false) {
    throw new Error("Migration preview API is not complete. Deploy the full backend before publishing either app.");
  }
  if (!preview) {
    if (outputs?.custom?.migrationPreview === true) {
      throw new Error("A migration preview backend requires a migration preview frontend build.");
    }
    return;
  }
  if (outputs?.custom?.migrationPreview !== true || outputs?.custom?.migrationApiReady !== true) {
    throw new Error("Migration preview API is not complete. Wait for the full backend deployment before publishing either app.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assertMigrationReleaseReady(process.env, () =>
    JSON.parse(readFileSync(resolve("amplify_outputs.json"), "utf8"))
  );
}
