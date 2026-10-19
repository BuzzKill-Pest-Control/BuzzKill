# Blog initial HTML and Amplify routing

The blog build emits `blog.html` and `blog/<slug>.html` with full page prose and
metadata. The previous broad SPA rewrite serves `index.html` for clean blog
paths before Amplify can resolve those artifacts.

The reviewed rule file `apps/web/hosting/amplify-custom-rules.json` adds two
listing rewrites, normalizes an article's trailing slash, and excludes only
`/blog` and its children from the broad SPA rewrite. Amplify's native clean URL
lookup then serves `blog/<slug>.html` for `/blog/<slug>`. Direct `.html` artifacts
remain accessible. The domain redirect, About exceptions, non-blog SPA behavior
and missing-file fallback remain intact. No synthetic article ships.

## Local verification

From `apps/web`, run:

```sh
npx vitest run src/lib/articles.test.ts src/seo
npm run build
npm run test:about-build
```

The fixture test sends real local HTTP requests through the ordered rules to
rendered listing and article HTML, including query strings, direct `.html`,
trailing slashes, unknown slugs and existing SPA routes. The final command checks
the real built About and Blog artifacts and any published article artifacts.
This simulation does not prove that Amplify is serving the reviewed rules.

## Live setup remains separate

Amplify custom rules are app-wide and are maintained separately from code
builds. Merging these PRs does **not** apply this rule file. Do not put an AWS
`update-app` operation in the build or apply it automatically from an article.
Follow the backup, comparison and rollback procedure in
[the existing About release guide](about-initial-html-2026-09-14.md).

1. Deploy the reviewed source to staging through the established branch
   workflow. With the old app-wide rules still present, check the raw HTML at
   `/blog.html` for the Blog title, canonical, empty listing and staging noindex
   directive. Use an HTTP read or disable JavaScript for this artifact check;
   the client router does not recognize `/blog.html` and renders NotFound there.
   Open `/blog` for rendered desktop/mobile QA; the existing SPA rules let React
   show the listing at that route. Neither check verifies that canonical
   `/blog` requests deliver the full initial HTML.
2. After these staging raw-HTML and rendered checks and the required source
   review/checks, release the same article implementation to main. Check raw
   `/blog.html` HTML and rendered `/blog` on production too. The documented
   release order permits these checks before a clean-URL switch. Do not promote
   unrelated staging commits.
3. A separately authorized hosting operator must inspect the actual current
   app/branches, save a fresh custom-rules backup, preserve unrelated live rules
   and confirm every affected branch has the referenced artifacts. Only then
   apply the reviewed blog routing change to the correct web app. This document
   and its tests perform no live configuration mutation.
4. After the hosting switch, verify raw canonical `/blog` and actual
   `/blog/<slug>` requests on the appropriate hosts, plus query-string and
   trailing-slash behavior, About, existing SPA routes and static assets.
   Direct `.html` URLs remain raw-artifact checks; use canonical routes for
   rendered desktop/mobile QA. Record responses and captures separately. An
   empty article collection cannot prove a real published article's live detail
   page. Restore the saved rules if needed.

Until the live rules and canonical readback are verified, hosting setup remains
incomplete and an autonomous editor must not claim canonical publication works.

AWS references: [rule ordering and 301 query forwarding](https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html),
[native clean URLs, placeholders and regular-expression rewrites](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html).
