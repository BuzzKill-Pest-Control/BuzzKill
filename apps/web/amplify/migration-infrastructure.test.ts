import { afterEach, describe, expect, it, vi } from "vitest";
import { App, Stack } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { Topic } from "aws-cdk-lib/aws-sns";
import { EmailSubscription, LambdaSubscription } from "aws-cdk-lib/aws-sns-subscriptions";
import { Metric } from "aws-cdk-lib/aws-cloudwatch";
import { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import { migrationBookingCorsOrigins, publicFunctionUrlAuthType, subscribeBusinessEvents, wireBusinessAlarm } from "./migration-infrastructure";
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

describe("migration booking CORS", () => {
  it.each(["migration", "migration-staging"])("synthesizes only the paired destination origins for %s", (prefix) => {
    const website = `https://${prefix}.d3owdoeg1om341.amplifyapp.com`;
    const crm = `https://${prefix}.d2y2zigtl5rx3.amplifyapp.com`;
    const stack = new Stack(new App(), "PreviewCors");
    new Function(stack, "Booking", {
      runtime: Runtime.NODEJS_20_X, handler: "index.handler", code: Code.fromInline("exports.handler = async () => {}"),
      environment: { BOOKING_CORS_ORIGINS: migrationBookingCorsOrigins(website + "/", crm) },
    });
    Template.fromStack(stack).hasResourceProperties("AWS::Lambda::Function", {
      Environment: { Variables: { BOOKING_CORS_ORIGINS: `${website},${crm}` } },
    });
  });
  it.each([
    "", "https://preview-unconfigured.invalid", "http://migration.d3owdoeg1om341.amplifyapp.com",
    "https://staging.d26qpsjewk0bee.amplifyapp.com", "https://staging.d5ln2hbbp9s2j.amplifyapp.com",
    "https://migration.d3owdoeg1om341.amplifyapp.com/quote", "https://migration.d3owdoeg1om341.amplifyapp.com?other=origin",
    "https://user@migration.d3owdoeg1om341.amplifyapp.com",
  ])("refuses an absent, source or unsafe origin in either position: %s", (origin) => {
    const destination = "https://migration.d2y2zigtl5rx3.amplifyapp.com";
    expect(() => migrationBookingCorsOrigins(origin, destination)).toThrow();
    expect(() => migrationBookingCorsOrigins(destination, origin)).toThrow();
  });
  it("refuses duplicate apps or cross-environment pairing", () => {
    const website = "https://migration.d3owdoeg1om341.amplifyapp.com";
    expect(() => migrationBookingCorsOrigins(website, website)).toThrow();
    expect(() => migrationBookingCorsOrigins(website, "https://migration-staging.d2y2zigtl5rx3.amplifyapp.com")).toThrow();
  });
});
