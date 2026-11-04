import { expect, it } from "vitest";
import { isCutoverPaused, areWorkersPaused } from "./cutover-pause";
const valid = {
  BUZZKILL_CUTOVER_PAUSED: "true", BUZZKILL_MIGRATION_PREVIEW: "false",
  BUZZKILL_PREVIEW_ADMIN_LOGIN: "false", BUZZKILL_SOURCE_ENVIRONMENT: "main",
  AWS_APP_ID: "d3owdoeg1om341", AWS_BRANCH: "codex-buzzkill-account-migration",
  AWS_REGION: "us-east-1", BUZZKILL_DESTINATION_ACCOUNT_ID: "743917687359",
  BUZZKILL_DEPLOY_ACCOUNT_ID: "743917687359",
};
it("preserves ordinary source behavior when pause is unset or false", () => {
  expect(isCutoverPaused({ AWS_APP_ID: "d26qpsjewk0bee", AWS_BRANCH: "main" })).toBe(false);
  expect(isCutoverPaused({ BUZZKILL_CUTOVER_PAUSED: "false" })).toBe(false);
});
it("accepts only the two retained destination release namespaces", () => {
  expect(isCutoverPaused(valid)).toBe(true);
  expect(isCutoverPaused({ ...valid, AWS_BRANCH: "codex-buzzkill-staging-migration", BUZZKILL_SOURCE_ENVIRONMENT: "staging" })).toBe(true);
});
it.each([
  { BUZZKILL_CUTOVER_PAUSED: "TRUE" }, { BUZZKILL_MIGRATION_PREVIEW: "true" },
  { BUZZKILL_PREVIEW_ADMIN_LOGIN: "true" }, { BUZZKILL_MIGRATION_BOOTSTRAP: "true" },
  { AWS_APP_ID: "d26qpsjewk0bee" }, { AWS_BRANCH: "main" },
  { BUZZKILL_SOURCE_ENVIRONMENT: "staging" }, { BUZZKILL_SOURCE_ENVIRONMENT: "" },
  { BUZZKILL_DESTINATION_ACCOUNT_ID: "637423611040" }, { BUZZKILL_DEPLOY_ACCOUNT_ID: "637423611040" },
  { AWS_REGION: "us-west-2" },
])("rejects an unsafe or ambiguous pause binding %j", (change) => {
  expect(() => isCutoverPaused({ ...valid, ...change })).toThrow();
});

it("holds workers independently while leaving API and frontend mode active", () => {
  const primed = { ...valid, BUZZKILL_CUTOVER_PAUSED: "false", BUZZKILL_WORKERS_PAUSED: "true" };
  expect(isCutoverPaused(primed)).toBe(false);
  expect(areWorkersPaused(primed)).toBe(true);
  expect(areWorkersPaused(valid)).toBe(true);
  expect(areWorkersPaused({ ...primed, BUZZKILL_WORKERS_PAUSED: "false" })).toBe(false);
  expect(areWorkersPaused({ AWS_APP_ID: "d26qpsjewk0bee", AWS_BRANCH: "main" })).toBe(false);
});
it.each([
  { BUZZKILL_WORKERS_PAUSED: "TRUE" }, { BUZZKILL_MIGRATION_PREVIEW: "true" },
  { BUZZKILL_PREVIEW_ADMIN_LOGIN: "true" }, { AWS_APP_ID: "d26qpsjewk0bee" },
  { AWS_BRANCH: "main" }, { BUZZKILL_DEPLOY_ACCOUNT_ID: "637423611040" },
  { BUZZKILL_SOURCE_ENVIRONMENT: "staging" }, { AWS_REGION: "us-west-2" },
])("rejects worker holds outside the exact destination release binding %j", (change) => {
  expect(() => areWorkersPaused({ ...valid, BUZZKILL_CUTOVER_PAUSED: "false", BUZZKILL_WORKERS_PAUSED: "true", ...change })).toThrow();
});
