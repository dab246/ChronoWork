import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import type { TimeEntry, UserSettings } from '../types';
import { DEFAULT_SETTINGS } from '../utils/storage';
import { getWeekDays } from '../utils/dateUtils';
import { buildReportSheet, cellText, reportLanguage, toGrid } from '../report/model';
import { renderCsv, renderHtml, renderTsv } from '../report/html';
import { renderOds } from '../report/ods';
import { aggregateWeeklyTasks } from '../report/aggregate';

const monday = new Date(2026, 8, 21); // Week 39, 21/09 - 25/09
const weekDays = getWeekDays(monday);
const settings: UserSettings = { ...DEFAULT_SETTINGS, userName: 'Jane Doe', userRole: 'Engineer', language: 'en' };

function entry(partial: Partial<TimeEntry>): TimeEntry {
  return {
    id: Math.random().toString(36),
    date: '2026-09-21',
    taskName: 'Task',
    project: 'P',
    hours: 1,
    completionPct: 100,
    gapPct: 0,
    createdAt: 0,
    ...partial,
  };
}

const entries = [
  entry({ taskName: 'Build feature #1', hours: 4, githubUrl: 'https://github.com/o/r/pull/1', completionPct: 90, gapReason: 'Waiting review' }),
  entry({ taskName: 'Build feature #1', hours: 6, date: '2026-09-22' }),
  entry({ taskName: '<img src=x onerror=alert(1)>', hours: 1 }),
  entry({ taskName: '=HYPERLINK("http://evil","x")', hours: 1 }),
];

const input = { weekDays, entries, dayLogs: {}, settings, objectives: [], reflections: { wentWell: 'Good', challenging: '', proposal: '' } };

describe('aggregateWeeklyTasks', () => {
  it('sums hours of the same task and keeps the lowest completion', () => {
    const [first] = aggregateWeeklyTasks(entries);
    expect(first.label).toBe('Build feature #1');
    expect(first.hours).toBe(10);
    expect(first.completionPct).toBe(90);
  });
});

describe('report sheet model (company template layout)', () => {
  const sheet = buildReportSheet(input);
  const grid = toGrid(sheet);

  it('has the template header texts', () => {
    expect(sheet.sheetName).toBe('Week 39 - 2026');
    expect(cellText(grid[0][0].cell!)).toBe('WEEKLY REPORT\nWeek 39 from 21/09 to 25/09');
    expect(cellText(grid[1][0].cell!)).toBe('Employee’s name: Jane Doe   Title: Engineer');
    expect(cellText(grid[2][0].cell!)).toBe('Your days off this week:');
    expect(cellText(grid[3][2].cell!)).toBe('Number 5 Date: 21/09 → 25/09');
    expect(cellText(grid[5][0].cell!)).toBe('COMPLETED WORK');
  });

  it('stores completion as a percentage and links the task', () => {
    const row = grid[8];
    expect(row[2].cell).toMatchObject({ value: 'Link', link: 'https://github.com/o/r/pull/1' });
    expect(row[3].cell?.value).toBe('10h');
    expect(row[4].cell).toMatchObject({ value: 0.9, format: 'pct2' });
    expect(cellText(row[4].cell!)).toBe('90.00%');
    expect(cellText(row[5].cell!)).toBe('10%');
  });

  it('leaves the description empty when none was logged, whatever the category', () => {
    const sheetNoDesc = buildReportSheet({ ...input, entries: [entry({ taskName: 'Plain task', category: 'development' })] });
    expect(toGrid(sheetNoDesc)[8][2].cell?.value).toBe('');
  });

  it('keeps 22 numbered task rows, then the objectives block', () => {
    const footerRow = grid.findIndex((row) => row[1].cell?.value === 'Reviews, meetings, support, community, …');
    expect(footerRow).toBe(8 + 22);
    const objHeader = grid[footerRow + 2];
    expect(objHeader[1].cell).toMatchObject({ value: 'OBJECTIVE FOR  NEXT WEEK', colSpan: 2 });
    expect(objHeader[5].cell).toMatchObject({ colSpan: 4, style: 'refHead' });
    expect(grid[footerRow + 3][5].cell?.value).toBe('Good');
  });
});

describe('reportLanguage', () => {
  it('defaults to English, not the interface language', () => {
    expect(reportLanguage({ ...settings, language: 'vi', reportLanguage: undefined })).toBe('en');
    expect(cellText(toGrid(buildReportSheet({ ...input, settings: { ...settings, language: 'fr' } }))[5][0].cell!)).toBe('COMPLETED WORK');
  });

  it('uses the language chosen in Settings', () => {
    expect(reportLanguage({ ...settings, language: 'en', reportLanguage: 'vi' })).toBe('vi');
  });
});

describe('exports', () => {
  const sheet = buildReportSheet(input);

  it('escapes HTML in the clipboard table', () => {
    const html = renderHtml(sheet);
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).toContain('background-color:#5226E0');
  });

  it('neutralizes formulas in CSV and TSV', () => {
    expect(renderCsv(sheet)).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect(renderTsv(sheet)).toContain(`'=HYPERLINK("http://evil","x")`);
  });

  it('writes a valid, styled ODS package', async () => {
    const blob = await renderOds(sheet, 'Jane');
    const zip = await JSZip.loadAsync(blob);
    expect(Object.keys(zip.files)[0]).toBe('mimetype');
    expect(await zip.file('mimetype')!.async('string')).toBe('application/vnd.oasis.opendocument.spreadsheet');
    const content = await zip.file('content.xml')!.async('string');
    const doc = new DOMParser().parseFromString(content, 'application/xml');
    expect(doc.getElementsByTagName('parsererror')).toHaveLength(0);
    expect(content).toContain('fo:background-color="#5226E0"');
    expect(content).toContain('office:value-type="percentage" office:value="0.9"');
    expect(content).toContain('table:number-columns-spanned="9"');
    expect(content).toContain('&lt;img src=x');
  });
});
