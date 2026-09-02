# GitHub is the only store; writes are App-mediated direct commits

We replaced Weblate with a stateless Cloudflare Worker app: no database, sessions in
an encrypted cookie, drafts in localStorage, reads edge-cached — `intl-web` on GitHub
is the sole persistent store. Translators cannot push to the repo themselves, so a
GitHub App commits directly to `master` with the translator as git *author* and the
App as *committer*; authorization is the tool's roster check, not GitHub permissions.
This deliberately reverses the previous documented rule ("translations arrive via
Weblate PR, never a direct push"): with one maintainer and ~55 locales, a PR/review
pipeline was queue busywork, and git history + revert is the audit trail.

## Considered options

- Weblate (retired: too expensive to keep deployed for one project)
- PR-per-save via user forks (rejected: merge busywork, worse translator feedback loop)
- Granting translators repo write access (rejected: bypasses the roster, over-privileges)
- D1/KV as a working store with periodic sync to GitHub (rejected: two sources of truth, migrations, backup — for a tool whose data is already a git repo)

## Consequences

- Same-key concurrent edits are last-write-wins. Reads are sha-addressed raw-file
  fetches done by the browser (public repo), so views are exact for the head the
  server reported. Saves merge at key level onto the live head, so stale reads
  can never clobber unrelated keys.
- No server-side session revocation short of rotating the cookie secret.
- intl-web CI regenerates Index Bundles on every Save's push; the tool never runs buildIndex.
- The submodule bump into the LU monorepo stays manual.
