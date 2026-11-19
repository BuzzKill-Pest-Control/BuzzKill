import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { assertDestinationDeploymentIdentity, businessEnvironment, retentionVaultName } from "./deployment-environment";
const main = { AWS_APP_ID: "d3owdoeg1om341", AWS_BRANCH: "codex-buzzkill-account-migration", BUZZKILL_DESTINATION_ACCOUNT_ID: "743917687359", BUZZKILL_SOURCE_ENVIRONMENT: "main" };
it("preserves ordinary source and local business modes", () => {
  expect(businessEnvironment({ AWS_APP_ID: "d26qpsjewk0bee", AWS_BRANCH: "main" })).toBe("main");
  expect(businessEnvironment({ AWS_APP_ID: "d26qpsjewk0bee", AWS_BRANCH: "staging" })).toBe("staging");
  expect(businessEnvironment({})).toBe("staging");
});
it("maps only the matching isolated destination namespaces", () => {
  expect(businessEnvironment(main)).toBe("main");
  expect(businessEnvironment({ ...main, AWS_BRANCH: "codex-buzzkill-staging-migration", BUZZKILL_SOURCE_ENVIRONMENT: "staging" })).toBe("staging");
});
it.each([
  { AWS_APP_ID: "d26qpsjewk0bee" }, { AWS_BRANCH: "main" }, { AWS_BRANCH: "unknown" },
  { BUZZKILL_DESTINATION_ACCOUNT_ID: "637423611040" }, { BUZZKILL_SOURCE_ENVIRONMENT: "staging" },
  { AWS_BRANCH: "codex-buzzkill-staging-migration" },
])("rejects foreign or mismatched mode overrides %j", (change) => {
  expect(() => businessEnvironment({ ...main, ...change })).toThrow("does not match");
});
it("requires deliberate business mode before releasing a retained destination backend", () => {
  const unconfigured = { ...main, BUZZKILL_SOURCE_ENVIRONMENT: undefined };
  expect(() => businessEnvironment(unconfigured)).toThrow("explicit matching");
  expect(businessEnvironment({ ...unconfigured, BUZZKILL_MIGRATION_PREVIEW: "true" })).toBe(main.AWS_BRANCH);
});

it("rejects migration configuration in a source, unresolved, or foreign stack", () => {
  expect(() => assertDestinationDeploymentIdentity("743917687359", "us-east-1")).not.toThrow();
  for (const account of ["637423611040", "foreign", "${Token[AWS.AccountId.1]}"]) expect(() => assertDestinationDeploymentIdentity(account, "us-east-1")).toThrow("dedicated BuzzKill destination");
  expect(() => assertDestinationDeploymentIdentity("743917687359", "us-west-2")).toThrow("dedicated BuzzKill destination");
});

it("preserves the destination backup vault name across preview activation", () => {
  for (const branch of ["codex-buzzkill-account-migration", "codex-buzzkill-staging-migration"]) {
    const before = retentionVaultName("d3owdoeg1om341", branch, true);
    expect(retentionVaultName("d3owdoeg1om341", branch, false)).toBe(before);
    expect(before.length).toBeLessThanOrEqual(50);
  }
  expect(retentionVaultName("d26qpsjewk0bee", "main", false)).toBe("buzzkill-main-retention");
  expect(retentionVaultName("d26qpsjewk0bee", "staging", false)).toBe("buzzkill-staging-retention");
});

it("keeps previews and staging noindex but indexes an activated production backend namespace", () => {
  const buildspec = readFileSync("../../amplify.yml", "utf8");
  const expression = buildspec.match(/if (.*); then\n\s+printf 'User-agent/)!;
  expect(expression).not.toBeNull();
  const noindex = (env: Record<string, string>) => spawnSync("sh", ["-c", `if ${expression[1]}; then exit 0; else exit 1; fi`], { env }).status === 0;
  expect(noindex({ AWS_BRANCH: "main" })).toBe(false);
  expect(noindex({ AWS_BRANCH: "staging" })).toBe(true);
  expect(noindex({ AWS_BRANCH: "codex-buzzkill-account-migration", BUZZKILL_SOURCE_ENVIRONMENT: "main", BUZZKILL_MIGRATION_PREVIEW: "true" })).toBe(true);
  expect(noindex({ AWS_BRANCH: "codex-buzzkill-account-migration", BUZZKILL_SOURCE_ENVIRONMENT: "main", BUZZKILL_MIGRATION_PREVIEW: "false" })).toBe(false);
  expect(noindex({ AWS_BRANCH: "codex-buzzkill-staging-migration", BUZZKILL_SOURCE_ENVIRONMENT: "staging", BUZZKILL_MIGRATION_PREVIEW: "false" })).toBe(true);
});
