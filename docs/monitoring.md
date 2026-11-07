# Production error and infrastructure monitoring

BuzzKill's public website and CRM report production browser errors to separate
Sentry projects. The initial integration covers errors and deployed releases.
Session replay, performance tracing, log collection, and paid AI features are
outside this setup.

## Shared organization and repo ownership

Owner decision (2026-11-04): use one shared Sentry organization named
**Master Planning**, organization ID `4512373753249792`, in the US region.
Its canonical slug is `master-planning`. The existing BuzzKill organization
was renamed in place, retaining its projects and ingestion identities.
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
there and preserve each repo's explicit notification policy. BuzzKill uses
Slack only for monitoring, including independent AWS emergency and delivery-failure
notifications; customer and business emails are outside this monitoring setup.

## Plan and alert operation

Native Slack notifications require Team or above. The shared organization
uses one subscription across its projects; usage allowances are also shared.
The shared Team subscription is active at $29/month plus tax, with a $0
pay-as-you-go limit and Seer disabled. Only Jake may authorize central plan
changes. Do not start trials, enable paid add-ons, or enable pay-as-you-go
through repo setup work.

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

The fixed `monitoring_source_category` tag describes the innermost frame of the
primary exception before its location is redacted. Its values are bounded:

| Value | Location hint |
| --- | --- |
| `app_asset` | A same-origin immutable JavaScript asset accepted by the existing asset allowlist |
| `inline` | The current document's origin and pathname, ignoring query strings and fragments |
| `external` | An HTTP or HTTPS location on another origin |
| `extension` | A recognized browser-extension URI scheme |
| `eval` | An explicit eval marker or a blob, data, or JavaScript URI scheme |
| `unknown` | A missing or unrecognized location |

These categories are location hints. They do not prove which application,
vendor, or extension caused an error. External hostnames, extension identifiers,
raw locations, function names, and error messages remain excluded. The category
survives both privacy passes, including SDK-internal errors that bypass
`beforeSend`. Existing error filters and event delivery remain in effect.

Historical events whose original messages and locations were already removed
cannot be reclassified from this tag. In particular, it does not establish the
cause of the earlier unattributed ReferenceErrors. Future events provide the
bounded hint alongside the existing operation, release, and sanitized route.

Both apps use this shared policy. Verify its category and redaction contract with
the local real-SDK tests and mocked fetch transport, including repeated
sanitization and SDK-internal errors, and run both app builds before release.

Monitoring must remain optional at runtime: an unavailable Sentry endpoint must
not prevent sign-in, booking, payment, or normal navigation.

## Release verification

Before production rollout, run the privacy/configuration tests and both app
builds. Verify the final artifacts contain neither source maps nor the private
upload token. Obtain the final commit's 5/5 review before merging.

After deployment, verify one synthetic, non-customer error per project, the
production environment, exact deployed release, original source mapping, and
native Slack delivery to the private `#sentry-buzzkill` channel. Verify an isolated
synthetic staging event is ingested without triggering production notifications. Check that normal booking and CRM navigation still
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
Preview and staging deployments do not forward operational notifications to
the production Slack channel. `OPS_EMAIL_MUTED` remains a legacy notification
mute for rollback compatibility; it does not enable an email route.

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
is captured**, posting to private `#sentry-buzzkill` with a one-hour per-issue
throttle. The browser and infrastructure rules have no email action. Jake's personal
Issue Workflow overrides are explicitly Off for `buzzkill-web`, `buzzkill-crm`,
and `buzzkill-backend`; regression/assignment emails are a separate Sentry path
from alert-rule actions. Other projects and global preferences remain separate. Listening to
every event allows a later ALARM transition to notify even when the historical
issue is still unresolved. Browser alert rules remain separate.

The native Sentry Slack installation is shared integration `554622` in workspace
`T0C66F8M9U3`. Its bot is `U0CEWEMKMJR`; only the matching BuzzKill project rules
route to channel `C0CEZEQCML6`.

AWS emergency delivery uses a separate Amazon Q Developer in chat applications
configuration, subscribed directly to the existing `OpsBridgeFailureTopic`.
It is owned by a separate CloudFormation stack using
`apps/web/amplify/operational-slack.template.json`; application deployments own
the topic and publisher grant but do not create another chat configuration.
The three watchdog alarms retain ALARM and OK actions to that topic, following
**CloudWatch → SNS → Amazon Q → #sentry-buzzkill** without Sentry or the
`ops-alerts` Lambda in the delivery path. The channel uses an explicit
notifications-only IAM policy and guardrail, and requires user roles. It does
not grant AI, Lambda invocation, or resource-changing commands.

The bridge receives `OPS_SLACK_TOPIC_ARN` and may publish only to that exact
operational topic. Successful Sentry delivery sends no fallback. A missing DSN
uses the operational Slack fallback as the rollback route. Failed or rate-limited
Sentry ingestion publishes a sanitized custom notification there and fails the
invocation so SNS/Lambda retries and the existing dead-letter queue remain
effective. Publishing failure also fails the invocation. SNS acceptance must be
followed by actual Slack delivery verification during setup.

Fallback messages use the same validated infrastructure allowlist as Sentry:
alarm identity, logical function, signal, transition time, numeric policy,
repository path, and AWS console link. They exclude raw logs, reasons,
descriptions, dimensions, payloads, provider error text, and customer data.
The bridge has no SES send or log-reading grant. No monitoring email
subscriptions remain after Slack verification.

Verify a clearly labelled synthetic event in the backend project and its
Slack delivery before enabling the main branch DSN. Verify the deployed
bridge, state table, IAM, all existing alarm actions, and normal recovery
after rollout. Do not create a real business failure to test monitoring.
To revert routing, remove `SENTRY_INFRA_DSN` from main Hosting settings and
redeploy; the operational Slack fallback remains active. Keep the AWS
detectors, queue, managed Slack configuration, and watchdog subscriptions intact.


## Operational Slack route ownership and verification

The standalone routing stack is
`buzzkill-slack-cutover-preflight-20261105-041453-84f14e`. Its configuration name
is `buzzkill-operational-preflight-20261105-041453-84f14e`. These verified
identities are retained in production: AWS permits only one configuration per
account, workspace, and channel. A second application-owned configuration for
the same destination is rejected. Do not delete the existing routing stack or
attempt to replace it during an application deployment.

Update that existing stack with `operational-slack.template.json`, preserving
its ConfigurationName parameter and setting ProductionTopicArn to the shared
ALARM/OK action of the three deployed watchdog alarms. The template owns exactly
the existing configuration, role, and notifications-only policy; their legacy
logical IDs preserve identity. The former test SNS topic is removed during this
update. Tag the stack `owner=buzzkill-operational-slack` and `stage=production`.
Amazon Q bot `U0CEW0YCK51` is a member only of private `#sentry-buzzkill`.

Before removing a confirmed AWS email subscription, verify labelled native
CloudWatch and sanitized custom notifications through the managed route on a
test-only SNS topic. Keep the proven route attached to the real watchdog topic
through the application rollout. This preserves independent delivery while the
bridge and IAM update. After monitoring email is removed, verify both formats
on the production operational topic without invoking business handlers or
changing real alarm states.

Verify all 33 ALARM/OK actions, the 14-day dead-letter queue, transition state,
exact SNS publish permission, absence of monitoring email subscriptions, and
permanent routing-stack ownership. Use an isolated copy of the real sanitizer
for the custom test payload, with a clear verification title and injected
privacy markers that must not survive. Resolve synthetic Sentry issues after
checking the native channel rules and personal workflow preferences.

Shared organization digests, billing, and security notifications are account
settings and are outside BuzzKill's incident-alert routes.

## Frontend-only website release

The website owns the shared backend. A normal `main` push builds both Hosting
apps and runs `ampx pipeline-deploy`; a browser-only fix must explicitly isolate
its release. Use account `743917687359`, region `us-east-1`, web app
`d3owdoeg1om341`, and `BUZZKILL_FRONTEND_ONLY_RELEASE=true`. The wrapper reads
existing outputs, validates the protected retained root and output bindings,
and runs ordinary `npm run build`, including its prebuild guard. It never
falls back to a backend deployment. Unset/false retains the normal deployment
path; other flag values fail.

QA before merging to `main`. Use the isolated Hosting branch
`codex/browser-source-diagnostics`, with automatic builds and PR previews off,
bound to `codex-buzzkill-staging-migration` and business environment `staging`.
Keep the actual backend preview, cutover pause, worker pause, and preview-admin
flags false. The wrapper sets only the client preview flag true for compilation,
which disables customer integrations, analytics, and Sentry. Set source-map
uploads false and do not copy production Sentry credentials or a DSN to this
host. Require noindex HTML, disallow-all robots, and no sitemap. Preserve the
existing staging host, Git branch, CRM, and backend. If the exact settled staging
root is unprotected, enable termination protection as a separately recorded
environment repair before the read-only guard can pass.

Before the production merge, record and hold automatic builds on both main
Hosting branches. Set the frontend-only flag only on web main, preserving its
other settings. Its retained namespace is `codex-buzzkill-account-migration`,
business environment `main`; the client preview flag must be absent/false.
Merge the reviewed source after final-head Greptile 5/5 and validation, then
release only web main. Verify its actual checkout, read-only build markers,
served full release, and artifact checks. Confirm backend identity/update time
and the CRM's existing job25 remain unchanged, then restore the recorded flag
and automatic-build settings. Do not promote unrelated staging or recovery work.

This rollout verifies only `buzzkill-web`; existing per-project integration
setup remains unchanged. Combine real-SDK offline tests and hosted artifact
checks with one separate, clearly labelled synthetic Sentry ingestion/Slack
delivery test. Do not deliberately throw on a production page or invoke forms,
customer workflows, or business APIs. Keep the original issue open while its
historical cause remains unconfirmed.
