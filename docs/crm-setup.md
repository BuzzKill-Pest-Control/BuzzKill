# BuzzKill CRM — deployment setup

What Jake needs to configure in the consoles before the CRM's Stripe billing
goes live, plus the app-wide hosting rules maintained separately from builds.
Application code deploys automatically with the repo.

## 1. Stripe (required for billing)

Create/log into the BuzzKill Stripe account (test mode first), then:

**Secrets on the WEB Amplify app (`BuzzKill`, d26qpsjewk0bee — it owns the
backend), per branch (staging/main):** Amplify Console → App settings →
Secrets:

| Secret | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_…` (later `sk_live_…`) |
| `STRIPE_WEBHOOK_SECRET` | signing secret from step below |

**Webhook registration** (Stripe dashboard → Developers → Webhooks → Add
endpoint): the endpoint URL is in the deployed `amplify_outputs.json` as
`custom.stripeWebhookUrl` (also visible in the Amplify build logs). Events:

```
setup_intent.succeeded
payment_intent.succeeded
payment_intent.payment_failed
invoice.paid
invoice.payment_failed
customer.subscription.deleted
```

Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

**Env var on the CRM Amplify app (`BuzzKill CRM`, d5ln2hbbp9s2j):**
`VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_…`. (Amplify build forwards `VITE_`
vars into the bundle.)

Sandbox equivalents: `npx ampx sandbox secret set STRIPE_SECRET_KEY` etc. in
`apps/web`, and a local `.env` with `VITE_STRIPE_PUBLISHABLE_KEY` in
`apps/crm`.

## 2. Google Maps address autocomplete

Create a **browser API key** in Google Cloud Console (APIs & Services →
Credentials) with **Places API (New)** enabled (the Maps JavaScript API is not
required — the forms call the Places REST endpoints directly). Restrict the
key by HTTP referrer to the app domains (and `localhost` for dev), then set
env var `VITE_GOOGLE_MAPS_API_KEY` on **both** Amplify apps and rebuild.
Without the key the address fields are plain inputs — everything still works,
just no suggestions.

## 3. SES

Already working: `info@pestbuzzkill.com` is the verified sender used for
service reports, agreement links, reminders, and payment requests. If email
volume grows or messages land in spam, add DKIM for the domain in SES.
Cognito login invites use Cognito's default mailer.

## 4. Customer portal domain

The production CRM and customer portal use `https://app.pestbuzzkill.com`.
Set `CRM_APP_URL=https://app.pestbuzzkill.com` on the WEB app's production
branch; it is baked into agreement links, billing links, and Cognito invite
emails. Staging continues to use the staging Amplify hostname.

## 5. Bootstrapping the first office user

The CRM is invite-only, and invites are sent from the CRM by office staff.
Create the *first* office login once per environment with the AWS CLI
(user pool id is in `amplify_outputs.json` → `auth.user_pool_id`):

```bash
aws cognito-idp admin-create-user --user-pool-id <POOL> \
  --username you@pestbuzzkill.com \
  --user-attributes Name=email,Value=you@pestbuzzkill.com Name=email_verified,Value=true Name=name,Value="Your Name" \
  --region us-east-1
aws cognito-idp admin-add-user-to-group --user-pool-id <POOL> \
  --username you@pestbuzzkill.com --group-name OFFICE --region us-east-1
```

(Add `TECH` too for a "both" role.) After that, everyone else is invited from
More → Invite a staff member, or per-customer with "Invite to portal".

## 6. CRM hosting routes

The CRM is a single-page app. Direct visits to `/dashboard`, customer records,
and portal pages must serve `index.html` with HTTP 200 so the browser router
can select the screen. Its reviewed rules are in
[`apps/crm/hosting/amplify-custom-rules.json`](../apps/crm/hosting/amplify-custom-rules.json).
The rewrite excludes static asset extensions so JavaScript, CSS, icons, and
the web manifest continue to resolve as files.
It follows [AWS's SPA rewrite guidance](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html#redirects-for-single-page-web-apps-spa),
with the CRM's asset extensions preserved.

| Amplify app | App ID | App root | Purpose |
| --- | --- | --- | --- |
| BuzzKill CRM | `d5ln2hbbp9s2j` | `apps/crm` | `app.pestbuzzkill.com` and customer portal |
| BuzzKill | `d26qpsjewk0bee` | `apps/web` | Public website and shared backend |

Both apps use `us-east-1`. Amplify custom rules are **app-wide**: changing CRM
rules affects both `main` and `staging`. The build does not apply this JSON;
deploying code alone does not repair or replace hosting rules.

Keep the website's canonical-domain, legacy marketing-route, and static-page
rules on the web app. The CRM does not generate `404.html` or `track.html`.
On September 28, 2026, web-only rules on the CRM app sent requests to a missing
`404.html` and caused a `/404/` redirect loop. Replacing them with the CRM SPA
rewrite restored direct routes without changing application code.

Run these commands from the repository root. First confirm the returned app
ID and app root match the CRM row above:

```bash
aws amplify get-app --app-id d5ln2hbbp9s2j --region us-east-1 \
  --query 'app.{appId:appId,name:name,appRoot:environmentVariables.AMPLIFY_MONOREPO_APP_ROOT,customRules:customRules}' \
  --output json
```

Back up the current rules, validate the backup, apply the CRM file, and read
the persisted rules back in one guarded block (requires `jq`). If fetching or
validating the backup fails, no rules are changed. Keep the printed backup
path for rollback; the saved JSON must be a nonempty rules array.

```bash
if crm_rules_backup="$(mktemp /tmp/buzzkill-crm-custom-rules.XXXXXX)" &&
  aws amplify get-app --app-id d5ln2hbbp9s2j --region us-east-1 \
    --query 'app.customRules' --output json > "$crm_rules_backup" &&
  jq -e 'type == "array" and length > 0' "$crm_rules_backup" > /dev/null; then
  printf 'Rules backup: %s\n' "$crm_rules_backup"
  aws amplify update-app --app-id d5ln2hbbp9s2j --region us-east-1 \
    --custom-rules file://apps/crm/hosting/amplify-custom-rules.json \
    --query 'app.customRules' --output json &&
  aws amplify get-app --app-id d5ln2hbbp9s2j --region us-east-1 \
    --query 'app.customRules' --output json
else
  printf 'Backup failed or contained no rules; no rules changed.\n' >&2
  false
fi
```

After propagation, verify both production and staging without following
redirects. Every path, including both `/404/` and `/404.html`, must return the
CRM HTML shell with HTTP 200 and an empty redirect URL. This check stops at
the first failed response:

```bash
(
  set -e
  crm_html="$(mktemp /tmp/buzzkill-crm-response.XXXXXX)"
  trap 'rm -f "$crm_html"' EXIT
  for crm_host in https://app.pestbuzzkill.com https://staging.d5ln2hbbp9s2j.amplifyapp.com; do
    for crm_path in / /dashboard /customers/test /portal/docs /welcome /404/ /404.html; do
      crm_response="$(curl --max-redirs 0 -sS -o "$crm_html" \
        -w '%{http_code}|%{redirect_url}' "$crm_host$crm_path")"
      if [ "$crm_response" != '200|' ] ||
        ! grep -Fq '<title>BuzzKill CRM</title>' "$crm_html" ||
        ! grep -Fq '<div id="root"></div>' "$crm_html"; then
        printf 'CRM route check failed: %s%s (%s)\n' "$crm_host" "$crm_path" "$crm_response" >&2
        exit 1
      fi
      printf 'CRM shell OK: %s%s\n' "$crm_host" "$crm_path"
    done
  done
)
```

Then request the current JavaScript and CSS URLs referenced by the shell and
`/manifest.webmanifest`. They must remain their original file types, not HTML
fallbacks. Open a nested CRM URL in a browser and reload it to confirm the
login or authorized screen loads. These HTTP and browser checks verify the
deployed rules; a successful build alone does not.

If a later rules change needs rollback, use a verified working backup:

```bash
aws amplify update-app --app-id d5ln2hbbp9s2j --region us-east-1 \
  --custom-rules "file://$crm_rules_backup" --query 'app.customRules' --output json
```

Do not restore the incident's web-only rules backup; retain it as evidence.

## What was E2E-verified in the sandbox (2026-07-14)

- Lead → convert (plan or scheduled 1-time job) → active customer
- Portal invite: Cognito user + dynamic `cus-<id>`/`grp-<id>` groups
- Technician + daily route auto-creation, job assignment/reorder
- Tech mobile service report → geolocation stamp → PDF to S3 → emailed via
  SES → job COMPLETED (PDF verified, including the GPS block)
- Agreement: office send → tokenized public /sign page → signed PDF with
  audit trail (name, IP, timestamp, device) → emailed copies
- Customer portal: role routing, own-records visibility, documents with
  entitlement-checked presigned URLs, billing screen
- Reporting dashboard renders (invoice data flows in once Stripe is live)

## Not yet verified (needs real Stripe test keys)

- SetupIntent flow end-to-end (card + US bank via PaymentElement)
- startSubscription / chargeOneTimeJob / webhook settlement of invoices

The UI degrades cleanly without keys (clear error messages), so this can be
tested any time after step 1 by walking a customer through
Collect now → Start billing → Charge.
