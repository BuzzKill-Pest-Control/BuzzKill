# About page initial HTML and Amplify routing

The September 14 live check found `/about` serving `index.html` while
`/about.html` already had the correct route metadata. Amplify's app-wide
`</^[^.]+$/>` rewrite intercepts the clean path before file resolution.
The route build also contained no visible page content before JavaScript.

The production build now renders the existing `AboutPage` component into
`dist/about.html` alongside its existing title, description, canonical,
Open Graph/Twitter tags and JSON-LD. The regular React app still mounts for
interaction and navigation. About copy remains defined in the page component
and shared company record, rather than duplicated in an SEO-only template.
Other pages keep their existing rendering and routing.

## Verify and deploy

From `apps/web`:

```sh
npx vitest run src/seo/artifacts.test.ts
npm run build
npm run test:about-build
```

The final command serves the actual built files locally with the proposed
ordered path rules. It verifies the raw `/about`, `/about/`, query-string and
direct `.html` responses without JavaScript, plus unchanged SPA routes. It
is a routing simulation, not proof of deployed Amplify behavior.

Production web app: `d26qpsjewk0bee`, branch `main`, region `us-east-1`, public
host `https://www.pestbuzzkill.com`. The read-only app inspection used the
default AWS CLI credential profile (no `--profile` override). This is the
web app only; do not change a CRM app or its configuration.

After the reviewed commit is pushed and the main build is deployed:

1. Request `https://www.pestbuzzkill.com/about.html` and confirm it contains
   the visible About heading and founder section, not only JSON-LD.
2. Save a fresh `get-app` custom-rules backup. Compare it with
   `apps/web/hosting/amplify-custom-rules.json`: that file preserves the three
   rules observed on September 14 and adds only `/about` and `/about/` 200
   rewrites before the broad SPA rewrite. If live rules changed, retain those
   unrelated changes and insert these two About rules in the proper order.
3. Apply the reviewed rules after the artifact is available. Amplify custom
   rules are app-wide, so check other branches before changing them; each
   must have `about.html`. Do not run this as a pre-deploy build step.

```sh
aws amplify get-app --app-id d26qpsjewk0bee --region us-east-1 --query 'app.customRules' --output json > /tmp/buzzkill-custom-rules-before-about.json
aws amplify update-app --app-id d26qpsjewk0bee --region us-east-1 --custom-rules file://apps/web/hosting/amplify-custom-rules.json --query 'app.customRules' --output json
```

Run those commands from the repository root. No hosting mutation is made by
the build, tests, or this documentation.

4. Fetch the live raw `/about` and `/about/` responses (also test a query
   string). Expect 200, About title/description and social tags, a slashless
   `https://www.pestbuzzkill.com/about` canonical, and visible founder content.
   Confirm `/`, `/book`, `/track/example`, `/residential` and static assets
   preserve their behavior. Also verify normal rendered navigation in a browser.
5. If needed, restore the saved custom-rules array to roll back routing.

The broader routing cleanup proposed in
`seo-canonical-entity-handoff-2026-09-07.md` is separate. This change does not
enable its global 404 behavior or change other public routes.

AWS references:
[Rule ordering](https://docs.aws.amazon.com/amplify/latest/userguide/redirects.html)
and [clean URL behavior](https://docs.aws.amazon.com/amplify/latest/userguide/redirect-rewrite-examples.html#trailing-slashes-and-clean-urls).
