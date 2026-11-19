import { describe, expect, it } from "vitest";
import { configureGoogleSignIn } from "./googleSignInConfig";

const production = "https://app.pestbuzzkill.com";
const staging = "https://staging.d5ln2hbbp9s2j.amplifyapp.com";

function outputs(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      user_pool_id: "pool",
      user_pool_client_id: "client",
      username_attributes: ["email"],
      oauth: {
        domain: "buzzkill.auth.us-east-1.amazoncognito.com",
        response_type: "code",
        scopes: ["openid", "email", "profile"],
        identity_providers: ["GOOGLE"],
        redirect_sign_in_uri: [
          `${production}/`,
          `${staging}/`,
          "http://localhost:5173/",
          "http://localhost:5174/",
        ],
        redirect_sign_out_uri: [
          `${production}/`,
          `${staging}/`,
          "http://localhost:5173/",
          "http://localhost:5174/",
        ],
        ...overrides,
      },
    },
    data: { url: "https://api.example.com/graphql" },
    custom: { bookingApiUrl: "https://api.example.com" },
  };
}

describe("Google sign-in configuration", () => {
  it("removes OAuth when the frontend is a migration preview", () => {
    const configured = configureGoogleSignIn(outputs(), production, true);
    expect(configured.enabled).toBe(false);
    expect(configured.outputs.auth).not.toHaveProperty("oauth");
  });

  it("removes OAuth when backend outputs identify a migration preview", () => {
    const original = outputs();
    const configured = configureGoogleSignIn(
      { ...original, custom: { ...original.custom, migrationPreview: true } },
      production
    );
    expect(configured.enabled).toBe(false);
    expect(configured.outputs.auth).not.toHaveProperty("oauth");
  });

  it.each([production, staging, "http://localhost:5174"])(
    "keeps sign-in and sign-out on exactly %s",
    (origin) => {
      const configured = configureGoogleSignIn(outputs(), origin);
      expect(configured.enabled).toBe(true);
      expect(configured.outputs.auth).toMatchObject({
        oauth: {
          redirect_sign_in_uri: [`${origin}/`],
          redirect_sign_out_uri: [`${origin}/`],
        },
      });
    }
  );

  it.each([
    "http://localhost:5175",
    "https://preview.example.com",
    "https://pestbuzzkill.com",
  ])("keeps native login available on unregistered origin %s", (origin) => {
    const original = outputs();
    const configured = configureGoogleSignIn(original, origin);
    expect(configured.enabled).toBe(false);
    expect(configured.outputs.auth).toEqual({
      user_pool_id: "pool",
      user_pool_client_id: "client",
      username_attributes: ["email"],
    });
    expect(configured.outputs.data).toBe(original.data);
    expect(configured.outputs.custom).toBe(original.custom);
    expect(original.auth.oauth).toBeDefined();
  });

  it("does not accept a hostname substring or another site's query parameter", () => {
    const configured = configureGoogleSignIn(
      outputs({
        redirect_sign_in_uri: [
          "https://app.pestbuzzkill.com.attacker.example/",
          "https://example.com/?next=https://app.pestbuzzkill.com/",
        ],
      }),
      production
    );
    expect(configured.enabled).toBe(false);
  });

  it("requires a registered sign-out URL as well as a callback", () => {
    expect(
      configureGoogleSignIn(
        outputs({ redirect_sign_out_uri: [`${staging}/`] }),
        production
      ).enabled
    ).toBe(false);
  });

  it.each([
    { domain: "" },
    { scopes: ["openid"] },
    { identity_providers: [] },
    { response_type: "token" },
    { redirect_sign_in_uri: [null, "invalid", `${production}/#token`] },
  ])("hides Google for incomplete OAuth configuration %j", (overrides) => {
    expect(configureGoogleSignIn(outputs(overrides), production).enabled).toBe(
      false
    );
  });

  it("works with a registered callback path without inventing a new URL", () => {
    const configured = configureGoogleSignIn(
      outputs({ redirect_sign_in_uri: [`${production}/auth/callback`] }),
      production
    );
    expect(configured.outputs.auth).toMatchObject({
      oauth: { redirect_sign_in_uri: [`${production}/auth/callback`] },
    });
  });

  it("preserves deployments that do not have Google configured", () => {
    const native = { auth: { user_pool_id: "pool" } };
    expect(configureGoogleSignIn(native, production)).toEqual({
      outputs: native,
      enabled: false,
    });
  });
});
