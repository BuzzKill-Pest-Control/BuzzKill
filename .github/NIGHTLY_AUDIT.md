# Nightly Audit Engineer

GitHub hosts this audit, so the local Mac and Codex desktop app do not need to be
running. The schedule is 4:00 a.m. in `America/New_York`, including daylight saving
time. GitHub schedules can start late during congestion; they are not an exact-time
execution guarantee. The workflow also supports a manual smoke run.

The workflow is stored on the default branch, `main`. Each audit researches the
current `staging` commit and considers at most one cleanup for each of the public
site, shared backend, and CRM UI. It can create up to three independent ready-for-review PRs
targeting `staging`. No worthwhile finding means no PR. The audit never merges or
deploys changes. Normal staging QA and human review still apply.

## Configuration

- Repository Actions secret `OPENAI_API_KEY`: a dedicated OpenAI API key. Keep it
  in GitHub Actions secrets, never in files, issues, PR descriptions, or logs.
- Optional repository Actions variable `CODEX_AUDIT_MODEL`: overrides the model
  named in the workflow.
- GitHub Actions must be enabled, and its workflow permissions must permit the
  trusted publisher job to create pull requests. The agent job has read-only
  GitHub access; only the later publisher receives repository write permissions.

OpenAI API usage is billed separately from a ChatGPT subscription. Set the desired
project budget and billing alerts in the OpenAI platform. GitHub-hosted runner
usage follows the repository's GitHub plan. Timeout limits bound execution time,
not an exact dollar amount.

## Running and reviewing

Use the repository's **Actions → Nightly Audit Engineer → Run workflow** control
for manual runs. Start with the smoke option when changing credentials or models;
smoke mode verifies the setup and creates no cleanup PRs.

The run summary and retained artifacts report coverage, findings, checks, and
blockers. The final Codex report is saved as a separate artifact for seven days
whenever it exists, including failed runs, so it remains available if proposal
validation fails. An open nightly audit PR for an area prevents another pending cleanup
for that area. Other open PRs are checked for overlapping files. Each new PR
includes validation results and the audited base commit.

PRs are ready for review when created, allowing configured automated reviewers such
as Greptile to start. Review generated changes and test results before merging. GitHub's
built-in workflow token can leave pull-request CI in an approval-required state
with an **Approve workflows to run** banner. The audit runs relevant local checks
before proposing a change; reviewers should approve the normal CI when required
and verify the repository's usual QA requirements.

## Operation

Disable the workflow in GitHub Actions to stop future hosted runs. Do not also
enable the retired local Codex audit unless intentionally replacing the hosted
schedule. Rotate the dedicated API key by replacing the `OPENAI_API_KEY` secret.
GitHub's Actions notification preferences control workflow failure notifications.

For public repositories, GitHub can disable scheduled workflows after 60 days
without repository activity. Re-enable the workflow if that happens. After a
failed or missed run, inspect its logs and use a manual run when appropriate;
GitHub does not guarantee replay of a missed scheduled run.

The [prompt](prompts/nightly-audit.md) defines research and maintenance standards.
The workflow and publisher enforce the staging base, separate ready-for-review PRs, bounded
patches, and blocked paths. Larger changes or changes to the audit's own controls
are findings for a separate human-led task.
