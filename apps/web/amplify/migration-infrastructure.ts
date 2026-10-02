import { FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
import type { Alarm } from "aws-cdk-lib/aws-cloudwatch";
import type { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import type { ITopic, ITopicSubscription } from "aws-cdk-lib/aws-sns";
import { isMigrationPreview } from "./functions/shared/migrationPreview";

export function publicFunctionUrlAuthType() {
  return isMigrationPreview() ? FunctionUrlAuthType.AWS_IAM : FunctionUrlAuthType.NONE;
}

export function subscribeBusinessEvents(topic: ITopic, subscription: ITopicSubscription): void {
  if (!isMigrationPreview()) topic.addSubscription(subscription);
}

export function wireBusinessAlarm(alarm: Alarm, action: SnsAction): void {
  if (isMigrationPreview()) return;
  alarm.addAlarmAction(action);
  alarm.addOkAction(action);
}

/** Preview CORS accepts only the configured pair of destination Hosting origins. */
export function migrationBookingCorsOrigins(marketingUrl: string, crmUrl: string): string {
  const origins = [marketingUrl, crmUrl].map((value) => {
    const url = new URL(value);
    if (
      url.protocol !== "https:" || url.username || url.password || url.port ||
      url.pathname !== "/" || url.search || url.hash ||
      !/^[a-z0-9-]+\.d[a-z0-9]+\.amplifyapp\.com$/.test(url.hostname) ||
      /\.(?:d26qpsjewk0bee|d5ln2hbbp9s2j)\.amplifyapp\.com$/.test(url.hostname)
    ) throw new Error("Migration preview requires configured destination website and CRM origins.");
    return url.origin;
  });
  if (origins[0] === origins[1] || new URL(origins[0]).hostname.split(".")[0] !== new URL(origins[1]).hostname.split(".")[0]) {
    throw new Error("Migration preview requires distinct website and CRM origins for the same environment.");
  }
  return origins.join(",");
}
