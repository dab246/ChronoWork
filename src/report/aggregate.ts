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
const FIRST_NON_EMPTY = ['url', 'activitiesDescription', 'category', 'gapReason', 'gapSolution', 'remark'] as const;

function fillIfEmpty<K extends keyof AggregatedTask>(target: AggregatedTask, next: AggregatedTask, field: K): void {
  target[field] ||= next[field];
}

function mergeTask(target: AggregatedTask, next: AggregatedTask): void {
  target.hours += next.hours;
  FIRST_NON_EMPTY.forEach((field) => fillIfEmpty(target, next, field));
  if (next.completionPct < target.completionPct) {
    target.completionPct = next.completionPct;
    target.gapPct = next.gapPct;
  }
}

/**
 * Aggregates the week's entries by task, summing hours. The lowest completion
 * wins, and the first non-empty description / reason / solution / remark is kept.
 */
export function aggregateWeeklyTasks(entries: TimeEntry[]): AggregatedTask[] {
  const aggMap = new Map<string, AggregatedTask>();
  for (const entry of entries) {
    const rawName = (entry.taskName || '').trim();
    if (!rawName) continue;
    const key = normalizeTaskKey(rawName);
    const task = toTask(entry, key, rawName);
    const existing = aggMap.get(key);
    if (existing) mergeTask(existing, task);
    else aggMap.set(key, task);
  }
  return Array.from(aggMap.values()).sort((a, b) => b.hours - a.hours);
}
