import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { GENERAL_PLAN_COVERED_PESTS, coveredPestsFor, quoteCoverageArtFor } from "./coverage";
import { SERVICE_CATALOG } from "./serviceCatalog";

/**
 * The covered-pests grid on a signed agreement is a promise about the plan
 * actually sold. It comes from the catalog service id, never from a guess:
 * the mosquito plan treats mosquitoes only, the mosquito-and-tick plan
 * mosquitoes and ticks only, and a one-time job has no plan to cover.
 */
describe("coveredPestsFor", () => {
  it("MOSQUITO covers mosquitoes only", () => {
    expect(coveredPestsFor("MOSQUITO", true)).toEqual(["Mosquitoes"]);
  });
  it("MOSQUITO_TICK covers mosquitoes and ticks only", () => {
    expect(coveredPestsFor("MOSQUITO_TICK", true)).toEqual(["Mosquitoes", "Ticks"]);
  });
  it("never lists fleas on a seasonal plan", () => {
    for (const id of Object.values(SERVICE_CATALOG).filter((e) => e.seasonal).map((e) => e.id)) {
      expect(coveredPestsFor(id, true)?.join(" ")).not.toMatch(/flea/i);
    }
  });
  it("gives one-time jobs no coverage grid at all", () => {
    for (const id of Object.keys(SERVICE_CATALOG)) {
      expect(coveredPestsFor(id, false)).toBeUndefined();
    }
    expect(coveredPestsFor(null, false)).toBeUndefined();
  });
  it("gives general recurring plans only the verified general lineup", () => {
    for (const id of Object.values(SERVICE_CATALOG).filter((e) => !e.seasonal && e.offersRecurring).map((e) => e.id)) {
      expect(coveredPestsFor(id, true)).toEqual([...GENERAL_PLAN_COVERED_PESTS]);
    }
    expect(GENERAL_PLAN_COVERED_PESTS.join(" ")).not.toMatch(/mosquito|tick|flea|termite|bed ?bug/i);
  });
});

describe("the online-booking agreement", () => {
  const src = readFileSync(join(__dirname, "bookingFinalize.ts"), "utf8");
  const pdf = readFileSync(join(__dirname, "pdf.ts"), "utf8");

  it("resolves the catalog service from the stored id before any label fallback", () => {
    expect(src).toContain("booking.service ? catalogEntry(booking.service) : null");
  });
  it("draws its grid from the catalog id and passes no initial term", () => {
    expect(src).toContain("coveredPests: coveredPestsFor(catalogService?.id, Boolean(offer))");
    expect(src).not.toMatch(/initialTermMonths/);
    expect(pdf).not.toMatch(/initialTermMonths|initial period of/);
  });
  it("prints no Tax (0%) rows", () => {
    expect(src).not.toMatch(/Tax \(0%\)/);
  });
  it("says every plan may be canceled at any time, in the body and the authorization", () => {
    expect(src.match(/may be canceled at any time/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(src).not.toMatch(/12[- ]month (initial|commitment|term)|initial period/i);
  });
  it("prints only the current, officially evidenced credential from the shared records", () => {
    expect(src).toContain("license: documentLicenseLine({ state: serviceState })");
    expect(pdf).toContain("license: documentLicenseLine({ state: serviceState })");
    expect(src).toContain("company: agreementCompanyFor(booking.state)");
    expect(src).not.toMatch(/CC-0060592|CP-PCR-000045|AL-0060551/);
    expect(pdf).not.toMatch(/CC-0060592|CP-PCR-000045|AL-0060551/);
  });
  it("has no label-based coverage heuristic left in the PDF module", () => {
    expect(pdf).not.toMatch(/pestsForService|\/mosquito\/\.test|\["mosquitoes", "ticks", "fleas"\]/);
    expect(pdf).toContain("quoteCoverageArtFor(opts.serviceId)");
    expect(quoteCoverageArtFor("MOSQUITO")).toEqual(["mosquitoes"]);
    expect(quoteCoverageArtFor("MOSQUITO_TICK")).toEqual(["mosquitoes", "ticks"]);
    expect(quoteCoverageArtFor("Mosquito plan")).toEqual([]);
  });
  it("quotes the accepted terms text stored on the booking", () => {
    expect(src).toContain("booking.tcText");
    expect(src).toContain("ACCEPTED TERMS (version");
  });
});
