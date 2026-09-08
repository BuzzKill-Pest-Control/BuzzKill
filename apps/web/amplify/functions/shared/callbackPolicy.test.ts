import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CALLBACK_POLICY_RULES,
  CALLBACK_POLICY_TEXT,
  CALLBACK_RETURN_BUSINESS_DAYS,
  FORBIDDEN_GUARANTEE_PATTERNS,
} from "./callbackPolicy";
import * as callbacks from "./callbacks";

/**
 * The guarantee the website advertises must be the guarantee the code
 * implements: active plans only, covered pests, qualifying callbacks at no
 * charge. These tests stop the marketing wording drifting from the policy.
 */

const WEB_ROOT = join(__dirname, "..", "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const PAGE_FILES = walk(join(WEB_ROOT, "src", "pages")).concat(walk(join(WEB_ROOT, "src", "components")));

describe("the policy sentence", () => {
  it("applies only to active plans, covered pests, and qualifying callbacks", () => {
    expect(CALLBACK_POLICY_TEXT).toContain("while your service plan is active");
    expect(CALLBACK_POLICY_TEXT).toContain("covered pests");
    expect(CALLBACK_POLICY_TEXT).toContain("Qualifying callbacks are provided at no charge");
    expect(CALLBACK_POLICY_TEXT).not.toMatch(/one-time|every sighting|guaranteed|30[- ]day/i);
  });
  it("rests on the rules callbacks.ts enforces", () => {
    expect(CALLBACK_POLICY_RULES.activePlansOnly).toBe(true);
    expect(CALLBACK_POLICY_RULES.oneTimeServicesEligible).toBe(false);
    expect(CALLBACK_POLICY_RULES.qualifyingCallbackCharge).toBe(0);
    expect(callbacks.CALLBACK_RETURN_BUSINESS_DAYS).toBe(CALLBACK_RETURN_BUSINESS_DAYS);
  });
});

describe("marketing pages", () => {
  it("state the guarantee through the shared constant wherever they promise a return visit", () => {
    const promisers = PAGE_FILES.filter((f) => /We Stand Behind Our Work|why-guarantee/.test(readFileSync(f, "utf8")));
    expect(promisers.length).toBeGreaterThan(10);
    for (const f of promisers) {
      expect(readFileSync(f, "utf8"), f).toContain("CALLBACK_POLICY_TEXT");
    }
  });
  it("never carry an overstated guarantee", () => {
    for (const f of PAGE_FILES) {
      const text = readFileSync(f, "utf8");
      for (const pattern of FORBIDDEN_GUARANTEE_PATTERNS) {
        expect(text, `${f} matches ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});

describe("the agreement note", () => {
  it("quotes the same sentence customers read on the site", async () => {
    const src = readFileSync(join(__dirname, "bookingFinalize.ts"), "utf8");
    expect(src).toContain("${CALLBACK_POLICY_TEXT}");
    expect(src).not.toMatch(/so do we/);
  });
});
