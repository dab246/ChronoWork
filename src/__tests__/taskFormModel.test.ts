import { describe, expect, it } from 'vitest';
import { initialState, toDraft, validationError } from '../components/taskFormModel';
import type { TimeEntry } from '../types';

const messages = { taskRequired: 'task', hoursInvalid: 'hours', linkInvalid: 'link' };
const valid = { ...initialState(null, '2026-10-06'), taskName: 'Fix login', hours: '2' };

describe('validationError', () => {
  it('accepts a valid form', () => {
    expect(validationError(valid, messages)).toBe('');
  });

  it.each([
    [{ taskName: '   ' }, 'task'],
    [{ hours: '0.2' }, 'hours'],
    [{ hours: '24.5' }, 'hours'],
    [{ hours: 'abc' }, 'hours'],
    [{ hours: 'Infinity' }, 'hours'],
    [{ githubUrl: 'javascript:alert(1)' }, 'link'],
    [{ taskName: '', hours: '99' }, 'task'],
  ])('rejects %o with %s', (patch, expected) => {
    expect(validationError({ ...valid, ...patch }, messages)).toBe(expected);
  });

  it('accepts the hour bounds', () => {
    expect(validationError({ ...valid, hours: '0.25' }, messages)).toBe('');
    expect(validationError({ ...valid, hours: '24' }, messages)).toBe('');
  });
});

describe('toDraft', () => {
  it('drops gap fields when the task is complete', () => {
    const draft = toDraft({ ...valid, gapReason: 'old', gapSolution: 'old' });
    expect(draft).toMatchObject({ completionPct: 100, gapPct: 0, isCompleted: true, gapReason: undefined, gapSolution: undefined, durationMinutes: 120 });
  });

  it('keeps trimmed gap fields and the GitHub number only with a link', () => {
    const draft = toDraft({ ...valid, completionPct: 70, gapReason: '  review ', githubNumber: 12, githubUrl: '' });
    expect(draft).toMatchObject({ gapPct: 30, gapReason: 'review', isCompleted: false, githubNumber: undefined, githubUrl: undefined });
  });
});

describe('initialState', () => {
  it('fills the form from an entry, falling back to notes for the remark', () => {
    const entry: TimeEntry = { id: '1', date: '2026-10-01', taskName: 'T', project: 'P', hours: 3, completionPct: 80, gapPct: 20, createdAt: 0, notes: 'n' };
    expect(initialState(entry, '2026-10-06')).toMatchObject({ date: '2026-10-01', hours: '3', remark: 'n', category: 'development', githubUrl: '' });
  });
});
