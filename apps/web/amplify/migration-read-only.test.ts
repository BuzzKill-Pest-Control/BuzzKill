import { afterEach, expect, it, vi } from "vitest";
import { App, NestedStack, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { CfnResolver } from "aws-cdk-lib/aws-appsync";
import { makeMigrationPreviewReadOnly, PREVIEW_MUTATION_REFUSAL } from "./migration-read-only";

afterEach(() => vi.unstubAllEnvs());
function fixture() {
  const stack = new Stack(new App(), "ReadOnlyPreview");
  const model = new NestedStack(stack, "PromoCode");
  const mutation = new CfnResolver(model, "Create", {
    apiId: "synthetic", typeName: "Mutation", fieldName: "createPromoCode",
    kind: "PIPELINE", pipelineConfig: { functions: ["synthetic-function"] },
    requestMappingTemplateS3Location: "s3://synthetic/mutation.vtl",
  });
  new CfnResolver(model, "List", {
    apiId: "synthetic", typeName: "Query", fieldName: "listPromoCodes",
    requestMappingTemplate: "{}", responseMappingTemplate: "$util.toJson($ctx.result)",
  });
  return { stack, model, mutation };
}
it("refuses nested generated writes before the pipeline and keeps reads", () => {
  vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", "true");
  const { stack, model } = fixture();
  expect(makeMigrationPreviewReadOnly(stack)).toBe(1);
  const resources = Object.values(Template.fromStack(model).findResources("AWS::AppSync::Resolver"));
  const write = resources.find((r) => r.Properties.TypeName === "Mutation")!;
  expect(write.Properties.RequestMappingTemplate).toBe(PREVIEW_MUTATION_REFUSAL);
  expect(write.Properties).not.toHaveProperty("RequestMappingTemplateS3Location");
  expect(resources.find((r) => r.Properties.TypeName === "Query")!.Properties.RequestMappingTemplate).toBe("{}");
});
it("leaves normal deployment templates unchanged", () => {
  vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", undefined);
  const { stack, model } = fixture();
  expect(makeMigrationPreviewReadOnly(stack)).toBe(0);
  Template.fromStack(model).hasResourceProperties("AWS::AppSync::Resolver", {
    FieldName: "createPromoCode", RequestMappingTemplateS3Location: "s3://synthetic/mutation.vtl",
  });
});
it("fails closed if generated mutations switch runtime or disappear", () => {
  vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", "true");
  const { stack, mutation } = fixture();
  mutation.runtime = { name: "APPSYNC_JS", runtimeVersion: "1.0.0" };
  expect(() => makeMigrationPreviewReadOnly(stack)).toThrow("cannot guard");
  expect(() => makeMigrationPreviewReadOnly(new Stack(new App(), "Empty"))).toThrow("no mutation resolvers");
});
