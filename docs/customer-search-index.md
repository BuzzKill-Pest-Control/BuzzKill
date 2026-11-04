# Indexed CRM customer and lead search

The existing OWNER-only `staffRoster(lookup: "CUSTOMERS", query, limit, nextToken)` contract now queries a private derived DynamoDB table first. There is no new public model, resolver, external service, or Customer GSI. Customer records are never changed by indexing or backfill.

Exact normalized phone and email keys are hashed; name words use a hashed two-character partition plus an indexed sort-key prefix. Names are bounded to 32 words of 80 code points. Lookup tokens and IDs remain sensitive metadata: the table has no browser grants, is retained with deletion protection/PITR, and is in the existing backup selection. It holds no address, billing, note, or customer snapshot. Do not print lookup rows, stream images, cursors, or provider exceptions.

Every candidate is checked against strongly consistent, selected current Customer fields and the shared matcher. Deleted or merged records are discarded. Current contact/address/lifecycle facts supply the UI. DNC leads remain discoverable with their current DNC label under existing office authorization. A verified fast chunk returns immediately; Search more continues the complete general address/substring walk. An empty or unavailable projection falls back to authoritative source reads. Validation failures fail the request without advancing its cursor.

The fallback queries the existing three status/name partitions using native DynamoDB, then strongly reads selected current facts. One request evaluates at most 150 source rows across 6 pages, returns at most 50 hits, and makes at most 28 native requests (including up to 3 bounded validation attempts). Sparse and empty pages retain continuation. Fast-hit IDs are excluded across every fallback page. Cursors bind caller/query/version and carry only status index keys and bounded seed IDs. Existing contact-query history stays scoped to the user and is absent from URLs.

## Synchronization and deployment

The existing Customer stream is already `NEW_AND_OLD_IMAGES`; the deployment reuses it. The worker reads current facts rather than event images. Its transaction condition-checks all indexed source facts (including absent/null distinctions and unchanged timestamps) and the previous manifest revision, then updates only the derived table. At most 70 distinct transaction items are used. Concurrent changes retry from current rows at most 3 times; stream partial failures checkpoint by sequence number.

1. Deploy the reviewed backend with the new retained projection table and worker. The reader can fall back while the table is absent, empty, or unavailable. No Customer GSI additions or business-row migrations are involved.
2. Confirm the exact production worker/config and IAM, mapping enabled, no errors/throttles, and no sustained IteratorAge backlog. Preview mappings are disabled. Worker pause phases disable the mapping and reserve concurrency 0; final release changes neither code nor environment.
3. Run the bounded backfill in the correct account/region/physical branch. Its first phase reconciles all current customers; its second phase reconciles orphan manifests to remove entries for deletions missed while delivery was paused. Each invocation evaluates at most 25 source or manifest-table entries; empty filtered pages retain continuation. The table-pair-bound cursor is checkpointed only after a successful page.
4. Verify complete backfill aggregate counts and then compare read-only CRM phone/email/name lookups with general search. Do not infer measured latency gains from static code or synthetic unit tests.

The stream retains events for 24 hours. After a pause beyond retention, run a fresh **full two-phase backfill**, even if the stream resumes successfully. Never resume an already-complete checkpoint for that recovery: choose a new private state filename. The worker's Errors/Throttles and sustained 10-minute IteratorAge alarms use the existing operations alarm bridge. A reader-only index outage does not prevent general search.

## Backfill CLI

Run from `apps/web` using the authenticated BuzzKill account 743917687359 in us-east-1. Resolve the deployed `customer-search-indexer` function name from the reviewed retained stack; do not guess a name or pass another function. The helper verifies STS account, exact function ARN account/app, physical branch SSM parameter, expected derived table name, and nonpreview enabled configuration before doing any work. It does not read or print customer rows during dry run.

```sh
node scripts/backfillCustomerSearch.mjs --environment main --function <reviewed-indexer-function>
node scripts/backfillCustomerSearch.mjs --environment main --function <reviewed-indexer-function> --state /absolute/private-directory/search-backfill.json --max-pages 100 --apply
```

Use `staging` explicitly for the retained staging backend. Use an owner-only 0700 state directory. `--apply` is required for Lambda invocation and derived-table writes. The helper keeps local cursor/payload files 0600, uses an exclusive lock and private random atomic checkpoint temp files, and prints aggregate counts only. Repeating the same command resumes its checkpoint; it does not reapply a completed run. A failed page leaves the previous cursor available for safe replay. For work exceeding the configured page limit, rerun the same command until complete. This CLI never changes worker configuration or source Customer rows.

Offline verification: `node --test scripts/backfillCustomerSearch.test.mjs`, focused shared customer search/index/writer/store and indexer tests, and the real migration-assembly suite. The assembly proves table retention/backup, unchanged Customer stream/indexes and resolver count, reference closure, explicit pause coverage, and alarms.
