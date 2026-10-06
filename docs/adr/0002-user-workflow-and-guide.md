# ADR-0002: User workflow and usage guide

**Status:** Accepted
**Date:** 2026-10-06
**Deciders:** dab246

## Context

ChronoWork replaces a weekly report that employees used to fill in by hand in a company spreadsheet template. The report has a fixed layout: header with office days and days off, "Completed work" table, next week's objectives and reflections, signatures.

The app is built around a few product decisions that shape how it must be used. Without them written down, its results can look surprising: the weekly target drops on leave days, the same task logged on three days becomes one report row, and data seems to "disappear" in another browser. This ADR records those decisions and doubles as the user guide. Labels below are the English UI; the Vietnamese and French interfaces have the same screens.

## Decision

1. **Log daily, report weekly.** Tasks are logged at the end of each day. The weekly report is generated from them and is never typed from scratch.
2. **Day status drives the targets.** Every Monday–Friday is "At the office" or "Remote (WFH)" according to the default office days in Settings, until it is changed. Leave days lower the weekly target and appear in the report header automatically.
3. **One report row per task.** Entries with the same task name in a week are merged into one row: hours are summed, the lowest completion wins, and the first non-empty description / reason / solution / remark is kept.
4. **Data stays in the browser.** Everything is saved in this browser's `localStorage`. Nothing is uploaded; moving data between browsers or machines goes through a JSON backup.
5. **Exports match the company template.** Excel, ODS, PDF and "Copy to sheet" all reproduce the template layout. The report is in **English by default**, whatever the interface language; another report language can be chosen in Settings.

## User guide

### 1. First-time setup (Settings, gear icon top right)

| Section | What to set | Why it matters |
|---|---|---|
| Employee | Full name, job title, company name | Printed on the report header and signature |
| Working hours & office days | Target hours / week (default 40), standard hours / day (default 8), default office days (default Mon–Fri) | Unselected weekdays count as WFH; targets feed the Timesheet and Performance tabs |
| Language | Interface language; report & export language (default: English) | The report stays in English while you work in Vietnamese or French, unless you pick another report language |
| GitHub search | Default repositories (`owner/repo`, comma separated), optional token | Restricts issue / PR search to your repos. Use a read-only fine-grained token; it is never included in backups |
| Report logo | PNG / JPG, max 2 MB | Placed in cell A1 of the Excel, ODS, PDF and copied reports |
| Backup & data | Back up / Restore (JSON), Load sample data, Delete all data | See section 7 |

Tip: "Load sample data" fills the current week with examples, which is the quickest way to see every screen working. It replaces the current tasks and day statuses, so use it before entering real data.

### 2. Every day: Daily log tab

1. Pick the day with the date arrows or the calendar button (defaults to today).
2. Set the **Day status**: At the office, Remote (WFH), Paid leave or Sick leave. On a leave day no logging is needed; the day is added to the report's "days off" line.
3. Fill in **Log completed work** for each task:
   - **Search a GitHub issue / PR** by keyword or `#number`, or paste a `https://github.com/...` URL. Picking a result fills the task name (`Title #number`), the link and, when it matches, the project.
   - **Task name** (required) and **Time spent** (0.25–24 hours, required). The 1h / 2h / 4h / 8h chips set the time in one click.
   - **Project**, **Category**, **Link**, **Description of activities**. If the description is empty, the report's description cell stays empty (a task with a link shows "Link" there instead).
   - **Completion %**. Below 100%, the gap is computed automatically; add a **Gap reason** and a **Solution & deadline**.
4. Click **Log task**. The day's total is compared with your daily standard ("6h remaining", "8h reached").
5. Edit or delete a task from the list below the form; deleting asks for confirmation.

Use the **same task name** for work that spans several days so it merges into a single report row (case, extra spaces and bracketed notes are ignored when matching).

### 3. Statuses beyond office / WFH: Timesheet and Attendance tabs

Click a day status in the **Timesheet** ("Day status" row) or a day in **Attendance** to open **Set up the day**:

| Status | Counts as | Default target |
|---|---|---|
| At the office | Working day (office day in the report) | Standard hours / day |
| Remote (WFH) | Working day | Standard hours / day |
| Overtime (OT) | Working day | 4 h |
| Paid leave, Sick leave, Public holiday, Unpaid leave | Day off (lowers the weekly target by one standard day) | 0 h |
| Weekend | Neither | 0 h |

The dialog also accepts a custom target, check-in / check-out times and a note.

### 4. Reviewing the week

- **Timesheet**: projects and tasks × days. Click an hours cell to edit that task, click **+** to log a task on that day. The footer shows each day's total against its target.
- **Attendance**: month calendar of office, WFH, leave and overtime days with counts.
- **Performance**: weekly goal %, deep-work ratio, task completion rate, hours per day against the standard, and tips. Deep work is derived from the category: Feature development, Bug fix and Security are deep; PR review and Test & release are normal; Meetings and Other are light.

### 5. End of week: Weekly report tab

1. Check **Office days & days off this week**. Toggle Office / WFH / Off per day, or click **Use default days** to reset to Settings.
2. Review the sheet preview. Click **Quick edit** to change completion %, reason, solution and remark per task directly in the table. Changes apply to every entry of that task.
3. Fill in **Objective for next week** (pencil icon → edit, add or delete rows) and the three reflection boxes on the right.
4. Get the report out:
   - **Copy to sheet** (recommended): open Excel, LibreOffice Calc or Google Sheets, select cell A1, press Ctrl+V (Cmd+V on Mac). Formatting, merged cells and borders are kept.
   - **Export Excel (.xlsx)**, **Export ODS (.ods)**, **Export PDF (.pdf)** (A4 landscape) or **Export CSV**.
   - **Print** for a paper copy.
   - **Paste guide** explains both methods and shows the raw tab-separated data.

The **Export CSV** button in the header exports the week currently selected, from any tab.

### 6. Changing language

Use the language menu (top right) for the interface. The report language is set separately in Settings and defaults to English, so changing the interface language never changes the report.

### 7. Backup, restore and moving to another machine

- **Back up (JSON)** downloads all tasks, day statuses, objectives, reflections and settings, except the GitHub token.
- **Restore (JSON)** validates the file first, then replaces all current data (with confirmation). Files over 5 MB or not created by ChronoWork are rejected.
- **Delete all data** removes tasks, day statuses, objectives and reflections; it cannot be undone.

Back up regularly: clearing the browser's site data, using a private window or switching browser / profile / machine starts from an empty app.

## Options Considered

### Option A: workflow and guide recorded in an ADR, linked from the README (chosen)

**Pros:** versioned with the code, so it changes in the same pull request as the behaviour; records why the rules exist, not only how to click.
**Cons:** users have to open the repository docs; it is not visible inside the app.

### Option B: in-app help only

**Pros:** visible where it is needed.
**Cons:** has to be translated into three languages and kept in sync in code; does not capture the reasoning behind the rules.

### Option C: README section only

**Pros:** the first file people read.
**Cons:** the README is aimed at developers (setup, security notes) and would grow too long.

## Trade-off Analysis

The rules in the Decision section (merging, targets, local storage) are the parts most likely to be questioned or changed later, so they belong in a decision record next to the code. The step-by-step guide sits in the same file to keep one source of truth. In-app help (Option B) can be added later for the few steps that need it, linking back here.

## Consequences

- **Easier:** onboarding a new user takes one document; behaviour questions ("why is my target 32h?") have a written answer.
- **Easier:** the weekly report needs no retyping, and its layout always matches the template.
- **Harder:** data is tied to one browser profile. Losing it without a backup is unrecoverable, so backups are the user's responsibility.
- **Harder:** tasks merge by name only; two different tasks with the same name end up in one row, and one task with differently worded names ends up in two.
- **Watch out:** objectives and reflections are a single shared set, not stored per week. Update or clear them at the start of each week.
- **Watch out:** "lowest completion wins" means an early entry at 50% keeps the row at 50% until that entry is edited, or until Quick edit updates all of them.
- **Revisit:** per-week objectives and reflections, and in-app links to this guide.

## Action Items

1. [x] Link this guide from `README.md`.
2. [ ] Store objectives and reflections per week (see Consequences).
3. [ ] Add a "Help" link in the app header pointing to this guide.
4. [ ] Update this ADR whenever a rule in the Decision section changes.
