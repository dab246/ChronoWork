import { TimeEntry, DayLog, UserSettings, WeeklyObjective, WeeklyReflections, DAY_STATUS_CONFIGS } from '../types';
import {
  formatDateIso,
  getVietnameseDayName,
  formatShortDate,
  getWeekRangeString,
  getWeekNumber,
} from './dateUtils';

export interface AggregatedTask {
  key: string;
  label: string;
  url?: string;
  hours: number;
  project: string;
  activitiesDescription: string;
  completionPct: number;
  gapPct: number;
  gapReason: string;
  gapSolution: string;
  remark: string;
}

/**
 * Aggregates tasks across the week by task name / URL, summing the hours
 * Formatted exactly like the user's real Linagora template CSV
 */
export function aggregateWeeklyTasks(entries: TimeEntry[]): AggregatedTask[] {
  const aggMap = new Map<string, AggregatedTask>();

  for (const entry of entries) {
    const rawName = (entry.taskName || '').trim();
    if (!rawName) continue;

    // Normalize key (strip urls/brackets, lowercase)
    const key = rawName
      .replace(/\(https?:\/\/[^)]*\)/gi, '')
      .replace(/\([^)]*\)/g, '')
      .replace(/[\u2000-\u200D\uFEFF\u00A0]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const hours = entry.hours ?? (entry.durationMinutes ? entry.durationMinutes / 60 : 0);
    const existing = aggMap.get(key);

    // Determine activities description (e.g., "Dev", "Test, Dev, Review", "Grooming", "Review", "Demo")
    let actDesc = (entry.description || '').trim();
    if (!actDesc) {
      if (entry.category === 'pr_review') actDesc = 'Review';
      else if (entry.category === 'meeting') actDesc = 'Grooming';
      else if (entry.category === 'release') actDesc = 'Test, Dev, Review';
      else if (entry.category === 'bugfix') actDesc = 'Bugfix';
      else actDesc = 'Dev';
    }

    if (existing) {
      existing.hours += hours;
      if (!existing.url && entry.githubUrl) {
        existing.url = entry.githubUrl;
      }
      if (entry.description && !existing.activitiesDescription) {
        existing.activitiesDescription = entry.description;
      }
      if (entry.gapReason && !existing.gapReason) {
        existing.gapReason = entry.gapReason;
      }
      if (entry.gapSolution && !existing.gapSolution) {
        existing.gapSolution = entry.gapSolution;
      }
      if (entry.completionPct !== undefined && entry.completionPct < existing.completionPct) {
        existing.completionPct = entry.completionPct;
        existing.gapPct = 100 - entry.completionPct;
      }
      if (!existing.remark && entry.notes) {
        existing.remark = entry.notes;
      }
    } else {
      const comp = entry.completionPct ?? 100;
      aggMap.set(key, {
        key,
        label: rawName.replace(/\(https?:\/\/[^)]*\)/gi, '').trim(),
        url: entry.githubUrl,
        hours,
        project: entry.project,
        activitiesDescription: actDesc,
        completionPct: comp,
        gapPct: 100 - comp,
        gapReason: entry.gapReason || '',
        gapSolution: entry.gapSolution || '',
        remark: entry.githubUrl || entry.notes || '',
      });
    }
  }

  // Sort descending by hours (just like in App Script: entries.sort((a,b) => b.hours - a.hours))
  return Array.from(aggMap.values()).sort((a, b) => b.hours - a.hours);
}

/**
 * Calculates office working days and days off formatted strings for the Linagora header
 * Matches the user's template:
 * - "Your days off this week:  ,, Number: 0 Date:   ,,,,,,"
 * - "Your working days at the office this week: ,, Number 4 Date: 25/08 → 28/08,,,,,,"
 */
export function getWorkingAndOffDaysInfo(
  weekDays: Date[],
  dayLogs: Record<string, DayLog>,
  settings: UserSettings
): {
  officeDaysCount: number;
  officeDatesText: string;
  daysOffCount: number;
  daysOffDatesText: string;
} {
  const officeDates: string[] = [];
  const offDates: string[] = [];

  // Mon-Fri (first 5 days)
  weekDays.slice(0, 5).forEach((d) => {
    const iso = formatDateIso(d);
    const log = dayLogs[iso];
    const dayOfWeek = d.getDay() === 0 ? 7 : d.getDay(); // 1=Mon, 2=Tue...

    const defaultDays = settings.defaultOfficeDays || [1, 2, 4];
    const isOffice = log
      ? log.status === 'work'
      : defaultDays.includes(dayOfWeek);

    const isOff = log
      ? log.status === 'paid_leave' || log.status === 'sick_leave' || log.status === 'holiday' || log.status === 'unpaid_leave'
      : false;

    const formatted = formatShortDate(d);

    if (isOffice) {
      officeDates.push(formatted);
    }
    if (isOff) {
      offDates.push(formatted);
    }
  });

  // Format date range: if consecutive 4+ days, e.g. "25/08 → 28/08", or comma list
  let officeText = '';
  if (officeDates.length >= 3 && officeDates.length === 5) {
    officeText = `${officeDates[0]} → ${officeDates[officeDates.length - 1]}`;
  } else if (officeDates.length > 0) {
    officeText = officeDates.join(', ');
  }

  return {
    officeDaysCount: officeDates.length,
    officeDatesText: officeText,
    daysOffCount: offDates.length,
    daysOffDatesText: offDates.join(', '),
  };
}

/**
 * Exports Raw Data CSV (matching the "Data" sheet from Notion export - Screenshot 1)
 */
export function exportRawNotionCsv(
  weekDays: Date[],
  entries: TimeEntry[],
  settings: UserSettings
): void {
  const dateIsoList = weekDays.map((d) => formatDateIso(d));
  const weekEntries = entries.filter((e) => dateIsoList.includes(e.date));

  const headers = ['Task', 'Author', 'Date', 'Time Spent (h)', 'Name'];
  const rows: string[] = [headers.join(',')];

  weekEntries.forEach((e, idx) => {
    const taskCol = e.githubUrl ? `${e.taskName} (${e.githubUrl})` : e.taskName;
    const hours = e.hours ?? ((e.durationMinutes || 0) / 60);
    const nameCol = `[TID-${4400 + idx}] - @${settings.userName} (${hours} h)`;

    rows.push(
      [
        `"${taskCol.replace(/"/g, '""')}"`,
        `"${settings.userName}"`,
        `"${e.date}"`,
        hours,
        `"${nameCol}"`,
      ].join(',')
    );
  });

  const content = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Notion_Export_Data_Week_${getWeekNumber(weekDays[0])}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Exports Completed Template CSV matching Linagora Vietnam Weekly Report
 * Exactly identical to user's real sheet CSV format!
 */
export function exportWeeklyTemplateCsv(
  weekDays: Date[],
  entries: TimeEntry[],
  dayLogs: Record<string, DayLog>,
  settings: UserSettings,
  objectives: WeeklyObjective[] = [],
  reflections?: WeeklyReflections
): void {
  const weekNum = getWeekNumber(weekDays[0]);
  const startStr = formatShortDate(weekDays[0]);
  const endStr = formatShortDate(weekDays[4]); // Friday
  const workingInfo = getWorkingAndOffDaysInfo(weekDays, dayLogs, settings);

  const dateIsoList = weekDays.map((d) => formatDateIso(d));
  const weekEntries = entries.filter((e) => dateIsoList.includes(e.date));
  const aggregated = aggregateWeeklyTasks(weekEntries);

  const rows: string[] = [];

  // Row 1: Brand & Title
  rows.push(`"WEEKLY REPORT \nWeek ${weekNum} from ${startStr}  to ${endStr}  ",,,,,,,,`);

  // Row 2: Employee name & Title
  rows.push(`"Employee’s name: ${settings.userName}  Title: ${settings.userRole}\n",,,,,,,,`);

  // Row 3: Days off
  rows.push(`Your days off this week:  ,, Number: ${workingInfo.daysOffCount} Date: ${workingInfo.daysOffDatesText || ''}   ,,,,,,`);

  // Row 4: Working days at the office
  rows.push(`Your working days at the office this week: ,, Number ${workingInfo.officeDaysCount} Date: ${workingInfo.officeDatesText || ''},,,,,,`);

  // Row 5: Blank spacer
  rows.push(',,,,,,,,');

  // Row 6: COMPLETED WORK banner
  rows.push('COMPLETED WORK ,,,,,,,,');

  // Row 7 & 8: Headers
  rows.push('NO ,PROJECT/TASK ,DESCRIPTION OF ACTIVITIES ,"TIME SPENT  \n",RESULT VS PLAN ,,GAP (if any) ,,REMARK ');
  rows.push(',,,,Completion (%) ,Gap (%) ,Reason ,Solution/Deadline ,');

  // Task rows (Rows 9+)
  aggregated.forEach((item, idx) => {
    // Exact format from user's sheet:
    // e.g. 1,Release new version 0.18.2,"Test, Dev, Review",5HD,100,,,,https://github.com/linagora/tmail-flutter/issues/3975
    const taskCol = `"${item.label.replace(/"/g, '""')}"`;
    const actCol = item.activitiesDescription ? `"${item.activitiesDescription.replace(/"/g, '""')}"` : 'Dev';
    const timeCol = `${item.hours}HD`;
    const compCol = item.completionPct;
    const gapCol = item.gapPct > 0 ? item.gapPct : '';
    const reasonCol = item.gapReason ? `"${item.gapReason.replace(/"/g, '""')}"` : '';
    const solCol = item.gapSolution ? `"${item.gapSolution.replace(/"/g, '""')}"` : '';
    const remarkCol = item.url ? item.url : (item.remark ? `"${item.remark.replace(/"/g, '""')}"` : '');

    rows.push([
      idx + 1,
      taskCol,
      actCol,
      timeCol,
      compCol,
      gapCol,
      reasonCol,
      solCol,
      remarkCol,
    ].join(','));
  });

  // Empty placeholder rows up to row 22
  const emptyCount = Math.max(0, 16 - aggregated.length);
  for (let i = 0; i < emptyCount; i++) {
    rows.push(`${aggregated.length + i + 1},,,,,,,,`);
  }

  // Separator
  rows.push('…,"Reviews, meetings, support, community, …",,,,,,,');
  rows.push(',,,,,,,,');

  // Objectives & Reflections
  rows.push('No ,OBJECTIVE FOR  NEXT WEEK ,,Note ,,"* The things that went particularly well this week (area of improvement, new task....)  ",,,');
  rows.push(`1,"${(objectives[0]?.task || 'Tmail tasks').replace(/"/g, '""')}",,"${(objectives[0]?.note || 'Sep sprint').replace(/"/g, '""')}",,"${(reflections?.wentWell || '').replace(/"/g, '""')}",,,`);
  rows.push('2,,,,,"* The things that were challenging this week (issue, problem, difficulty,..)",,,');
  rows.push(`3,"${(objectives[1]?.task || '').replace(/"/g, '""')}",,"${(objectives[1]?.note || '').replace(/"/g, '""')}",,"${(reflections?.challenging || '').replace(/"/g, '""')}",,,`);
  rows.push('4,,,,,"* Your proposal, suggestion, request…",,,');
  rows.push(`5,"${(objectives[2]?.task || '').replace(/"/g, '""')}",,"${(objectives[2]?.note || '').replace(/"/g, '""')}",,"${(reflections?.proposal || '').replace(/"/g, '""')}",,,`);

  rows.push(',,,,,,,,');
  rows.push(',,,,,,,,');
  rows.push(',Employee ,,,,,Teamleader/Manager ,,');

  const content = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Weekly_Report_Week_${weekNum}_${settings.userName.replace(/\s+/g, '_')}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
