import { formatDateIso } from './dateUtils';

/**
 * A reminder missed by more than this (laptop asleep, app opened late) is
 * skipped rather than fired at a time it no longer helps.
 */
export const REMINDER_WINDOW_MINUTES = 60;

/** Minutes since midnight of an "HH:MM" time. */
export function minutesOfTime(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/** Whether `now` falls between the reminder time and the end of its window. */
export function isWithinReminderWindow(now: Date, time: string): boolean {
  const elapsed = now.getHours() * 60 + now.getMinutes() - minutesOfTime(time);
  return elapsed >= 0 && elapsed < REMINDER_WINDOW_MINUTES;
}

export interface ReminderDay {
  /** Office, remote or overtime day (not leave, holiday or weekend) */
  isWorkDay: boolean;
  loggedHours: number;
  targetHours: number;
}

/** Only working days whose hours are not logged yet need a reminder. */
export const dayNeedsReminder = ({ isWorkDay, loggedHours, targetHours }: ReminderDay): boolean =>
  isWorkDay && (targetHours <= 0 || loggedHours < targetHours);

export interface ReminderCheck extends ReminderDay {
  now: Date;
  time: string;
  /** Date of the last reminder; it fires at most once a day */
  lastDate?: string;
}

export function isReminderDue(check: ReminderCheck): boolean {
  if (check.lastDate === formatDateIso(check.now)) return false;
  return isWithinReminderWindow(check.now, check.time) && dayNeedsReminder(check);
}
