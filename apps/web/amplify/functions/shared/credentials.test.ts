import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CREDENTIALS,
  credential,
  documentLicenseLine,
  holderLabel,
  officiallyDocumentedCredentials,
  ownerConfirmedCredentials,
  publicCredentials,
  publicStatus,
} from "./credentials";

const WEB = join(__dirname, "..", "..", "..");
const REPO = join(WEB, "..", "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === ".amplify") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts|md|html|json|xml|txt)$/.test(name)) out.push(p);
  }
  return out;
}

describe("the Massachusetts credentials (both active, both Jacob Greasley's)", () => {
  const cc = credential("MA_COMMERCIAL_CERTIFICATION");
  const al = credential("MA_APPLICATOR_CORE");

  it("record the Commercial Certification from the MDAR approval letter", () => {
    expect(cc.number).toBe("CC-0060592");
    expect(cc.type).toBe("Commercial Certification");
    expect(cc.category).toBe("Category 41, General Pest Control");
    expect(cc.holder).toEqual({ kind: "person", name: "Jacob Greasley" });
    expect(cc.evidence).toBe("official-document");
    expect(cc.issuedOn).toBe("2026-02-25");
    expect(cc.validThrough).toBe("2026-12-31");
    expect(cc.recertificationOn).toBe("2029-12-31");
    expect(cc.status).toBe("Active");
    expect(cc.primaryForDocuments).toBe(true);
  });

  it("record the Applicator (Core) License in the issuer's exact wording, active, not superseded", () => {
    expect(al.number).toBe("AL-0060551");
    expect(al.type).toBe("Applicator (Core) License");
    expect(al.holder).toEqual({ kind: "person", name: "Jacob Greasley" });
    expect(al.evidence).toBe("official-document");
    expect(al.issuedOn).toBe("2026-02-17");
    expect(al.validThrough).toBe("2026-12-31");
    expect(al.recertificationOn).toBe("2029-12-31");
    expect(al.status).toBe("Active");
    expect(publicStatus(al, "2026-09-08")).toBe("Active");
    expect(JSON.stringify(al)).not.toMatch(/supersed|historical|history|replaced|only CC|roster lists/i);
  });

  it("are both listed publicly, and both read Active through 2026-12-31", () => {
    const ma = publicCredentials("2026-12-31", "MA").map((c) => c.number);
    expect(ma).toEqual(["CC-0060592", "V175", "AL-0060551"]);
    for (const c of publicCredentials("2026-12-31", "MA")) expect(publicStatus(c, "2026-12-31")).toBe("Active");
  });

  it("stop reading Active on 2027-01-01 without renewal evidence, but stay listed", () => {
    for (const c of publicCredentials("2027-01-01", "MA")) {
      expect(publicStatus(c, "2027-01-01")).toBe("Renewal verification pending");
    }
    expect(publicCredentials("2027-01-01", "MA")).toHaveLength(3);
  });

  it("are personal credentials, never described as company licences", () => {
    for (const c of [cc, al]) {
      expect(c.holder.kind).toBe("person");
      expect(c.evidenceDescription).not.toMatch(/company licen[cs]e/i);
    }
  });
});

describe("the MassWildlife Problem Animal Control Permit", () => {
  const pac = credential("MA_PROBLEM_ANIMAL_CONTROL");

  it("records the permit facts, never printed on pesticide documents", () => {
    expect(pac.number).toBe("V175");
    expect(pac.numberLabel).toBe("Trap Registration #");
    expect(pac.holder).toEqual({ kind: "person", name: "Nathaniel C Wiggin" });
    expect(pac.issuedOn).toBe("2026-10-02");
    expect(pac.validThrough).toBe("2026-12-31");
    expect(pac.primaryForDocuments).toBe(false);
    expect(publicStatus(pac, "2026-12-31")).toBe("Active");
    expect(publicStatus(pac, "2027-01-01")).toBe("Renewal verification pending");
  });
});

describe("the Rhode Island registration (active, owner-confirmed)", () => {
  const ri = credential("RI_COMPANY_REGISTRATION");

  it("is registered to BuzzKill Pest Control LLC and active", () => {
    expect(ri.number).toBe("CP-PCR-000045");
    expect(ri.type).toBe("Pesticide Company Registration");
    expect(ri.holder).toEqual({ kind: "company", name: "BuzzKill Pest Control LLC" });
    expect(ri.status).toBe("Active");
    expect(publicStatus(ri, "2026-09-08")).toBe("Active");
    expect(publicStatus(ri, "2030-01-01")).toBe("Active"); // no expiration known, none invented
  });

  it("records owner confirmation, not an official record, without inventing an expiration", () => {
    expect(ri.evidence).toBe("owner-confirmed");
    expect(ownerConfirmedCredentials().map((c) => c.id)).toEqual(["RI_COMPANY_REGISTRATION"]);
    expect(ri.validThrough).toBeUndefined();
    expect(ri.recertificationOn).toBeUndefined();
    expect(ri.evidenceDescription).toMatch(/Confirmed by the owner/);
    expect(ri.evidenceDescription).not.toMatch(/portal record confirms|independently verified|certificate on file/i);
    expect(JSON.stringify(ri)).not.toMatch(/unverified|pending|expected:|not established/i);
  });
});

describe("evidence provenance", () => {
  it("separates official documents from owner confirmation", () => {
    expect(officiallyDocumentedCredentials().map((c) => c.number).sort()).toEqual(["AL-0060551", "CC-0060592", "V175"]);
    expect(ownerConfirmedCredentials().map((c) => c.number)).toEqual(["CP-PCR-000045"]);
    expect(CREDENTIALS).toHaveLength(4);
    for (const c of CREDENTIALS) expect(holderLabel(c).length).toBeGreaterThan(3);
  });
});

describe("the credential line on agreements and PDFs", () => {
  it("prints the Category 41 certification for Massachusetts work", () => {
    expect(documentLicenseLine({ state: "MA", asOf: "2026-09-08" })).toBe(
      "MA Commercial Certification CC-0060592 (held by Jacob Greasley)",
    );
    expect(documentLicenseLine({ asOf: "2026-09-08" })).not.toMatch(/CP-PCR|AL-0060551/);
  });
  it("adds the company registration for Rhode Island work", () => {
    expect(documentLicenseLine({ state: "ri", asOf: "2026-09-08" })).toBe(
      "MA Commercial Certification CC-0060592 (held by Jacob Greasley); RI Pesticide Company Registration CP-PCR-000045 (held by BuzzKill Pest Control LLC)",
    );
  });
  it("prints nothing expired", () => {
    expect(documentLicenseLine({ state: "MA", asOf: "2027-01-01" })).toBe("");
    expect(documentLicenseLine({ state: "RI", asOf: "2027-01-01" })).toBe(
      "RI Pesticide Company Registration CP-PCR-000045 (held by BuzzKill Pest Control LLC)",
    );
  });
});

describe("the repository never repeats the old conclusions or the private address", () => {
  const files = [...walk(join(WEB, "src")), ...walk(join(WEB, "amplify")), ...walk(join(WEB, "public")), ...walk(join(REPO, "docs"))]
    // This test file is the one place the patterns are allowed to exist.
    .filter((f) => !f.endsWith("credentials.test.ts"));

  it("scans more than a hundred files", () => {
    expect(files.length).toBeGreaterThan(100);
  });
  it("contains the holder's former personal address nowhere", () => {
    for (const f of files) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/Ruggles|Westborough, MA 01581|\b01581\b/);
    }
  });
  it("never calls the Core license superseded or the Rhode Island registration unverified", () => {
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/AL-0060551[^\n]{0,120}(supersed|historical|history)|(supersed|historical)[^\n]{0,120}AL-0060551/i);
      expect(text, f).not.toMatch(/CP-PCR-000045[^\n]{0,160}(unverified|confirmation pending|not established)|(unverified|confirmation pending)[^\n]{0,160}CP-PCR-000045/i);
      expect(text, f).not.toMatch(/independently verified through (a )?(public )?RIDEM/i);
    }
  });
});
