import type { TaskCategory, TimeEntry } from '../types';
import { normalizeTaskKey } from '../report/aggregate';
import { entryHours } from './workdays';

/**
 * Identity of a task across days: case, odd whitespace and bracketed notes are
 * ignored, the same rule the weekly report uses to merge rows.
 */
export const taskKey = (taskName: string): string => normalizeTaskKey(taskName);

/** A task logged before, as offered by the task name suggestions. */
export interface TaskSuggestion {
  key: string;
  /** Name of the most recent entry */
  taskName: string;
  project: string;
  category?: TaskCategory;
  githubUrl?: string;
  githubNumber?: number;
  description?: string;
  gapReason?: string;
  gapSolution?: string;
  /** Completion of the most recent entry */
  completionPct: number;
  lastDate: string;
  totalHours: number;
  logCount: number;
}

/** Chronological order: by date, then by creation time. */
const compareEntries = (a: Pick<TimeEntry, 'date' | 'createdAt'>, b: Pick<TimeEntry, 'date' | 'createdAt'>): number =>
  a.date === b.date ? a.createdAt - b.createdAt : a.date < b.date ? -1 : 1;

function toSuggestion(key: string, latest: TimeEntry): TaskSuggestion {
  return {
    key,
    taskName: latest.taskName.trim(),
    project: latest.project,
    category: latest.category,
    githubUrl: latest.githubUrl,
    githubNumber: latest.githubNumber,
    description: latest.description,
    gapReason: latest.gapReason,
    gapSolution: latest.gapSolution,
    completionPct: latest.completionPct ?? 100,
    lastDate: latest.date,
    totalHours: 0,
    logCount: 0,
  };
}

/** One suggestion per task, most recently logged first. */
export function buildTaskSuggestions(entries: TimeEntry[]): TaskSuggestion[] {
  const byKey = new Map<string, TaskSuggestion>();
  const sorted = [...entries].sort((a, b) => compareEntries(b, a));
  for (const entry of sorted) {
    if (!entry.taskName?.trim()) continue;
    const key = taskKey(entry.taskName);
    const suggestion = byKey.get(key) ?? toSuggestion(key, entry);
    suggestion.totalHours += entryHours(entry);
    suggestion.logCount += 1;
    byKey.set(key, suggestion);
  }
  return [...byKey.values()];
}

/** Entries grouped by task, so lookups while typing do not rescan every entry. */
export function groupByTask(entries: TimeEntry[]): Map<string, TimeEntry[]> {
  const groups = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    if (!entry.taskName?.trim()) continue;
    const key = taskKey(entry.taskName);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(entry);
  }
  return groups;
}

/** Suggestions whose name contains the query (case-insensitive), most recent first. */
export function filterTaskSuggestions(suggestions: TaskSuggestion[], query: string, limit = 8): TaskSuggestion[] {
  const needle = query.replace(/\s+/g, ' ').trim().toLowerCase();
  const matches = needle ? suggestions.filter((s) => s.key.includes(needle) || s.taskName.toLowerCase().includes(needle)) : suggestions;
  return matches.slice(0, limit);
}

export interface ProgressPoint {
  pct: number;
  date: string;
}

export interface ProgressBounds {
  /** Lowest completion allowed: the progress already reached before this entry */
  min: number;
  /** Highest completion allowed: the progress of the next logged entry, if any */
  max: number;
  previous?: ProgressPoint;
  next?: ProgressPoint;
  /** The task was already finished before this entry, so its progress cannot change */
  locked: boolean;
}

export interface ProgressPosition {
  date: string;
  /** Creation time of the entry being edited; a new entry comes after everything on its date */
  createdAt?: number;
  /** Entry being edited, left out of its own history */
  excludeId?: string;
}

const NO_BOUNDS: ProgressBounds = { min: 0, max: 100, locked: false };

type LoggedAt = Pick<TimeEntry, 'date' | 'createdAt'>;

const latest = (a: TimeEntry | undefined, b: TimeEntry) => (a && compareEntries(a, b) >= 0 ? a : b);
const earliest = (a: TimeEntry | undefined, b: TimeEntry) => (a && compareEntries(a, b) <= 0 ? a : b);

/** Entries of the task logged just before and just after `self`. */
function neighbours(entries: TimeEntry[], self: LoggedAt): { previous?: TimeEntry; next?: TimeEntry } {
  const before = entries.filter((e) => compareEntries(e, self) <= 0);
  const after = entries.filter((e) => compareEntries(e, self) > 0);
  return { previous: before.reduce<TimeEntry | undefined>(latest, undefined), next: after.reduce<TimeEntry | undefined>(earliest, undefined) };
}

const toPoint = (e?: TimeEntry): ProgressPoint | undefined => (e ? { pct: e.completionPct ?? 100, date: e.date } : undefined);

/**
 * Progress of a task is cumulative across its entries, so an entry can neither
 * go below the progress already logged before it, nor above the progress logged after it.
 */
export function progressBounds(entries: TimeEntry[], taskName: string, at: ProgressPosition): ProgressBounds {
  const key = taskName.trim() ? taskKey(taskName) : '';
  if (!key) return NO_BOUNDS;
  const sameTask = entries.filter((e) => e.id !== at.excludeId && taskKey(e.taskName ?? '') === key);
  const { previous, next } = neighbours(sameTask, { date: at.date, createdAt: at.createdAt ?? Number.POSITIVE_INFINITY });
  const min = previous?.completionPct ?? 0;
  // Older data may not be monotonic; never let the upper bound fall below the lower one
  const max = Math.max(min, next?.completionPct ?? 100);
  return { min, max, previous: toPoint(previous), next: toPoint(next), locked: min >= 100 };
}

export const clampProgress = (pct: number, bounds: Pick<ProgressBounds, 'min' | 'max'>): number => Math.min(bounds.max, Math.max(bounds.min, pct));
