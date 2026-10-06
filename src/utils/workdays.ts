import { DayLog, DayStatusType, DAY_STATUS_CONFIGS, TimeEntry, UserSettings } from '../types';
import { formatDateIso, formatShortDate } from './dateUtils';

/**
 * Status of a day: the saved day log, otherwise derived from the weekday and
 * the user's default office days. Every view uses this so they agree.
 */
export function getEffectiveStatus(
  date: Date,
  dayLogs: Record<string, DayLog>,
  settings: UserSettings
): DayStatusType {
  const log = dayLogs[formatDateIso(date)];
  if (log) return log.status;
  const weekday = date.getDay();
  if (weekday === 0 || weekday === 6) return 'weekend';
  return settings.defaultOfficeDays.includes(weekday) ? 'work' : 'wfh';
}

export function isLeaveStatus(status: DayStatusType): boolean {
  return DAY_STATUS_CONFIGS[status].isOffDay;
}

/** Hours expected for a day: explicit target from the day log, otherwise the status default. */
export function getDayTargetHours(
  date: Date,
  dayLogs: Record<string, DayLog>,
  settings: UserSettings
): number {
  const log = dayLogs[formatDateIso(date)];
  if (log?.targetHours !== undefined) return log.targetHours;
  const status = getEffectiveStatus(date, dayLogs, settings);
  if (status === 'work' || status === 'wfh') return settings.dailyStandardHours;
  return DAY_STATUS_CONFIGS[status].defaultHours;
}

/** Weekly target reduced by the leave days of that week. */
export function getWeeklyTargetHours(
  weekDays: Date[],
  dayLogs: Record<string, DayLog>,
  settings: UserSettings
): number {
  const leaveDays = weekDays
    .slice(0, 5)
    .filter((d) => isLeaveStatus(getEffectiveStatus(d, dayLogs, settings))).length;
  return Math.max(0, settings.weeklyTargetHours - leaveDays * settings.dailyStandardHours);
}

export function entryHours(entry: TimeEntry): number {
  return entry.hours ?? (entry.durationMinutes ? entry.durationMinutes / 60 : 0);
}

export function sumHours(entries: TimeEntry[]): number {
  return entries.reduce((acc, e) => acc + entryHours(e), 0);
}

export function filterEntriesForDays(entries: TimeEntry[], days: Date[]): TimeEntry[] {
  const isoDates = new Set(days.map((d) => formatDateIso(d)));
  return entries.filter((e) => isoDates.has(e.date));
}

/**
 * Office days and days off (Mon-Fri) for the report header.
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

  weekDays.slice(0, 5).forEach((d) => {
    const status = getEffectiveStatus(d, dayLogs, settings);
    if (status === 'work') officeDates.push(formatShortDate(d));
    if (isLeaveStatus(status)) offDates.push(formatShortDate(d));
  });

  // A full office week reads as a range: "25/08 → 29/08"
  const officeText =
    officeDates.length === 5 ? `${officeDates[0]} → ${officeDates[4]}` : officeDates.join(', ');

  return {
    officeDaysCount: officeDates.length,
    officeDatesText: officeText,
    daysOffCount: offDates.length,
    daysOffDatesText: offDates.join(', '),
  };
}
