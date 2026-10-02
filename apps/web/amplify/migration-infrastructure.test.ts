import { afterEach, describe, expect, it, vi } from "vitest";
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription, LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Metric } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { publicFunctionUrlAuthType, subscribeBusinessEvents, wireBusinessAlarm } from "./migration-infrastructure";
afterEach(() => vi.unstubAllEnvs());
function synth() {
  const stack = new Stack(new App(), "MigrationBoundaries");
  const fn = new Function(stack, "BusinessFunction", { runtime: Runtime.NODEJS_20_X, handler: "index.handler", code: Code.fromInline("exports.handler = async () => {}") });
  fn.addFunctionUrl({ authType: publicFunctionUrlAuthType() });
  const topic = new Topic(stack, "Events");
  subscribeBusinessEvents(topic, new LambdaSubscription(fn));
  subscribeBusinessEvents(topic, new EmailSubscription("nobody@example.invalid"));
  const alarm = new Metric({ namespace: "Synthetic", metricName: "Errors" }).createAlarm(stack, "Alarm", { threshold: 1, evaluationPeriods: 1 });
  wireBusinessAlarm(alarm, new SnsAction(topic));
  return Template.fromStack(stack);
}
describe("synthesized migration infrastructure", () => {
  it("requires IAM URLs and omits subscriptions and alarm actions in preview", () => {
    vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", "true");
    const template = synth();
    template.hasResourceProperties("AWS::Lambda::Url", { AuthType: "AWS_IAM" });
    template.resourceCountIs("AWS::SNS::Subscription", 0);
    const alarm = Object.values(template.findResources("AWS::CloudWatch::Alarm"))[0].Properties;
    expect(alarm).not.toHaveProperty("AlarmActions"); expect(alarm).not.toHaveProperty("OKActions");
  });
  it("retains public URLs and business events outside preview", () => {
    vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", undefined);
    const template = synth();
    template.hasResourceProperties("AWS::Lambda::Url", { AuthType: "NONE" });
    template.resourceCountIs("AWS::SNS::Subscription", 2);
    const alarm = Object.values(template.findResources("AWS::CloudWatch::Alarm"))[0].Properties;
    expect(alarm.AlarmActions).toHaveLength(1); expect(alarm.OKActions).toHaveLength(1);
  });
});
