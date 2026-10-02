import { afterEach, expect, it, vi } from "vitest";
import { App, CfnResource, NestedStack, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Construct } from "constructs";
import { applyMigrationBootstrap, bootstrapEnabled, BOOTSTRAP_DEFERRED_MODELS } from "./migration-bootstrap";

afterEach(() => vi.unstubAllEnvs());
const scope = {
  BUZZKILL_MIGRATION_BOOTSTRAP: "true",
  BUZZKILL_MIGRATION_PREVIEW: "true",
  BUZZKILL_DESTINATION_ACCOUNT_ID: "743917687359",
  CDK_DEFAULT_ACCOUNT: "743917687359",
  AWS_APP_ID: "d3owdoeg1om341",
  AWS_BRANCH: "codex-buzzkill-account-migration",
  BUZZKILL_BOOTSTRAP_EMPTY_DESTINATION_CONFIRMED: "true",
};
function enabled() { for (const [key, value] of Object.entries(scope)) vi.stubEnv(key, value); }
function fixture() {
  const stack = new Stack(new App(), "BootstrapTest", { env: { account: scope.CDK_DEFAULT_ACCOUNT, region: "us-east-1" } });
  const api = new Construct(stack, "amplifyData");
  const models: Record<string, NestedStack> = {};
  for (const [name, counts] of [...Object.entries(BOOTSTRAP_DEFERRED_MODELS), ...Array.from({ length: 30 }, (_, i) => [`Retained${i}`, [1, 1]] as const)]) {
    const model = new NestedStack(api, name); models[name] = model;
    new CfnResource(model, "Table", { type: "Custom::AmplifyDynamoDBTable", properties: { ServiceToken: "arn:aws:lambda:us-east-1:743917687359:function:synthetic", Model: name } });
    for (let i = 0; i < counts[0]; i++) new CfnResource(model, `Function${i}`, { type: "AWS::AppSync::FunctionConfiguration", properties: { Name: `${name}Fn${i}` } });
    for (let i = 0; i < counts[1]; i++) new CfnResource(model, `Resolver${i}`, { type: "AWS::AppSync::Resolver", properties: { FieldName: `${name}Field${i}` } });
  }
  return { stack, models };
}
it("is a complete no-op unless bootstrap is explicitly enabled", () => {
  vi.stubEnv("BUZZKILL_MIGRATION_BOOTSTRAP", undefined);
  const stack = new Stack(new App(), "Unrelated");
  expect(applyMigrationBootstrap(stack)).toBe(0);
  expect(bootstrapEnabled({ BUZZKILL_MIGRATION_BOOTSTRAP: "false" })).toBe(false);
});
it("requires every exact destination and empty-preflight guard", () => {
  for (const key of Object.keys(scope)) expect(() => bootstrapEnabled({ ...scope, [key]: "wrong" })).toThrow();
  expect(() => bootstrapEnabled({ ...scope, AWS_BRANCH: "main" })).toThrow();
  expect(() => bootstrapEnabled({ ...scope, BUZZKILL_DESTINATION_ACCOUNT_ID: "637423611040" })).toThrow();
  expect(bootstrapEnabled({ ...scope, AWS_BRANCH: "codex-buzzkill-staging-migration" })).toBe(true);
});
it("physically omits exactly 962 stateless resources and retains all 55 tables", () => {
  enabled(); const { stack, models } = fixture();
  expect(applyMigrationBootstrap(stack)).toBe(962);
  let tables = 0;
  for (const [name, model] of Object.entries(models)) {
    const template = Template.fromStack(model);
    template.resourceCountIs("Custom::AmplifyDynamoDBTable", 1); tables++;
    template.resourceCountIs("AWS::AppSync::FunctionConfiguration", name in BOOTSTRAP_DEFERRED_MODELS ? 0 : 1);
    template.resourceCountIs("AWS::AppSync::Resolver", name in BOOTSTRAP_DEFERRED_MODELS ? 0 : 1);
  }
  expect(tables).toBe(55);
});
it("rejects a missing reviewed model before removing any resources", () => {
  enabled(); const { stack, models } = fixture();
  models.LeadLifecycleClaim.node.scope!.node.tryRemoveChild("LeadLifecycleClaim");
  expect(() => applyMigrationBootstrap(stack)).toThrow("model stack changed");
  Template.fromStack(models.Agreement).resourceCountIs("AWS::AppSync::FunctionConfiguration", 26);
});
it("rejects count drift before removing any resources", () => {
  enabled(); const { stack, models } = fixture();
  new CfnResource(models.LeadLifecycleClaim, "Unexpected", { type: "AWS::AppSync::Resolver" });
  expect(() => applyMigrationBootstrap(stack)).toThrow("resource count changed");
  Template.fromStack(models.Agreement).resourceCountIs("AWS::AppSync::Resolver", 8);
});
it("leaves the complete final templates unchanged when bootstrap is disabled", () => {
  vi.stubEnv("BUZZKILL_MIGRATION_BOOTSTRAP", undefined);
  const before = fixture(), after = fixture();
  expect(applyMigrationBootstrap(after.stack)).toBe(0);
  for (const name of Object.keys(before.models)) {
    expect(Template.fromStack(after.models[name]).toJSON()).toEqual(Template.fromStack(before.models[name]).toJSON());
  }
});
