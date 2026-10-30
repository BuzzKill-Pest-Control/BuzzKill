import { afterEach, describe, expect, it, vi } from "vitest";
import type { VerifyAuthChallengeResponseTriggerEvent } from "aws-lambda";
import { assertPreviewAdminChallenge, previewAdminLoginConfig, PREVIEW_ADMIN_CRM_ORIGIN } from "./previewAdminLogin";

const now = Date.parse("2026-10-29T16:00:00Z");
const good = {
  BUZZKILL_MIGRATION_PREVIEW: "true", BUZZKILL_PREVIEW_ADMIN_LOGIN: "true",
  BUZZKILL_DESTINATION_ACCOUNT_ID: "743917687359",
  BUZZKILL_PREVIEW_AUTH_BRANCH: "codex-buzzkill-account-migration",
  BUZZKILL_PREVIEW_ADMIN_EMAIL: "owner@example.com", BUZZKILL_PREVIEW_ADMIN_USERNAME: "destination-user",
  BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL: "2026-10-29T17:00:00Z",
  BUZZKILL_PREVIEW_SES_CONFIGURATION_SET: "buzzkill-migration-preview-test",
  BUZZKILL_PREVIEW_AUTH_POOL_ID: "us-east-1_destination", BUZZKILL_PREVIEW_AUTH_CLIENT_ID: "destination-client",
  CRM_APP_URL: PREVIEW_ADMIN_CRM_ORIGIN,
};
const event = () => ({ version: "1", response: { answerCorrect: false }, triggerSource: "VerifyAuthChallengeResponse_Authentication", region: "us-east-1",
  userPoolId: good.BUZZKILL_PREVIEW_AUTH_POOL_ID, callerContext: { clientId: good.BUZZKILL_PREVIEW_AUTH_CLIENT_ID, awsSdkVersion: "test" },
  userName: "destination-user", request: { challengeAnswer: "REQUEST_LINK", privateChallengeParameters: {}, userAttributes: { email: "owner@example.com", email_verified: "true" } },
}) as VerifyAuthChallengeResponseTriggerEvent;
afterEach(() => vi.useRealTimers());

describe("expiring isolated administrator login", () => {
  it("is off unless deliberately configured and refuses without reading the request", () => {
    expect(previewAdminLoginConfig({}, now)).toBeUndefined();
    expect(() => assertPreviewAdminChallenge(new Proxy({}, { get() { throw new Error("request inspected"); } }) as VerifyAuthChallengeResponseTriggerEvent, {})).toThrow("business actions and external services are disabled");
  });
  it.each([
    ["BUZZKILL_MIGRATION_PREVIEW", "false"], ["BUZZKILL_DESTINATION_ACCOUNT_ID", "637423611040"],
    ["BUZZKILL_PREVIEW_AUTH_BRANCH", "main"], ["BUZZKILL_PREVIEW_AUTH_BRANCH", "codex-buzzkill-staging-migration"],
    ["CRM_APP_URL", "https://app.pestbuzzkill.com"], ["CRM_APP_URL", PREVIEW_ADMIN_CRM_ORIGIN + "/evil"],
    ["CRM_APP_URL", PREVIEW_ADMIN_CRM_ORIGIN + ".evil.example"],
    ["BUZZKILL_PREVIEW_ADMIN_EMAIL", "Owner <owner@example.com>"], ["BUZZKILL_PREVIEW_ADMIN_EMAIL", "owner@example.com,other@example.com"],
    ["BUZZKILL_PREVIEW_ADMIN_USERNAME", ""], ["BUZZKILL_PREVIEW_SES_CONFIGURATION_SET", "production-mail"],
    ["BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL", "2026-10-29T15:00:00Z"],
    ["BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL", "2026-10-31T15:00:00Z"], ["BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL", "invalid"],
  ])("rejects unsafe %s=%s", (key, value) => {
    expect(() => previewAdminLoginConfig({ ...good, [key]: value }, now)).toThrow("Invalid or expired");
  });
  it("accepts only the configured destination user and Cognito client", () => {
    vi.useFakeTimers(); vi.setSystemTime(now);
    expect(assertPreviewAdminChallenge(event(), good).email).toBe("owner@example.com");
    const altered = [
      { ...event(), triggerSource: "OtherChallenge" }, { ...event(), region: "us-west-2" },
      { ...event(), userPoolId: "us-east-1_source" }, { ...event(), callerContext: { clientId: "source-client" } },
      { ...event(), userName: "another-user" },
      { ...event(), request: { ...event().request, userNotFound: true } },
      { ...event(), request: { userAttributes: { email: "another@example.com", email_verified: "true" } } },
      { ...event(), request: { userAttributes: { email: "owner@example.com", email_verified: "false" } } },
    ];
    for (const bad of altered) expect(() => assertPreviewAdminChallenge(bad as VerifyAuthChallengeResponseTriggerEvent, good)).toThrow("unavailable for this identity");
    for (const key of ["BUZZKILL_PREVIEW_AUTH_POOL_ID", "BUZZKILL_PREVIEW_AUTH_CLIENT_ID"]) expect(() => assertPreviewAdminChallenge(event(), { ...good, [key]: "" })).toThrow("unavailable for this identity");
    vi.setSystemTime(Date.parse(good.BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL));
    expect(() => assertPreviewAdminChallenge(event(), good)).toThrow("expired");
  });
});
