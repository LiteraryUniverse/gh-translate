# Formatted Translator

A deliberately small translation web app for FormatJS/ICU JSON locale files that
uses **GitHub as its only store** — no database, no queue, no background jobs.
Built for [Literary Universe's intl-web](https://github.com/LiteraryUniverse/intl-web),
deployable against any public repo with a `<locale>/<module>.json` layout.

Translators sign in with GitHub, edit strings in an ICU-aware editor (live
plural/select preview, placeholder validation, per-string context notes from the
repo's wiki), and hit Save — which lands as **one git commit authored by the
translator** and committed by a GitHub App. Drafts persist in the browser until
saved.

Stack: [TanStack Start](https://tanstack.com/start) + SolidJS on Cloudflare
Workers. MIT licensed.

## How it works

- **Auth**: GitHub OAuth via a GitHub App; sessions are sealed httpOnly cookies.
  The user token is used once for identity and never stored.
- **Reads**: the browser fetches message files sha-addressed from
  `raw.githubusercontent.com` at the head the server reports — exact, cacheable,
  no server proxying. Browsing works logged-out, and even without App
  credentials (unauthenticated fallback).
- **Writes**: direct commits on the configured branch via the Git Data API.
  Author = translator, committer = the App; translators need zero repo
  permissions. Saves merge at key level onto the live head, so concurrent saves
  never clobber unrelated keys.
- **Authorization**: optional public `translators.json` roster in the target
  repo (login → locales, `"*"` = all; no file = open), enforced server-side.
- **Validation**: ICU syntax + placeholder parity against the source string,
  client-side as you type and re-enforced server-side before committing.
- **Context**: GitHub Wiki, one page per module, one `## message.key` heading
  per string; the wiki `Home` page doubles as the in-app Help page. A
  [General Translation keyed-metadata](https://generaltranslation.com/en-US/docs/cli/reference/keyed-metadata)
  companion (`<source>/<module>.metadata.json`) is picked up automatically and
  shown above the wiki notes.

## Documentation

- **[Deployment guide](docs/DEPLOYMENT.md)** — GitHub App setup, Cloudflare
  secrets, repository layout contract, roster, wiki conventions,
  troubleshooting.
- **[Translator guide](docs/TRANSLATING.md)** — for the people doing the
  translating; link it from your project.
- [`CONTEXT.md`](CONTEXT.md) — glossary of the project's terms.
- [`PLAN.md`](PLAN.md) and [`docs/adr/`](docs/adr/) — why it's built this way.

## Quick start

```sh
npm install
cp .dev.vars.example .dev.vars   # dummies are fine for read-only browsing
npm run dev                      # http://localhost:3000
```

Deploying for real: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). The short
version: create one GitHub App (login + Contents read/write), convert its key
to PKCS#8, `wrangler secret put` five secrets, point `wrangler.jsonc` at your
repo, `npm run deploy`.

## Development

```sh
npm run dev      # vite dev server (Workers runtime via miniflare)
npm run test     # vitest — pure logic in src/lib (merge, ICU, roster, wiki)
npm run check    # tsc
npm run build    # production build
npm run deploy   # build + wrangler deploy
```

Layout: `src/lib` is pure logic (no Workers imports — keep it that way, tests
depend on it), `src/server` is Worker-side (GitHub App auth, commits, server
functions), `src/routes` is file-based routing (UI + the three OAuth handler
routes), `src/components` shared UI.

## Known ceilings (deliberate)

- Same-key concurrent edits are last-write-wins; there is no locking or
  presence.
- Sessions can't be revoked server-side short of rotating `SESSION_SECRET`.
- Modules with non-string JSON values (arrays, config blobs) are read-only in
  the app.
- No review queue — git history and `git revert` are the review trail.
