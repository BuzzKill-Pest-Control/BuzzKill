import { afterEach, expect, it } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function check(preview: boolean, bootstrap: boolean, outputs?: object) {
  const dir = mkdtempSync(join(tmpdir(), "migration-release-")); dirs.push(dir);
  if (outputs) writeFileSync(join(dir, "amplify_outputs.json"), JSON.stringify(outputs));
  return spawnSync(process.execPath, [resolve("scripts/checkMigrationRelease.mjs")], {
    cwd: dir, encoding: "utf8", env: {
      ...process.env, BUZZKILL_MIGRATION_PREVIEW: String(preview), BUZZKILL_MIGRATION_BOOTSTRAP: String(bootstrap),
    },
  });
}
it("refuses bootstrap artifacts even if outputs from a prior full deployment exist", () => {
  const result = check(true, true, { custom: { migrationPreview: true, migrationApiReady: true } });
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain("bootstrap cannot publish");
});
it.each([undefined, {}, { custom: { migrationPreview: true, migrationApiReady: false } }, { custom: { migrationApiReady: true } }])(
  "refuses missing, stale or incomplete backend outputs: %o", (outputs) => {
    expect(check(true, false, outputs).status).not.toBe(0);
  }
);
it("permits a complete preview and leaves normal builds unchanged", () => {
  expect(check(true, false, { custom: { migrationPreview: true, migrationApiReady: true } }).status).toBe(0);
  expect(check(false, false).status).toBe(0);
});
it("rejects known preview outputs when the frontend preview flag is missing", () => {
  expect(check(false, false, { custom: { migrationPreview: true, migrationApiReady: false } }).status).not.toBe(0);
  expect(check(false, false, { custom: { migrationPreview: true, migrationApiReady: true } }).status).not.toBe(0);
});
