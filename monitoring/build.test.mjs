import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, realpath, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import { AUTH_TOKEN_SENTINEL, assertPrivateArtifacts, createMonitoringBuild } from "./build.mjs";

const sha = "a".repeat(40);
const authToken = "sntrys_TEST_PRIVATE_CREDENTIAL_4d2a8f";
const configured = (project = "business-web") => ({
  CI: "true", SENTRY_UPLOAD_SOURCEMAPS: "true", SENTRY_ORG: "independent-business",
  SENTRY_PROJECT: project, SENTRY_AUTH_TOKEN: authToken,
  VITE_SENTRY_DSN: `https://${"a".repeat(32)}@o123.ingest.us.sentry.io/456`, AWS_COMMIT_ID: sha,
});
const build = (overrides = {}) => createMonitoringBuild({
  env: configured(), command: "build", branch: "main", expectedProject: "business-web",
  sentryPlugin: () => [{ name: "sentry-injected-plugin" }], readCommit: () => sha, ...overrides,
});

test("staging, preview, development and unconfigured builds clear inherited telemetry configuration", () => {
  for (const overrides of [
    { branch: "staging" }, { branch: undefined }, { preview: true }, { command: "serve" },
    { env: { ...configured(), SENTRY_DEPLOYMENT_BRANCH: "staging", BUZZKILL_SOURCE_ENVIRONMENT: "main" } },
    { env: { ...configured(), SENTRY_UPLOAD_SOURCEMAPS: undefined } },
    { env: { VITE_SENTRY_DSN: configured().VITE_SENTRY_DSN, VITE_SENTRY_RELEASE: "stale" } },
  ]) {
    const result = build({ ...overrides, sentryPlugin: () => assert.fail("disabled build called uploader") });
    assert.equal(result.define["import.meta.env.VITE_SENTRY_DSN"], '""');
    assert.equal(result.define["import.meta.env.VITE_SENTRY_RELEASE"], '""');
    assert.equal(result.build.sourcemap, false);
    assert.deepEqual(result.plugins, []);
  }
});

test("each app uploads to its own project with the same release used by its browser", () => {
  for (const project of ["business-web", "business-crm"]) {
    let sent;
    const result = build({ expectedProject: project, env: configured(project), sentryPlugin: (options) => {
      sent = options;
      return [{ name: "inject-debug-ids" }, { name: "upload-private-maps" }];
    } });
    assert.equal(sent.org, "independent-business");
    assert.equal(sent.project, project);
    assert.equal(sent.authToken, authToken);
    assert.equal(sent.release.name, JSON.parse(result.define["import.meta.env.VITE_SENTRY_RELEASE"]));
    assert.equal(sent.release.name, `${project}@${sha}`);
    assert.equal(sent.release.setCommits, false);
    assert.equal(sent.release.deploy, false);
    assert.equal(sent.telemetry, false);
    assert.equal(result.build.sourcemap, "hidden");
    assert.deepEqual(sent.sourcemaps.filesToDeleteAfterUpload, ["./dist/**/*.map"]);
    assert.deepEqual(result.plugins.map((p) => p.name), ["inject-debug-ids", "upload-private-maps"]);
  }
});

test("production uploads require complete matching configuration without echoing secrets", () => {
  const failures = [
    { CI: undefined }, { SENTRY_ORG: undefined }, { SENTRY_PROJECT: "another-business" },
    { SENTRY_AUTH_TOKEN: undefined }, { SENTRY_AUTH_TOKEN: "secret with whitespace" },
    { VITE_SENTRY_DSN: undefined }, { VITE_SENTRY_DSN: "https://abc:secret@o123.ingest.us.sentry.io/456" },
    { VITE_SENTRY_DSN: "https://abc123@o123.ingest.us.sentry.io/456" },
    { VITE_SENTRY_DSN: `https://${"g".repeat(32)}@o123.ingest.us.sentry.io/456` },
    { VITE_SENTRY_DSN: `https://${"a".repeat(32)}@example.org/456` }, { AWS_COMMIT_ID: "main" },
    { AWS_COMMIT_ID: "a".repeat(7) },
  ];
  for (const override of failures) {
    assert.throws(() => build({ env: { ...configured(), ...override } }), (error) => {
      assert.match(error.message, /^Monitoring build:/);
      assert.ok(!error.message.includes(authToken));
      assert.ok(!error.message.includes("secret"));
      return true;
    });
  }
});

test("Amplify is recognized as CI, and git HEAD is a validated fallback", () => {
  const env = { ...configured(), CI: undefined, AWS_APP_ID: "app-id", AWS_COMMIT_ID: undefined };
  const result = build({ env, readCommit: () => sha.toUpperCase() });
  assert.equal(JSON.parse(result.define["import.meta.env.VITE_SENTRY_RELEASE"]), `business-web@${sha}`);
  assert.throws(() => build({ env, readCommit: () => "HEAD" }), /full Git SHA/);
  assert.throws(() => build({ env, readCommit: () => { throw new Error(authToken); } }), /could not be determined/);
});

test("release identity comes from git HEAD and cannot be replaced by stale CI metadata", () => {
  assert.throws(() => build({ env: { ...configured(), AWS_COMMIT_ID: "b".repeat(40) } }), /match the checked-out source/);
  const result = build({ env: { ...configured(), AWS_COMMIT_ID: sha.toUpperCase() } });
  assert.equal(JSON.parse(result.define["import.meta.env.VITE_SENTRY_RELEASE"]), `business-web@${sha}`);
});

test("a public credential variable is refused even when telemetry is disabled", () => {
  for (const env of [
    { VITE_SENTRY_AUTH_TOKEN: authToken }, { VITE_SENTRY_SECRET: authToken },
    { SENTRY_AUTH_TOKEN: authToken, VITE_OTHER_SETTING: `prefix${authToken}` },
  ]) {
    assert.throws(() => build({ command: "serve", env }), /private Sentry credential/);
  }
});

test("source-map failure aborts without exposing the underlying HTTP/token exception", () => {
  build({ sentryPlugin: (options) => {
    assert.throws(() => options.errorHandler(new Error(`HTTP failure ${authToken}`)), (error) => {
      assert.equal(error.message, "Monitoring build: source-map upload failed");
      assert.equal(error.cause, undefined);
      return true;
    });
    return [];
  } });
  assert.throws(() => build({ sentryPlugin: () => { throw new Error(authToken); } }), (error) => {
    assert.equal(error.message, "Monitoring build: source-map uploader could not be configured");
    assert.equal(error.cause, undefined);
    return true;
  });
});

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), "monitoring-artifacts-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(join(dir, "assets"));
  await writeFile(join(dir, "index.html"), '<script src="/assets/app.js"></script>');
  await writeFile(join(dir, "assets", "app.js"), 'console.log("app");\n//# debugId=1234');
  return dir;
}

test("private hidden maps cannot reach Hosting even without map URL comments", async (t) => {
  const dir = await fixture(t);
  await assertPrivateArtifacts(dir, { authToken });
  for (const name of ["app.js.map", "style.css.map", "app.js.map.gz", "app.js.map.br"]) {
    await writeFile(join(dir, "assets", name), "private source");
    await assert.rejects(assertPrivateArtifacts(dir, { authToken }), /private source map/);
    await rm(join(dir, "assets", name));
  }
});

test("JS, CSS, inline map references and private credential bytes fail the artifact check", async (t) => {
  const dir = await fixture(t);
  for (const [name, contents, expected] of [
    ["app.js", 'console.log(1);\n//# sourceMappingURL=app.js.map', /source-map URL/],
    ["app.js", '//# sourceMappingURL=data:application/json;base64,e30=', /source-map URL/],
    ["app.css", 'body{}/*# sourceMappingURL=app.css.map */', /source-map URL/],
    ["app.js", `export const credential=${JSON.stringify(authToken)};`, /private credential/],
    ["app.js", `export const credential=${JSON.stringify(AUTH_TOKEN_SENTINEL)};`, /private credential/],
  ]) {
    const path = join(dir, "assets", name);
    await writeFile(path, contents);
    await assert.rejects(assertPrivateArtifacts(dir, { authToken }), expected);
    await rm(path);
  }
});

test("missing, empty or symlinked artifact trees cannot pass", async (t) => {
  const dir = await fixture(t);
  await assert.rejects(assertPrivateArtifacts(join(dir, "missing")));
  await mkdir(join(dir, "empty"));
  await assert.rejects(assertPrivateArtifacts(join(dir, "empty")), /empty/);
  await symlink(join(dir, "index.html"), join(dir, "linked.html"));
  await assert.rejects(assertPrivateArtifacts(dir), /symbolic link/);
});

test("the CI artifact command exits unsuccessfully and does not log credentials", async (t) => {
  const dir = await fixture(t);
  await writeFile(join(dir, "assets", "app.js"), authToken);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL("./build.mjs", import.meta.url)), "--assert-artifacts", dir], {
    encoding: "utf8", env: { ...process.env, SENTRY_AUTH_TOKEN: authToken },
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /artifact verification failed/);
  assert.ok(!`${result.stdout}${result.stderr}`.includes(authToken));
});

test("the installed Vite/Sentry plugins produce matching Debug IDs and hidden maps without network uploads", async (t) => {
  // Each app installs these dependencies; resolving through web avoids a third
  // root package.json. disable-upload plus disabled release management keeps
  // this fixture entirely local, including when tests run with CI credentials.
  const fromWeb = createRequire(new URL("../apps/web/package.json", import.meta.url));
  const { build: viteBuild } = await import(pathToFileURL(fromWeb.resolve("vite")).href);
  const { sentryVitePlugin } = fromWeb("@sentry/vite-plugin");
  const dir = await realpath(await mkdtemp(join(tmpdir(), "monitoring-vite-")));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await writeFile(join(dir, "index.html"), '<script type="module" src="/main.js"></script>');
  await writeFile(join(dir, "main.js"), 'document.body.dataset.release=import.meta.env.VITE_SENTRY_RELEASE;');
  const monitoring = build({ sentryPlugin: (options) => sentryVitePlugin({
    ...options,
    release: { ...options.release, create: false, finalize: false },
    sourcemaps: { ...options.sourcemaps, disable: "disable-upload" },
  }) });
  await viteBuild({ root: dir, configFile: false, logLevel: "silent", define: monitoring.define,
    plugins: monitoring.plugins, build: { ...monitoring.build, outDir: "dist" } });
  const dist = join(dir, "dist");
  const assets = join(dist, "assets");
  const names = await readdir(assets);
  const jsName = names.find((n) => n.endsWith(".js"));
  assert.ok(jsName);
  const javascript = await readFile(join(assets, jsName), "utf8");
  const map = JSON.parse(await readFile(join(assets, `${jsName}.map`), "utf8"));
  assert.match(map.debug_id, /^[a-f0-9-]{36}$/);
  assert.ok(javascript.includes(map.debug_id));
  assert.ok(javascript.includes(`business-web@${sha}`));
  assert.doesNotMatch(javascript, /sourceMappingURL\s*=/);
  await assert.rejects(assertPrivateArtifacts(dist, { authToken }), /private source map/);
  await rm(join(assets, `${jsName}.map`));
  await assertPrivateArtifacts(dist, { authToken });
});
