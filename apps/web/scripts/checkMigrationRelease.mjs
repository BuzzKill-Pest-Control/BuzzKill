import process from "node:process";
import { retainedBackendBranch } from "./retainedBackend.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

/** Both apps must consume outputs from the same complete, account-bound backend. */
export function assertMigrationReleaseReady(env, readOutputs) {
  if (env.BUZZKILL_MIGRATION_BOOTSTRAP === "true") {
    throw new Error("Migration bootstrap cannot publish a frontend. Deploy the full preview API first.");
  }
  const preview = env.BUZZKILL_MIGRATION_PREVIEW === "true";
  const destination = ["d3owdoeg1om341", "d2y2zigtl5rx3"].includes(env.AWS_APP_ID);
  let outputs;
  try { outputs = readOutputs(); } catch (error) {
    if (preview || destination) throw error;
    return;
  }
  if (outputs?.custom?.migrationApiReady === false) {
    throw new Error("Migration preview API is not complete. Deploy the full backend before publishing either app.");
  }
  if (!preview && outputs?.custom?.migrationPreview === true) {
    throw new Error("A migration preview backend requires a migration preview frontend build.");
  }
  if (!preview && !destination) return;
  const bindings = {
    "codex-buzzkill-account-migration": { pool: "us-east-1_NT4TiB2DQ", environment: "main" },
    "codex-buzzkill-staging-migration": { pool: "us-east-1_CyX0nNTre", environment: "staging" },
  };
  const branch = retainedBackendBranch(env);
  const expected = Object.hasOwn(bindings, branch ?? "") ? bindings[branch] : undefined;
  if (!destination || env.BUZZKILL_DESTINATION_ACCOUNT_ID !== "743917687359" || !expected ||
      (env.AWS_APP_ID === "d2y2zigtl5rx3" && env.BUZZKILL_BACKEND_APP_ID !== "d3owdoeg1om341") ||
      (!preview && env.BUZZKILL_SOURCE_ENVIRONMENT !== expected.environment) ||
      outputs?.auth?.user_pool_id !== expected.pool ||
      outputs?.custom?.migrationBackendAppId !== "d3owdoeg1om341" ||
      outputs?.custom?.migrationBackendBranch !== branch ||
      outputs?.custom?.migrationAccountId !== "743917687359") {
    throw new Error("Migration outputs do not match the exact destination backend and business environment.");
  }
  if ((outputs?.custom?.migrationCutoverPaused ?? false) !== (env.BUZZKILL_CUTOVER_PAUSED === "true")) {
    throw new Error("Cutover pause mode does not match this frontend build.");
  }
  if (outputs?.custom?.migrationPreview !== preview || outputs?.custom?.migrationApiReady !== true) {
    throw new Error("Migration API mode is not complete or does not match this frontend build.");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assertMigrationReleaseReady(process.env, () =>
    JSON.parse(readFileSync(resolve("amplify_outputs.json"), "utf8"))
  );
}
