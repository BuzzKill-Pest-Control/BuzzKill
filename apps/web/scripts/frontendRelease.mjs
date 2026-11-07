import { execFileSync } from "node:child_process";
import { readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { verifyRetainedBackend } from "./retainedBackend.mjs";
import { assertMigrationReleaseReady } from "./checkMigrationRelease.mjs";

const ACCOUNT = "743917687359";
const REGION = "us-east-1";
const WEB_APP = "d3owdoeg1om341";
const QA_BRANCH = "codex/browser-source-diagnostics";
const mappings = {
  main: { backend: "codex-buzzkill-account-migration", business: "main", preview: false },
  [QA_BRANCH]: { backend: "codex-buzzkill-staging-migration", business: "staging", preview: true },
};
const need = (ok) => { if (!ok) throw new Error("Frontend-only release does not match an approved read-only deployment context."); };

/** Bind Hosting to one existing backend; preview is a UI fence, not a backend change. */
export function frontendReleaseContext(env, phase = "prepare") {
  need(["prepare", "build"].includes(phase) && env.BUZZKILL_FRONTEND_ONLY_RELEASE === "true");
  const hosting = env.SENTRY_DEPLOYMENT_BRANCH;
  const mapping = Object.hasOwn(mappings, hosting ?? "") ? mappings[hosting] : undefined;
  need(mapping && env.AWS_APP_ID === WEB_APP && env.AWS_REGION === REGION
    && env.BUZZKILL_DESTINATION_ACCOUNT_ID === ACCOUNT
    && env.BUZZKILL_SOURCE_ENVIRONMENT === mapping.business
    && env.BUZZKILL_MIGRATION_PREVIEW === "false"
    && env.BUZZKILL_CUTOVER_PAUSED === "false" && env.BUZZKILL_WORKERS_PAUSED === "false"
    && env.BUZZKILL_PREVIEW_ADMIN_LOGIN === "false" && env.BUZZKILL_MIGRATION_BOOTSTRAP !== "true");
  need(phase === "prepare"
    ? env.AWS_BRANCH === hosting && env.BUZZKILL_BACKEND_BRANCH === mapping.backend
    : env.AWS_BRANCH === mapping.backend && env.BUZZKILL_BACKEND_BRANCH === undefined);
  if (mapping.preview) need(env.SENTRY_UPLOAD_SOURCEMAPS === "false");
  else need(env.VITE_BUZZKILL_MIGRATION_PREVIEW === undefined || env.VITE_BUZZKILL_MIGRATION_PREVIEW === "false");
  // Backend flags remain active. A separate client-only preview flag fences
  // integrations without changing backend flags or generated output metadata.
  const guardEnv = { ...env, AWS_BRANCH: mapping.backend };
  delete guardEnv.BUZZKILL_BACKEND_BRANCH;
  if (mapping.preview) delete guardEnv.SENTRY_AUTH_TOKEN;
  return { backendBranch: mapping.backend, preview: mapping.preview, guardEnv };
}

const readAws = (args) => JSON.parse(execFileSync("aws", [...args, "--region", REGION, "--output", "json"], {
  encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
}));
const readOutputs = () => JSON.parse(readFileSync(resolve("amplify_outputs.json"), "utf8"));
const run = (command, args, env) => execFileSync(command, args, { env, stdio: ["ignore", "pipe", "pipe"] });

export function prepareFrontendRelease(env, io = {}) {
  const context = frontendReleaseContext(env);
  const read = io.readAws ?? readAws;
  verifyRetainedBackend(context.guardEnv, read);
  // Never let a failed read reuse outputs from an earlier environment/build.
  (io.removeOutputs ?? (() => rmSync(resolve("amplify_outputs.json"), { force: true })))();
  (io.run ?? run)("npx", ["ampx", "generate", "outputs", "--app-id", WEB_APP, "--branch", context.backendBranch], context.guardEnv);
  assertMigrationReleaseReady(context.guardEnv, io.readOutputs ?? readOutputs);
  verifyRetainedBackend(context.guardEnv, read);
  return context.backendBranch;
}

export function buildFrontendRelease(env, io = {}) {
  const context = frontendReleaseContext(env, "build");
  verifyRetainedBackend(context.guardEnv, io.readAws ?? readAws);
  assertMigrationReleaseReady(context.guardEnv, io.readOutputs ?? readOutputs);
  // Normal npm prebuild still validates the canonical active backend context.
  // Only the isolated staging client's UI/integrations run in preview mode.
  (io.run ?? run)("npm", ["run", "build"], {
    ...context.guardEnv, VITE_BUZZKILL_MIGRATION_PREVIEW: String(context.preview),
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.argv.length === 2) {
      const backend = prepareFrontendRelease(process.env);
      console.error("Frontend-only retained outputs verified; no backend deployment was attempted.");
      process.stdout.write(backend + "\n");
    } else if (process.argv.length === 3 && process.argv[2] === "--build") {
      buildFrontendRelease(process.env);
      console.log("Frontend-only website build completed.");
    }
    else throw new Error("Unexpected frontend-only release arguments.");
  } catch {
    // CLI/SDK errors can contain environment values. No raw error or output
    // JSON is needed to explain that this read-only release must stop.
    console.error("Frontend-only release validation failed; no backend deployment was attempted.");
    process.exitCode = 1;
  }
}
