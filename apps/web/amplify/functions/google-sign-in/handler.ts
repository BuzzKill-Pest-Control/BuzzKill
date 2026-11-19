import type { PreSignUpTriggerEvent } from "aws-lambda";
import { assertBusinessActionsEnabled } from "../shared/migrationPreview";
import {
  AdminGetUserCommand,
  AdminLinkProviderForUserCommand,
  CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

const cognito = new CognitoIdentityProviderClient();
const SIGN_IN_REFUSED =
  "Use the Google account for your existing BuzzKill login, or sign in with an emailed link.";

/**
 * The CRM is invite-only. Google must resolve to an enabled, verified native
 * login, never create a second profile or grant roles. Linking to the native
 * username preserves its sub, staff roles, and customer/technician references.
 *
 * Google is authoritative for Gmail and Google Workspace addresses only. A
 * third-party Google Account can retain email_verified after its mailbox has
 * changed owners, so that flag alone cannot authorize linking a BuzzKill login.
 */
export const handler = async (
  event: PreSignUpTriggerEvent
): Promise<PreSignUpTriggerEvent> => {
  // Office invites and automatic portal provisioning still create native users.
  if (event.triggerSource === "PreSignUp_AdminCreateUser") return event;
  if (event.triggerSource !== "PreSignUp_ExternalProvider") {
    throw new Error(SIGN_IN_REFUSED);
  }
  assertBusinessActionsEnabled();

  // Cognito lowercases the provider prefix in a case-insensitive pool. Split
  // only the prefix: the provider subject is an opaque, case-sensitive value.
  const match = /^google_(.+)$/i.exec(event.userName);
  const attrs = event.request.userAttributes;
  const email = attrs.email?.trim().toLowerCase() ?? "";
  const domain = email.split("@");
  const hostedDomain = attrs["custom:googleHostedDomain"]?.toLowerCase();
  const authoritative =
    domain.length === 2 &&
    !!domain[0] &&
    !/\s/.test(email) &&
    (domain[1] === "gmail.com" ||
      (!!hostedDomain && domain[1] === hostedDomain));
  if (
    !match ||
    /\s/.test(match[1]) ||
    attrs.email_verified !== "true" ||
    !authoritative
  ) {
    throw new Error(SIGN_IN_REFUSED);
  }

  let nativeUser;
  try {
    // Email is the pool's login attribute. AdminGetUser resolves its canonical
    // username directly, without ListUsers' eventually-consistent email index.
    nativeUser = await cognito.send(
      new AdminGetUserCommand({
        UserPoolId: event.userPoolId,
        Username: email,
      })
    );
  } catch (err) {
    if ((err as { name?: string }).name === "UserNotFoundException") {
      throw new Error(SIGN_IN_REFUSED);
    }
    throw err;
  }

  const nativeAttrs = Object.fromEntries(
    (nativeUser.UserAttributes ?? []).map((attr) => [attr.Name, attr.Value])
  );
  if (
    !nativeUser.Username ||
    /^google_/i.test(nativeUser.Username) ||
    nativeUser.Enabled !== true ||
    nativeUser.UserStatus !== "CONFIRMED" ||
    nativeAttrs.email?.trim().toLowerCase() !== email ||
    nativeAttrs.email_verified !== "true"
  ) {
    throw new Error(SIGN_IN_REFUSED);
  }

  await cognito.send(
    new AdminLinkProviderForUserCommand({
      UserPoolId: event.userPoolId,
      DestinationUser: {
        ProviderName: "Cognito",
        ProviderAttributeValue: nativeUser.Username,
      },
      SourceUser: {
        ProviderName: "Google",
        ProviderAttributeName: "Cognito_Subject",
        ProviderAttributeValue: match[1],
      },
    })
  );

  // No autoConfirm/autoVerify flags: Cognito must use the linked account and
  // must never move an email alias to a newly-created Google profile.
  return event;
};
