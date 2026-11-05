import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type OperationalTemplate = {
  Parameters: Record<string, { Type: string; Default?: string; AllowedValues?: string[]; AllowedPattern?: string }>;
  Resources: Record<string, { Type: string; Properties: Record<string, unknown> }>;
  Outputs: Record<string, { Value: unknown }>;
};

const template = JSON.parse(readFileSync(new URL("./operational-slack.template.json", import.meta.url), "utf8")) as OperationalTemplate;
const resources = template.Resources;

describe("independent production operational Slack infrastructure", () => {
  it("retains exactly the verified managed route and no temporary topic or email sender", () => {
    expect(Object.fromEntries(Object.entries(resources).map(([name, resource]) => [name, resource.Type]))).toEqual({
      PreflightNotificationsPolicy: "AWS::IAM::ManagedPolicy",
      PreflightNotificationsRole: "AWS::IAM::Role",
      PreflightSlackConfiguration: "AWS::Chatbot::SlackChannelConfiguration",
    });
  });

  it("keeps the channel identity stable instead of replacing the only allowed account/channel configuration", () => {
    const name = "buzzkill-operational-preflight-20261105-041453-84f14e";
    expect(template.Parameters.ConfigurationName.Default).toBe(name);
    expect(template.Parameters.ConfigurationName.AllowedValues).toEqual([name]);
    // IAM policy descriptions are immutable; changing this would replace its verified ARN.
    expect(resources.PreflightNotificationsPolicy.Properties.Description).toBe("Amazon Q notifications-only CloudWatch reads for the temporary BuzzKill preflight.");
  });

  it("requires the existing production topic in the correct AWS account and region", () => {
    const parameter = template.Parameters.ProductionTopicArn;
    expect(parameter.Default).toBeUndefined();
    const pattern = new RegExp(parameter.AllowedPattern!);
    expect(pattern.test("arn:aws:sns:us-east-1:743917687359:production-watchdogs")).toBe(true);
    for (const value of ["", "arn:aws:sns:us-west-2:743917687359:watchdogs", "arn:aws:sns:us-east-1:637423611040:watchdogs", "https://example.com", "arn:aws:sns:us-east-1:743917687359:watchdogs.fifo"]) {
      expect(pattern.test(value)).toBe(false);
    }
    expect(resources.PreflightSlackConfiguration.Properties.SnsTopicArns).toEqual([{ Ref: "ProductionTopicArn" }]);
    expect(template.Outputs.TopicArn.Value).toEqual({ Ref: "ProductionTopicArn" });
  });

  it("allows only CloudWatch notification reads and assumes only the managed Chatbot service", () => {
    expect(resources.PreflightNotificationsPolicy.Properties.PolicyDocument).toEqual({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Action: ["cloudwatch:Describe*", "cloudwatch:Get*", "cloudwatch:List*"], Resource: "*" }],
    });
    expect(resources.PreflightNotificationsRole.Properties.AssumeRolePolicyDocument).toEqual({
      Version: "2012-10-17",
      Statement: [{ Effect: "Allow", Principal: { Service: "chatbot.amazonaws.com" }, Action: "sts:AssumeRole" }],
    });
    expect(resources.PreflightNotificationsRole.Properties.ManagedPolicyArns).toEqual([{ Ref: "PreflightNotificationsPolicy" }]);
  });

  it("routes only to private BuzzKill with explicit notifications-only guardrails", () => {
    expect(resources.PreflightSlackConfiguration.Properties).toEqual({
      ConfigurationName: { Ref: "ConfigurationName" },
      IamRoleArn: { "Fn::GetAtt": ["PreflightNotificationsRole", "Arn"] },
      SlackWorkspaceId: "T0C66F8M9U3",
      SlackChannelId: "C0CEZEQCML6",
      SnsTopicArns: [{ Ref: "ProductionTopicArn" }],
      GuardrailPolicies: [{ Ref: "PreflightNotificationsPolicy" }],
      UserRoleRequired: true,
      LoggingLevel: "NONE",
      Tags: [{ Key: "owner", Value: "buzzkill-operational-slack" }, { Key: "stage", Value: "production" }],
    });
  });
});
