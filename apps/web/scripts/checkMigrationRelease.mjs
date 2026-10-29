import process from "node:process";
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
  const pools = {
    "codex-buzzkill-account-migration": "us-east-1_NT4TiB2DQ",
    "codex-buzzkill-staging-migration": "us-east-1_CyX0nNTre",
  };
  const branch = env.AWS_BRANCH;
  if (env.BUZZKILL_DESTINATION_ACCOUNT_ID !== "743917687359" ||
      !["d3owdoeg1om341", "d2y2zigtl5rx3"].includes(env.AWS_APP_ID) ||
      !Object.hasOwn(pools, branch ?? "") ||
      outputs?.auth?.user_pool_id !== pools[branch] ||
      outputs?.custom?.migrationBackendAppId !== "d3owdoeg1om341" ||
      outputs?.custom?.migrationBackendBranch !== branch ||
      outputs?.custom?.migrationAccountId !== "743917687359") {
    throw new Error("Migration preview outputs do not match the exact destination backend.");
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
