# Production error and infrastructure monitoring

BuzzKill's public website and CRM report production browser errors to separate
Sentry projects. The initial integration covers errors and deployed releases.
Session replay, performance tracing, log collection, and paid AI features are
outside this setup.

## Shared organization and repo ownership

Owner decision (2026-11-04): use one shared Sentry organization named
**Master Planning**, organization ID `4512373753249792`, in the US region.
Its canonical slug is `master-planning`. The existing BuzzKill organization
is renamed in place so its projects and ingestion identities are retained.
This decision supersedes the earlier per-business organization convention.

Keep separate projects for each independently deployed application or service.
Use `buzzkill-web` for the public website/booking flow and
`buzzkill-crm` for the staff application/customer portal. Production and staging
are environments, not businesses. This release enables only canonical production
hosts; development, preview, and staging builds do not send events.

Jake coordinates organization identity, billing, membership, and the shared
Slack installation. Repo chats must not create another organization or modify
those shared settings. Each repo uses its own project DSNs and a separately
named CI upload credential kept in its existing secret store. Do not reuse
another repo's token. Inspect membership before inviting collaborators:
organization-wide administrators span projects, and project names alone do
not establish access isolation.

Use the **Master Planning** Slack workspace, ID `T0C66F8M9U3` (some connectors
still display its former name, ERP). BuzzKill's private channel is
`#sentry-buzzkill`, ID `C0CEZEQCML6`; other repos use their own private
`#sentry-<repo>` channel. Route only the matching projects' production alerts
there and preserve existing email actions.

## Plan and alert operation

Native Slack notifications require Team or above. The shared organization
uses one subscription across its projects; usage allowances are also shared.
Only Jake may authorize the central plan change. Do not start trials, enable
paid add-ons, or enable pay-as-you-go through repo setup work.

Alert on newly observed and regressed browser errors rather than each occurrence.
Keep infrastructure transition alerts on their separate event-based rule below.
Inspect project usage if one application becomes noisy. Suppress known benign
errors deliberately rather than hiding new failures with broad filters.

## Build configuration

Each production Amplify app supplies its own branch-scoped values:

| Variable | Purpose |
| --- | --- |
| `VITE_SENTRY_DSN` | Public event-ingestion key for that application's project |
| `SENTRY_ORG` | Shared organization slug, `master-planning` |
| `SENTRY_PROJECT` | The matching app project slug |
| `SENTRY_AUTH_TOKEN` | Private CI credential scoped to this organization for release/artifact uploads |
| `SENTRY_UPLOAD_SOURCEMAPS` | Explicit production source-map upload opt-in |

CI captures the original hosting branch in `SENTRY_DEPLOYMENT_BRANCH` before the
WEB backend switches its internal deployment namespace. Only the captured `main`
branch may upload. The build derives `VITE_SENTRY_RELEASE` from the project and
actual Git HEAD, and checks any AWS commit metadata against that checkout.
The SDK and uploaded artifacts must use that same release. Set these values on
the production branch, not at an app-wide scope inherited by preview branches.
The private token must never have a `VITE_` prefix, appear in a checked-in file,
or be copied into browser code.

The shared build helper generates hidden source maps, uploads them to Sentry,
and removes them from the hosting artifacts. A configured production upload
failure blocks the build. The final artifact check must pass before hosting;
hidden source maps are still files and must not be served publicly.

Local builds work without Sentry credentials. The shared browser initialization
and privacy policy are reused by both apps; app entry points provide their own
identity and allowed production hosts. A future repository can reuse that
pattern in the shared Master Planning organization with its own projects,
hostnames, and CI credentials.

## Event contents

Send diagnostic stack locations, a fixed operation label, the release, and a
sanitized route. Do not send customer names, email addresses, phone numbers,
addresses, payment information, form contents, authentication links, URL query
strings, raw console messages, or arbitrary application state. Preserve only
validated source-map debug identifiers and public static asset filenames.

Monitoring must remain optional at runtime: an unavailable Sentry endpoint must
not prevent sign-in, booking, payment, or normal navigation.

## Release verification

Before production rollout, run the privacy/configuration tests and both app
builds. Verify the final artifacts contain neither source maps nor the private
upload token. Obtain the final commit's 5/5 review before merging.

After deployment, verify one synthetic, non-customer error per project, the
production environment, exact deployed release, original source mapping, and
owner email-alert delivery. Check that normal booking and CRM navigation still
work. Verification must not modify customer records or deliberately interrupt a
real user's task.

After confirming the integration, resolve the synthetic verification issues.
For each additional repo, verify its project identity, secret storage, membership,
Slack routing, and shared usage impact before switching its production settings.

## Infrastructure incidents

`buzzkill-backend` receives production infrastructure incidents from the
existing `ops-alerts` bridge. CloudWatch continues detecting Lambda errors and
throttles, missed scheduled runs, email dead letters, and customer-search
indexing failures/backlog. Throttled or missing invocations cannot report
their own application errors, so those AWS detectors remain in place.

Set `SENTRY_INFRA_DSN` on the website's **main Hosting branch** to the
`buzzkill-backend` public ingestion DSN. This is separate from the website's
`VITE_SENTRY_DSN`; do not change either browser project's configuration.
The backend derives `SENTRY_ENVIRONMENT`, the exact retained alarm namespace
(`SENTRY_INFRA_ALARM_BRANCH`), the AWS account, and its transition-state table.
Preview and staging deployments keep the prior diagnostic-email route.

An ALARM sends one structured Sentry error with a stable issue fingerprint
and transition-specific event ID. It includes the logical function, signal,
numeric alarm policy, repository path, and AWS alarm link. Raw log excerpts,
alarm descriptions/reasons, dimensions, request payloads, and customer data
never go to Sentry. SNS retries reuse the event ID. A per-alarm DynamoDB lease
and durable transition timestamp prevent delayed deliveries from reopening
an incident after a newer recovery.

The CRM still owns its deduplicated `INFRA_ALERT` and automatically resolves it
when AWS reports OK. The Sentry issue is diagnostic history: resolving it does
not change AWS or the CRM, and AWS recovery does not automatically resolve the
Sentry issue. Confirm recovery before marking the Sentry issue resolved.

The Sentry alert **BuzzKill infrastructure — production alarm events** selects
`buzzkill-backend`, environment `production`, and **An event or issue activity
is captured**, notifying Jake with a one-hour per-issue throttle. Listening to
every event allows a later ALARM transition to notify even when the historical
issue is still unresolved. Browser alert rules remain separate.

Successful Sentry delivery replaces the bridge's custom diagnostic email.
Missing DSN keeps that previous route for rollback. Failed or rate-limited
Sentry ingestion sends the diagnostic fallback and fails the invocation so
SNS/Lambda retries and the existing dead-letter queue remain effective. The
three bridge watchdog alarms retain their independent direct SNS email path:
an alert bridge cannot reliably report its own failure through itself.

Verify a clearly labelled synthetic event in the backend project and its
notification history before enabling the main branch DSN. Verify the deployed
bridge, state table, IAM, all existing alarm actions, and normal recovery
after rollout. Do not create a real business failure to test monitoring.
To revert routing, remove `SENTRY_INFRA_DSN` from main Hosting settings and
redeploy; keep the AWS detectors, queue, and watchdog subscriptions intact.
