import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PreSignUpTriggerEvent } from "aws-lambda";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));

type SentCommand = { kind: string; input: Record<string, unknown> };
vi.mock("@aws-sdk/client-cognito-identity-provider", () => ({
  CognitoIdentityProviderClient: class {
    send = send;
  },
  AdminGetUserCommand: class {
    kind = "get";
    constructor(public input: Record<string, unknown>) {}
  },
  AdminLinkProviderForUserCommand: class {
    kind = "link";
    constructor(public input: Record<string, unknown>) {}
  },
}));

const { handler } = await import("./handler");
const unchangedResponse = {
  autoConfirmUser: false,
  autoVerifyEmail: false,
  autoVerifyPhone: false,
};

function event(
  attrs: Record<string, string> = {},
  triggerSource: PreSignUpTriggerEvent["triggerSource"] = "PreSignUp_ExternalProvider",
  userName = "Google_123_Subject"
): PreSignUpTriggerEvent {
  return {
    version: "1",
    region: "us-east-1",
    callerContext: { awsSdkVersion: "test", clientId: "client-1" },
    userPoolId: "pool-1",
    userName,
    triggerSource,
    request: {
      userAttributes: {
        email: "dana@gmail.com",
        email_verified: "true",
        ...attrs,
      },
    },
    response: { ...unchangedResponse },
  } as PreSignUpTriggerEvent;
}

function nativeUser(overrides: Record<string, unknown> = {}) {
  return {
    Username: "native-uuid",
    Enabled: true,
    UserStatus: "CONFIRMED",
    UserAttributes: [
      { Name: "sub", Value: "original-staff-sub" },
      { Name: "email", Value: "dana@gmail.com" },
      { Name: "email_verified", Value: "true" },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  send.mockReset();
  send.mockImplementation(async (command: SentCommand) =>
    command.kind === "get" ? nativeUser() : {}
  );
});
afterEach(() => vi.unstubAllEnvs());

describe("Google sign-in account linking", () => {
  it("refuses migration-preview linking before reading or changing copied accounts", async () => {
    vi.stubEnv("BUZZKILL_MIGRATION_PREVIEW", "true");
    await expect(handler(event())).rejects.toThrow(/Migration preview/);
    expect(send).not.toHaveBeenCalled();
  });

  it("links the exact Google subject to the existing native username, preserving the login identity", async () => {
    const incoming = event({ email: "  Dana@GMAIL.COM  " });
    expect(await handler(incoming)).toBe(incoming);
    expect(incoming.response).toEqual(unchangedResponse);
    expect(send.mock.calls.map(([command]) => command)).toEqual([
      {
        kind: "get",
        input: { UserPoolId: "pool-1", Username: "dana@gmail.com" },
      },
      {
        kind: "link",
        input: {
          UserPoolId: "pool-1",
          DestinationUser: {
            ProviderName: "Cognito",
            ProviderAttributeValue: "native-uuid",
          },
          SourceUser: {
            ProviderName: "Google",
            ProviderAttributeName: "Cognito_Subject",
            ProviderAttributeValue: "123_Subject",
          },
        },
      },
    ]);
  });

  it("accepts Cognito's lowercase provider prefix without lowercasing the subject", async () => {
    await handler(event({}, "PreSignUp_ExternalProvider", "google_SubJECT_123"));
    expect(send.mock.calls[1][0].input.SourceUser.ProviderAttributeValue).toBe(
      "SubJECT_123"
    );
  });

  it("allows a verified Workspace mailbox whose domain matches Google's mapped hosted domain", async () => {
    send.mockResolvedValueOnce(
      nativeUser({
        UserAttributes: [
          { Name: "email", Value: "dana@buzzkill.example" },
          { Name: "email_verified", Value: "true" },
        ],
      })
    );
    await handler(
      event({
        email: "dana@buzzkill.example",
        "custom:googleHostedDomain": "BUZZKILL.EXAMPLE",
      })
    );
    expect(send.mock.calls[1][0].kind).toBe("link");
  });

  it.each([
    ["a non-Google provider", {}, "Facebook_123"],
    ["a missing Google subject", {}, "google_"],
    ["an invalid subject", {}, "google_123 456"],
    ["an unverified Gmail address", { email_verified: "false" }, "Google_123"],
    ["a missing verified claim", { email_verified: "" }, "Google_123"],
    ["a missing email", { email: "" }, "Google_123"],
    ["a malformed email", { email: "dana@@gmail.com" }, "Google_123"],
    ["an empty Gmail local part", { email: "@gmail.com" }, "Google_123"],
    ["a third-party Google Account", { email: "dana@example.com" }, "Google_123"],
    [
      "a mismatching Workspace domain",
      { email: "dana@example.com", "custom:googleHostedDomain": "other.com" },
      "Google_123",
    ],
  ])("refuses %s before reading or linking any account", async (_label, attrs, username) => {
    await expect(
      handler(event(attrs as Record<string, string>, "PreSignUp_ExternalProvider", username as string))
    ).rejects.toThrow(/existing BuzzKill login/);
    expect(send).not.toHaveBeenCalled();
  });

  it.each([
    ["a disabled login", { Enabled: false }],
    ["an unknown enabled status", { Enabled: undefined }],
    ["an unconfirmed login", { UserStatus: "UNCONFIRMED" }],
    ["a temporary-password login", { UserStatus: "FORCE_CHANGE_PASSWORD" }],
    ["an external profile", { UserStatus: "EXTERNAL_PROVIDER" }],
    ["a Google profile with a manually-set password", { Username: "google_123" }],
    ["a missing canonical username", { Username: undefined }],
    [
      "a mismatching native email",
      {
        UserAttributes: [
          { Name: "email", Value: "other@gmail.com" },
          { Name: "email_verified", Value: "true" },
        ],
      },
    ],
    [
      "an unverified native email",
      {
        UserAttributes: [
          { Name: "email", Value: "dana@gmail.com" },
          { Name: "email_verified", Value: "false" },
        ],
      },
    ],
  ])("refuses %s without changing the account", async (_label, overrides) => {
    send.mockResolvedValueOnce(nativeUser(overrides));
    await expect(handler(event())).rejects.toThrow(/existing BuzzKill login/);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("refuses an uninvited mailbox without creating a user", async () => {
    send.mockRejectedValueOnce({ name: "UserNotFoundException" });
    await expect(handler(event())).rejects.toThrow(/existing BuzzKill login/);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("fails closed when the native lookup is unavailable", async () => {
    const outage = new Error("Cognito unavailable");
    send.mockRejectedValueOnce(outage);
    await expect(handler(event())).rejects.toBe(outage);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("fails closed on link conflicts instead of approving a new external profile", async () => {
    const conflict = new Error("Identity already linked");
    send.mockResolvedValueOnce(nativeUser()).mockRejectedValueOnce(conflict);
    const incoming = event();
    await expect(handler(incoming)).rejects.toBe(conflict);
    expect(incoming.response).toEqual(unchangedResponse);
  });

  it("leaves office invites and booking portal provisioning unchanged", async () => {
    const incoming = event(
      { email: "dana@example.com" },
      "PreSignUp_AdminCreateUser",
      "native-uuid"
    );
    expect(await handler(incoming)).toBe(incoming);
    expect(send).not.toHaveBeenCalled();
  });

  it("blocks direct public native signup", async () => {
    await expect(handler(event({}, "PreSignUp_SignUp"))).rejects.toThrow(
      /existing BuzzKill login/
    );
    expect(send).not.toHaveBeenCalled();
  });
});
