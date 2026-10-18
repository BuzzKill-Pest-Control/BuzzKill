## BuzzKill Pest Control

Monorepo for BuzzKill Pest Control applications.

## Repository layout

| Path | What it is |
| --- | --- |
| `apps/web/` | Public-facing marketing site (React + Vite) and its Amplify Gen 2 backend (`apps/web/amplify/`) — the single backend owner |
| `apps/crm/` | Internal CRM (React + Vite) — the single system of record. Frontend-only: consumes the web app's backend via `npm run outputs` locally / `ampx generate outputs` in CI |
| `docs/` | Shared reference docs and the business reviews under `docs/business-reviews/` |
| `amplify.yml` | Amplify Hosting build spec (monorepo format; each app declares its own `appRoot`) |

Each app is self-contained with its own `package.json` and lockfile — install and run from inside the app directory:

```bash
cd apps/web
npm install
npm run dev        # local dev server
npx ampx sandbox   # personal cloud sandbox for the Amplify backend
```

## Public articles

The marketing site's `/blog` index and `/blog/:slug` pages share the existing header, footer, typography, and black/lime design. The collection starts empty; no demonstration articles are published. Published entries live in `apps/web/src/content/articles/articles.json` and are validated by `src/lib/articles.ts`. Every record needs:

- A unique lowercase hyphenated `slug`, `title` (at most 90 characters), `description` (at most 200), `topic`, and the company editorial `author` byline, `BuzzKill Pest Control`.
- A released ISO `publishedAt` timestamp with timezone and, when corrected, a truthful `updatedAt` that does not precede publication. Future entries fail validation; a future timestamp is not a publishing scheduler.
- An `image` with a local `src` under `/images/blog/<slug>/`, useful `alt`, pixel `width`/`height`, visible `credit`, and a `sourceUrl` documenting provenance. Supported extensions: webp, jpg, jpeg, png, avif. Images must exist inside this site's public directory and be at most 10 MiB.
- A `body` containing 1,000–2,000 words in typed blocks: `{type: "heading", id, text}`, `{type: "paragraph", content: [{text, href?}]}`, or `{type: "list", items: [[{text, href?}]], ordered?}`. Heading IDs must be unique. Prose is rendered as escaped text, never raw HTML or executable content.
- A nonempty `sources` array of `{title, url}` references. Sources use credential-free HTTPS; prose links may also use local site paths. Source quality, factual accuracy, permission to use images, internal-link validity, and any required professional review still need editorial verification before release.

Run from `apps/web`:

```bash
npx tsx scripts/validate-editorial-content.mts
npx vitest run src/lib/articles.test.ts src/seo
npm run build
```

The build validates articles, local prose-link destinations, and image files, then writes the listing and each complete article body into slashless clean-URL HTML artifacts, together with page metadata, article/breadcrumb structured data, and sitemap entries. This uses the existing postbuild pipeline and preserves deployment noindex rules. Test fixtures stay in tests. Keep unreleased work outside the public collection.

Use the established reviewed website release workflow. The web app still owns the shared backend; adding an article does not establish a separate content-only deployment procedure or authorize an autonomous release. Hosting clean-URL behavior and rendered mobile/desktop pages require staging verification before production.

The Amplify Hosting app has `AMPLIFY_MONOREPO_APP_ROOT=apps/web` set in the console so builds resolve the correct app root.

---

This repository was created from the AWS Amplify React+Vite starter template, emphasizing easy setup for authentication, API, and database capabilities.

## Overview

This template equips you with a foundational React application integrated with AWS Amplify, streamlined for scalability and performance. It is ideal for developers looking to jumpstart their project with pre-configured AWS services like Cognito, AppSync, and DynamoDB.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/react/start/quickstart/#deploy-a-fullstack-app-to-aws) of our documentation.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.
