import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isProductionSite, portalUrl } from "./portal";

/**
 * Where "Customer Login" sends people.
 *
 * The bug: PORTAL_URL fell back to the production portal whenever
 * VITE_PORTAL_URL was unset — and it IS unset on the staging branch, so
 * staging.pestbuzzkill.com's header and footer pointed QA sessions at the real
 * customers' portal. The direction of the default is the whole fix: an
 * unrecognized host must land on staging, never on production.
 */

const PROD = "https://app.pestbuzzkill.com";
const STAGING = "https://staging.d5ln2hbbp9s2j.amplifyapp.com";

describe("portalUrl", () => {
  beforeEach(() => {
    // Hosting sets these for the paired preview; defaults must be tested
    // independently of the environment that launches the test runner.
    vi.stubEnv("VITE_PORTAL_URL", "");
    vi.stubEnv("VITE_BUZZKILL_MIGRATION_PREVIEW", "false");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uses an explicit portal override for any hostname", () => {
    const override = "https://paired-crm.example.invalid";
    vi.stubEnv("VITE_PORTAL_URL", override);
    expect(portalUrl("www.pestbuzzkill.com")).toBe(override);
    expect(portalUrl("unknown.example.invalid")).toBe(override);
  });

  it("keeps the explicit paired portal override in migration previews", () => {
    const override = "https://paired-crm.example.invalid";
    vi.stubEnv("VITE_PORTAL_URL", override);
    vi.stubEnv("VITE_BUZZKILL_MIGRATION_PREVIEW", "true");
    expect(portalUrl("preview.example.invalid")).toBe(override);
  });

  it("sends the production site to the production portal", () => {
    expect(portalUrl("www.pestbuzzkill.com")).toBe(PROD);
    expect(portalUrl("pestbuzzkill.com")).toBe(PROD);
    expect(portalUrl("main.d26qpsjewk0bee.amplifyapp.com")).toBe(PROD);
  });

  it("keeps staging on the staging portal — the reported bug", () => {
    expect(portalUrl("staging.pestbuzzkill.com")).toBe(STAGING);
    expect(portalUrl("staging.d26qpsjewk0bee.amplifyapp.com")).toBe(STAGING);
  });

  it("keeps an UNKNOWN host off production", () => {
    // A preview branch, a new custom domain, a local dev server. Guessing
    // "production" here is what put a QA session in front of real customer
    // data; guessing "staging" is visible and harmless.
    expect(portalUrl("localhost")).toBe(STAGING);
    expect(portalUrl("pr-42.d26qpsjewk0bee.amplifyapp.com")).toBe(STAGING);
    expect(portalUrl("")).toBe(STAGING);
  });

  it("is not fooled by case or by a lookalike hostname", () => {
    expect(portalUrl("WWW.PestBuzzKill.com")).toBe(PROD);
    // Someone else's domain that merely ends with ours must not read as prod.
    expect(portalUrl("www.pestbuzzkill.com.evil.test")).toBe(STAGING);
    expect(isProductionSite("notpestbuzzkill.com")).toBe(false);
  });
});
