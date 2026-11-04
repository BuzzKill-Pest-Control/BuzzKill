import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { chmod, lstat, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { optionsFor, runBackfill } from "./backfillCustomerSearch.mjs";
const branch = "codex-buzzkill-account-migration", app = "d3owdoeg1om341";
const index = `CustomerSearch-${createHash("sha256").update(`${app}:${branch}`).digest("hex").slice(0, 20)}-v1`;
const arn = `arn:aws:lambda:us-east-1:743917687359:function:amplify-${app}-search-worker`;
function provider(pages = [], change = {}) {
  const calls = [], payloads = [];
  const aws = async (args) => {
    calls.push(args);
    if (args[0] === "sts") return { Account: "743917687359" };
    if (args[1] === "get-function-configuration") return { FunctionArn: arn, Environment: { Variables: {
      AMPLIFY_DATA_API_ID_PARAM: `/buzzkill/${app}/${branch}/data-api-id`, CUSTOMER_SEARCH_TABLE_NAME: index,
      CUSTOMER_SEARCH_WORKER_ENABLED: "true", BUZZKILL_MIGRATION_PREVIEW: "false", ...change,
    } } };
    if (args[0] === "ssm") return { Parameter: { Value: "testapi" } };
    if (args[1] === "describe-table") return { Table: { ItemCount: 128 } };
    if (args[1] === "invoke") {
      payloads.push(JSON.parse(await readFile(args[args.indexOf("--payload") + 1].slice(7), "utf8")));
      const next = pages.shift(); if (next instanceof Error) throw next;
      await writeFile(args.at(-1), JSON.stringify(next)); return { StatusCode: 200 };
    }
    throw new Error("Unexpected provider operation");
  };
  return { aws, calls, payloads };
}
const opts = (state, maxPages = 10) => optionsFor(["--environment", "main", "--function", "test", "--state", state, "--max-pages", String(maxPages), "--apply"]);
test("dry run reads only metadata; rejects unsafe environment and apply options", async () => {
  const fake = provider(), output = [];
  await runBackfill(optionsFor(["--environment", "main", "--function", "test"]), fake.aws, (value) => output.push(value));
  assert.equal(fake.calls.some((args) => args[1] === "invoke"), false);
  assert.deepEqual(output, [{ mode: "dry_run", approximateCustomers: 128, approximateIndexEntries: 128 }]);
  for (const args of [[], ["--environment", "prod", "--function", "test"], ["--environment", "main", "--function", "test", "--apply"], ["--environment", "main", "--function", "test", "--max-pages", "1001"]]) assert.throws(() => optionsFor(args));
  await assert.rejects(runBackfill(optionsFor(["--environment", "staging", "--function", "test"]), fake.aws, () => {}));
});
test("resumes empty pages safely, binds state, keeps cursors out of progress and ignores predictable temp symlinks", async () => {
  const dir = await mkdtemp(join(tmpdir(), "search-backfill-test-")), state = join(dir, "checkpoint");
  try {
    const victim = join(dir, "unrelated"); await writeFile(victim, "preserve"); await symlink(victim, `${state}.next`);
    const fake = provider([{ processed: 0, evaluated: 25, complete: false, cursor: "sensitive-cursor" }, { processed: 2, evaluated: 2, complete: true, cursor: null }]);
    const output = [];
    await runBackfill(opts(state, 1), fake.aws, (value) => output.push(value));
    assert.equal((await lstat(state)).mode & 0o777, 0o600);
    assert.equal(JSON.parse(await readFile(state)).cursor, "sensitive-cursor");
    await runBackfill(opts(state), fake.aws, (value) => output.push(value));
    assert.deepEqual(fake.payloads, [{ kind: "BACKFILL", cursor: null }, { kind: "BACKFILL", cursor: "sensitive-cursor" }]);
    assert.equal(JSON.stringify(output).includes("sensitive"), false);
    assert.equal(await readFile(victim, "utf8"), "preserve");
    assert.equal((await readdir(dir)).some((entry) => entry.startsWith(".search-checkpoint-") || entry.endsWith(".lock")), false);
    const saved = JSON.parse(await readFile(state)); saved.sourceTable = "Customer-other-NONE"; await writeFile(state, JSON.stringify(saved));
    await assert.rejects(runBackfill(opts(state), fake.aws, () => {}));
  } finally { await rm(dir, { recursive: true, force: true }); }
});
test("failed or repeated pages preserve prior checkpoint; permissive state and concurrent lock refuse invocation", async () => {
  const dir = await mkdtemp(join(tmpdir(), "search-backfill-test-")), state = join(dir, "checkpoint");
  try {
    const fake = provider([{ processed: 1, evaluated: 1, complete: false, cursor: "next" }, new Error("private provider message")]);
    await assert.rejects(runBackfill(opts(state), fake.aws, () => {}));
    assert.equal(JSON.parse(await readFile(state)).cursor, "next");
    const repeat = provider([{ processed: 0, evaluated: 25, complete: false, cursor: "next" }]);
    await assert.rejects(runBackfill(opts(state), repeat.aws, () => {}));
    assert.equal(JSON.parse(await readFile(state)).pages, 1);
    await chmod(state, 0o644);
    const other = provider(); await assert.rejects(runBackfill(opts(state), other.aws, () => {}));
    assert.equal(other.payloads.length, 0);
    await chmod(state, 0o600); await writeFile(`${state}.lock`, "locked");
    await assert.rejects(runBackfill(opts(state), other.aws, () => {})); assert.equal(other.payloads.length, 0);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
