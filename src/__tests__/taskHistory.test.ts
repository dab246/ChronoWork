import { describe, expect, it } from 'vitest';
import type { TimeEntry } from '../types';
import { buildTaskSuggestions, clampProgress, filterTaskSuggestions, progressBounds } from '../utils/taskHistory';

let seq = 0;
function entry(partial: Partial<TimeEntry>): TimeEntry {
  seq += 1;
  return { id: `e${seq}`, date: '2026-10-05', taskName: 'Task', project: 'P', hours: 1, completionPct: 100, gapPct: 0, createdAt: seq, ...partial };
}

describe('buildTaskSuggestions', () => {
  const entries = [
    entry({ taskName: 'Audit Twake Mail security', date: '2026-10-05', hours: 2, completionPct: 30, project: 'tmail' }),
    entry({ taskName: 'audit twake  mail SECURITY', date: '2026-10-06', hours: 1, completionPct: 60, gapReason: 'Waiting' }),
    entry({ taskName: 'Review PRs', date: '2026-10-07', hours: 4 }),
  ];

  it('merges names that differ only by case or spacing, latest entry first', () => {
    const suggestions = buildTaskSuggestions(entries);
    expect(suggestions.map((s) => s.taskName)).toEqual(['Review PRs', 'audit twake  mail SECURITY']);
    expect(suggestions[1]).toMatchObject({ completionPct: 60, totalHours: 3, logCount: 2, lastDate: '2026-10-06', gapReason: 'Waiting' });
  });

  it('skips entries without a name', () => {
    expect(buildTaskSuggestions([entry({ taskName: '  ' })])).toEqual([]);
  });
});

describe('filterTaskSuggestions', () => {
  const suggestions = buildTaskSuggestions([
    entry({ taskName: 'Fix login (hotfix)', date: '2026-10-01' }),
    entry({ taskName: 'Write docs', date: '2026-10-02' }),
  ]);

  it('matches any part of the name, ignoring case', () => {
    expect(filterTaskSuggestions(suggestions, '  LOGIN ').map((s) => s.taskName)).toEqual(['Fix login (hotfix)']);
    expect(filterTaskSuggestions(suggestions, 'hotfix').map((s) => s.taskName)).toEqual(['Fix login (hotfix)']);
  });

  it('returns the most recent tasks for an empty query, up to the limit', () => {
    expect(filterTaskSuggestions(suggestions, '', 1).map((s) => s.taskName)).toEqual(['Write docs']);
  });
});

describe('progressBounds', () => {
  const mon = entry({ taskName: 'Build feature', date: '2026-10-05', completionPct: 40 });
  const tue = entry({ taskName: 'BUILD FEATURE', date: '2026-10-06', completionPct: 70 });
  const thu = entry({ taskName: 'build feature', date: '2026-10-08', completionPct: 90 });
  const entries = [thu, mon, tue];

  it('starts a new entry from the latest progress logged on or before its day', () => {
    expect(progressBounds(entries, 'Build Feature', { date: '2026-10-07' })).toMatchObject({
      min: 70,
      max: 90,
      previous: { pct: 70, date: '2026-10-06' },
      next: { pct: 90, date: '2026-10-08' },
      locked: false,
    });
  });

  it('counts entries already logged on the same day as earlier for a new entry', () => {
    expect(progressBounds(entries, 'build feature', { date: '2026-10-06' })).toMatchObject({ min: 70, max: 90 });
  });

  it('leaves the edited entry out and keeps it between its neighbours', () => {
    expect(progressBounds(entries, tue.taskName, { date: tue.date, createdAt: tue.createdAt, excludeId: tue.id })).toMatchObject({ min: 40, max: 90 });
  });

  it('locks the progress once the task reached 100%', () => {
    const done = [...entries, entry({ taskName: 'Build feature', date: '2026-10-09', completionPct: 100 })];
    expect(progressBounds(done, 'build feature', { date: '2026-10-12' })).toMatchObject({ min: 100, max: 100, locked: true });
  });

  it('has no bounds for an unknown or empty name', () => {
    expect(progressBounds(entries, 'Something else', { date: '2026-10-07' })).toMatchObject({ min: 0, max: 100, locked: false });
    expect(progressBounds(entries, '   ', { date: '2026-10-07' })).toMatchObject({ min: 0, max: 100 });
  });

  it('never returns an upper bound below the lower bound for non-monotonic history', () => {
    const odd = [entry({ taskName: 'X', date: '2026-10-05', completionPct: 80 }), entry({ taskName: 'X', date: '2026-10-07', completionPct: 50 })];
    expect(progressBounds(odd, 'X', { date: '2026-10-06' })).toMatchObject({ min: 80, max: 80 });
  });
});

describe('clampProgress', () => {
  it('keeps the value inside the bounds', () => {
    expect(clampProgress(20, { min: 40, max: 90 })).toBe(40);
    expect(clampProgress(95, { min: 40, max: 90 })).toBe(90);
    expect(clampProgress(60, { min: 40, max: 90 })).toBe(60);
  });
});
