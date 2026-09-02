# Formatted Translator — Implementation Plan

Minimal open-source translation web app replacing Weblate for Literary Universe.
Settled 2026-08-20 in a grilling session; every decision below is confirmed by the
project owner. Agents: build exactly this — deviations need a new decision, not
silent improvisation.

## Product in one paragraph

Translators log in with GitHub, pick a locale and module, edit strings in an
ICU-aware editor with live plural/select preview and per-string context notes
pulled from the GitHub Wiki, and hit Save. Save produces **one direct commit**
to `LiteraryUniverse/intl-web` `master` with the translator as git author.
GitHub is the only persistent store. Deployed on Cloudflare Workers.

## Settled decisions (do not reopen)

| # | Decision |
|---|----------|
| 1 | Auth: **GitHub only** for v1. "Login with Literary Universe" is deferred (LU has no OAuth-provider surface today — see Amendment A). |
| 2 | Stack: **TanStack Start + SolidJS** on Cloudflare Workers (wrangler). Fallback if the Solid adapter fights Workers: Astro + one Solid island — but try TanStack Start first. |
| 3 | Writes: **direct commits to `master`**, batched — a translator edits as much as they want (whole file, several files), then one explicit Save = one commit. No PRs, no review queue. Git history is the audit trail. |
| 4 | Authorization: optional roster. `translators.json` at the root of `intl-web`: `{ "<github-login>": ["cs","sk"] | "*" }`. **File absent → anyone authenticated may translate.** File is public; that's accepted. |
| 5 | Storage: **GitHub is the only persistent store.** No KV, no D1. Sessions = encrypted cookie. Drafts = browser localStorage. Read cache = Cloudflare Cache API (ephemeral). |
| 6 | Context notes: **GitHub Wiki** (text + images). Tool displays; editing happens on GitHub via deep links. Convention in Phase 4. |
| 7 | MVP editor scope: locale → module → string list, **untranslated filter** (missing/empty key), search by key/source text, ICU preview + validation, context notes. **No "outdated" tracking** — untranslated only. No MT, no translation memory, no glossary highlighting, no review tiers. |
| 8 | Home: monorepo folder `translate/`, zero imports from `app/`/`admin/`, history-extractable to its own repo later. Name: **Formatted Translator**. License: **MIT**. |
| 9 | Delivery stretch goal: Amendment B only — a consideration, not a phase. |
| 10 | GitHub App does double duty: OAuth login for identity, installation token for writes. Commit **author = translator** (`Name <login@users.noreply.github.com>`), **committer = the App bot**. Translators need zero repo permissions. |
| 11 | Sessions: encrypted httpOnly cookie (~2-week expiry), secret in Worker env. No server-side revocation (accepted ceiling; `ponytail:` comment it). **A logout route that clears the cookie must exist.** |
| 12 | Reads: Cache API, ~60 s TTL, bust own entries after save. Cross-translator staleness up to ~60 s accepted. Save re-fetches live head and merges **at key level**; same-key concurrent edits are last-write-wins. |
| 13 | Wiki convention: one page per module, `## <full.message.key>` headings; `Home` page doubles as the tool's help page. |
| 14 | License MIT; deploy = manual `wrangler deploy`; target repo/branch are plain config vars so the tool stays generic. |

## Facts about the target repo (verified 2026-08-20)

- `LiteraryUniverse/intl-web`, **public**, default branch `master`. Monorepo consumes it as submodule `app/intl-source` (bump stays **manual** — the tool never touches the monorepo).
- 56 locale dirs (`en` + 55), 51 module JSON files per locale, 6,128 en keys. Flat `key → string`, ICU embedded in strings (multiline plural/select exist).
- `<locale>/index.json` is a **generated artifact**: repo CI (`.github/workflows/build-index.yml`) regenerates + commits it on every push to `master`. The tool must **never read or write `index.json`** and never runs buildIndex.
- 8 isolated namespaces (`comparisons`, `faq`, `signup`, `the_way`, `cookieconsent`, `tours`, `eventSignup`, `sharingCanvas`) are ordinary module files from the tool's perspective — no special handling.
- `scripts/validateLocale.mjs` is the canonical validity definition: key parity vs en, no empty values, string values only, ICU placeholder-name parity. The tool's pre-save validation mirrors these rules (plus ICU parseability).
- `en` is developer-edited only: **the tool treats `en` as read-only source**, never a save target.

## Invariants (enforce in code, test each)

1. Never write `en/*`, any `index.json`, or anything outside `<locale>/<module>.json`.
2. Every commit's author is the authenticated translator; committer is the App.
3. Save merges onto the *live* head at key level — a stale read can never delete or revert keys the translator didn't edit.
4. Roster check runs server-side on every save (per-locale scoping honored).
5. GitHub tokens (user OAuth token, installation token, App private key) never reach the client. All GitHub calls go through server functions.
6. A saved value must parse as an ICU message and pass placeholder parity vs the en source; otherwise the save is rejected with a per-key error.

## Phases (each independently hand-off-able)

### Phase 0 — Scaffold
- `translate/` with its own `package.json` (not a monorepo workspace member), TanStack Start + SolidJS, Cloudflare Workers target, `wrangler.jsonc`.
- `LICENSE` (MIT), `README.md` stub, this `PLAN.md`, `CONTEXT.md`, `docs/adr/`.
- Config as env vars: `GITHUB_REPO=LiteraryUniverse/intl-web`, `GITHUB_BRANCH=master`, `SOURCE_LOCALE=en`. Secrets via `wrangler secret`: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `SESSION_SECRET`.
- Dependencies: framework + `intl-messageformat` / `@formatjs/icu-messageformat-parser` are pre-approved. GitHub App auth = plain `fetch` + WebCrypto RS256 JWT (~20 lines) — **no Octokit** unless the hand-rolled path genuinely fails on Workers.
- Done when: `wrangler dev` serves a hello page; deploy works.

### Phase 1 — Auth & roster
- GitHub App OAuth web flow (server functions). Session = encrypted httpOnly cookie (AES-GCM via WebCrypto, `SESSION_SECRET`), holds login, display name, avatar, user token; ~2-week expiry. Logout route clears it.
- Installation-token minting with in-memory reuse until expiry.
- Roster loader: fetch `translators.json` from the repo (through the same cached read path as Phase 2); absent → open. Helper `canTranslate(login, locale)`.
- Done when: login/logout round-trips on Workers; roster unit tests (absent file, `"*"`, per-locale, unlisted login).

### Phase 2 — Read path & browse UI
- Server read functions over GitHub contents API, wrapped in Cache API (~60 s TTL): repo tree → locale list (dirs except `scripts`), module list (JSON files except `index.json`), file contents.
- Unauthenticated GitHub reads are fine (public repo); attach the installation token only if rate limits bite.
- Screens: locale picker (en shown as source, not selectable as target) → module list with per-module counts (translated / untranslated vs en) → string list: en source + current translation, filter **untranslated**, search key + source text.
- Done when: browsing all 55 locales works; counts correct against a fixture; a save (Phase 3) followed by reload shows the new value (cache bust verified).

### Phase 3 — Editor & save
- Editor pane per key: en source (read-only), multiline input, live ICU preview via `intl-messageformat` with auto-generated inputs for arguments/plural/select, validation on blur + save (mirror `validateLocale.mjs` rules).
- Drafts: every edit persists to localStorage keyed `locale/module/key`; surviving reloads; cleared per-key on successful save. Dirty-count badge; Save button commits **all** drafted keys for the current locale (may span modules).
- Save server function: roster check → fetch live head + affected files → apply drafted keys onto live content (key-level merge, preserve key order of the existing file, 2-space/no — match existing file formatting exactly: `JSON.stringify(…, null, 2)` + trailing newline, same as buildIndex) → Git Data API (blobs → tree → commit → updateRef), author = translator, committer = App; one retry on ref race. Commit message: `cs: 12 strings (workshop, common) via Formatted Translator`.
- Done when: unit tests for merge (stale base keeps others' keys; same-key LWW), validation rejects placeholder mismatch; a real commit lands on a test repo with correct author/committer.

### Phase 4 — Context notes (Wiki)
- Fetch `https://raw.githubusercontent.com/wiki/<repo>/<module>.md` (Cache API, same TTL), split by `## <key>` headings, render the section (markdown incl. images) beside the string. Missing page/section → "Add context" deep link to the wiki editor; existing → "Edit context" link.
- Render wiki `Home` as the in-app help page; document the page/heading convention **on the wiki Home page itself**.
- Accepted ceiling: heading typos silently orphan notes; page names track module names manually.
- Done when: a note with an image renders at its string; absent wiki degrades to links only.

### Phase 5 — Polish & ship
- Loading/error states everywhere (GitHub down, rate-limited, validation failures with per-key messages).
- Tests: vitest for merge/validation/roster/wiki-parsing; happy-path e2e optional, not required for v1.
- README: setup (GitHub App registration walkthrough, wrangler secrets), config reference, screenshot.
- Monorepo housekeeping **in the same PR**: amend `ai-kb/INTL_ARCHITECTURE.md` — Weblate flow replaced by Formatted Translator direct commits; submodule bump into `app/` stays manual; trs.literaryuniverse.com decommission note.
- Manual `wrangler deploy`; no CI/CD for v1.

## Amendments (designed later, decided not-now)

**A. Literary Universe login.** LU has no OAuth-provider capability (verified — consumer packages only). Adding it means building an authorization-server surface on LU or a token-handoff over the shared domain. Deferred until a concrete translator can't/won't use GitHub. Design constraint recorded: session layer already abstracts "identity provider" only at the cookie-contents level, so a second provider slots in without rearchitecting — but writes would then need a fallback author identity (e.g. `LU-user <noreply@literaryuniverse.net>`).

**B. Intl delivery.** Serving `<locale>/index.json` from a Worker to the Meteor app, replacing `public/intl` packaging. Touches the version-coupled preload/cache contract (main.html preload + LangContainer localStorage + browser_policy headers) and needs an offline-dev story (fallback to committed submodule files). Separate go/no-go later. The only requirement it imposes on v1 is already met: GitHub stays the source of truth, so a Worker can serve the same files.

**Dropped (recorded so nobody re-suggests):** outdated-string tracking (untranslated only; if ever needed, the `en-hashes.json` snapshot approach was sketched and rejected for now), review/approval workflow, KV/D1 storage, machine translation, translation memory, per-string locking/presence.

## Build log (2026-08-20)

Phases 0–4 implemented in one pass; all settled decisions hold, with two
recorded deviations, both improvements:

1. **Read path** (decision 12 updated above): client-direct sha-addressed raw
   fetches instead of server-proxied Cache API reads.
2. **Sessions** use `useSession` from `@tanstack/solid-start/server` (sealed
   cookies) instead of hand-rolled AES-GCM — same properties, less code.

Verified locally against the live public repo (read path, counts, editor, ICU
preview/validation, filters/search, help fallback, OAuth redirect) plus 27 unit
tests. **Not yet verified** (needs the real GitHub App registered): OAuth
callback round-trip, roster enforcement on save, and the commit write path —
see README "First-run checklist".

Docs shipped 2026-08-20: `docs/DEPLOYMENT.md` (operator guide: GitHub App,
secrets, repo-layout contract, roster, wiki conventions, troubleshooting) and
`docs/TRANSLATING.md` (translator guide, linkable from the product). README
restructured around them. `postinstall` typegen added so fresh clones typecheck;
`/?login=failed` now shows feedback.

Still open from Phase 5: register the App + deploy, seed the wiki Home page
with the context convention, and the monorepo `ai-kb/INTL_ARCHITECTURE.md`
amendment (rides in this feature's PR).
