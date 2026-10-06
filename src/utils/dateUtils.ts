/**
 * Date utility functions for work logs and weekly timesheets
 */

export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateIso(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0); // Noon to prevent timezone shifts
}

/**
 * Returns Monday of the week for a given date
 */
export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Sunday is 0, Monday is 1, Saturday is 6
  // Distance from Monday: if day is 0 (Sunday), diff is -6 days; otherwise 1 - day
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
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

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

const VN_DAY_NAMES = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
const VN_SHORT_DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function getVietnameseDayName(date: Date | string, short = false): string {
  const d = typeof date === 'string' ? parseDateIso(date) : date;
  const dayIdx = d.getDay();
  return short ? VN_SHORT_DAYS[dayIdx] : VN_DAY_NAMES[dayIdx];
}

export function formatVietnameseDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateIso(date) : date;
  const dayName = VN_DAY_NAMES[d.getDay()];
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dayName}, ${dd}/${mm}/${yyyy}`;
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? parseDateIso(date) : date;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

export function getWeekRangeString(baseDate: Date): string {
  const days = getWeekDays(baseDate);
  const start = days[0];
  const end = days[6];
  const weekNum = getWeekNumber(baseDate);
  return `${formatShortDate(start)} - ${formatShortDate(end)}/${end.getFullYear()} (Tuần ${weekNum})`;
}

export function isToday(dateIso: string): boolean {
  return dateIso === formatDateIso(new Date());
}

export function isWeekendDay(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseDateIso(date) : date;
  const day = d.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

export function formatDuration(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const mins = Math.round(totalMinutes % 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

export function formatDurationHours(totalMinutes: number): string {
  const hours = (totalMinutes / 60).toFixed(1);
  return `${hours.endsWith('.0') ? hours.slice(0, -2) : hours}h`;
}

export function minutesToHoursDecimal(totalMinutes: number): number {
  return Number((totalMinutes / 60).toFixed(1));
}

export function formatSecondsToTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
