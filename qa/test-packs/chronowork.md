# ChronoWork test pack

Source of truth for Phase 1. Each case traces a rule of
[ADR-0002](../../docs/adr/0002-user-workflow-and-guide.md) or
[SECURITY.md](../../SECURITY.md) to the tests that prove it.

- `Type: automated` cases link Vitest results as `unit:<file>:<describe> > <test>`.
  A trailing `*` covers every test of a `describe` block; every linked test must pass.
- `Type: manual-e2e` cases are run by a person on the deployed app and recorded
  in `qa/manual-results.yaml`.

# Automated: product rules (ADR-0002)

## TC-RPT-001: One report row per task, latest completion wins (rule 3)
- Type: automated
- Lane: unit
- Priority: P1
- Required: yes
- Automation: unit:src/__tests__/report.test.ts:aggregateWeeklyTasks > *

## TC-RPT-002: The report is in English by default, whatever the interface language (rule 5)
- Type: automated
- Lane: unit
- Priority: P2
- Required: yes
- Automation: unit:src/__tests__/report.test.ts:reportLanguage > *

## TC-RPT-003: Exports follow the company template (rule 5)
- Type: automated
- Lane: unit
- Priority: P1
- Required: yes
- Automation: unit:src/__tests__/report.test.ts:report sheet model (company template layout) > *
- Automation: unit:src/__tests__/report.test.ts:exports > writes a valid*

## TC-PRG-001: Progress is cumulative per task and locks at 100% (rule 6)
- Type: automated
- Lane: unit
- Priority: P1
- Required: yes
- Automation: unit:src/__tests__/taskHistory.test.ts:progressBounds > *
- Automation: unit:src/__tests__/taskHistory.test.ts:clampProgress > *
- Automation: unit:src/__tests__/taskFormModel.test.ts:toDraft progress bounds > *

## TC-LOG-001: Logging a task validates name and time (0.25–24 h) and continues a task on another day
- Type: automated
- Lane: unit
- Priority: P1
- Required: yes
- Automation: unit:src/__tests__/taskFormModel.test.ts:validationError > *
- Automation: unit:src/__tests__/taskFormModel.test.ts:toDraft > *
- Automation: unit:src/__tests__/taskFormModel.test.ts:templates (continuing a task) > *

## TC-LOG-002: Task names are suggested from history, case-insensitive
- Type: automated
- Lane: unit
- Priority: P2
- Required: yes
- Automation: unit:src/__tests__/taskHistory.test.ts:buildTaskSuggestions > *
- Automation: unit:src/__tests__/taskHistory.test.ts:filterTaskSuggestions > *

## TC-REM-001: The end-of-day reminder fires once, on working days not fully logged, within an hour
- Type: automated
- Lane: unit
- Priority: P2
- Required: yes
- Automation: unit:src/__tests__/reminder.test.ts:reminder window > *
- Automation: unit:src/__tests__/reminder.test.ts:dayNeedsReminder > *
- Automation: unit:src/__tests__/reminder.test.ts:isReminderDue > *
- Automation: unit:src/__tests__/reminder.test.ts:reminder settings storage > *

## TC-DAT-001: Data stays in the browser; backups never carry the GitHub token and restore validates first (rule 4)
- Type: automated
- Lane: unit
- Priority: P1
- Required: yes
- Automation: unit:src/__tests__/storage.test.ts:backup import / export > *

## TC-NAV-001: Every page and settings section has a stable link
- Type: automated
- Lane: unit
- Priority: P3
- Required: yes
- Automation: unit:src/__tests__/routing.test.ts:parseRoute > *

# Automated: security scope (SECURITY.md)

## TC-SEC-001: No script injection through task data, links or imported backups
- Type: automated
- Lane: unit
- Priority: P1
- Required: yes
- Automation: unit:src/__tests__/security.test.ts:escapeHtml > *
- Automation: unit:src/__tests__/security.test.ts:safeUrl > *
- Automation: unit:src/__tests__/storage.test.ts:sanitizeEntry > *
- Automation: unit:src/__tests__/report.test.ts:exports > escapes HTML in the clipboard table

## TC-SEC-002: No formula injection in spreadsheet exports
- Type: automated
- Lane: unit
- Priority: P1
- Required: yes
- Automation: unit:src/__tests__/security.test.ts:spreadsheet formula injection > *
- Automation: unit:src/__tests__/report.test.ts:exports > neutralizes formulas in CSV and TSV

## TC-SEC-003: Only real github.com issue / PR links are accepted, repositories are validated
- Type: automated
- Lane: unit
- Priority: P2
- Required: yes
- Automation: unit:src/__tests__/security.test.ts:parseGitHubUrl > *
- Automation: unit:src/__tests__/routing.test.ts:parseRepos > *

# Manual E2E (deployed app)

## TC-E2E-001: Log a day end to end
- Type: manual-e2e
- Lane: ui
- Priority: P1
- Required: yes

### Steps
1. Open the app in a fresh browser profile; Settings → Data → Load sample data.
2. Daily log: set today to Remote (WFH), log a task with a GitHub issue picked from search, 2h, 60%.
3. Log the same task name again with different casing, 1h, 80%.

### Expected
The day total shows 3h against the daily standard; the second entry's slider started at 60% and could not go lower; the weekly report shows one row for the task with 3h and 80%.

## TC-E2E-002: End-of-day reminder in the browser
- Type: manual-e2e
- Lane: ui
- Priority: P2
- Required: yes

### Steps
1. Settings → Reminder: set the time to two minutes from now, allow notifications.
2. Keep the tab in the background and do not log the day fully.

### Expected
A system notification appears once, the chime plays and the message is read aloud; clicking the notification opens today's log.

## TC-E2E-003: Weekly report exports open in office suites
- Type: manual-e2e
- Lane: ui
- Priority: P1
- Required: yes

### Steps
1. With sample data and a report logo set, export .xlsx, .ods and PDF; use Copy to sheet into Google Sheets.
2. Open the files in Excel and LibreOffice Calc.

### Expected
Every output reproduces the company template (header, 22 task rows, objectives block, signatures), the logo is in A1, and no cell starting with `=`, `+`, `-` or `@` is evaluated as a formula.

## TC-E2E-004: Continue a task by drag and drop
- Type: manual-e2e
- Lane: ui
- Priority: P2
- Required: yes

### Steps
1. Timesheet: drag a task's hours cell to the next working day; then try dropping on a day off.

### Expected
The task dialog opens on the target day with everything prefilled except the day-specific remark; a day off does not accept the drop.

## TC-E2E-005: Move data to another browser with a backup
- Type: manual-e2e
- Lane: ui
- Priority: P1
- Required: yes

### Steps
1. Set a GitHub token, back up to JSON, open the file and check its content.
2. In another browser profile, restore the file; then try restoring a file over 5 MB and a non-ChronoWork JSON file.

### Expected
The backup has no token; the restore asks for confirmation and brings back all tasks, statuses, objectives and settings; the invalid files are rejected without touching existing data.

## TC-E2E-006: Paste guide and print
- Type: manual-e2e
- Lane: ui
- Priority: P3
- Required: no

### Steps
1. Weekly report → Paste guide, then Print.

### Expected
The guide shows the raw tab-separated data; the print preview fits A4 landscape.
