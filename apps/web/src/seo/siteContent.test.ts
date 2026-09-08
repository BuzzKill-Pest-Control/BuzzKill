import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COMPANY } from "../../amplify/functions/shared/company";
import { PUBLIC_REVIEWS, THUMBTACK_RATING } from "../data/reviews";

/**
 * Source-level checks on the public pages: the approved reviews and metrics
 * are present, the unsupported claims stay gone, legal dates are possible,
 * and the company's identity facts come from the one record.
 */
const WEB = join(__dirname, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}
const SRC_FILES = walk(join(WEB, "src"));
const read = (rel: string) => readFileSync(join(WEB, rel), "utf8");

describe("approved reviews and metrics", () => {
  it("keep the 5.0 rating presentation in the hero trust bar", () => {
    const hero = read("src/components/Hero.tsx");
    expect(hero).toContain("★★★★★");
    expect(hero).toContain("5.0 <GoogleLogo /> Rating");
    expect(hero).not.toContain("Family Owned");
  });
  it("keep the approved 67%, 3x, and #1 marketing metrics verbatim", () => {
    const lp = read("src/pages/lp/LPProtect.tsx");
    expect(lp).toContain('num: "67%"');
    expect(lp).toContain("of condo pest issues originate in shared spaces, not individual units");
    expect(lp).toContain('num: "3×"');
    expect(lp).toContain("more expensive to treat reactively than with a preventative program");
    expect(lp).toContain('num: "#1"');
    expect(lp).toContain("resident complaint category for HOA boards — ahead of parking and noise");
  });
  it("publish the public reviews on /reviews without saying reviews are still being collected", () => {
    const page = read("src/pages/Reviews.tsx");
    expect(page).not.toMatch(/collecting reviews|coming soon/i);
    expect(page).toContain("PUBLIC_REVIEWS");
    expect(PUBLIC_REVIEWS).toHaveLength(THUMBTACK_RATING.count);
    expect(THUMBTACK_RATING.value).toBe("5.0");
    expect(page).toContain("Leave a Google review");
    expect(page).not.toMatch(/read (our )?reviews on google/i);
  });
});

describe("unsupported claims stay out", () => {
  const banned: [RegExp, string][] = [
    [/pet[- ]safe|child[- ]safe|kid[- ]safe|family[- ]safe|non[- ]?toxic|chemical[- ]free|eco[- ]friendly|safely remov|treatments? (are|is) (completely )?safe/i, "safety claim"],
    [/family owned/i, "ownership claim"],
    [/\b(\d+) employees\b|years? in business|in business since/i, "size or age claim"],
    [/30[- ]day (re-?treatment )?guarantee|day guarantee|100% satisfaction/i, "guarantee"],
    [/evenings and weekends/i, "availability claim"],
    [/licensed technicians/i, "plural licence claim"],
    [/aggregateRating|"@type":\s*"Review"/, "self-serving review markup"],
  ];
  it("in every page and component", () => {
    for (const f of SRC_FILES) {
      const text = readFileSync(f, "utf8");
      for (const [pattern, why] of banned) {
        expect(text, `${f}: ${why}`).not.toMatch(pattern);
      }
    }
  });
  it("the tagline and customer questions are the only 'safe for families' wording left", () => {
    for (const f of SRC_FILES) {
      const text = readFileSync(f, "utf8")
        // The tagline, including its JSX form split over a <br /> line break.
        .replace(/Safe for Families\.[\s\S]{0,60}?Tough on Pests\./gi, "")
        // A visitor's own question ("Is it safe for kids and pets?") is not a claim.
        .replace(/\bq:\s*"[^"]*"/g, "")
        .replace(/\bq:\s*`[^`]*`/g, "");
      expect(text, f).not.toMatch(/safe for (families|children|kids|pets)/i);
    }
  });
});

describe("credentials on public pages", () => {
  it("render every public credential with a date-aware status, from the shared records", () => {
    const page = read("src/pages/LicensedInsured.tsx");
    expect(page).toContain("publicCredentials(asOf)");
    expect(page).toContain("publicStatus(c, asOf)");
    expect(page).not.toMatch(/CREDENTIALS\.map|currentCredentials|unverifiedCredentials|historicalCredentials/);
    expect(page).not.toMatch(/AL-0060551|CC-0060592|CP-PCR-000045/);
    expect(page).not.toMatch(/supersed|historical|pending|unverified/i);
    const state = read("src/components/StateServiceArea.tsx");
    expect(state).toContain("publicCredentials(asOf, stateAbbr)");
    expect(state).toContain("publicStatus(c, asOf)");
  });
  it("never puts licence numbers into the founder's Person schema", () => {
    const schema = read("src/seo/schema.ts");
    expect(schema).not.toMatch(/hasCredential|CC-0060592|AL-0060551|CP-PCR/);
  });
});

describe("termite pages promise no unverified regulated application method", () => {
  const banned = /soil treatment|termiticide|trench|sub-?slab|perimeter[- ]soil|liquid (soil|barrier)|foundation injection|bait system|drill(ing)? (the|along)|Category 43/i;
  it("in pages, the registry, the catalog, and customer documents", () => {
    const files = [
      ...SRC_FILES.filter((f) => /termite|Termite|WoodBoring/.test(f)),
      join(WEB, "src/seo/pages.ts"),
      join(WEB, "amplify/functions/shared/serviceCatalog.ts"),
      join(WEB, "amplify/functions/shared/pdf.ts"),
      join(WEB, "amplify/functions/shared/bookingFinalize.ts"),
      join(WEB, "amplify/functions/shared/email.ts"),
    ];
    for (const f of files) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(banned);
    }
  });
});

describe("legal pages", () => {
  it("carry an effective date on or after the LLC's formation and a current last-updated date", () => {
    for (const rel of ["src/pages/PrivacyPolicy.tsx", "src/pages/TermsOfService.tsx"]) {
      const text = read(rel);
      expect(text, rel).toContain("Effective Date:</strong> January 16, 2026");
      expect(text, rel).toContain("Last Updated:</strong> September 7, 2026");
      expect(text, rel).not.toContain("January 1, 2026");
      expect(text, rel).toContain("COMPANY.legalName");
    }
  });
});

describe("identity facts come from the company record", () => {
  it("keeps the three names distinct", () => {
    expect(COMPANY.brandName).toBe("BuzzKill");
    expect(COMPANY.serviceDisplayName).toBe("BuzzKill Pest Control");
    expect(COMPANY.legalName).toBe("BuzzKill Pest Control LLC");
    expect(new Set([COMPANY.brandName, COMPANY.serviceDisplayName, COMPANY.legalName]).size).toBe(3);
    expect(COMPANY.name).toBe(COMPANY.serviceDisplayName);
  });
  it("never claims a registered trade name", () => {
    for (const f of SRC_FILES) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/registered (trade name|DBA)|doing business as/i);
    }
  });
  it("uses the exact address, entity id, and dates", () => {
    expect(COMPANY.address.streetAddress).toBe("420 Lakeside Ave, Suite 104");
    expect(COMPANY.registrations.massachusetts.id).toBe("001941986");
    expect(COMPANY.foundingDate).toBe("2026-01-16");
    expect(COMPANY.planning.began).toBe("late 2025");
    expect(COMPANY.phone.pretty).toBe("(508) 258-9294");
  });
  it("leaves no duplicated phone, email, or street literals in page sources", () => {
    const allowed = new Set([
      join(WEB, "src/lib/portal.ts"), // hostname routing, not a company fact
    ]);
    for (const f of SRC_FILES) {
      if (allowed.has(f)) continue;
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/508-258-9294|\(508\) 258-9294|tel:\+?1?5082589294|info@pestbuzzkill\.com|Lakeside Ave/);
    }
  });
  it("puts the founder's story on the right dates", () => {
    const about = read("src/pages/AboutPage.tsx");
    expect(about).toContain("began designing and planning");
    expect(about).toContain("planning.began");
    expect(about).toContain("was formed in");
    expect(about).not.toMatch(/founded in 2025|since 2025|in 2025 to/);
    expect(about).toContain('rel="me noopener noreferrer"');
    expect(about).toContain("registrations.massachusetts");
  });
});
