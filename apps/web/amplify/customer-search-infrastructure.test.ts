import { expect, it } from "vitest";
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { configureCustomerSearch, customerSearchTableName } from "./customer-search-infrastructure";
function setup(preview: boolean, paused: boolean) {
  const stack = new Stack(new App(), "Search", { env: { account: "743917687359", region: "us-east-1" } });
  const customer = Table.fromTableAttributes(stack, "Customer", { tableArn: "arn:aws:dynamodb:us-east-1:743917687359:table/Customer-test-NONE", tableStreamArn: "arn:aws:dynamodb:us-east-1:743917687359:table/Customer-test-NONE/stream/existing" });
  const fn = (name: string) => new Function(stack, name, { runtime: Runtime.NODEJS_22_X, handler: "index.handler", code: Code.fromInline("exports.handler=async()=>{}") });
  configureCustomerSearch({ customer, indexer: fn("Indexer"), reader: fn("Reader"), appId: "app", branch: "physical", preview, paused });
  return Template.fromStack(stack).toJSON().Resources as Record<string, { Type: string; Properties: Record<string, unknown>; DeletionPolicy?: string; UpdateReplacePolicy?: string }>;
}
it("uses the existing stream and a retained, protected, recoverable plain projection table without Customer indexes", () => {
  const resources = Object.values(setup(false, false));
  const tables = resources.filter((r) => r.Type === "AWS::DynamoDB::Table");
  expect(tables).toHaveLength(1);
  expect(tables[0]).toMatchObject({ DeletionPolicy: "Retain", UpdateReplacePolicy: "Retain", Properties: {
    TableName: customerSearchTableName("app", "physical"), BillingMode: "PAY_PER_REQUEST", DeletionProtectionEnabled: true,
    PointInTimeRecoverySpecification: { PointInTimeRecoveryEnabled: true },
  } });
  expect(tables[0].Properties).not.toHaveProperty("GlobalSecondaryIndexes");
  expect(tables[0].Properties).not.toHaveProperty("StreamSpecification");
  const mapping = resources.find((r) => r.Type === "AWS::Lambda::EventSourceMapping")!;
  expect(mapping.Properties).toMatchObject({ EventSourceArn: "arn:aws:dynamodb:us-east-1:743917687359:table/Customer-test-NONE/stream/existing", BatchSize: 10, StartingPosition: "TRIM_HORIZON", MaximumRecordAgeInSeconds: 86400, MaximumRetryAttempts: -1, BisectBatchOnFunctionError: true, FunctionResponseTypes: ["ReportBatchItemFailures"], Enabled: true });
});
it.each([[true, false], [false, true]])("disables preview or paused stream mapping %s/%s", (preview, paused) => {
  const mapping = Object.values(setup(preview, paused)).find((r) => r.Type === "AWS::Lambda::EventSourceMapping")!;
  expect(mapping.Properties.Enabled).toBe(false);
});
it("grants only exact projection/source maintenance and selected reader actions, never business-row writes", () => {
  const resources = setup(false, false);
  const policies = Object.entries(resources).filter(([, r]) => r.Type === "AWS::IAM::Policy");
  const indexer = policies.find(([id]) => id.startsWith("Indexer"))![1].Properties.PolicyDocument as { Statement: { Action: string | string[]; Resource: unknown }[] };
  const reader = policies.find(([id]) => id.startsWith("Reader"))![1].Properties.PolicyDocument as typeof indexer;
  expect(indexer.Statement.find((s) => JSON.stringify(s.Resource).includes("CustomerSearch-"))?.Action).toEqual(["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Scan"]);
  const source = indexer.Statement.find((s) => JSON.stringify(s.Resource).includes("Customer-test-NONE") && !JSON.stringify(s.Resource).includes("stream"))!;
  expect(source.Action).toEqual(["dynamodb:GetItem", "dynamodb:ConditionCheckItem", "dynamodb:Scan"]);
  expect(JSON.stringify(indexer)).not.toMatch(/dynamodb:\*|UpdateItem|BatchWriteItem/);
  const readerActions = reader.Statement.flatMap((s) => s.Action).sort();
  expect(readerActions).toEqual(["dynamodb:BatchGetItem", "dynamodb:Query", "dynamodb:Query"]);
  expect(JSON.stringify(reader)).not.toMatch(/PutItem|DeleteItem|Scan|UpdateItem/);
});
