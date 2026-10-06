# ChronoWork

Daily work log, attendance calendar, personal performance and weekly report — in Vietnamese, English and French.

## Features

- End-of-day task log with GitHub issue / PR search, progress and gap tracking
- Weekly timesheet, attendance calendar (office, remote, leave, holidays) and performance insights
- Weekly report exported to Excel (`.xlsx`), OpenDocument (`.ods`), PDF and CSV, or copied with formatting to paste into a spreadsheet
- Optional report logo (Settings → Report logo), embedded in every export
- Backup / restore as JSON

All data stays in the browser (`localStorage`). Nothing is sent anywhere except optional GitHub API searches.

**How to use it:** see the [user guide (ADR-0002)](docs/adr/0002-user-workflow-and-guide.md), covering first-time setup, the daily log, day statuses, the weekly report and its exports, and backup / restore.

## Development

**Prerequisites:** Node.js 24 LTS (any `>=22.12` works; Node 20 is not supported by Vitest). [Bun](https://bun.sh) is the preferred package manager because `bun.lock` is the committed lockfile. No `.env` file or other configuration is needed.

```bash
bun install
bun run dev      # http://localhost:3000 (hot reload, no CSP)
bun run lint     # type check
bun run test     # unit tests
bun run build    # production build in dist/ (with CSP)
bun run preview  # serve dist/ on http://localhost:4173
bun run clean    # remove dist/
```

Without Bun, use npm with the same scripts. Pass `--no-package-lock` so no second lockfile is created; versions then follow the `package.json` ranges rather than `bun.lock`:

```bash
npm install --no-package-lock
npm run dev      # likewise: npm run lint, npm test, npm run build, npm run preview
```

Or use the helper script. It checks the Node version, picks Bun or npm, and installs dependencies when they are missing:

```bash
scripts/run.sh dev       # dev server on :3000
scripts/run.sh check     # lint + test + build: run before committing
scripts/run.sh preview   # build, then serve on :4173
scripts/run.sh setup     # (re)install dependencies
scripts/run.sh clean     # remove dist/
```

Good to know:

- Data is stored per origin, so the dev server (`:3000`) and the preview (`:4173`) do not share data. Move it with Settings → Backup / Restore.
- If port 3000 is busy, Vite picks the next free port, which starts with empty data.
- The CSP only applies to the production build. Check `build` + `preview` after changing scripts, styles, fonts, images or network calls.
- Before committing, run `lint`, `test` and `build`.

The reasoning behind this setup is in [ADR-0001: Local development environment](docs/adr/0001-local-development-environment.md). Release notes are in [CHANGELOG.md](CHANGELOG.md).

## Deployment (GitHub Pages)

Live at **https://dab246.github.io/ChronoWork/**.

Every push to `main` runs [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml): locked install with Bun, type check, unit tests, production build, then deploy. It can also be started by hand from the Actions tab ("Run workflow").

One-time setup: the repository must be public (or on a paid plan), and **Settings → Pages → Source** must be set to **GitHub Actions**.

The app is served from a sub-path, set at build time through `BASE_PATH` (the workflow takes it from the Pages configuration, so it becomes `/` with a custom domain). To check a sub-path build locally:

```bash
BASE_PATH=/ChronoWork/ npm run build
BASE_PATH=/ChronoWork/ npm run preview   # http://localhost:4173/ChronoWork/
```

Things to know about this host:

- **Shared origin:** every site under `dab246.github.io` shares one origin, so they share `localStorage`, including ChronoWork's data and GitHub token. Only publish trusted pages there, or give ChronoWork its own origin with a custom domain.
- **No HTTP headers:** GitHub Pages cannot send custom headers. The CSP is embedded as a meta tag, and the app refuses to run inside a frame (`src/main.tsx`) because `frame-ancestors` / `X-Frame-Options` cannot be set.

## Security notes

- The production build ships a strict Content-Security-Policy (see `vite.config.ts`). On hosts that support headers, also send `frame-ancestors 'none'` (or `X-Frame-Options: DENY`): it cannot be set from a meta tag. The app additionally refuses to run inside a frame.
- A GitHub token is optional, kept in this browser only and never written to backups. Use a read-only fine-grained token.
- Imported backups are validated and sanitized; links are restricted to `http(s)`; spreadsheet exports neutralize formulas.
