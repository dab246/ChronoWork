# ADR-0001: Local development environment

**Status:** Accepted
**Date:** 2026-10-06
**Deciders:** dab246

## Context

ChronoWork is a client-only React 19 + Vite 8 + TypeScript app. There is no backend, database or `.env` file: all data lives in the browser's `localStorage`, and the only network calls are optional GitHub API searches.

Several facts shape how the app has to be run locally:

- **Node.js is required in every case.** The Vite, Vitest and TypeScript binaries run on Node, even when they are started through Bun (`bun run` honours their `#!/usr/bin/env node` shebang).
- **Declared Node engines of the toolchain:**

  | Package | Version | `engines.node` |
  |---|---|---|
  | vite | 8.3 | `^20.19.0 \|\| >=22.12.0` |
  | @vitejs/plugin-react | 6.1 | `^20.19.0 \|\| >=22.12.0` |
  | vitest | 5.0 | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` |
  | jsdom | 27.4 | `^20.19.0 \|\| ^22.12.0 \|\| >=24.0.0` |

  Node 20 is excluded by Vitest. Node 25 (odd-numbered, non-LTS) is outside Vitest's declared range: it works today but is unsupported.
- **The only committed lockfile is `bun.lock`.** There is no `package-lock.json`, so `npm install` resolves fresh versions within the `package.json` ranges instead of the locked ones.
- **The Content-Security-Policy is injected only into the production build** (`vite.config.ts`), because the dev server needs inline scripts for HMR. CSP problems therefore only show up in `build` + `preview`.
- **`localStorage` is per origin.** `http://localhost:3000` (dev) and `http://localhost:4173` (preview) hold separate data.

## Decision

1. **Runtime:** use Node.js **24 LTS** (any `>=22.12` LTS also satisfies every package above).
2. **Package manager:** **Bun** is the canonical installer and `bun.lock` is the source of truth for dependency versions. npm is an accepted fallback when Bun is not installed, run with `--no-package-lock` so a second lockfile is never created or committed.
3. **Standard commands** (identical scripts through either tool):

   | Task | Bun | npm | Notes |
   |---|---|---|---|
   | Install | `bun install` | `npm install --no-package-lock` | |
   | Dev server | `bun run dev` | `npm run dev` | http://localhost:3000, HMR, no CSP |
   | Type check | `bun run lint` | `npm run lint` | `tsc --noEmit` |
   | Unit tests | `bun run test` | `npm test` | Vitest + jsdom |
   | Production build | `bun run build` | `npm run build` | output in `dist/`, CSP injected |
   | Serve the build | `bun run preview` | `npm run preview` | http://localhost:4173 |
   | Remove `dist/` | `bun run clean` | `npm run clean` | |

4. **No configuration is needed to start.** A GitHub token is optional and is entered in the app (Settings), never in a file.
5. **Before committing:** run `lint`, `test` and `build`, and run `preview` when a change touches anything the CSP governs (scripts, styles, fonts, images, workers, network calls).

## Options Considered

### Option A: Bun with `bun.lock`, npm as fallback (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Low: the scripts are identical through both tools |
| Cost | None |
| Reproducibility | High with Bun (locked); medium with the npm fallback (ranges only) |
| Team familiarity | Bun is already documented in the README and its lockfile is committed |

**Pros:** keeps the existing lockfile and README; fast installs; npm still works for anyone without Bun.
**Cons:** two install paths; the npm path can pick newer patch or minor versions than `bun.lock`.

### Option B: switch to npm with a committed `package-lock.json`

| Dimension | Assessment |
|---|---|
| Complexity | Low |
| Cost | One migration commit; `bun.lock` removed |
| Reproducibility | High (`npm ci`) |
| Team familiarity | npm ships with Node, so nothing extra to install |

**Pros:** a single toolchain; `npm ci` is the default in most CI templates.
**Cons:** churns the lockfile, versions may shift during the migration, and it contradicts the current README.

### Option C: commit both `bun.lock` and `package-lock.json`

**Pros:** both tools install locked versions.
**Cons:** two lockfiles drift apart unless every dependency change updates both; reviewers cannot tell which one is authoritative. Rejected.

## Trade-off Analysis

The real trade-off is reproducibility against setup friction. Option A keeps the locked versions for the default path and costs nothing to adopt, because it matches what is already committed. Its only weakness, version drift on the npm fallback, is caught by running `lint`, `test` and `build` before committing. Option B is the better choice if CI is added, since `npm ci` is the most widely supported locked install. That is listed as a revisit point rather than done now.

## Consequences

- **Easier:** a new machine needs only Node 24 (plus optional Bun) and one install command; there are no env files or services to set up.
- **Easier:** CSP regressions are caught locally with `build` + `preview` instead of after hosting.
- **Harder:** someone on the npm fallback may see failures that do not reproduce with Bun. Reinstalling with Bun is the first step when that happens.
- **Watch out:** data entered on the dev server (port 3000) does not appear in preview (port 4173), and vice versa. Use Settings → Backup / Restore (JSON) to move it.
- **Watch out:** if port 3000 is taken, Vite silently moves to the next free port, which is a new origin with empty storage. Free the port or check the URL Vite prints.
- **Revisit:** when CI is introduced, re-evaluate Option B.

## Action Items

1. [x] Document the local workflow in `README.md` and link this ADR.
2. [ ] Add `"engines": { "node": ">=22.12.0" }` to `package.json` so unsupported Node versions warn on install.
3. [ ] Add an `.nvmrc` containing `24` so `nvm use` / `fnm use` pick the right runtime.
4. [ ] Decide between Option A and Option B when a CI pipeline is set up.
