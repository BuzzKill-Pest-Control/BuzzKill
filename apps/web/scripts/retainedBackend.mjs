import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ACCOUNT = "743917687359";
const REGION = "us-east-1";
const WEB_APP = "d3owdoeg1om341";
const CRM_APP = "d2y2zigtl5rx3";
const MAIN = "codex-buzzkill-account-migration";
const ROOTS = {
  [MAIN]: "arn:aws:cloudformation:us-east-1:743917687359:stack/amplify-d3owdoeg1om341-codexbuzzkillaccountmigration-branch-9b29de27ce/cf4d7e90-be8b-11f1-b0a8-0afff64fb7bb",
  "codex-buzzkill-staging-migration": "arn:aws:cloudformation:us-east-1:743917687359:stack/amplify-d3owdoeg1om341-codexbuzzkillstagingmigration-branch-c439abc121/0e0d0830-be8c-11f1-a7fc-127661e772a7",
};

/** Hosting main owns deployments, but the backend's physical name never changes. */
export function retainedBackendBranch(env) {
  const branch = env.AWS_BRANCH;
  const target = env.BUZZKILL_BACKEND_BRANCH;
  const destination = [WEB_APP, CRM_APP].includes(env.AWS_APP_ID);
  if (target !== undefined) {
    if (!destination || env.BUZZKILL_DESTINATION_ACCOUNT_ID !== ACCOUNT ||
        env.AWS_REGION !== REGION || target !== MAIN ||
        !["main", MAIN].includes(branch) || env.BUZZKILL_SOURCE_ENVIRONMENT !== "main" ||
        env.BUZZKILL_MIGRATION_PREVIEW !== "false" || env.BUZZKILL_CUTOVER_PAUSED !== "false" ||
        env.BUZZKILL_WORKERS_PAUSED !== "false") {
      throw new Error("Hosting main must bind the exact active retained destination backend.");
    }
    if (env.AWS_APP_ID === CRM_APP && env.BUZZKILL_BACKEND_APP_ID !== WEB_APP) {
      throw new Error("CRM main must consume the retained destination website backend.");
    }
    return target;
  }
  if (destination && !Object.hasOwn(ROOTS, branch ?? "")) {
    throw new Error("A destination Hosting branch requires an explicit retained backend mapping.");
  }
  return branch;
}

/** Run immediately before ampx: real account and an existing exact root are mandatory. */
export function verifyRetainedBackend(env, readAws) {
  const branch = retainedBackendBranch(env);
  if (![WEB_APP, CRM_APP].includes(env.AWS_APP_ID)) return branch;
  if (env.BUZZKILL_DESTINATION_ACCOUNT_ID !== ACCOUNT || env.AWS_REGION !== REGION ||
      readAws(["sts", "get-caller-identity"]).Account !== ACCOUNT) {
    throw new Error("Live build identity is not the destination account and region.");
  }
  const stack = readAws(["cloudformation", "describe-stacks", "--stack-name", ROOTS[branch]]).Stacks?.[0];
  // The CRM only reads outputs. Its schema polling must remain usable while
  // the website's concurrent build updates this same backend.
  const allowedStatus = ["CREATE_COMPLETE", "UPDATE_COMPLETE", ...(env.AWS_APP_ID === CRM_APP ? ["UPDATE_IN_PROGRESS", "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS"] : [])];
  if (stack?.StackId !== ROOTS[branch] || stack?.EnableTerminationProtection !== true ||
      !allowedStatus.includes(stack?.StackStatus)) {
    throw new Error("Retained protected backend root identity does not match.");
  }
  return branch;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const verify = process.argv[2] === "--verify";
  if (process.argv.length > (verify ? 3 : 2)) throw new Error("Unexpected retained-backend arguments.");
  const branch = verify ? verifyRetainedBackend(process.env, (args) =>
    JSON.parse(execFileSync("aws", [...args, "--region", REGION, "--output", "json"], { encoding: "utf8" }))
  ) : retainedBackendBranch(process.env);
  if (!branch) throw new Error("Build branch is required.");
  process.stdout.write(branch + "\n");
}
