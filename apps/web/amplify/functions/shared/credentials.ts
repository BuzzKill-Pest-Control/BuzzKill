/**
 * The credentials BuzzKill publishes, as structured records.
 *
 * The Licensed & Insured page, the state service-area pages, the service
 * agreements, and the PDF mastheads all read from here, so a number, a
 * holder, a status, or a date can only ever be published one way.
 *
 * Provenance is recorded per credential and is part of the public truth:
 *  - "official-document": the issuer's own approval letter or certificate is
 *    on file and the issuer's public lookup returns the record. This is the
 *    case for both Massachusetts credentials, which MDAR issued to Jacob
 *    Greasley personally (Commercial Certification CC-0060592, Category 41,
 *    and Applicator (Core) License AL-0060551; both issued February 2026,
 *    both valid through 2026-12-31, both on a 2029-12-31 recertification
 *    cycle, both Active, and both returned by MDAR's ePLACE public search).
 *    They are personal credentials, not company licences, and neither is
 *    evidence about how many technicians hold credentials.
 *  - "owner-confirmed": the owner has confirmed the credential is active and
 *    who holds it, but no official certificate or portal record is stored
 *    here. This is the case for the Rhode Island Pesticide Company
 *    Registration CP-PCR-000045, registered to BuzzKill Pest Control LLC. Its
 *    expiration date has not been supplied and is never invented.
 *
 * Status is date-aware: a credential with a known expiration is Active only
 * through that date; after it, without renewal data, the public status becomes
 * "Renewal verification pending". Callers pass `asOf` so nothing depends on
 * the system clock in a test.
 *
 * The MDAR approval letters carry the holder's former personal address. That
 * address is not a company fact and must never enter this file, the site, or
 * any document; only the credential facts above are recorded.
 *
 * Pure: shared by the Lambdas and the Vite app.
 */

export type CredentialHolder =
  | { kind: "person"; name: string }
  | { kind: "company"; name: string };

export type CredentialEvidence = "official-document" | "owner-confirmed";

export type Credential = {
  id: "MA_COMMERCIAL_CERTIFICATION" | "MA_APPLICATOR_CORE" | "RI_COMPANY_REGISTRATION";
  jurisdiction: "MA" | "RI";
  jurisdictionName: string;
  /** Title as shown on the Licensed & Insured card. */
  title: string;
  /** Credential type in the issuer's exact wording. */
  type: string;
  number: string;
  issuer: string;
  category?: string;
  holder: CredentialHolder;
  /** Status as the issuer or the owner states it today. */
  status: "Active";
  evidence: CredentialEvidence;
  /** What the evidence is (never a path to a private document). */
  evidenceDescription: string;
  issuedOn?: string;
  /** ISO date the credential is valid through, when supplied. */
  validThrough?: string;
  recertificationOn?: string;
  /** The primary credential printed on documents for this jurisdiction. */
  primaryForDocuments: boolean;
  /** Public lookup the visitor can use. */
  verifyUrl: string;
  verifyLabel: string;
};

export const MA_LOOKUP_URL =
  "https://www.mass.gov/how-to/look-up-and-confirm-a-massachusetts-pesticide-license";
export const RI_LOOKUP_URL = "https://demri.my.site.com/agr/s/";

const MDAR = "Massachusetts Department of Agricultural Resources (MDAR), Pesticide Program";
const RIDEM =
  "Rhode Island Department of Environmental Management (RIDEM), Division of Agriculture and Forest Environment";

export const CREDENTIALS: readonly Credential[] = [
  {
    id: "MA_COMMERCIAL_CERTIFICATION",
    jurisdiction: "MA",
    jurisdictionName: "Massachusetts",
    title: "Massachusetts Pesticide Commercial Certification",
    type: "Commercial Certification",
    number: "CC-0060592",
    issuer: MDAR,
    category: "Category 41, General Pest Control",
    holder: { kind: "person", name: "Jacob Greasley" },
    status: "Active",
    evidence: "official-document",
    evidenceDescription:
      "MDAR approval letter dated February 25, 2026 (Active; recertification 2029-12-31); returned by MDAR's ePLACE public search.",
    issuedOn: "2026-02-25",
    validThrough: "2026-12-31",
    recertificationOn: "2029-12-31",
    primaryForDocuments: true,
    verifyUrl: MA_LOOKUP_URL,
    verifyLabel: "Look Up on Mass.gov",
  },
  {
    id: "MA_APPLICATOR_CORE",
    jurisdiction: "MA",
    jurisdictionName: "Massachusetts",
    title: "Massachusetts Applicator (Core) License",
    type: "Applicator (Core) License",
    number: "AL-0060551",
    issuer: MDAR,
    holder: { kind: "person", name: "Jacob Greasley" },
    status: "Active",
    evidence: "official-document",
    evidenceDescription:
      "MDAR approval letter dated February 17, 2026 (Active; recertification 2029-12-31); returned by MDAR's ePLACE public search.",
    issuedOn: "2026-02-17",
    validThrough: "2026-12-31",
    recertificationOn: "2029-12-31",
    // Documents print the Category 41 certification as the primary credential;
    // that choice says nothing about this licence's status, which is Active.
    primaryForDocuments: false,
    verifyUrl: MA_LOOKUP_URL,
    verifyLabel: "Look Up on Mass.gov",
  },
  {
    id: "RI_COMPANY_REGISTRATION",
    jurisdiction: "RI",
    jurisdictionName: "Rhode Island",
    title: "Rhode Island Pesticide Company Registration",
    type: "Pesticide Company Registration",
    number: "CP-PCR-000045",
    issuer: RIDEM,
    holder: { kind: "company", name: "BuzzKill Pest Control LLC" },
    status: "Active",
    evidence: "owner-confirmed",
    evidenceDescription:
      "Confirmed by the owner as active and registered to BuzzKill Pest Control LLC. No RIDEM certificate or portal record is stored; the expiration date has not been supplied.",
    // validThrough deliberately absent: unknown, never invented.
    primaryForDocuments: true,
    verifyUrl: RI_LOOKUP_URL,
    verifyLabel: "Verify on RIDEM Portal",
  },
];

export function credential(id: Credential["id"]): Credential {
  const found = CREDENTIALS.find((c) => c.id === id);
  if (!found) throw new Error(`unknown credential ${id}`);
  return found;
}

/** The credential holder's name. */
export function holderLabel(c: Credential): string {
  return c.holder.name;
}

/** ISO calendar date (YYYY-MM-DD) for "today"; callers pass their own in tests. */
export function isoToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export type PublicStatus = "Active" | "Renewal verification pending";

/**
 * The status the public may read on a date. Active through `validThrough`
 * (inclusive); after that, without renewal evidence, the credential is not
 * shown as Active. A credential with no known expiration keeps the status the
 * evidence states.
 */
export function publicStatus(c: Credential, asOf: string): PublicStatus {
  if (c.validThrough && asOf > c.validThrough) return "Renewal verification pending";
  return c.status;
}

/** Credentials to show publicly on a date, in display order. */
export function publicCredentials(_asOf: string, jurisdiction?: Credential["jurisdiction"]): Credential[] {
  return CREDENTIALS.filter((c) => (jurisdiction ? c.jurisdiction === jurisdiction : true)).map((c) => c);
  // Every record stays listed; `publicStatus(c, asOf)` says whether it may be
  // called Active on that date.
}

/** Records whose official document is on file. */
export function officiallyDocumentedCredentials(): Credential[] {
  return CREDENTIALS.filter((c) => c.evidence === "official-document");
}

/** Records confirmed by the owner but without a stored official record. */
export function ownerConfirmedCredentials(): Credential[] {
  return CREDENTIALS.filter((c) => c.evidence === "owner-confirmed");
}

/**
 * The credential line agreements and PDFs print. Massachusetts work prints the
 * Category 41 Commercial Certification (the primary credential for documents;
 * the Applicator (Core) License remains active but is not repeated). Rhode
 * Island work adds the company registration. Only credentials that are Active
 * on `asOf` are printed.
 */
export function documentLicenseLine(opts: { state?: string | null; asOf?: string } = {}): string {
  const asOf = opts.asOf ?? isoToday();
  const state = (opts.state ?? "MA").toUpperCase();
  const jurisdictions: Credential["jurisdiction"][] = state === "RI" ? ["MA", "RI"] : ["MA"];
  return CREDENTIALS.filter(
    (c) => c.primaryForDocuments && jurisdictions.includes(c.jurisdiction) && publicStatus(c, asOf) === "Active",
  )
    .map((c) => `${c.jurisdiction} ${c.type} ${c.number} (held by ${c.holder.name})`)
    .join("; ");
}
