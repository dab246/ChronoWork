import {
  TimeEntry,
  DayLog,
  UserSettings,
  WeeklyObjective,
  WeeklyReflections,
  Language,
  LANGUAGES,
  DAY_STATUSES,
  DayStatusType,
  TASK_CATEGORIES,
  TaskCategory,
} from '../types';
import { formatDateIso, getWeekDays, isIsoDate } from './dateUtils';
import { clampNumber, cleanText, safeUrl } from './security';

const STORAGE_KEYS = {
  ENTRIES: 'chronowork_entries_v3',
  DAY_LOGS: 'chronowork_day_logs_v3',
  SETTINGS: 'chronowork_settings_v3',
  OBJECTIVES: 'chronowork_objectives_v3',
  REFLECTIONS: 'chronowork_reflections_v3',
};

export const BACKUP_VERSION = '4.0';
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 50_000;
const MAX_OBJECTIVES = 50;
const REPO_PATTERN = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const LOGO_PATTERN = /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
export const MAX_LOGO_CHARS = 3_000_000;

function sanitizeLogo(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length > MAX_LOGO_CHARS) return undefined;
  return LOGO_PATTERN.test(value) ? value : undefined;
}

export function detectLanguage(): Language {
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : '';
  if (nav.startsWith('vi')) return 'vi';
  if (nav.startsWith('fr')) return 'fr';
  return 'en';
}

export const DEFAULT_SETTINGS: UserSettings = {
  userName: '',
  userRole: '',
  companyName: '',
  weeklyTargetHours: 40,
  dailyStandardHours: 8,
  defaultOfficeDays: [1, 2, 3, 4, 5],
  defaultRepos: [],
  language: 'vi',
};

export const DEFAULT_REFLECTIONS: WeeklyReflections = {
  wentWell: '',
  challenging: '',
  proposal: '',
};

// ---------------------------------------------------------------------------
// Sanitizers: everything read from storage or a backup file goes through these
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalText(value: unknown, maxLength = 2000): string | undefined {
  const text = cleanText(value, maxLength).trim();
  return text || undefined;
}

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

export function sanitizeSettings(raw: unknown, base: UserSettings = DEFAULT_SETTINGS): UserSettings {
  if (!isRecord(raw)) return { ...base };
  const officeDays = Array.isArray(raw.defaultOfficeDays) ? raw.defaultOfficeDays : base.defaultOfficeDays;
  const repos = Array.isArray(raw.defaultRepos) ? raw.defaultRepos : base.defaultRepos;
  return {
    userName: cleanText(raw.userName ?? base.userName, 120),
    userRole: cleanText(raw.userRole ?? base.userRole, 120),
    companyName: cleanText(raw.companyName ?? base.companyName, 120),
    weeklyTargetHours: clampNumber(raw.weeklyTargetHours, 0, 168, base.weeklyTargetHours),
    dailyStandardHours: clampNumber(raw.dailyStandardHours, 0, 24, base.dailyStandardHours),
    defaultOfficeDays: [...new Set(officeDays.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 5))].sort(),
    defaultRepos: repos.filter((r): r is string => typeof r === 'string' && REPO_PATTERN.test(r)).slice(0, 20),
    githubToken: optionalText(raw.githubToken, 255),
    language: isLanguage(raw.language) ? raw.language : base.language,
    reportLanguage: isLanguage(raw.reportLanguage) ? raw.reportLanguage : undefined,
    logoDataUrl: sanitizeLogo(raw.logoDataUrl),
  };
}

export function sanitizeEntry(raw: unknown): TimeEntry | null {
  if (!isRecord(raw) || !isIsoDate(raw.date)) return null;
  const taskName = cleanText(raw.taskName, 500).trim();
  if (!taskName) return null;
  const hours = clampNumber(raw.hours ?? Number(raw.durationMinutes) / 60, 0, 24, 0);
  const completionPct = clampNumber(raw.completionPct, 0, 100, 100);
  const category = TASK_CATEGORIES.includes(raw.category as TaskCategory) ? (raw.category as TaskCategory) : undefined;
  const githubNumber = Number.isInteger(raw.githubNumber) ? (raw.githubNumber as number) : undefined;
  return {
    id: cleanText(raw.id, 100) || newId('task'),
    date: raw.date,
    taskName,
    project: cleanText(raw.project, 120).trim(),
    hours,
    durationMinutes: Math.round(hours * 60),
    category,
    githubUrl: safeUrl(raw.githubUrl),
    githubNumber,
    description: optionalText(raw.description),
    notes: optionalText(raw.notes),
    completionPct,
    gapPct: 100 - completionPct,
    gapReason: optionalText(raw.gapReason),
    gapSolution: optionalText(raw.gapSolution),
    remark: optionalText(raw.remark),
    isCompleted: raw.isCompleted === true ? true : undefined,
    focusLevel: raw.focusLevel === 'deep' || raw.focusLevel === 'normal' || raw.focusLevel === 'shallow' ? raw.focusLevel : undefined,
    createdAt: clampNumber(raw.createdAt, 0, Number.MAX_SAFE_INTEGER, Date.now()),
  };
}

export function sanitizeDayLog(raw: unknown): DayLog | null {
  if (!isRecord(raw) || !isIsoDate(raw.date)) return null;
  if (!DAY_STATUSES.includes(raw.status as DayStatusType)) return null;
  const time = (v: unknown) => (typeof v === 'string' && TIME_PATTERN.test(v) ? v : undefined);
  return {
    date: raw.date,
    status: raw.status as DayStatusType,
    note: optionalText(raw.note, 500),
    targetHours: raw.targetHours === undefined ? undefined : clampNumber(raw.targetHours, 0, 24, 0),
    checkInTime: time(raw.checkInTime),
    checkOutTime: time(raw.checkOutTime),
  };
}

function sanitizeEntries(raw: unknown): TimeEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, MAX_ENTRIES).map(sanitizeEntry).filter((e): e is TimeEntry => e !== null);
}

function sanitizeDayLogs(raw: unknown): Record<string, DayLog> {
  const result: Record<string, DayLog> = {};
  if (!isRecord(raw)) return result;
  for (const value of Object.values(raw)) {
    const log = sanitizeDayLog(value);
    if (log) result[log.date] = log;
  }
  return result;
}

function sanitizeObjectives(raw: unknown): WeeklyObjective[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .slice(0, MAX_OBJECTIVES)
    .filter(isRecord)
    .map((o) => ({
      id: cleanText(o.id, 100) || newId('obj'),
      task: cleanText(o.task, 500),
      note: cleanText(o.note, 500),
    }));
}

function sanitizeReflections(raw: unknown): WeeklyReflections {
  if (!isRecord(raw)) return { ...DEFAULT_REFLECTIONS };
  return {
    wentWell: cleanText(raw.wentWell, 5000),
    challenging: cleanText(raw.challenging, 5000),
    proposal: cleanText(raw.proposal, 5000),
  };
}

// ---------------------------------------------------------------------------
// localStorage access
// ---------------------------------------------------------------------------

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : undefined;
  } catch {
    return undefined;
  }
}

function writeJson(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.error(`Failed to save ${key}`, e);
    return false;
  }
}

export function getStoredSettings(): UserSettings {
  const raw = readJson(STORAGE_KEYS.SETTINGS);
  return sanitizeSettings(raw, { ...DEFAULT_SETTINGS, language: detectLanguage() });
}

export const saveStoredSettings = (settings: UserSettings) => writeJson(STORAGE_KEYS.SETTINGS, settings);
export const getStoredEntries = () => sanitizeEntries(readJson(STORAGE_KEYS.ENTRIES));
export const saveStoredEntries = (entries: TimeEntry[]) => writeJson(STORAGE_KEYS.ENTRIES, entries);
export const getStoredDayLogs = () => sanitizeDayLogs(readJson(STORAGE_KEYS.DAY_LOGS));
export const saveStoredDayLogs = (logs: Record<string, DayLog>) => writeJson(STORAGE_KEYS.DAY_LOGS, logs);
export const getStoredObjectives = () => sanitizeObjectives(readJson(STORAGE_KEYS.OBJECTIVES));
export const saveStoredObjectives = (objs: WeeklyObjective[]) => writeJson(STORAGE_KEYS.OBJECTIVES, objs);
export const getStoredReflections = () => sanitizeReflections(readJson(STORAGE_KEYS.REFLECTIONS));
export const saveStoredReflections = (refs: WeeklyReflections) => writeJson(STORAGE_KEYS.REFLECTIONS, refs);

export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${random}`;
}

// ---------------------------------------------------------------------------
// Backup / restore
// ---------------------------------------------------------------------------

/** Full backup. The GitHub token is deliberately left out. */
export function exportAllDataJson(): string {
  const { githubToken: _omitted, ...settings } = getStoredSettings();
  return JSON.stringify(
    {
      app: 'chronowork',
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      settings,
      entries: getStoredEntries(),
      dayLogs: getStoredDayLogs(),
      objectives: getStoredObjectives(),
      reflections: getStoredReflections(),
    },
    null,
    2
  );
}

export type ImportResult = { ok: true; entries: number } | { ok: false; reason: 'too_large' | 'invalid' };

/**
 * Validates the whole backup first and only then writes it, so a broken file
 * never leaves the app half restored. The local GitHub token is kept.
 */
export function importAllDataJson(jsonString: string): ImportResult {
  if (jsonString.length > MAX_BACKUP_BYTES) return { ok: false, reason: 'too_large' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.entries)) return { ok: false, reason: 'invalid' };

  const current = getStoredSettings();
  const importedSettings = isRecord(parsed.settings)
    ? { ...sanitizeSettings(parsed.settings, current), githubToken: current.githubToken }
    : current;
  const entries = sanitizeEntries(parsed.entries);
  const dayLogs = sanitizeDayLogs(parsed.dayLogs);
  const objectives = sanitizeObjectives(parsed.objectives);
  const reflections = sanitizeReflections(parsed.reflections);

  saveStoredSettings(importedSettings);
  saveStoredEntries(entries);
  saveStoredDayLogs(dayLogs);
  saveStoredObjectives(objectives);
  saveStoredReflections(reflections);
  return { ok: true, entries: entries.length };
}

// ---------------------------------------------------------------------------
// Sample data (fictional) for trying the app out
// ---------------------------------------------------------------------------

export function generateSampleData(): { entries: TimeEntry[]; dayLogs: Record<string, DayLog> } {
  const week = getWeekDays(new Date()).map((d) => formatDateIso(d));
  const sample: Array<[number, string, string, number, TaskCategory, number, string?]> = [
    [0, 'Build login form validation #12', 'Web App', 5, 'development', 100, 'https://github.com/example/web-app/pull/12'],
    [0, 'Sprint planning', 'Team', 1, 'meeting', 100],
    [0, 'Review open pull requests', 'Web App', 2, 'pr_review', 100],
    [1, 'Fix crash when uploading large files #34', 'Mobile App', 6, 'bugfix', 80, 'https://github.com/example/mobile-app/issues/34'],
    [1, 'Daily stand-up & sync', 'Team', 2, 'meeting', 100],
    [2, 'Build login form validation #12', 'Web App', 4, 'development', 100, 'https://github.com/example/web-app/pull/12'],
    [2, 'Dependency security audit', 'Web App', 4, 'security', 100],
    [3, 'Prepare release v1.4.0', 'Mobile App', 6, 'release', 90],
    [3, 'Review open pull requests', 'Web App', 2, 'pr_review', 100],
    [4, 'Fix crash when uploading large files #34', 'Mobile App', 5, 'bugfix', 100, 'https://github.com/example/mobile-app/issues/34'],
    [4, 'Write technical documentation', 'Web App', 3, 'other', 100],
  ];

  const entries = sample.map(([day, taskName, project, hours, category, completionPct, githubUrl]) => ({
    id: newId('task'),
    date: week[day],
    taskName,
    project,
    hours,
    durationMinutes: hours * 60,
    category,
    githubUrl,
    completionPct,
    gapPct: 100 - completionPct,
    gapReason: completionPct < 100 ? 'Waiting for review' : undefined,
    createdAt: Date.now() - (5 - day) * 86_400_000,
  }));

  const dayLogs: Record<string, DayLog> = {};
  (['work', 'work', 'wfh', 'work', 'wfh', 'weekend', 'weekend'] as DayStatusType[]).forEach((status, i) => {
    dayLogs[week[i]] = { date: week[i], status };
  });

  return { entries, dayLogs };
}
