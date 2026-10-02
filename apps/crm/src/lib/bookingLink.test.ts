import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bookingFunnelSpoken,
  bookingFunnelUrl,
  marketingSiteUrl,
} from "./bookingLink";

/**
 * The booking funnel is the lead's only road to becoming a customer, so the
 * URL the CRM shows (and a CSR reads aloud) must match the environment: the
 * production CRM must never hand out a staging link, and staging must never
 * point a test lead at the real checkout.
 */

const PROD_CRM = "app.pestbuzzkill.com";
const LEGACY_PROD_CRM = "main.d5ln2hbbp9s2j.amplifyapp.com";
const STAGING_CRM = "staging.d5ln2hbbp9s2j.amplifyapp.com";

beforeEach(() => {
  // Test hostname defaults independently of the paired deployment override.
  vi.stubEnv("VITE_MARKETING_URL", "");
  vi.stubEnv("VITE_BUZZKILL_MIGRATION_PREVIEW", "false");
});
afterEach(() => vi.unstubAllEnvs());

describe("marketingSiteUrl", () => {
  it("uses the explicit marketing override and normalizes its trailing slash", () => {
    vi.stubEnv("VITE_MARKETING_URL", "https://paired-web.example.invalid/");
    expect(marketingSiteUrl(PROD_CRM)).toBe("https://paired-web.example.invalid");
    expect(bookingFunnelUrl(STAGING_CRM)).toBe("https://paired-web.example.invalid/quote");
    expect(bookingFunnelSpoken("localhost")).toBe("paired-web.example.invalid/quote");
  });

  it("keeps the explicit paired marketing override in migration previews", () => {
    vi.stubEnv("VITE_MARKETING_URL", "https://paired-web.example.invalid");
    vi.stubEnv("VITE_BUZZKILL_MIGRATION_PREVIEW", "true");
    expect(marketingSiteUrl("preview.example.invalid")).toBe("https://paired-web.example.invalid");
  });

  it("maps the production CRM host to the production marketing site", () => {
    expect(marketingSiteUrl(PROD_CRM)).toBe("https://www.pestbuzzkill.com");
  });

  it("keeps the direct production Amplify host in production", () => {
    expect(marketingSiteUrl(LEGACY_PROD_CRM)).toBe(
      "https://www.pestbuzzkill.com"
    );
  });

  it("maps the staging CRM host to the staging marketing site", () => {
    expect(marketingSiteUrl(STAGING_CRM)).toBe(
      "https://staging.d26qpsjewk0bee.amplifyapp.com"
    );
  });

  it("treats localhost as staging — dev must never point at real checkout", () => {
    expect(marketingSiteUrl("localhost")).toBe(
      "https://staging.d26qpsjewk0bee.amplifyapp.com"
    );
  });
});

describe("bookingFunnelUrl", () => {
  it("is the marketing site's /quote page", () => {
    expect(bookingFunnelUrl(PROD_CRM)).toBe(
      "https://www.pestbuzzkill.com/quote"
    );
    expect(bookingFunnelUrl(STAGING_CRM)).toBe(
      "https://staging.d26qpsjewk0bee.amplifyapp.com/quote"
    );
  });
});

describe("bookingFunnelSpoken", () => {
  it("drops the protocol and www so it reads aloud as typed", () => {
    expect(bookingFunnelSpoken(PROD_CRM)).toBe("pestbuzzkill.com/quote");
  });

  it("keeps the staging host intact apart from the protocol", () => {
    expect(bookingFunnelSpoken(STAGING_CRM)).toBe(
      "staging.d26qpsjewk0bee.amplifyapp.com/quote"
    );
  });
});
