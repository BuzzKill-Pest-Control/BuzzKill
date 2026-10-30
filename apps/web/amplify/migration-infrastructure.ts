import { assertDestinationDeploymentIdentity } from "./deployment-environment";
import { areWorkersPaused } from "./cutover-pause";
import { FunctionUrlAuthType } from "aws-cdk-lib/aws-lambda";
import type { Alarm } from "aws-cdk-lib/aws-cloudwatch";
import type { SnsAction } from "aws-cdk-lib/aws-cloudwatch-actions";
import type { ITopic, ITopicSubscription } from "aws-cdk-lib/aws-sns";
import { isMigrationPreview } from "./functions/shared/migrationPreview";

export function publicFunctionUrlAuthType() {
  return isMigrationPreview() ? FunctionUrlAuthType.AWS_IAM : FunctionUrlAuthType.NONE;
}

export function subscribeBusinessEvents(topic: ITopic, subscription: ITopicSubscription): void {
  if (!isMigrationPreview() && !areWorkersPaused()) topic.addSubscription(subscription);
}

export function wireBusinessAlarm(alarm: Alarm, action: SnsAction): void {
  if (isMigrationPreview() || areWorkersPaused()) return;
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

/** Preserve canonical lead origins; allow the exact isolated staging website too. */
export function leadIntakeCorsOrigins(env = process.env): string[] {
  const origins = [
    "https://www.pestbuzzkill.com",
    "https://pestbuzzkill.com",
    "https://staging.pestbuzzkill.com",
    "https://buzzkill-pest-control.squarespace.com",
    "http://localhost:5173",
  ];
  if (env.AWS_APP_ID === "d3owdoeg1om341" &&
      env.AWS_BRANCH === "codex-buzzkill-staging-migration" &&
      env.BUZZKILL_SOURCE_ENVIRONMENT === "staging") {
    assertDestinationDeploymentIdentity(env.BUZZKILL_DEPLOY_ACCOUNT_ID ?? "", env.AWS_REGION ?? "");
    const stagingOrigin = "https://migration-staging.d3owdoeg1om341.amplifyapp.com";
    if (env.BUZZKILL_DESTINATION_ACCOUNT_ID !== "743917687359" || env.MARKETING_URL !== stagingOrigin) {
      throw new Error("Staging lead CORS requires the exact configured destination website origin.");
    }
    origins.push(stagingOrigin);
  }
  return origins;
}
