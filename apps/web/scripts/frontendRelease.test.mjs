import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtempSync, readFileSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { frontendReleaseContext, prepareFrontendRelease, buildFrontendRelease } from "./frontendRelease.mjs";

const main = "codex-buzzkill-account-migration", staging = "codex-buzzkill-staging-migration";
const roots = {
  [main]: "arn:aws:cloudformation:us-east-1:743917687359:stack/amplify-d3owdoeg1om341-codexbuzzkillaccountmigration-branch-9b29de27ce/cf4d7e90-be8b-11f1-b0a8-0afff64fb7bb",
  [staging]: "arn:aws:cloudformation:us-east-1:743917687359:stack/amplify-d3owdoeg1om341-codexbuzzkillstagingmigration-branch-c439abc121/0e0d0830-be8c-11f1-a7fc-127661e772a7",
};
const production = { AWS_APP_ID: "d3owdoeg1om341", AWS_BRANCH: "main", AWS_REGION: "us-east-1",
  SENTRY_DEPLOYMENT_BRANCH: "main", BUZZKILL_FRONTEND_ONLY_RELEASE: "true", BUZZKILL_BACKEND_BRANCH: main,
  BUZZKILL_SOURCE_ENVIRONMENT: "main", BUZZKILL_DESTINATION_ACCOUNT_ID: "743917687359", BUZZKILL_MIGRATION_PREVIEW: "false",
  BUZZKILL_CUTOVER_PAUSED: "false", BUZZKILL_WORKERS_PAUSED: "false", BUZZKILL_PREVIEW_ADMIN_LOGIN: "false" };
const qa = { ...production, AWS_BRANCH: "codex/browser-source-diagnostics", SENTRY_DEPLOYMENT_BRANCH: "codex/browser-source-diagnostics",
  BUZZKILL_BACKEND_BRANCH: staging, BUZZKILL_SOURCE_ENVIRONMENT: "staging", SENTRY_UPLOAD_SOURCEMAPS: "false" };
function outputs(branch = main) {
  return { auth: { user_pool_id: branch === main ? "us-east-1_NT4TiB2DQ" : "us-east-1_CyX0nNTre" }, custom: {
    migrationBackendAppId: "d3owdoeg1om341", migrationBackendBranch: branch, migrationAccountId: "743917687359",
    migrationApiReady: true, migrationPreview: false, migrationCutoverPaused: false,
  } };
}
function fixture(branch = main, patch = {}) {
  const calls = [];
  const io = { readAws(args) {
    calls.push(["aws", ...args]);
    if (args[0] === "sts") return { Account: "743917687359" };
    assert.equal(args[0], "cloudformation"); assert.equal(args[1], "describe-stacks"); assert.equal(args[3], roots[branch]);
    return { Stacks: [{ StackId: roots[branch], StackStatus: "UPDATE_COMPLETE", EnableTerminationProtection: true }] };
  }, removeOutputs() { calls.push(["removeOutputs"]); }, run(command, args, env) { calls.push([command, args, env]); },
  readOutputs() { calls.push(["readOutputs"]); return outputs(branch); }, ...patch };
  return { io, calls };
}
function buildEnv(env) { const context = frontendReleaseContext(env); return { ...env, AWS_BRANCH: context.backendBranch, BUZZKILL_BACKEND_BRANCH: undefined }; }

test("production generates only existing main outputs and preserves caller environment", () => {
  const f = fixture();
  assert.equal(prepareFrontendRelease(production, f.io), main);
  const command = f.calls.find(c => c[0] === "npx");
  assert.deepEqual(command[1], ["ampx", "generate", "outputs", "--app-id", "d3owdoeg1om341", "--branch", main]);
  assert.equal(command[2].AWS_BRANCH, main); assert.equal(command[2].BUZZKILL_BACKEND_BRANCH, undefined);
  assert.equal(production.AWS_BRANCH, "main"); assert.equal(production.BUZZKILL_BACKEND_BRANCH, main);
  assert.ok(f.calls.findIndex(c => c[0] === "removeOutputs") < f.calls.findIndex(c => c[0] === "npx"));
  assert.equal(f.calls.filter(c => c[0] === "npx").length, 1);
});

test("isolated staging preview validates actual active staging outputs without rewriting them", () => {
  const f = fixture(staging);
  assert.equal(prepareFrontendRelease(qa, f.io), staging);
  const generated = f.calls.find(c => c[0] === "npx");
  assert.equal(generated[2].BUZZKILL_MIGRATION_PREVIEW, "false"); assert.equal(generated[2].AWS_BRANCH, staging);
  assert.equal(qa.BUZZKILL_MIGRATION_PREVIEW, "false");
  assert.deepEqual(f.calls.filter(c => !["aws", "removeOutputs", "readOutputs", "npx"].includes(c[0])), []);
});

test("only explicit approved account/app/namespace/release contexts can request read-only outputs", () => {
  for (const patch of [
    { BUZZKILL_FRONTEND_ONLY_RELEASE: undefined }, { BUZZKILL_FRONTEND_ONLY_RELEASE: "false" }, { BUZZKILL_FRONTEND_ONLY_RELEASE: "TRUE" },
    { AWS_APP_ID: "d2y2zigtl5rx3" }, { AWS_APP_ID: "d26qpsjewk0bee" }, { AWS_REGION: "us-west-2" },
    { BUZZKILL_DESTINATION_ACCOUNT_ID: "637423611040" }, { AWS_BRANCH: "staging" }, { AWS_BRANCH: "feature" },
    { SENTRY_DEPLOYMENT_BRANCH: undefined }, { SENTRY_DEPLOYMENT_BRANCH: "staging" },
    { BUZZKILL_BACKEND_BRANCH: staging }, { BUZZKILL_BACKEND_BRANCH: undefined }, { BUZZKILL_BACKEND_BRANCH: "main" },
    { BUZZKILL_SOURCE_ENVIRONMENT: "staging" }, { BUZZKILL_MIGRATION_PREVIEW: "true" },
    { BUZZKILL_CUTOVER_PAUSED: "true" }, { BUZZKILL_WORKERS_PAUSED: "true" },
    { BUZZKILL_PREVIEW_ADMIN_LOGIN: "true" }, { BUZZKILL_MIGRATION_BOOTSTRAP: "true" },
    { VITE_BUZZKILL_MIGRATION_PREVIEW: "true" }, { VITE_BUZZKILL_MIGRATION_PREVIEW: "TRUE" },
  ]) {
    const f = fixture(); assert.throws(() => prepareFrontendRelease({ ...production, ...patch }, f.io));
    assert.deepEqual(f.calls, []);
  }
  for (const patch of [{ BUZZKILL_BACKEND_BRANCH: main }, { BUZZKILL_MIGRATION_PREVIEW: "true" },
    { SENTRY_UPLOAD_SOURCEMAPS: undefined }, { SENTRY_UPLOAD_SOURCEMAPS: "true" }]) {
    assert.throws(() => prepareFrontendRelease({ ...qa, ...patch }, fixture(staging).io));
  }
});

test("failed live identity/protection checks never delete or generate outputs", () => {
  for (const status of ["UPDATE_IN_PROGRESS", "UPDATE_ROLLBACK_IN_PROGRESS", "UPDATE_ROLLBACK_FAILED"]) {
    const f = fixture(main, { readAws: args => args[0] === "sts" ? { Account: "743917687359" }
      : { Stacks: [{ StackId: roots[main], StackStatus: status, EnableTerminationProtection: true }] } });
    assert.throws(() => prepareFrontendRelease(production, f.io)); assert.deepEqual(f.calls, []);
  }
  for (const patch of [{ StackId: roots[staging] }, { EnableTerminationProtection: false }]) {
    const f = fixture(main, { readAws: args => args[0] === "sts" ? { Account: "743917687359" }
      : { Stacks: [{ StackId: roots[main], StackStatus: "UPDATE_COMPLETE", EnableTerminationProtection: true, ...patch }] } });
    assert.throws(() => prepareFrontendRelease(production, f.io)); assert.deepEqual(f.calls, []);
  }
  const f = fixture(main, { readAws: () => ({ Account: "637423611040" }) });
  assert.throws(() => prepareFrontendRelease(production, f.io)); assert.deepEqual(f.calls, []);
});

test("failed generation/output validation never falls back to deployment or a stale output", () => {
  const f = fixture(main, { run(command, args) { f.calls.push([command, args]); throw new Error("read unavailable"); } });
  assert.throws(() => prepareFrontendRelease(production, f.io));
  assert.equal(f.calls.filter(c => c[0] === "npx").length, 1); assert.equal(f.calls.some(c => c[0] === "readOutputs"), false);
  for (const data of [outputs(staging), { ...outputs(), auth: { user_pool_id: "foreign" } },
    { ...outputs(), custom: { ...outputs().custom, migrationApiReady: false } },
    { ...outputs(), custom: { ...outputs().custom, migrationPreview: true } }]) {
    const invalid = fixture(main, { readOutputs: () => data });
    assert.throws(() => prepareFrontendRelease(production, invalid.io));
    assert.equal(invalid.calls.filter(c => c[0] === "npx").length, 1);
  }
});

test("root must still be settled after output generation", () => {
  let reads = 0;
  const f = fixture(main, { readAws: args => args[0] === "sts" ? { Account: "743917687359" }
    : { Stacks: [{ StackId: roots[main], StackStatus: ++reads === 1 ? "UPDATE_COMPLETE" : "UPDATE_IN_PROGRESS", EnableTerminationProtection: true }] } });
  assert.throws(() => prepareFrontendRelease(production, f.io));
  assert.equal(f.calls.filter(c => c[0] === "npx").length, 1);
});

test("build revalidates outputs before normal production or isolated preview UI compilation", () => {
  const prod = fixture(); buildFrontendRelease(buildEnv(production), prod.io);
  assert.deepEqual(prod.calls.find(c => c[0] === "npm")[1], ["run", "build"]);
  const stage = fixture(staging); buildFrontendRelease({ ...buildEnv(qa), SENTRY_AUTH_TOKEN: "PRIVATE_TEST_SENTINEL" }, stage.io);
  const command = stage.calls.find(c => c[0] === "npm");
  assert.deepEqual(command[1], ["run", "build"]);
  assert.equal(command[2].BUZZKILL_MIGRATION_PREVIEW, "false");
  assert.equal(command[2].VITE_BUZZKILL_MIGRATION_PREVIEW, "true");
  assert.equal(command[2].SENTRY_AUTH_TOKEN, undefined);
  assert.equal(command[2].SENTRY_DEPLOYMENT_BRANCH, "codex/browser-source-diagnostics");
  assert.ok(stage.calls.findIndex(c => c[0] === "readOutputs") < stage.calls.findIndex(c => c[0] === "npm"));
  const bad = fixture(staging, { readOutputs: () => outputs(main) });
  assert.throws(() => buildFrontendRelease(buildEnv(qa), bad.io)); assert.equal(bad.calls.some(c => c[0] === "npm"), false);
  assert.throws(() => buildFrontendRelease({ ...buildEnv(qa), AWS_BRANCH: main }, fixture(staging).io));
  assert.throws(() => buildFrontendRelease({ ...buildEnv(production), VITE_BUZZKILL_MIGRATION_PREVIEW: "true" }, fixture().io));
});

test("Hosting shell selects read-only mode without a pipeline fallback and retains the default path", () => {
  const yaml = readFileSync(new URL("../../../amplify.yml", import.meta.url), "utf8");
  const start = yaml.indexOf("            - |\n") + "            - |\n".length;
  const block = yaml.slice(start).split("\n").filter((_, index, lines) => index < lines.findIndex(line => line && !line.startsWith("              "))).map(line => line.slice(14)).join("\n");
  const directory = mkdtempSync(join(tmpdir(), "buzzkill-frontend-release-"));
  const log = join(directory, "commands.log");
  const scripts = {
    aws: '#!/bin/sh\nprintf "743917687359\\n"\n',
    node: '#!/bin/sh\nprintf "node %s\\n" "$*" >> "$COMMAND_LOG"\nif [ "$1" = "scripts/frontendRelease.mjs" ] && [ "$FAIL_READ" = "true" ]; then exit 42; fi\nprintf "%s\\n" "$EXPECTED_BACKEND"\n',
    npx: '#!/bin/sh\nprintf "npx %s\\n" "$*" >> "$COMMAND_LOG"\n',
  };
  try {
    for (const [name, body] of Object.entries(scripts)) { writeFileSync(join(directory, name), body); chmodSync(join(directory, name), 0o755); }
    for (const [flag, fail, expectedCalls, success] of [["true", "false", ["node scripts/frontendRelease.mjs"], true],
      ["true", "true", ["node scripts/frontendRelease.mjs"], false],
      ["false", "false", ["node scripts/retainedBackend.mjs --verify", 'npx ampx pipeline-deploy --branch ' + main + ' --app-id d3owdoeg1om341'], true],
      [undefined, "false", ["node scripts/retainedBackend.mjs --verify", 'npx ampx pipeline-deploy --branch ' + main + ' --app-id d3owdoeg1om341'], true],
      ["invalid", "false", [], false]]) {
      writeFileSync(log, "");
      const env = { ...production, BUZZKILL_FRONTEND_ONLY_RELEASE: flag,
        PATH: directory + ":/usr/bin:/bin", COMMAND_LOG: log, FAIL_READ: fail, EXPECTED_BACKEND: main };
      if (flag === undefined) delete env.BUZZKILL_FRONTEND_ONLY_RELEASE;
      const result = spawnSync("/bin/bash", ["-c", block], { env, encoding: "utf8" });
      assert.equal(result.status === 0, success, result.stderr);
      assert.deepEqual(readFileSync(log, "utf8").trim().split("\n").filter(Boolean), expectedCalls);
    }
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
