# Contributing to ChronoWork

Thanks for helping! Bug reports, translations, docs, design polish and features are all welcome. This page explains how to get a change merged quickly.

## Before you start

- **Bugs:** open an issue with the [bug report form](https://github.com/dab246/ChronoWork/issues/new?template=bug_report.yml): steps, expected vs. actual, browser.
- **Features:** open a [feature request](https://github.com/dab246/ChronoWork/issues/new?template=feature_request.yml) first for anything bigger than a small fix, so we can agree on the approach before you spend time on it.
- **Security issues:** never in a public issue; see [SECURITY.md](SECURITY.md).

Be kind and constructive in issues and reviews. Assume good intent.

## Setup

Node.js 24 LTS (or `>=22.12`) and [Bun](https://bun.sh):

```bash
git clone https://github.com/<you>/ChronoWork.git
cd ChronoWork
bun install
bun run dev          # http://localhost:3000
```

Settings → Data → **Load sample data** fills the current week with examples. The user guide is in [docs/adr/0002-user-workflow-and-guide.md](docs/adr/0002-user-workflow-and-guide.md).

## Workflow

1. Branch from `main`: `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`.
2. Make the change, with tests (see below).
3. Run the checks: `scripts/run.sh check` (type check + tests + build).
4. Commit with a one-line [Conventional Commit](https://www.conventionalcommits.org/) message, e.g. `fix: keep the slider still when the gap appears`.
5. Open a pull request and fill in the template. CI, CodeQL and the security checks must pass.

Pull requests are merged with **rebase merge**, so keep each commit meaningful and buildable.

## Code conventions

- **TypeScript strict, React function components.** Match the style of the file you touch: naming, comment density, Tailwind classes.
- **Small units.** Keep components and functions short and flat: the repository is checked with CodeScene, so extract a component, hook or helper instead of growing a long method or nesting conditions.
- **Logic out of components.** Pure logic goes to `src/utils/` (or a `*Model.ts` next to the component) with unit tests in `src/__tests__/`.
- **Every string is translated.** Add it to `src/i18n/vi.ts`, `en.ts` and `fr.ts`; `en` and `fr` are type-checked against `vi`, so a missing key fails the build.
- **Untrusted data is sanitized.** Anything read from `localStorage` or a backup goes through the sanitizers in `src/utils/storage.ts`; links go through `safeUrl`.
- **Regular expressions must be linear.** No nested or overlapping quantifiers; anchor them and bound their input. When you add or change one, time it on 10 k / 100 k / 1 M character hostile inputs and mention the result in the PR.
- **CSP:** no inline scripts, no new external origins. Check `bun run build && bun run preview` after touching scripts, styles, fonts, images or network calls.

## Tests

- Unit tests: `bun run test` (Vitest + jsdom). Cover the new logic, its edge cases and the bug you fix (a test that fails without the fix).
- UI changes: describe what you checked in the browser, and attach a screenshot or a short clip to the PR.

## Translations

Translations are in `src/i18n/`. To add a language: copy `en.ts`, translate it, add the code to `LANGUAGES` in `src/types/index.ts` and to `src/i18n/index.tsx`, then add a locale in `src/utils/dateUtils.ts`.

## Adding a settings section

1. Create a component in `src/components/settings/` taking `SettingsSectionProps`.
2. Add its id to `SETTINGS_SECTIONS` in `src/routing.ts`.
3. Register it in `src/components/settings/sections.ts`.
4. Add its menu texts under `settings.nav` in the three language files.

New fields in `UserSettings` need a default in `DEFAULT_SETTINGS` and a sanitizer in `sanitizeSettings` (`src/utils/storage.ts`), with a test.

## Architecture decisions

Decisions that shape the app are recorded in [`docs/adr/`](docs/adr/). If your change alters one of them, update the ADR in the same pull request. User-visible changes go into the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md).
