# Security policy

## Supported versions

Only the latest version, deployed from `main` to https://dab246.github.io/ChronoWork/, receives fixes.

## Reporting a vulnerability

Please **do not open a public issue**. Report it privately through GitHub: **Security → Report a vulnerability** on this repository ([direct link](https://github.com/dab246/ChronoWork/security/advisories/new)).

Include what you can of:

- the affected screen or file, and the impact (e.g. script injection through an imported backup);
- steps or a proof of concept to reproduce it;
- the browser and version.

You can expect an acknowledgement within a few days. Once a fix is released, the advisory is published and you are credited, unless you prefer otherwise.

## Scope

ChronoWork runs entirely in the browser and stores its data in `localStorage`. Relevant reports include, for example: script injection (XSS) through task data, imported backups or exports; bypasses of the Content-Security-Policy; formula injection in spreadsheet exports; leaks of the GitHub token (it must never leave the browser except to `api.github.com`, nor appear in backups).

Out of scope: issues that need an already compromised browser or device, and the shared-origin limitation of GitHub Pages described in the README.
