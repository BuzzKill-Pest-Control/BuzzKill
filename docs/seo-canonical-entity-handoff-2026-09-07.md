# Canonical domain, entity, NAP, and contract cleanup: handoff (2026-09-07, corrected 2026-09-08, release pass 2026-09-08)

This note records how the public site (`apps/web`) establishes
`https://www.pestbuzzkill.com` as the canonical home of BuzzKill Pest Control
LLC, what is generated from where, the exact hosting rules that make the
generated route files serve, what still needs evidence, and the external
corrections that cannot be made in this repository.

## Source of truth

| Fact | File |
| --- | --- |
| Brand (`BuzzKill`), descriptive name (`BuzzKill Pest Control`), legal name (`BuzzKill Pest Control LLC`), MA entity ID, formation date, planning milestone, address, phone, email, service area, founder and his profiles, company profiles, review sources, logo, origin | `apps/web/amplify/functions/shared/company.ts` |
| State credentials, with holder and evidence status | `apps/web/amplify/functions/shared/credentials.ts` |
| The guarantee sentence (plan callback policy) | `apps/web/amplify/functions/shared/callbackPolicy.ts` |
| Checkout terms, built per offer, and their version | `apps/web/amplify/functions/shared/bookingTerms.ts` |
| Public reviews and rating, quoted from Thumbtack | `apps/web/src/data/reviews.ts` |
| Contact constants for React components | `apps/web/src/lib/contactInfo.ts` |
| Canonical URL rules | `apps/web/src/seo/canonical.ts` |
| Every published route: title, description, breadcrumb, Service node, FAQ, index state | `apps/web/src/seo/pages.ts` |
| JSON-LD builders and entity ids | `apps/web/src/seo/schema.ts` |
| Per-route static HTML files | `apps/web/src/seo/artifacts.ts`, written by `apps/web/scripts/postbuild.mts` on every build |
| Sitemap | generated into `dist/sitemap.xml` by the same script |

## Names

`BuzzKill Pest Control LLC` operates the `BuzzKill` brand and provides the
services described online as `BuzzKill Pest Control`. The Organization node is
typed `HomeAndConstructionBusiness` (a real schema.org LocalBusiness subtype;
`PestControl` is not in the vocabulary) and uses `BuzzKill Pest Control` as
`name` (citation consistency), `BuzzKill` as `alternateName` and `brand`, and
the LLC as `legalName`, with the Massachusetts entity ID `001941986` as a
`PropertyValue` identifier. The
repository holds no DBA or trade-name filing, so nothing calls the descriptive
name a registered trade name. The founding date is the LLC formation date,
2026-01-16; planning began in late 2025 and is shown only as a story milestone.

## Contracts and billing

* Checkout terms are built per offer and per payment method by
  `bookingTermsFor({ recurring, offSeason, paymentMethod })`. The offers are
  one-time, recurring (the amount shown is the initial fee, monthly billing
  after the first completed visit, cancel any time, initial-visit refund rule
  on `CANCEL_FULL_REFUND_DAYS`), and off-season seasonal enrollment (first
  monthly payment now, monthly year-round from now, April to October
  treatments, April date confirmed by BuzzKill, cancel any time). The payment
  sentence is decided only by the method the customer selected: CARD terms say
  the card is charged today and never mention an invoice; INVOICE terms say
  the amount is "invoiced when the booking is made, payable on Net 30 terms"
  and never mention a card. Invoice eligibility (`invoiceEligibleFor`) stays a
  separate server check; the quote response carries card text always and
  invoice text only for invoice-eligible quotes; the checkout shows exactly
  the text for the selected method and clears acceptance whenever the method
  changes (`src/lib/bookingTermsView.ts`). `/book` reconstructs the text from
  `body.invoice` and the stored quote, never from client text.
  `BOOKING_TERMS_VERSION` is `2026-09-08.1`; `/book` rejects any other
  version with a 409 carrying the fresh terms before any money, invoice, or
  capacity change, and stores the exact accepted text on the booking
  (`tcText`) with the version. The agreement quotes that stored text. Quote
  PDFs label the plan amount "Initial fee", not "Due at booking", because the
  payment method is not known when the quote is rendered.
* The online-booking agreement no longer prints a 12-month initial term or
  `Tax (0%)` rows. Its covered-pests grid comes from the catalog service sold:
  MOSQUITO lists mosquitoes only, MOSQUITO_TICK mosquitoes and ticks only,
  general plans the general lineup, one-time jobs no grid. The same module
  (`amplify/functions/shared/coverage.ts`) decides the quote PDF's coverage
  strip from the catalog id passed by every caller; the label-based
  `pestsForService` heuristic that once added fleas to a mosquito label is
  gone, and neither seasonal plan shows fleas anywhere.
* The guarantee everywhere is the implemented plan callback:
  "If covered pests return between scheduled visits while your service plan
  is active, request a callback. Qualifying callbacks are provided at no
  charge."

## Credentials

| Credential | Holder | Evidence | Public status |
| --- | --- | --- | --- |
| MA Commercial Certification CC-0060592, Category 41, General Pest Control (issued 2026-02-25, valid through 2026-12-31, recertification 2029-12-31) | Jacob Greasley | Official document: MDAR approval letter; MDAR ePLACE public search returns it | Active; shown on Licensed & Insured and the Massachusetts service-area page; the primary credential printed on documents |
| MA Applicator (Core) License AL-0060551 (issued 2026-02-17, valid through 2026-12-31, recertification 2029-12-31) | Jacob Greasley | Official document: MDAR approval letter; MDAR ePLACE public search returns it | Active; shown wherever Massachusetts credentials are summarized, in the issuer's exact wording |
| RI Pesticide Company Registration CP-PCR-000045 | BuzzKill Pest Control LLC | Owner confirmation (no RIDEM certificate or portal record stored) | Active; shown on Licensed & Insured, the Rhode Island service-area page, and metadata; printed only on Rhode Island work documents; expiration not supplied and never invented |

Provenance is recorded on each record (`evidence: "official-document"` or
`"owner-confirmed"`) and is part of the public truth. The site does not claim
that the Rhode Island registration was verified through a portal or a
certificate; it says the owner confirmed it. Obtaining the RIDEM certificate
or portal record (registrant, status, expiration) is a follow-up, not a
release blocker.

Public status is date-aware. `publicStatus(credential, asOf)` returns
"Active" through the credential's `validThrough` date and "Renewal
verification pending" from the day after, so on 2027-01-01 neither
Massachusetts credential reads Active until renewal evidence updates the
record. The registration with no known expiration keeps the status the
owner confirmed. Pages compute `asOf` from `isoToday()`; tests pass fixed
dates.

Documents (`documentLicenseLine({ state })`) print the Category 41
certification for Massachusetts work and add the company registration for
Rhode Island work. Printing only CC-0060592 as the primary credential is a
layout choice and says nothing about the Applicator (Core) License, which is
Active. Only credentials Active on the document date are printed.

Both Massachusetts credentials were issued to Jacob Greasley personally.
Neither is a company licence, and neither is evidence that more than one
technician is licensed; no authoritative staff credential records exist in
the repository, so the site says "a licensed and insured team" or "a licensed
applicator" and never pluralizes licences. The MDAR approval letters are
private evidence: they carry the holder's former personal address, which is
not a company fact and must never be published, quoted, linked, or copied
into the repository. A test scans the site, backend, public folder, and docs
for that address, and for any return of the earlier conclusions (the Core
license called superseded or historical, the Rhode Island registration
called unverified or pending).

No licence number appears in the founder's Person schema.

## Regulated methods

The site holds evidence for Category 41 (General Pest Control) only. Under
333 CMR 13.05 termite work by subsurface application (soil treatment around
foundations, bait systems, trenching, drilling, sub-slab injection) is
Category 43, which is not held, so the termite pages now describe
inspection, identification, monitoring, and treatment "matched to the
credentials that cover it" and promise no subsurface method. A test refuses
those terms in the termite pages, the route registry, the catalog, the PDF
module, the agreement, and the email module. Follow-ups: obtain Category 43
(or a Category 43 supervisor) before offering subsurface termite work, and
review Category 47 (wood-destroying insect or product) coverage before any
product or method claim in that area.

## Route files and hosting rules

`npm run build` writes `dist/index.html` (home, with its own canonical),
`dist/<path>.html` for every registered route (including `quote/instant.html`
and `quote/contact-me.html`, both canonical to `/quote`, and every city page
with `noindex, follow`), `dist/404.html` (noindex), and `dist/track.html`
(noindex, token-free shell for `/track/<token>`). Amplify serves `/about.html`
for a request to `/about` without changing the address bar, so slashless
canonicals are preserved.

Current Amplify rules (`aws amplify get-app --app-id d26qpsjewk0bee --region us-east-1`):

1. `https://pestbuzzkill.com` -> `https://www.pestbuzzkill.com` 301
2. `</^[^.]+$/>` -> `/index.html` 200
3. `/<*>` -> `/index.html` 404-200

### Replacement rules (apply in this order, after the staging check below)

```json
[
  { "source": "https://pestbuzzkill.com", "target": "https://www.pestbuzzkill.com", "status": "301", "condition": null },
  { "source": "https://main.d26qpsjewk0bee.amplifyapp.com", "target": "https://www.pestbuzzkill.com", "status": "301", "condition": null },
  { "source": "/request-quote", "target": "/quote", "status": "301", "condition": null },
  { "source": "/residential/<*>", "target": "/services/<*>", "status": "301", "condition": null },
  { "source": "/track/<*>", "target": "/track.html", "status": "200", "condition": null },
  { "source": "/<*>", "target": "/404.html", "status": "404", "condition": null }
]
```

Rule 4 also moves the exact `/residential` landing page's children only; the
landing page itself has no trailing segment and is unaffected. Rule 5 keeps the
requested `/track/<token>` URL in the browser while serving the noindex shell.
Rule 6 replaces the broad `index.html` rewrite: every public route has its own
file, so anything else is a real 404.

### Safe deployment order

Staging first, always. One push to `staging` builds the backend and the web
app together (`amplify.yml`): the backend carries the `BookingRequest.tcText`
field and `BOOKING_TERMS_VERSION` `2026-09-08.1`, and `/book` answers any
older version with a 409 and the fresh terms, so no customer mid-checkout
is charged on stale text and no data migration is needed. The CRM app
builds separately: re-release it after the schema deploy so its
`amplify_outputs.json` includes `tcText`. On staging, before anything
touches `main`, book one card visit and one invoice visit (a COMMERCIAL or
COMMUNITY quote) and confirm the checkout shows card terms for card and
invoice terms for invoice, that switching the method clears the checkbox,
and that each emailed agreement quotes the stored text under "ACCEPTED
TERMS (version 2026-09-08.1)". Only then merge to `main`.

Amplify custom rules are app-wide, and the current `</^[^.]+$/>` rewrite
intercepts every clean path, so staging cannot prove clean-path delivery
until that rule is replaced. Prove the files first, then switch the rules.

1. Push the corrected build to `staging` and wait for the deploy.
2. While the old rules remain, request the direct artifacts, which the
   rewrite does not intercept because they carry an extension:

   ```bash
   for p in about.html services/termite.html 404.html track.html; do
     echo "== $p"; curl -s "https://staging.pestbuzzkill.com/$p" \
       | grep -o '<title>[^<]*</title>\|<meta name="robots"[^>]*>\|<link rel="canonical"[^>]*>\|application/ld+json' ; done
   ```

3. Confirm each file carries the expected title, canonical (`about` and
   `services/termite`; none for `404.html` and `track.html`), robots directive
   (`noindex, nofollow` on staging for every file because `amplify.yml` stamps
   it there; the canonical and title are the signals to read), and two JSON-LD
   blocks (one for the shell files).
4. Deploy the same artifact-producing build to `main` and repeat step 2
   against `https://www.pestbuzzkill.com/`; production files should read
   `index, follow` where the registry says so.
5. Only after both staging and main serve the generated route files, replace
   the app-wide rules with the JSON above (console: App settings, Rewrites and
   redirects, or `aws amplify update-app --custom-rules`).
6. Test clean URLs on both hosts:

   ```bash
   for p in /about /services/termite /reviews /track/example /request-quote /residential/termite /no-such-page; do
     echo "== $p"; curl -sI "https://www.pestbuzzkill.com$p" | grep -iE '^(HTTP|location)'; done
   ```

   Expect 200 for `/about`, `/services/termite`, `/reviews` (each with its own
   canonical in the body), 200 with `noindex, nofollow` and no token for
   `/track/example`, 301 to `/quote` for `/request-quote`, 301 to
   `/services/termite` for `/residential/termite`, and 404 with the not-found
   page for the nonexistent path.
7. Watch production throughout: the SPA keeps working under either rule set
   because every route file boots the same application bundle, so the switch
   can be reverted by restoring the two old rules if anything regresses.

## Post-deployment checklist

1. `curl -sI https://pestbuzzkill.com/ | grep -i location` -> `https://www.pestbuzzkill.com/`.
2. `curl -sI https://main.d26qpsjewk0bee.amplifyapp.com/ | grep -i location` -> `https://www.pestbuzzkill.com/`.
3. `curl -s https://www.pestbuzzkill.com/about | grep -c 'rel="canonical"'` -> 1; the href is `https://www.pestbuzzkill.com/about`.
4. `curl -s https://www.pestbuzzkill.com/ | grep -c 'bk-site-jsonld'` -> 1; paste both JSON-LD blocks into the Schema Markup Validator and Google's Rich Results Test.
5. `curl -s https://www.pestbuzzkill.com/sitemap.xml | grep -c '<loc>'` -> 35; no `/pest-control/` URL; `/reviews`, `/locations/massachusetts`, `/locations/rhode-island` present.
6. `curl -s https://www.pestbuzzkill.com/pest-control/framingham-ma | grep -o '<meta name="robots"[^>]*>'` -> `noindex, follow`.
7. `curl -sI https://www.pestbuzzkill.com/no-such-page | head -1` -> `404`.
8. `curl -s https://www.pestbuzzkill.com/track/example | grep -o '<meta name="robots"[^>]*>'` -> `noindex, nofollow`; the response contains no token.
9. Google Search Console: submit the sitemap; URL Inspection on `/`, `/about`, `/services/termite`, `/reviews`; confirm "User-declared canonical" equals "Google-selected canonical".
10. Google Business Profile, Thumbtack, Facebook, Instagram, LinkedIn: name "BuzzKill Pest Control", address 420 Lakeside Ave, Suite 104, Marlborough, MA 01752, phone (508) 258-9294, website `https://www.pestbuzzkill.com`.

## External work this repository cannot do

* **Federal trademark review** of "BUZZKILL PEST CONTROL" with qualified
  counsel. Unresolved. The site adds no ™ or ® and implies no conclusion.
* **Public-brand qualifier decision** (for example "BuzzKill Pest Control of
  Marlborough"); the site uses descriptive titles only.
* **Massachusetts state-record address** amendment from the Framingham mailing
  address to 420 Lakeside Ave, Suite 104.
* **Thumbtack profile** (https://www.thumbtack.com/ma/marlborough/exterminators/buzzkill-pest-control/service/583778090572914694) corrections:
  remove the unqualified "safe" language; rewrite "100% satisfaction guarantee"
  to the active-plan callback policy or remove it; remove "30 employees";
  remove "1 year in business"; remove the published hours (Mon to Fri 8am to
  5pm) unless confirmed; make clear the Massachusetts commercial certification
  is held by Jacob Greasley, not by the company. Keep the four authentic
  reviews, the 5.0 rating, and completed-job counts.
* **Google Business Profile and citations**: name, Suite 104 address, phone,
  www host; the Google URL `https://g.page/r/CYyHi3DH59WEEAI/review` is a
  review-submission link only.
* **Legacy or duplicate profiles** that mix this company with same-name
  businesses in other states.
* **jakegreasley.com**: deploy it; once it answers 200 with a matching
  Person, move `PERSON_ID` in `src/seo/schema.ts` to `https://jakegreasley.com/#person`.
* **Credential evidence**: obtain the RIDEM certificate or portal record for
  CP-PCR-000045 (registrant, status, expiration) and add the expiration to
  the record; renewal evidence for both Massachusetts credentials before
  2027-01-01, when their public status stops reading Active; Category 43
  before any subsurface termite offer; Category 47 review (see Regulated
  methods).
* **Amplify rules** above, after the staging check.
* **Legal review** of the Privacy Policy and Terms of Service, dated Effective
  January 16, 2026 and Last Updated September 7, 2026.
* **`VITE_GA_ID`** is not set on the Amplify app or the `main` branch; the
  build falls back to the property hard-coded in `index.html`. Set it in the
  Amplify console if a separate staging property is wanted.
