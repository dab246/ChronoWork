import { describe, expect, it } from 'vitest';
import { parseRoute, routeHash } from '../routing';
import { parseRepos } from '../components/settings/settingsModel';

describe('parseRoute', () => {
  it.each([
    ['', { page: 'daily' }],
    ['#', { page: 'daily' }],
    ['#/timesheet', { page: 'timesheet' }],
    ['#/settings', { page: 'settings', section: 'profile' }],
    ['#/settings/reminder', { page: 'settings', section: 'reminder' }],
    ['#/settings/unknown', { page: 'settings', section: 'profile' }],
    ['#/nope', { page: 'daily' }],
    ['#/__proto__', { page: 'daily' }],
  ])('%s → %o', (hash, route) => {
    expect(parseRoute(hash)).toEqual(route);
  });

  it('round-trips through routeHash', () => {
    expect(parseRoute(routeHash({ page: 'settings', section: 'data' }))).toEqual({ page: 'settings', section: 'data' });
    expect(routeHash({ page: 'report' })).toBe('#/report');
  });
});

describe('parseRepos', () => {
  it('keeps valid owner/repo entries and reports the others', () => {
    expect(parseRepos(' a/b, bad repo ,c-d/e.f,, x ')).toEqual({ repos: ['a/b', 'c-d/e.f'], invalid: ['bad repo', 'x'] });
  });

  it('keeps at most 20 repositories', () => {
    expect(parseRepos(Array.from({ length: 25 }, (_, i) => `o/r${i}`).join(',')).repos).toHaveLength(20);
  });
});
