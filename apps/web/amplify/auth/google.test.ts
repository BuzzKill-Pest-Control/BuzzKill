import { describe, expect, it } from "vitest";
import { googleSignInSettings } from "./google";

const destination = {
  GOOGLE_SIGN_IN_ENABLED: "true",
  AWS_APP_ID: "d3owdoeg1om341",
  AWS_BRANCH: "codex-buzzkill-staging-migration",
  BUZZKILL_DESTINATION_ACCOUNT_ID: "743917687359",
  BUZZKILL_SOURCE_ENVIRONMENT: "staging",
};

describe("Google sign-in deployment settings", () => {
  it("leaves existing environments independent of Google credentials", () => {
    expect(googleSignInSettings({})).toBeNull();
    expect(googleSignInSettings({ GOOGLE_SIGN_IN_ENABLED: "false" })).toBeNull();
  });

  it("keeps migration preview disconnected even if Google is enabled", () => {
    expect(googleSignInSettings({
      GOOGLE_SIGN_IN_ENABLED: "true",
      BUZZKILL_MIGRATION_PREVIEW: "true",
      GOOGLE_AUTH_REDIRECT_URLS: "invalid and must not be used",
    })).toBeNull();
  });

  it("keeps production and staging callbacks separate", () => {
    expect(googleSignInSettings({ GOOGLE_SIGN_IN_ENABLED: "true", AWS_BRANCH: "main" })?.redirectUrls)
      .toEqual(["https://app.pestbuzzkill.com/", "https://main.d5ln2hbbp9s2j.amplifyapp.com/"]);
    expect(googleSignInSettings({ GOOGLE_SIGN_IN_ENABLED: "true", AWS_BRANCH: "staging" })?.redirectUrls)
      .toEqual(["https://staging.d5ln2hbbp9s2j.amplifyapp.com/", "http://localhost:5174/"]);
  });

  it("binds destination staging to its current CRM host", () => {
    expect(googleSignInSettings(destination)?.redirectUrls).toEqual([
      "https://migration-staging.d2y2zigtl5rx3.amplifyapp.com/",
      "http://localhost:5174/",
    ]);
  });

  it("uses business main on the retained production namespace", () => {
    expect(googleSignInSettings({
      ...destination,
      AWS_BRANCH: "codex-buzzkill-account-migration",
      BUZZKILL_SOURCE_ENVIRONMENT: "main",
    })?.redirectUrls).toEqual(["https://app.pestbuzzkill.com/"]);
  });

  it("uses CRM_APP_URL before default hosts without losing staging localhost", () => {
    expect(googleSignInSettings({
      ...destination, CRM_APP_URL: "https://paired-crm.example.com",
    })?.redirectUrls).toEqual([
      "https://paired-crm.example.com/", "http://localhost:5174/",
    ]);
    expect(googleSignInSettings({
      ...destination, AWS_BRANCH: "codex-buzzkill-account-migration",
      BUZZKILL_SOURCE_ENVIRONMENT: "main", CRM_APP_URL: "https://production.example.com/",
    })?.redirectUrls).toEqual(["https://production.example.com/"]);
  });

  it("lets an explicit allowlist override CRM_APP_URL and defaults", () => {
    expect(googleSignInSettings({
      ...destination,
      CRM_APP_URL: "https://unused.example.com/",
      GOOGLE_AUTH_REDIRECT_URLS: "https://migration-staging.d2y2zigtl5rx3.amplifyapp.com/,http://localhost:5174/",
    })?.redirectUrls).toEqual([
      "https://migration-staging.d2y2zigtl5rx3.amplifyapp.com/",
      "http://localhost:5174/",
    ]);
  });

  it.each([
    { BUZZKILL_SOURCE_ENVIRONMENT: "main" },
    { BUZZKILL_SOURCE_ENVIRONMENT: undefined },
    { BUZZKILL_DESTINATION_ACCOUNT_ID: "637423611040" },
  ])("rejects unsafe destination business bindings %j", (changes) => {
    expect(() => googleSignInSettings({ ...destination, ...changes })).toThrow();
  });

  it("rejects an invalid CRM_APP_URL instead of falling back to a legacy host", () => {
    expect(() => googleSignInSettings({
      ...destination, CRM_APP_URL: "https://crm.example.com/welcome",
    })).toThrow();
  });

  it("normalizes and deduplicates explicit preview or sandbox origins", () => {
    expect(googleSignInSettings({
      GOOGLE_SIGN_IN_ENABLED: "true",
      GOOGLE_AUTH_REDIRECT_URLS: " https://preview.example.com, https://preview.example.com/, http://127.0.0.1:5174/ ",
    })?.redirectUrls).toEqual(["https://preview.example.com/", "http://127.0.0.1:5174/"]);
  });

  it.each([
    "", "http://app.pestbuzzkill.com/", "javascript:alert(1)",
    "https://user:password@example.com/", "https://example.com/?next=elsewhere",
    "https://example.com/#token", "https://example.com/welcome", "https://example.com/,",
  ])("rejects an invalid callback configuration: %s", (urls) => {
    expect(() => googleSignInSettings({
      GOOGLE_SIGN_IN_ENABLED: "true", GOOGLE_AUTH_REDIRECT_URLS: urls,
    })).toThrow();
  });
});
