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

## Security notes

- The production build ships a strict Content-Security-Policy (see `vite.config.ts`). When hosting, also send `frame-ancestors 'none'` (or `X-Frame-Options: DENY`) as an HTTP header — it cannot be set from a meta tag.
- A GitHub token is optional, kept in this browser only and never written to backups. Use a read-only fine-grained token.
- Imported backups are validated and sanitized; links are restricted to `http(s)`; spreadsheet exports neutralize formulas.
