import { beforeEach, describe, expect, it } from 'vitest';
import {
  exportAllDataJson,
  getStoredEntries,
  getStoredSettings,
  importAllDataJson,
  saveStoredEntries,
  saveStoredSettings,
  sanitizeEntry,
  DEFAULT_SETTINGS,
} from '../utils/storage';

const validEntry = {
  id: 't1',
  date: '2026-10-05',
  taskName: 'Fix login',
  project: 'Web',
  hours: 2,
  completionPct: 80,
  gapPct: 20,
  createdAt: 1,
};

beforeEach(() => localStorage.clear());

describe('sanitizeEntry', () => {
  it('strips dangerous links and clamps numbers', () => {
    const entry = sanitizeEntry({ ...validEntry, githubUrl: 'javascript:alert(1)', hours: 99, completionPct: -5 });
    expect(entry?.githubUrl).toBeUndefined();
    expect(entry?.hours).toBe(24);
    expect(entry?.completionPct).toBe(0);
    expect(entry?.gapPct).toBe(100);
  });

  it.each([{ ...validEntry, date: '2026-13-40' }, { ...validEntry, taskName: '' }, { ...validEntry, taskName: 42 }, null, 'x'])(
    'drops invalid entry %#',
    (raw) => {
      expect(sanitizeEntry(raw)).toBeNull();
    }
  );
});

describe('backup import / export', () => {
  it('never exports the GitHub token', () => {
    saveStoredSettings({ ...DEFAULT_SETTINGS, githubToken: 'github_pat_secret' });
    expect(exportAllDataJson()).not.toContain('github_pat_secret');
  });

  it('keeps the local token and ignores a token in the backup', () => {
    saveStoredSettings({ ...DEFAULT_SETTINGS, githubToken: 'mine' });
    const result = importAllDataJson(JSON.stringify({ settings: { userName: 'A', githubToken: 'attacker' }, entries: [validEntry] }));
    expect(result).toEqual({ ok: true, entries: 1 });
    expect(getStoredSettings().githubToken).toBe('mine');
    expect(getStoredSettings().userName).toBe('A');
  });

  it('rejects a malformed file without touching existing data', () => {
    saveStoredEntries([sanitizeEntry(validEntry)!]);
    expect(importAllDataJson('{"entries": "nope"}')).toEqual({ ok: false, reason: 'invalid' });
    expect(importAllDataJson('not json')).toEqual({ ok: false, reason: 'invalid' });
    expect(getStoredEntries()).toHaveLength(1);
  });

  it('does not pollute Object.prototype', () => {
    importAllDataJson('{"__proto__": {"polluted": true}, "entries": [], "settings": {"__proto__": {"polluted": true}}}');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('sanitizes imported entries', () => {
    importAllDataJson(JSON.stringify({ entries: [{ ...validEntry, githubUrl: 'javascript:alert(1)' }, { bad: true }] }));
    const entries = getStoredEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].githubUrl).toBeUndefined();
  });
});
