import { describe, expect, it } from 'vitest';
import { applyTemplate, initialState, toDraft, validationError } from '../components/taskFormModel';
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

describe('templates (continuing a task)', () => {
  const source: TimeEntry = {
    id: 's',
    date: '2026-10-05',
    taskName: 'Build feature',
    project: 'P',
    category: 'bugfix',
    hours: 3,
    githubUrl: 'https://github.com/o/r/pull/7',
    githubNumber: 7,
    description: 'Tests',
    completionPct: 60,
    gapPct: 40,
    gapReason: 'Review',
    remark: 'only that day',
    createdAt: 1,
  };

  it('prefills a new entry on another day, without the day-specific remark', () => {
    expect(initialState(null, '2026-10-06', source)).toMatchObject({
      date: '2026-10-06',
      taskName: 'Build feature',
      project: 'P',
      category: 'bugfix',
      hours: '3',
      githubUrl: 'https://github.com/o/r/pull/7',
      githubNumber: 7,
      description: 'Tests',
      completionPct: 60,
      gapReason: 'Review',
      remark: '',
    });
  });

  it('keeps the typed hours when the template has none (picked suggestion)', () => {
    const form = applyTemplate({ ...valid, hours: '2', githubUrl: 'https://old' }, { taskName: 'X', project: 'Q' });
    expect(form).toMatchObject({ taskName: 'X', project: 'Q', hours: '2', githubUrl: '' });
  });

  it('ignores the template when editing', () => {
    expect(initialState(source, '2026-10-09', { taskName: 'Other', project: '' }).taskName).toBe('Build feature');
  });
});

describe('toDraft progress bounds', () => {
  it('cannot go below the progress already logged nor above a later one', () => {
    expect(toDraft({ ...valid, completionPct: 20 }, { min: 50, max: 90 })).toMatchObject({ completionPct: 50, gapPct: 50 });
    expect(toDraft({ ...valid, completionPct: 100 }, { min: 50, max: 90 })).toMatchObject({ completionPct: 90, isCompleted: false });
  });

  it('stays at 100% once the task was finished', () => {
    expect(toDraft({ ...valid, completionPct: 40 }, { min: 100, max: 100 })).toMatchObject({ completionPct: 100, isCompleted: true });
  });
});
