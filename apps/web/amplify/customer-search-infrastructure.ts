import { createHash } from "node:crypto";
import { Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table, type ITable } from "aws-cdk-lib/aws-dynamodb";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnEventSourceMapping, type IFunction } from "aws-cdk-lib/aws-lambda";

export function customerSearchTableName(appId: string, branch: string): string {
  return `CustomerSearch-${createHash("sha256").update(`${appId}:${branch}`).digest("hex").slice(0, 20)}-v1`;
}

/** No new model/query/directive operation and no Customer GSI/stream replacement. */
export function configureCustomerSearch(input: {
  customer: ITable; indexer: IFunction; reader: IFunction; appId: string; branch: string; preview: boolean; paused: boolean;
}) {
  const stack = Stack.of(input.indexer);
  if (!input.customer.tableStreamArn) throw new Error("Customer search requires the existing Customer stream");
  const tableName = customerSearchTableName(input.appId, input.branch);
  const table = new Table(stack, "CustomerSearchIndex", {
    tableName, partitionKey: { name: "pk", type: AttributeType.STRING }, sortKey: { name: "sk", type: AttributeType.STRING },
    billingMode: BillingMode.PAY_PER_REQUEST, removalPolicy: RemovalPolicy.RETAIN, deletionProtection: true,
    pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
  });
  const indexArn = stack.formatArn({ service: "dynamodb", resource: "table", resourceName: tableName });
  input.indexer.addToRolePolicy(new PolicyStatement({
    actions: ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Scan"], resources: [indexArn],
  }));
  input.customer.grant(input.indexer, "dynamodb:GetItem", "dynamodb:ConditionCheckItem", "dynamodb:Scan");
  // A literal app/branch-owned table ARN avoids auth↔data stack cycles through the existing crm-admin resolver.
  input.reader.addToRolePolicy(new PolicyStatement({ actions: ["dynamodb:Query"], resources: [indexArn] }));
  // Same model-name convention as the existing CAS policy; runtime resolves only its exact branch-bound API-ID SSM parameter.
  const customerArn = Stack.of(input.reader).formatArn({ service: "dynamodb", resource: "table", resourceName: "Customer-*" });
  input.reader.addToRolePolicy(new PolicyStatement({ actions: ["dynamodb:BatchGetItem"], resources: [customerArn] }));
  input.reader.addToRolePolicy(new PolicyStatement({ actions: ["dynamodb:Query"], resources: [`${customerArn}/index/customersByStatusAndDisplayName`] }));
  const mapping = new CfnEventSourceMapping(stack, "CustomerSearchStream", {
    eventSourceArn: input.customer.tableStreamArn, functionName: input.indexer.functionArn,
    startingPosition: "TRIM_HORIZON", batchSize: 10, maximumBatchingWindowInSeconds: 0,
    maximumRecordAgeInSeconds: Duration.hours(24).toSeconds(), maximumRetryAttempts: -1,
    bisectBatchOnFunctionError: true, functionResponseTypes: ["ReportBatchItemFailures"],
    enabled: !input.preview && !input.paused,
  });
  input.customer.grantStreamRead(input.indexer).applyBefore(mapping);
  return { table, mapping, tableName };
}
