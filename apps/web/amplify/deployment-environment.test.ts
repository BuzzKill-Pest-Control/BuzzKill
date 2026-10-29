import { expect, it } from "vitest";
import { assertDestinationDeploymentIdentity, businessEnvironment } from "./deployment-environment";
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
