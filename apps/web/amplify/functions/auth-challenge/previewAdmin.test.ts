import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VerifyAuthChallengeResponseTriggerEvent } from "aws-lambda";
const mocks = vi.hoisted(() => ({ cognito: vi.fn(), ses: vi.fn(), businessEmail: vi.fn() }));
vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: class { send = mocks.cognito; },
  AdminUpdateUserAttributesCommand: class { constructor(public input: unknown) {} },
}));
vi.mock("@aws-sdk/client-ses", () => ({ SESClient: class { send = mocks.ses; }, SendEmailCommand: class { constructor(public input: unknown) {} } }));
vi.mock("../shared/email", () => ({ sendEmail: mocks.businessEmail, emailShell: vi.fn() }));
const { handler } = await import("./verify");
const origin = "https://migration.d2y2zigtl5rx3.amplifyapp.com";
const now = Date.parse("2026-10-29T16:00:00Z");
const config = {
  BUZZKILL_MIGRATION_PREVIEW: "true", BUZZKILL_PREVIEW_ADMIN_LOGIN: "true",
  BUZZKILL_DESTINATION_ACCOUNT_ID: "743917687359", BUZZKILL_PREVIEW_AUTH_BRANCH: "codex-buzzkill-account-migration",
  BUZZKILL_PREVIEW_ADMIN_EMAIL: "owner@example.com", BUZZKILL_PREVIEW_ADMIN_USERNAME: "destination-user",
  BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL: "2026-10-29T17:00:00Z",
  BUZZKILL_PREVIEW_SES_CONFIGURATION_SET: "buzzkill-migration-preview-test",
  BUZZKILL_PREVIEW_AUTH_POOL_ID: "us-east-1_destination", BUZZKILL_PREVIEW_AUTH_CLIENT_ID: "destination-client", CRM_APP_URL: origin,
};
function event(answer = "REQUEST_LINK", attrs: Record<string, string> = {}): VerifyAuthChallengeResponseTriggerEvent {
  return { version: "1", region: "us-east-1", triggerSource: "VerifyAuthChallengeResponse_Authentication", userPoolId: config.BUZZKILL_PREVIEW_AUTH_POOL_ID,
    callerContext: { clientId: config.BUZZKILL_PREVIEW_AUTH_CLIENT_ID, awsSdkVersion: "test" }, userName: "destination-user",
    request: { challengeAnswer: answer, privateChallengeParameters: {}, userAttributes: { email: "owner@example.com", email_verified: "true", ...attrs } }, response: { answerCorrect: false },
  };
}
const invoke = (input: VerifyAuthChallengeResponseTriggerEvent) => handler(input, {} as never, () => {});
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.clearAllMocks(); for (const [key, value] of Object.entries(config)) vi.stubEnv(key, value); mocks.ses.mockResolvedValue({ MessageId: "test-message" }); mocks.cognito.mockResolvedValue({}); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
describe("preview administrator magic link", () => {
  it("sends only the explicit test recipient, through the preview config set, without business email/data", async () => {
    const response = await invoke(event());
    expect(response?.response.answerCorrect).toBe(false);
    expect(mocks.businessEmail).not.toHaveBeenCalled();
    expect(mocks.cognito).toHaveBeenCalledTimes(1); expect(mocks.ses).toHaveBeenCalledTimes(1);
    const send = mocks.ses.mock.calls[0][0].input;
    expect(send).toMatchObject({ Source: "info@pestbuzzkill.com", Destination: { ToAddresses: ["owner@example.com"] }, ConfigurationSetName: "buzzkill-migration-preview-test" });
    expect(send.Message.Subject.Data).toContain("[Migration test]");
    expect(send.Message.Body.Text.Data).toContain(origin + "/welcome#email=owner%40example.com&token=");
    const token = /token=([a-zA-Z0-9_-]+)/.exec(send.Message.Body.Text.Data)![1];
    const attrs = Object.fromEntries(mocks.cognito.mock.calls[0][0].input.UserAttributes.map((a: { Name: string; Value: string }) => [a.Name, a.Value]));
    expect(attrs["custom:loginTokenHash"]).toBe(createHash("sha256").update(token).digest("hex"));
  });
  it("rejects other recipients and wrong pool/client before writing or sending", async () => {
    for (const input of [event("REQUEST_LINK", { email: "customer@example.com" }), { ...event(), userPoolId: "source-pool" }, { ...event(), callerContext: { ...event().callerContext, clientId: "source-client" } }]) {
      await expect(invoke(input)).rejects.toThrow("unavailable for this identity");
    }
    expect(mocks.cognito).not.toHaveBeenCalled(); expect(mocks.ses).not.toHaveBeenCalled();
  });
  it("redeems only an unexpired stored token once and never sends on redemption", async () => {
    const answer = "test-43-character-token";
    const attrs = { "custom:loginTokenHash": createHash("sha256").update(answer).digest("hex"), "custom:loginTokenExp": String(now + 60_000) };
    expect((await invoke(event("wrong", attrs)))?.response.answerCorrect).toBe(false);
    expect(mocks.cognito).not.toHaveBeenCalled();
    expect((await invoke(event(answer, attrs)))?.response.answerCorrect).toBe(true);
    expect(mocks.cognito.mock.calls[0][0].input.UserAttributes).toEqual([{ Name: "custom:loginTokenHash", Value: "" }, { Name: "custom:loginTokenExp", Value: "0" }]);
    expect((await invoke(event(answer, { "custom:loginTokenHash": "", "custom:loginTokenExp": "0" })))?.response.answerCorrect).toBe(false);
    expect(mocks.ses).not.toHaveBeenCalled();
  });
  it("stops all preview login effects after expiry", async () => {
    vi.setSystemTime(Date.parse(config.BUZZKILL_PREVIEW_ADMIN_LOGIN_UNTIL));
    await expect(invoke(event())).rejects.toThrow("expired");
    expect(mocks.cognito).not.toHaveBeenCalled(); expect(mocks.ses).not.toHaveBeenCalled();
  });
  it("surfaces an SES failure instead of claiming the test email was sent", async () => {
    mocks.ses.mockRejectedValueOnce(new Error("SES refused"));
    await expect(invoke(event())).rejects.toThrow("SES refused");
    expect(mocks.businessEmail).not.toHaveBeenCalled();
  });
});
