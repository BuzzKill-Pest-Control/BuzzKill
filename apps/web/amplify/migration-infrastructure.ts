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
