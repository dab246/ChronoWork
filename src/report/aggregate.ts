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
    const existing = aggMap.get(key);
    const remark = entry.remark || entry.notes || '';

    if (!existing) {
      const completion = entry.completionPct ?? 100;
      aggMap.set(key, {
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
        remark,
      });
      continue;
    }

    existing.hours += entryHours(entry);
    existing.url ||= entry.githubUrl;
    existing.activitiesDescription ||= (entry.description || '').trim();
    existing.category ||= entry.category;
    existing.gapReason ||= entry.gapReason || '';
    existing.gapSolution ||= entry.gapSolution || '';
    existing.remark ||= remark;
    if (entry.completionPct !== undefined && entry.completionPct < existing.completionPct) {
      existing.completionPct = entry.completionPct;
      existing.gapPct = 100 - entry.completionPct;
    }
  }

  return Array.from(aggMap.values()).sort((a, b) => b.hours - a.hours);
}
