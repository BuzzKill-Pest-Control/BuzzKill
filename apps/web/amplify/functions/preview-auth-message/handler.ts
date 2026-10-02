import type { CustomMessageTriggerHandler } from "aws-lambda";

/** A failed custom-message trigger aborts native Cognito email/SMS delivery. */
export const handler: CustomMessageTriggerHandler = async () => {
  throw new Error("Migration preview: authentication messages are disabled.");
};
