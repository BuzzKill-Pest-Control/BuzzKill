import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmod, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

const ACCOUNT = "743917687359", REGION = "us-east-1", APP = "d3owdoeg1om341";
const BRANCHES = { main: "codex-buzzkill-account-migration", staging: "codex-buzzkill-staging-migration" };
const fail = () => { throw new Error("Customer search backfill stopped; inspect configuration or retry the saved page. No private values are printed."); };
const awsCli = (args) => {
  try { return JSON.parse(execFileSync("aws", [...args, "--region", REGION, "--output", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })); }
  catch { return fail(); }
};

export function optionsFor(args) {
  const value = { environment: "", functionName: "", state: "", apply: false, maxPages: 100 };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--environment") value.environment = args[++i];
    else if (args[i] === "--function") value.functionName = args[++i];
    else if (args[i] === "--state") value.state = args[++i];
    else if (args[i] === "--max-pages") value.maxPages = Number(args[++i]);
    else if (args[i] === "--apply") value.apply = true;
    else fail();
  }
  if (!Object.hasOwn(BRANCHES, value.environment) || !value.functionName ||
      !Number.isInteger(value.maxPages) || value.maxPages < 1 || value.maxPages > 1000 ||
      (value.apply && (!value.state || !isAbsolute(value.state)))) fail();
  return value;
}

export async function runBackfill(options, aws = awsCli, print = (value) => console.log(JSON.stringify(value))) {
  if ((await aws(["sts", "get-caller-identity"])).Account !== ACCOUNT) fail();
  const config = await aws(["lambda", "get-function-configuration", "--function-name", options.functionName]);
  const env = config.Environment?.Variables ?? {};
  const branch = BRANCHES[options.environment];
  const parameter = `/buzzkill/${APP}/${branch}/data-api-id`;
  const expectedIndex = `CustomerSearch-${createHash("sha256").update(`${APP}:${branch}`).digest("hex").slice(0, 20)}-v1`;
  if (!config.FunctionArn?.startsWith(`arn:aws:lambda:${REGION}:${ACCOUNT}:function:amplify-${APP}-`) ||
      env.AMPLIFY_DATA_API_ID_PARAM !== parameter || env.CUSTOMER_SEARCH_TABLE_NAME !== expectedIndex ||
      env.BUZZKILL_MIGRATION_PREVIEW === "true" || env.CUSTOMER_SEARCH_WORKER_ENABLED !== "true") fail();
  const apiId = (await aws(["ssm", "get-parameter", "--name", parameter])).Parameter?.Value;
  if (typeof apiId !== "string" || !/^[a-z0-9]+$/.test(apiId)) fail();
  const sourceTable = `Customer-${apiId}-NONE`;
  if (!options.apply) {
    const [source, index] = await Promise.all([sourceTable, expectedIndex].map((name) => aws(["dynamodb", "describe-table", "--table-name", name])));
    print({ mode: "dry_run", approximateCustomers: source.Table?.ItemCount ?? null, approximateIndexEntries: index.Table?.ItemCount ?? null });
    return;
  }
  await mkdir(dirname(options.state), { recursive: true, mode: 0o700 });
  const lock = `${options.state}.lock`;
  try { await writeFile(lock, "locked\n", { flag: "wx", mode: 0o600 }); } catch { fail(); }
  let directory;
  try {
    let state = { v: 1, functionArn: config.FunctionArn, sourceTable, indexTable: expectedIndex, cursor: null, complete: false, pages: 0, processed: 0, evaluated: 0 };
    try {
      const stat = await lstat(options.state);
      if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) || stat.uid !== process.getuid()) fail();
      const prior = JSON.parse(await readFile(options.state, "utf8"));
      if (prior.v !== 1 || prior.functionArn !== state.functionArn || prior.sourceTable !== sourceTable || prior.indexTable !== expectedIndex ||
          typeof prior.complete !== "boolean" || !(prior.cursor === null || typeof prior.cursor === "string") ||
          [prior.pages, prior.processed, prior.evaluated].some((n) => !Number.isSafeInteger(n) || n < 0)) fail();
      state = prior;
    } catch (error) { if (error?.code !== "ENOENT") fail(); }
    const save = async () => {
      const temporaryDirectory = await mkdtemp(join(dirname(options.state), ".search-checkpoint-"));
      try {
        await chmod(temporaryDirectory, 0o700);
        const temporary = join(temporaryDirectory, "state.json");
        await writeFile(temporary, JSON.stringify(state), { flag: "wx", mode: 0o600 });
        await rename(temporary, options.state);
      } finally { await rm(temporaryDirectory, { recursive: true, force: true }); }
    };
    await save();
    directory = await mkdtemp(join(tmpdir(), "buzzkill-search-backfill-"));
    await chmod(directory, 0o700);
    const input = join(directory, "input.json"), output = join(directory, "output.json");
    for (let page = 0; page < options.maxPages && !state.complete; page++) {
      await writeFile(input, JSON.stringify({ kind: "BACKFILL", cursor: state.cursor }), { mode: 0o600 });
      await writeFile(output, "", { mode: 0o600 });
      const response = await aws(["lambda", "invoke", "--function-name", config.FunctionArn, "--cli-binary-format", "raw-in-base64-out", "--payload", `file://${input}`, output]);
      if (response.FunctionError || response.StatusCode !== 200) fail();
      const result = JSON.parse(await readFile(output, "utf8"));
      if (typeof result.complete !== "boolean" || !(result.cursor === null || typeof result.cursor === "string") ||
          !Number.isInteger(result.processed) || result.processed < 0 || result.processed > 25 ||
          !Number.isInteger(result.evaluated) || result.evaluated < 0 || result.evaluated > 25 ||
          (!result.complete && (!result.cursor || result.cursor === state.cursor)) || (result.complete && result.cursor !== null)) fail();
      state = { ...state, cursor: result.cursor, complete: result.complete, pages: state.pages + 1,
        processed: state.processed + result.processed, evaluated: state.evaluated + result.evaluated };
      await save();
      // Cursors and source identities exist only in0600 local state/payload files, never progress logs.
      print({ pages: state.pages, processed: state.processed, evaluated: state.evaluated, complete: state.complete });
    }
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
    await rm(lock, { force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runBackfill(optionsFor(process.argv.slice(2))).catch(() => { console.error("Customer search backfill stopped; no private values were printed. Retry the saved state after resolving the failure."); process.exitCode = 1; });
}
