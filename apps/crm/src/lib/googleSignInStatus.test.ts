import { beforeEach, describe, expect, it, vi } from "vitest";

const hub = vi.hoisted(() => ({
  listener: (_event: {
    payload: { event: string; data?: unknown };
  }): void => {},
}));

vi.mock("aws-amplify/utils", () => ({
  Hub: {
    listen: vi.fn((_channel, listener) => {
      hub.listener = listener;
    }),
  },
}));

import {
  getGoogleSignInError,
  subscribeGoogleSignInError,
} from "./googleSignInStatus";

beforeEach(() => {
  hub.listener({ payload: { event: "signedOut" } });
});

describe("Google sign-in feedback", () => {
  it("remembers a failed redirect that happened before the login screen mounted", () => {
    hub.listener({
      payload: {
        event: "signInWithRedirect_failure",
        data: { error: new Error("Private Cognito trigger details") },
      },
    });
    expect(getGoogleSignInError()).toContain("Google sign-in wasn't completed");
    expect(getGoogleSignInError()).toContain("emailed sign-in link");
    expect(getGoogleSignInError()).not.toContain("Private Cognito");
  });

  it("updates the mounted login screen and clears feedback after successful login", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeGoogleSignInError(listener);
    hub.listener({ payload: { event: "signInWithRedirect_failure" } });
    expect(listener).toHaveBeenCalledTimes(1);
    hub.listener({ payload: { event: "signedIn" } });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getGoogleSignInError()).toBeNull();
    unsubscribe();
    hub.listener({ payload: { event: "signedOut" } });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("ignores unrelated token refresh events", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeGoogleSignInError(listener);
    hub.listener({ payload: { event: "tokenRefresh_failure" } });
    expect(listener).not.toHaveBeenCalled();
    expect(getGoogleSignInError()).toBeNull();
    unsubscribe();
  });
});
