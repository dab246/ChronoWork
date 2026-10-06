/**
 * Date utility functions for work logs and weekly timesheets
 */
import type { Language } from '../types';

const LOCALES: Record<Language, string> = {
  vi: 'vi-VN',
  en: 'en-GB',
  fr: 'fr-FR',
};

export function localeOf(lang: Language): string {
  return LOCALES[lang] ?? LOCALES.en;
}

export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const d = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return formatDateIso(d) === value;
}

export function parseDateIso(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // Noon to prevent timezone shifts
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return formatDateIso(a) === formatDateIso(b);
}

/**
 * Returns Monday of the week for a given date
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns 7 days (Monday through Sunday) for the given base date's week
 */
export function getWeekDays(baseDate: Date): Date[] {
  const monday = getMondayOfWeek(baseDate);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** ISO 8601 week number */
export function getWeekNumber(date: Date): number {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

function toDate(date: Date | string): Date {
  return typeof date === 'string' ? parseDateIso(date) : date;
}

export function getDayName(date: Date | string, lang: Language, short = false): string {
  return new Intl.DateTimeFormat(localeOf(lang), { weekday: short ? 'short' : 'long' }).format(toDate(date));
}

/** e.g. "Thứ Ba, 06/10/2026" / "Tuesday, 06/10/2026" */
export function formatLongDate(date: Date | string, lang: Language): string {
  const d = toDate(date);
  const weekday = getDayName(d, lang);
  const capitalized = weekday.charAt(0).toLocaleUpperCase(localeOf(lang)) + weekday.slice(1);
  return `${capitalized}, ${formatShortDate(d)}/${d.getFullYear()}`;
}

export function formatMonthYear(date: Date, lang: Language): string {
  const text = new Intl.DateTimeFormat(localeOf(lang), { month: 'long', year: 'numeric' }).format(date);
  return text.charAt(0).toLocaleUpperCase(localeOf(lang)) + text.slice(1);
}

export function getMonthNames(lang: Language): string[] {
  const fmt = new Intl.DateTimeFormat(localeOf(lang), { month: 'short' });
  return Array.from({ length: 12 }, (_, m) => fmt.format(new Date(2024, m, 1)));
}

/** Weekday names starting on Monday */
export function getWeekdayNames(lang: Language, short = true): string[] {
  const monday = new Date(2024, 0, 1); // 1 Jan 2024 is a Monday
  return Array.from({ length: 7 }, (_, i) => getDayName(addDays(monday, i), lang, short));
}

export function formatShortDate(date: Date | string): string {
  const d = toDate(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function isToday(dateIso: string): boolean {
  return dateIso === formatDateIso(new Date());
}

export function isWeekendDay(date: Date | string): boolean {
  const day = toDate(date).getDay();
  return day === 0 || day === 6;
}

export function minutesToHoursDecimal(totalMinutes: number): number {
  return Number((totalMinutes / 60).toFixed(1));
}

/** Formats hours without floating point noise: 7.5 -> "7.5", 8 -> "8" */
export function formatHours(hours: number): string {
  return String(Math.round(hours * 100) / 100);
}
