import { strict as assert } from "node:assert";
import { test } from "node:test";
import { retainedBackendBranch, verifyRetainedBackend } from "./retainedBackend.mjs";
const physical = "codex-buzzkill-account-migration";
const root = "arn:aws:cloudformation:us-east-1:743917687359:stack/amplify-d3owdoeg1om341-codexbuzzkillaccountmigration-branch-9b29de27ce/cf4d7e90-be8b-11f1-b0a8-0afff64fb7bb";
const env = { AWS_APP_ID: "d3owdoeg1om341", AWS_BRANCH: "main", AWS_REGION: "us-east-1", BUZZKILL_BACKEND_BRANCH: physical, BUZZKILL_SOURCE_ENVIRONMENT: "main", BUZZKILL_DESTINATION_ACCOUNT_ID: "743917687359", BUZZKILL_MIGRATION_PREVIEW: "false", BUZZKILL_CUTOVER_PAUSED: "false", BUZZKILL_WORKERS_PAUSED: "false" };
const responses = [{ Account: "743917687359" }, { branch: { backend: { stackArn: root } } }, { Stacks: [{ StackId: root, StackStatus: "UPDATE_COMPLETE", EnableTerminationProtection: true }] }];
function reader(data = responses) { return (args) => data[args[0] === "sts" ? 0 : args[0] === "amplify" ? 1 : 2]; }
test("maps both main apps to the same retained physical namespace and supports repeated phases", () => {
  assert.equal(retainedBackendBranch(env), physical);
  assert.equal(retainedBackendBranch({ ...env, AWS_BRANCH: physical }), physical);
  assert.equal(retainedBackendBranch({ ...env, AWS_APP_ID: "d2y2zigtl5rx3", BUZZKILL_BACKEND_APP_ID: "d3owdoeg1om341" }), physical);
  assert.equal(verifyRetainedBackend(env, reader()), physical);
});
test("never creates a new destination backend when the mapping is absent", () => {
  assert.throws(() => retainedBackendBranch({ ...env, BUZZKILL_BACKEND_BRANCH: undefined }));
  assert.throws(() => retainedBackendBranch({ ...env, AWS_BRANCH: "staging", BUZZKILL_BACKEND_BRANCH: undefined }));
});
test("rejects wrong account, source app, region, branch, business mode and paused flags", () => {
  for (const patch of [
    { AWS_APP_ID: "d26qpsjewk0bee" }, { AWS_APP_ID: "d5ln2hbbp9s2j" }, { AWS_REGION: "us-west-2" },
    { BUZZKILL_DESTINATION_ACCOUNT_ID: "637423611040" }, { AWS_BRANCH: "staging" }, { AWS_BRANCH: "feature" },
    { BUZZKILL_BACKEND_BRANCH: "main" }, { BUZZKILL_BACKEND_BRANCH: "codex-buzzkill-staging-migration" },
    { BUZZKILL_SOURCE_ENVIRONMENT: "staging" }, { BUZZKILL_MIGRATION_PREVIEW: "true" },
    { BUZZKILL_CUTOVER_PAUSED: "true" }, { BUZZKILL_WORKERS_PAUSED: "true" },
    { AWS_APP_ID: "d2y2zigtl5rx3" },
  ]) assert.throws(() => retainedBackendBranch({ ...env, ...patch }));
});
test("requires a real destination session, exact protected identity and a settled root", () => {
  for (const [index, value] of [
    [0, { Account: "637423611040" }], [2, { Stacks: [{ StackId: root, StackStatus: "UPDATE_COMPLETE", EnableTerminationProtection: false }] }],
    [2, { Stacks: [{ StackId: root, StackStatus: "UPDATE_IN_PROGRESS", EnableTerminationProtection: true }] }],
    [2, { Stacks: [{ StackId: root + "different", StackStatus: "UPDATE_COMPLETE", EnableTerminationProtection: true }] }],
  ]) { const data = [...responses]; data[index] = value; assert.throws(() => verifyRetainedBackend(env, reader(data))); }
});
test("source builds and the retained staging namespace keep their original branch", () => {
  assert.equal(retainedBackendBranch({ AWS_APP_ID: "d26qpsjewk0bee", AWS_BRANCH: "main" }), "main");
  assert.equal(retainedBackendBranch({ AWS_APP_ID: "d5ln2hbbp9s2j", AWS_BRANCH: "staging" }), "staging");
  assert.equal(retainedBackendBranch({ AWS_APP_ID: "d3owdoeg1om341", AWS_BRANCH: "codex-buzzkill-staging-migration" }), "codex-buzzkill-staging-migration");
});

test("CRM output readers tolerate the website update but cannot accept a rollback or different root", () => {
  const crm = { ...env, AWS_APP_ID: "d2y2zigtl5rx3", BUZZKILL_BACKEND_APP_ID: "d3owdoeg1om341" };
  const updating = [...responses]; updating[2] = { Stacks: [{ StackId: root, StackStatus: "UPDATE_IN_PROGRESS", EnableTerminationProtection: true }] };
  assert.equal(verifyRetainedBackend(crm, reader(updating)), physical);
  updating[2] = { Stacks: [{ StackId: root, StackStatus: "UPDATE_ROLLBACK_IN_PROGRESS", EnableTerminationProtection: true }] };
  assert.throws(() => verifyRetainedBackend(crm, reader(updating)));
});
