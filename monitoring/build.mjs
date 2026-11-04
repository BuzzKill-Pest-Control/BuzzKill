import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const AUTH_TOKEN_SENTINEL = "SENTRY_AUTH_TOKEN_MUST_NOT_SHIP";

const slug = /^[a-z0-9][a-z0-9._-]{0,79}$/;
const commit = /^[a-f0-9]{40}$/i;
const fail = (message) => { throw new Error(`Monitoring build: ${message}`); };

function publicDsn(value) {
  try {
    const dsn = new URL(value);
    return dsn.protocol === "https:" && /^[a-f0-9]{16,64}$/i.test(dsn.username) &&
      !dsn.password && /^o\d+\.ingest(?:\.[a-z0-9-]+)?\.sentry\.io$/i.test(dsn.hostname) &&
      !dsn.port && /^\/\d+$/.test(dsn.pathname) && !dsn.search && !dsn.hash;
  } catch { return false; }
}

function rejectPublicCredentials(env) {
  for (const [name, value] of Object.entries(env)) {
    if (!name.startsWith("VITE_")) continue;
    if ((/SENTRY/i.test(name) && /TOKEN|SECRET/i.test(name)) ||
        (env.SENTRY_AUTH_TOKEN && value?.includes(env.SENTRY_AUTH_TOKEN))) {
      fail("a private Sentry credential must not use a VITE_ variable");
    }
  }
}

/** Apps inject their installed plugin, so this helper has no root package dependencies. */
export function createMonitoringBuild({
  env = process.env, command, branch, preview = false, expectedProject, sentryPlugin,
  readCommit = () => execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8", stdio: ["ignore", "pipe", "ignore"],
  }).trim(),
}) {
  rejectPublicCredentials(env);
  const disabled = {
    define: {
      "import.meta.env.VITE_SENTRY_DSN": JSON.stringify(""),
      "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(""),
    },
    build: { sourcemap: false },
    plugins: [],
  };
  // An app-wide Hosting variable can also be inherited by staging/preview jobs.
  // Only an explicit production CI build may send code or browser telemetry.
  const deploymentBranch = env.SENTRY_DEPLOYMENT_BRANCH || branch;
  if (command !== "build" || preview || deploymentBranch !== "main" || env.SENTRY_UPLOAD_SOURCEMAPS !== "true") {
    return disabled;
  }
  if (env.CI !== "true" && !env.AWS_APP_ID) fail("production uploads require CI");
  if (!slug.test(expectedProject ?? "") || env.SENTRY_PROJECT !== expectedProject) {
    fail("SENTRY_PROJECT must match this app's configured project");
  }
  if (!slug.test(env.SENTRY_ORG ?? "")) fail("SENTRY_ORG is missing or invalid");
  if (!env.SENTRY_AUTH_TOKEN || /\s/.test(env.SENTRY_AUTH_TOKEN)) fail("SENTRY_AUTH_TOKEN is missing or invalid");
  if (!publicDsn(env.VITE_SENTRY_DSN)) fail("VITE_SENTRY_DSN is missing or invalid");
  let sha;
  try { sha = readCommit(); }
  catch { fail("the source commit could not be determined"); }
  if (!commit.test(sha ?? "")) fail("the source commit must be a full Git SHA");
  if (env.AWS_COMMIT_ID && (!commit.test(env.AWS_COMMIT_ID) || env.AWS_COMMIT_ID.toLowerCase() !== sha.toLowerCase())) {
    fail("AWS_COMMIT_ID must match the checked-out source commit");
  }
  const release = `${expectedProject}@${sha.toLowerCase()}`;
  let plugin;
  try { plugin = sentryPlugin({
    org: env.SENTRY_ORG,
    project: expectedProject,
    authToken: env.SENTRY_AUTH_TOKEN,
    telemetry: false,
    silent: true,
    debug: false,
    release: { name: release, inject: true, create: true, finalize: true, setCommits: false, deploy: false },
    sourcemaps: { assets: ["./dist/**"], filesToDeleteAfterUpload: ["./dist/**/*.map"] },
    // Never turn an upload failure into a successful but unreadable release, or
    // echo SDK/HTTP exception details that could contain a CI credential.
    errorHandler: () => fail("source-map upload failed"),
  }); } catch { fail("source-map uploader could not be configured"); }
  return {
    define: {
      "import.meta.env.VITE_SENTRY_DSN": JSON.stringify(env.VITE_SENTRY_DSN),
      "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(release),
    },
    build: { sourcemap: "hidden" },
    plugins: Array.isArray(plugin) ? plugin : [plugin],
  };
}

/** Run after the complete build, before the output directory is handed to Hosting. */
export async function assertPrivateArtifacts(directory, { authToken = process.env.SENTRY_AUTH_TOKEN } = {}) {
  const secrets = [AUTH_TOKEN_SENTINEL, authToken].filter(Boolean).map((s) => Buffer.from(s));
  let files = 0;
  const walk = async (path) => {
    for (const entry of await readdir(path, { withFileTypes: true })) {
      const target = resolve(path, entry.name);
      if (entry.isSymbolicLink()) fail("hosting artifacts contain an unexpected symbolic link");
      if (entry.isDirectory()) { await walk(target); continue; }
      if (!entry.isFile()) continue;
      if (/\.map(?:\.(?:gz|br))?$/i.test(entry.name)) fail("hosting artifacts contain a private source map");
      const contents = await readFile(target);
      if (secrets.some((secret) => contents.includes(secret))) fail("hosting artifacts contain a private credential");
      if (/\.(?:[cm]?js|css|html)$/i.test(entry.name) &&
          /(?:\/\/[#@]|\/\*[#@])\s*sourceMappingURL\s*=/.test(contents.toString("utf8"))) {
        fail("hosting artifacts contain a source-map URL comment");
      }
      files++;
    }
  };
  await walk(resolve(directory));
  if (!files) fail("hosting artifacts are empty");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 4 || process.argv[2] !== "--assert-artifacts") {
    console.error("Usage: node monitoring/build.mjs --assert-artifacts <dist>");
    process.exitCode = 1;
  } else {
    try { await assertPrivateArtifacts(process.argv[3]); }
    catch {
      console.error("Monitoring artifact verification failed: private maps, map references, credentials, or invalid artifacts.");
      process.exitCode = 1;
    }
  }
}
