# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub Pages deployment: every push to `main` type checks, tests, builds and deploys to https://dab246.github.io/ChronoWork/ (`.github/workflows/deploy-pages.yml`).
- `BASE_PATH` build setting so the app can be served from a sub-path.
- Task name suggestions: typing a task name lists the tasks logged before (case-insensitive) with their project, last date, hours and progress; picking one fills the task details.
- Cumulative task progress: a new entry starts from the progress already logged for that task, cannot go below it (nor above a later entry), and a task at 100% is locked.
- Timesheet drag & drop: drag a task's hours to another day (or press **+** on its row) to log it again there, with the task dialog prefilled.
- End-of-day reminder (Settings → End-of-day reminder, on by default at 16:30): on working days not fully logged, a system notification, a “ding ding” chime and the message read aloud with text-to-speech (system voice of the interface language), plus an in-app message. The message is editable; **Test now** previews it. Works while ChronoWork is open, also in a background tab.

### Changed

- README rewritten for users and contributors: screenshots, feature table, quick start, project structure, quality gates, contributors and star history.
- Settings is a page instead of a dialog (`#/settings/<section>`): a section menu (Profile, Working hours, Reminder, Language, Report, GitHub, Data), one card per section, and every change saved as soon as a field is left. Each section lives in its own component under `src/components/settings/`, registered in `sections.ts`.
- Tabs have their own URL (`#/daily`, `#/report`, `#/timesheet`, `#/calendar`, `#/performance`), so they can be bookmarked and the browser's Back button works.
- Weekly report: a task's completion is now the one of its latest entry in the week instead of the lowest one, and a finished task has no gap reason or solution.
- Timesheet rows merge task names that differ only by case or spacing, like the report already did.
- Daily log: the day status switch only offers Office / WFH; leave and other statuses are set through **More statuses**, the Timesheet or the Attendance calendar.
- Refreshed interface: segmented navigation, page headers, section cards with clear headers, a two-column daily log (form and the day's tasks side by side), a grouped task form, colour-coded timesheet chips and staggered entrance animations (reduced when the system asks for less motion).

### Fixed

- Completion slider flickered endlessly when dragged down from 100%: the gap label appearing next to it moved the slider under the pointer.
- The category select's arrow touched the right border.

### Security

- CI on every push and pull request: type check, unit tests and production builds (root and Pages sub-path, CSP present) in `ci.yml`; CodeQL analysis of the code and workflows (`codeql.yml`); `bun audit`, dependency review and a Gitleaks secret scan (`security.yml`); weekly runs and Dependabot updates for packages and Actions.
- `SECURITY.md` with private vulnerability reporting, `CONTRIBUTING.md`, issue forms and a pull request template.
- The app refuses to run inside a frame (clickjacking), since static hosts like GitHub Pages cannot send `frame-ancestors` / `X-Frame-Options`.

## [1.1.0] - 2026-10-06

### Added

- ADR-0001 documenting the local development environment (`docs/adr/0001-local-development-environment.md`).
- ADR-0002 recording the user workflow rules and the usage guide (`docs/adr/0002-user-workflow-and-guide.md`).
- This changelog.
- `scripts/run.sh` helper (`setup`, `dev`, `check`, `preview`, `clean`) that checks the Node version and uses Bun or npm.

### Changed

- Code-health refactor of the report exporters (PDF, ODS, Excel, HTML, aggregation, sheet model), the date picker, language menu, modal, snackbar / confirm dialog, task form, and the daily log, weekly report, timesheet, performance, calendar and settings views. Large components are split into focused subcomponents and helpers; workspace state moves into a `useWorkspaceData` hook. The refactor itself does not change report output or rendered markup.
- The weekly report view is split into `src/components/weeklyReport/` (export toolbar, week status panel, sheet preview, guide modal).
- The GitHub service takes an options object: `searchGitHubIssuesAndPRs(query, { repos, token, signal })` and `fetchGitHubDetailsByUrl(url, { token, signal })`.
- README: prerequisites (Node 24 LTS), npm fallback commands, preview and data notes.
- The report and its exports are in English by default instead of following the interface language; Settings → "Report & export language" changes it (the "Same as interface" option is removed).
- Header: the desktop tab bar starts at the `xl` breakpoint, "Export CSV" is an icon button, and the language button shows the language code next to the tabs.

### Fixed

- A task logged without a description no longer gets the category name (e.g. "Dev") as its description in the report and exports; the cell stays empty.
- Tall dialogs (e.g. Settings) were cut off at the top on short screens and the title could not be scrolled to; all dialogs now open at the top and scroll inside the overlay.
- Task dialog: the hour chips overflowed the dialog and the date wrapped onto two lines; hours now get their own row and the chips wrap.
- Header items overflowed the page on desktop widths in all three languages (most in French).

## [1.0.0] - 2026-10-06

### Added

- Interface in Vietnamese, English and French, with a separate report language.
- Material-style UI: date picker (day / week / month), language menu, dialogs, and snackbar / confirm dialogs replacing `window.alert` / `window.confirm`.
- End-of-day task log with GitHub issue / PR search, progress and gap tracking.
- Weekly timesheet, attendance calendar (office, remote, leave, holidays) and performance insights.
- Weekly report matching the company template, exported to Excel (`.xlsx`), OpenDocument (`.ods`), PDF and CSV, or copied with formatting to paste into a spreadsheet.
- Optional report logo, embedded in every export.
- Backup / restore of all data as JSON.
- Unit tests for report generation, storage sanitizing and security helpers.

### Security

- Strict Content-Security-Policy in the production build.
- GitHub token optional, kept in this browser only and never written to backups; requests omit credentials and referrer.
- GitHub URLs are parsed strictly (https://github.com only, plain owner and repo names) before anything is sent to the API.
- Imported backups are validated and sanitized; links are restricted to `http(s)`; spreadsheet exports neutralize formulas.

### Removed

- Live timer component.
- `.env.example` and `metadata.json`: the app needs no environment configuration.

[Unreleased]: https://github.com/dab246/ChronoWork/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/dab246/ChronoWork/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/dab246/ChronoWork/releases/tag/v1.0.0
