# ChronoWork

Daily work log, attendance calendar, personal performance and weekly report — in Vietnamese, English and French.

## Features

- End-of-day task log with GitHub issue / PR search, progress and gap tracking
- Weekly timesheet, attendance calendar (office, remote, leave, holidays) and performance insights
- Weekly report exported to Excel (`.xlsx`), OpenDocument (`.ods`), PDF and CSV, or copied with formatting to paste into a spreadsheet
- Optional report logo (Settings → Report logo), embedded in every export
- Backup / restore as JSON

All data stays in the browser (`localStorage`). Nothing is sent anywhere except optional GitHub API searches.

## Development

```bash
bun install
bun run dev      # http://localhost:3000
bun run lint     # type check
bun run test     # unit tests
bun run build    # production build in dist/
```

## Security notes

- The production build ships a strict Content-Security-Policy (see `vite.config.ts`). When hosting, also send `frame-ancestors 'none'` (or `X-Frame-Options: DENY`) as an HTTP header — it cannot be set from a meta tag.
- A GitHub token is optional, kept in this browser only and never written to backups. Use a read-only fine-grained token.
- Imported backups are validated and sanitized; links are restricted to `http(s)`; spreadsheet exports neutralize formulas.
