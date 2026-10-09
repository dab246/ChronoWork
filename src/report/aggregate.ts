import type { TaskCategory, TimeEntry } from '../types';
import { entryHours } from '../utils/workdays';

export interface AggregatedTask {
  key: string;
  label: string;
  url?: string;
  hours: number;
  project: string;
  activitiesDescription: string;
  category?: TaskCategory;
  completionPct: number;
  gapPct: number;
  gapReason: string;
  gapSolution: string;
  remark: string;
}

// `[^()]*` (not `[^)]*`) keeps these linear: an unclosed "(" stops at the next "(".
const BRACKETED_URL = /\(https?:\/\/[^()]*\)/gi;
const BRACKETED = /\([^()]*\)/g;

/**
 * Key used to merge the same task logged on several days: URLs in brackets,
 * bracketed notes, odd whitespace and case are ignored.
 */
export function normalizeTaskKey(taskName: string): string {
  return taskName
    .replace(BRACKETED_URL, '')
    .replace(BRACKETED, '')
    .replace(/[\u2000-\u200D\uFEFF\u00A0]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function toTask(entry: TimeEntry, key: string, rawName: string): AggregatedTask {
  const completion = entry.completionPct ?? 100;
  return {
    key,
    label: rawName.replace(BRACKETED_URL, '').trim(),
    url: entry.githubUrl,
    hours: entryHours(entry),
    project: entry.project,
    activitiesDescription: (entry.description || '').trim(),
    category: entry.category,
    completionPct: completion,
    gapPct: 100 - completion,
    gapReason: entry.gapReason || '',
    gapSolution: entry.gapSolution || '',
    remark: entry.remark || entry.notes || '',
  };
}

/** Fields where the first non-empty value across the week is kept. */
const FIRST_NON_EMPTY = ['url', 'activitiesDescription', 'category', 'remark'] as const;

function fillIfEmpty<K extends keyof AggregatedTask>(target: AggregatedTask, next: AggregatedTask, field: K): void {
  target[field] ||= next[field];
}

type LoggedAt = Pick<TimeEntry, 'date' | 'createdAt'>;

const isLater = (a: LoggedAt, b: LoggedAt) => (a.date === b.date ? a.createdAt > b.createdAt : a.date > b.date);

/** Progress is cumulative: the latest entry gives the completion, and its gap if it has one. */
function takeProgress(target: AggregatedTask, latest: AggregatedTask): void {
  target.completionPct = latest.completionPct;
  target.gapPct = latest.gapPct;
  target.gapReason = latest.gapReason || target.gapReason;
  target.gapSolution = latest.gapSolution || target.gapSolution;
}

function mergeTask(target: AggregatedTask, next: AggregatedTask, nextIsLater: boolean): void {
  target.hours += next.hours;
  FIRST_NON_EMPTY.forEach((field) => fillIfEmpty(target, next, field));
  if (nextIsLater) takeProgress(target, next);
  else {
    target.gapReason ||= next.gapReason;
    target.gapSolution ||= next.gapSolution;
  }
}

/**
 * Aggregates the week's entries by task, summing hours. The completion of the
 * latest entry wins (progress is cumulative across days); a finished task has
 * no gap reason or solution. The first non-empty description / remark is kept.
 */
export function aggregateWeeklyTasks(entries: TimeEntry[]): AggregatedTask[] {
  const aggMap = new Map<string, AggregatedTask>();
  const latestAt = new Map<string, LoggedAt>();
  for (const entry of entries) {
    const rawName = (entry.taskName || '').trim();
    if (!rawName) continue;
    const key = normalizeTaskKey(rawName);
    const task = toTask(entry, key, rawName);
    const existing = aggMap.get(key);
    const nextIsLater = !existing || isLater(entry, latestAt.get(key)!);
    if (nextIsLater) latestAt.set(key, entry);
    if (existing) mergeTask(existing, task, nextIsLater);
    else aggMap.set(key, task);
  }
  const tasks = Array.from(aggMap.values());
  tasks.forEach((task) => {
    if (task.completionPct >= 100) task.gapReason = task.gapSolution = '';
  });
  return tasks.sort((a, b) => b.hours - a.hours);
}
