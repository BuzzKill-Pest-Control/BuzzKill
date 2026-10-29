import type { VerifyAuthChallengeResponseTriggerEvent } from "aws-lambda";
import { MIGRATION_PREVIEW_MESSAGE } from "./migrationPreview";

export const PREVIEW_ADMIN_CRM_ORIGIN = "https://migration.d2y2zigtl5rx3.amplifyapp.com";
export const PREVIEW_ADMIN_FROM = "info@pestbuzzkill.com";
export const PREVIEW_ADMIN_ACCOUNT = "743917687359";
export const PREVIEW_ADMIN_BRANCH = "codex-buzzkill-account-migration";

export type PreviewAdminLoginConfig = { email: string; username: string; until: string; configurationSet: string };

/** Default off and short-lived. Only the isolated main preview can opt in. */
export function previewAdminLoginConfig(env = process.env, now = Date.now()): PreviewAdminLoginConfig | undefined {
  if (env.BUZZKILL_PREVIEW_ADMIN_LOGIN !== "true") return undefined;
  const email = env.BUZZKILL_PREVIEW_ADMIN_EMAIL ?? "";
  const username = env.BUZZKILL_PREVIEW_ADMIN_USERNAME ?? "";
  const until = env.BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL ?? "";
  const deadline = Date.parse(until);
  const configurationSet = env.BUZZKILL_PREVIEW_SES_CONFIGURATION_SET ?? "";
  if (env.BUZZKILL_MIGRATION_PREVIEW !== "true" ||
      env.BUZZKILL_DESTINATION_ACCOUNT_ID !== PREVIEW_ADMIN_ACCOUNT ||
      env.BUZZKILL_PREVIEW_AUTH_BRANCH !== PREVIEW_ADMIN_BRANCH ||
      env.CRM_APP_URL !== PREVIEW_ADMIN_CRM_ORIGIN ||
      !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(email) ||
      !/^[a-zA-Z0-9@._+-]{1,128}$/.test(username) ||
      !/^buzzkill-migration-preview-[a-z0-9-]+$/.test(configurationSet) ||
      !Number.isFinite(deadline) || deadline <= now || deadline > now + 24 * 60 * 60 * 1000) {
    throw new Error("Invalid or expired migration administrator sign-in configuration.");
  }
  return { email, username, until, configurationSet };
}

/** Check before touching a challenge, Cognito identity, or an external provider. */
export function assertPreviewAdminChallenge(event: VerifyAuthChallengeResponseTriggerEvent, env = process.env): PreviewAdminLoginConfig {
  const config = previewAdminLoginConfig(env);
  if (!config) throw new Error(MIGRATION_PREVIEW_MESSAGE);
  if (event.triggerSource !== "VerifyAuthChallengeResponse_Authentication" ||
      event.region !== "us-east-1" ||
      event.userPoolId !== env.BUZZKILL_PREVIEW_AUTH_POOL_ID ||
      event.callerContext?.clientId !== env.BUZZKILL_PREVIEW_AUTH_CLIENT_ID ||
      !env.BUZZKILL_PREVIEW_AUTH_POOL_ID || !env.BUZZKILL_PREVIEW_AUTH_CLIENT_ID ||
      event.userName !== config.username || event.request.userNotFound === true ||
      event.request.userAttributes?.email !== config.email ||
      event.request.userAttributes?.email_verified !== "true") {
    throw new Error("Migration administrator sign-in is unavailable for this identity.");
  }
  return config;
}
