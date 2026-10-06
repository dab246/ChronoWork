/**
 * Single description of the weekly report sheet. Excel, ODS, PDF, CSV and
 * the copy-to-sheet HTML are all rendered from this model, so they stay
 * identical to the company template layout.
 */
import type { DayLog, Language, TimeEntry, UserSettings, WeeklyObjective, WeeklyReflections } from '../types';
import { getTranslations } from '../i18n';
import { formatHours, formatShortDate, getWeekNumber } from '../utils/dateUtils';
import { fileNamePart, safeUrl } from '../utils/security';
import { filterEntriesForDays, getWorkingAndOffDaysInfo } from '../utils/workdays';
import { aggregateWeeklyTasks } from './aggregate';

export const REPORT_COLORS = {
  banner: '#5226E0',
  header: '#ABB0F3',
  cell: '#E8E6E6',
  cellLight: '#F2F0F0',
  border: '#A9A9A9',
  borderDark: '#808080',
  link: '#1155CC',
  text: '#000000',
  white: '#FFFFFF',
} as const;

export type FontFamily = 'Arial' | 'Times New Roman';

export interface CellStyle {
  bg?: string;
  color: string;
  font: FontFamily;
  size: number; // pt
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  h: 'left' | 'center' | 'right';
  v: 'top' | 'middle' | 'bottom';
  wrap?: boolean;
  border?: string;
}

const C = REPORT_COLORS;
const base = { color: C.text, font: 'Arial' as FontFamily, size: 10, h: 'left' as const, v: 'middle' as const };

const STYLE_DEFS = {
  title: { ...base, size: 20, bold: true, h: 'center', wrap: true },
  employee: { ...base, size: 12, h: 'center' },
  infoLabel: { ...base, size: 12, bold: true, bg: C.cell },
  infoFill: { ...base, bg: C.cell },
  infoValue: { ...base, size: 12, bg: C.cell },
  banner: { ...base, size: 12, bold: true, color: C.white, bg: C.banner, h: 'center' },
  head: { ...base, bg: C.header, border: C.border, h: 'center', wrap: true },
  no: { ...base, bg: C.cell, border: C.border, h: 'center' },
  task: { ...base, font: 'Times New Roman', bg: C.cell, border: C.border, wrap: true },
  link: { ...base, color: C.link, underline: true, bg: C.cell, border: C.border, h: 'center' },
  center: { ...base, bg: C.cell, border: C.border, h: 'center', wrap: true },
  right: { ...base, bg: C.cell, border: C.border, h: 'right' },
  text: { ...base, bg: C.cell, border: C.border, wrap: true },
  footer: { ...base, italic: true, bg: C.cell, border: C.border },
  objNo: { ...base, bg: C.cellLight, border: C.border, h: 'center' },
  objText: { ...base, font: 'Times New Roman', bg: C.cellLight, border: C.border, h: 'center', wrap: true },
  refHead: { ...base, size: 11, italic: true, bg: C.header, border: C.borderDark, wrap: true },
  refBody: { ...base, size: 11, bg: C.cellLight, border: C.borderDark, wrap: true },
  signature: { ...base, size: 11, h: 'center', v: 'top' },
  blank: { ...base },
} satisfies Record<string, CellStyle>;

export type CellStyleKey = keyof typeof STYLE_DEFS;
export const REPORT_STYLES: Record<CellStyleKey, CellStyle> = STYLE_DEFS;

export interface ReportCell {
  col: number;
  value: string | number;
  /** Percentages are stored as fractions (0.9) like the template. */
  format?: 'pct2' | 'pct0';
  link?: string;
  style: CellStyleKey;
  colSpan?: number;
  rowSpan?: number;
}

export interface ReportRow {
  height: number; // pt
  cells: ReportCell[];
}

export interface ReportLogo {
  dataUrl: string;
  mime: 'image/png' | 'image/jpeg';
  width: number; // px in the sheet
  height: number;
}

export interface ReportSheet {
  sheetName: string;
  fileBase: string;
  /** Column widths in inches (A..I), taken from the template. */
  columns: number[];
  rows: ReportRow[];
  logo?: ReportLogo;
  lang: Language;
}

export const COLUMN_COUNT = 9;
const COLUMN_WIDTHS_IN = [0.83, 2.93, 2.72, 1.852, 1.302, 1.302, 1.89, 1.89, 3.955];
const MIN_TASK_ROWS = 22;
const MIN_OBJECTIVE_ROWS = 5;
/** Logo box of the template: 2.04in x 0.71in at 96 dpi */
const LOGO_BOX = { width: 196, height: 68 };

export interface ReportInput {
  weekDays: Date[];
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  objectives: WeeklyObjective[];
  reflections: WeeklyReflections;
  logoSize?: { width: number; height: number };
}

export function reportLanguage(settings: UserSettings): Language {
  return settings.reportLanguage ?? settings.language;
}

/** Approximate wrapped line count, used to size rows that hold long text. */
function lineCount(text: string, widthIn: number, sizePt: number): number {
  if (!text) return 1;
  const charsPerLine = Math.max(8, Math.floor((widthIn * 72) / (sizePt * 0.5)));
  return text.split('\n').reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

function textRowHeight(min: number, parts: Array<[string, number]>, sizePt = 10): number {
  const lines = Math.max(...parts.map(([text, col]) => lineCount(text, COLUMN_WIDTHS_IN[col], sizePt)));
  return Math.max(min, lines * sizePt * 1.25 + 6);
}

function buildLogo(settings: UserSettings, size?: { width: number; height: number }): ReportLogo | undefined {
  const dataUrl = settings.logoDataUrl;
  if (!dataUrl) return undefined;
  const mime = dataUrl.startsWith('data:image/jpeg') ? 'image/jpeg' : 'image/png';
  const ratio = size && size.height > 0 ? size.width / size.height : LOGO_BOX.width / LOGO_BOX.height;
  const width = Math.min(LOGO_BOX.width, Math.round(LOGO_BOX.height * ratio));
  return { dataUrl, mime, width, height: Math.round(width / ratio) };
}

export function buildReportSheet(input: ReportInput): ReportSheet {
  const { weekDays, settings, objectives, reflections } = input;
  const lang = reportLanguage(settings);
  const r = getTranslations(lang).reportDoc;

  const weekNum = getWeekNumber(weekDays[0]);
  const startStr = formatShortDate(weekDays[0]);
  const endStr = formatShortDate(weekDays[4]);
  const tasks = aggregateWeeklyTasks(filterEntriesForDays(input.entries, weekDays));
  const info = getWorkingAndOffDaysInfo(weekDays, input.dayLogs, settings);

  const rows: ReportRow[] = [];
  const push = (height: number, cells: ReportCell[] = []) => rows.push({ height, cells });

  // Rows 1-4: title, employee, days off, office days
  push(50.3, [{ col: 0, value: `${r.reportTitle}\n${r.weekFromTo(weekNum, startStr, endStr)}`, style: 'title', colSpan: 9 }]);
  push(25.5, [{ col: 0, value: r.employeeNameRole(settings.userName, settings.userRole), style: 'employee', colSpan: 9 }]);
  push(29.3, [
    { col: 0, value: r.daysOffLabel, style: 'infoLabel' },
    { col: 1, value: '', style: 'infoFill' },
    { col: 2, value: r.daysOffText(info.daysOffCount, info.daysOffDatesText), style: 'infoValue', colSpan: 2 },
  ]);
  push(22.5, [
    { col: 0, value: r.officeDaysLabel, style: 'infoLabel' },
    { col: 1, value: '', style: 'infoFill' },
    { col: 2, value: r.officeDaysText(info.officeDaysCount, info.officeDatesText), style: 'infoValue', colSpan: 2 },
  ]);
  push(17.3);

  // Rows 6-8: banner and table header
  push(30.8, [{ col: 0, value: r.completedWorkHeader, style: 'banner', colSpan: 9 }]);
  push(18, [
    { col: 0, value: r.colNo, style: 'head', rowSpan: 2 },
    { col: 1, value: r.colProject, style: 'head', rowSpan: 2 },
    { col: 2, value: r.colDesc, style: 'head', rowSpan: 2 },
    { col: 3, value: r.colTime, style: 'head', rowSpan: 2 },
    { col: 4, value: r.colResult, style: 'head', colSpan: 2 },
    { col: 6, value: r.colGap, style: 'head', colSpan: 2 },
    { col: 8, value: r.colRemark, style: 'head', rowSpan: 2 },
  ]);
  push(15.8, [
    { col: 4, value: r.colCompletion, style: 'head' },
    { col: 5, value: r.colGapPct, style: 'head' },
    { col: 6, value: r.colReason, style: 'head' },
    { col: 7, value: r.colSolution, style: 'head' },
  ]);

  // Task rows (at least 22 numbered rows, like the template)
  const taskRowCount = Math.max(MIN_TASK_ROWS, tasks.length);
  for (let i = 0; i < taskRowCount; i++) {
    const task = tasks[i];
    if (!task) {
      push(17, [
        { col: 0, value: i + 1, style: 'no' },
        { col: 1, value: '', style: 'task' },
        ...[2, 3, 4, 5, 6, 7, 8].map((col) => ({ col, value: '', style: 'text' as CellStyleKey })),
      ]);
      continue;
    }
    const url = safeUrl(task.url);
    const activity = task.activitiesDescription || (task.category ? r.activity[task.category] : '');
    push(
      textRowHeight(24, [
        [task.label, 1],
        [task.gapReason, 6],
        [task.gapSolution, 7],
        [task.remark, 8],
        [url ? '' : activity, 2],
      ]),
      [
        { col: 0, value: i + 1, style: 'no' },
        { col: 1, value: task.label, style: 'task' },
        url
          ? { col: 2, value: getTranslations(lang).common.link, link: url, style: 'link' }
          : { col: 2, value: activity, style: 'center' },
        { col: 3, value: `${formatHours(task.hours)}h`, style: 'right' },
        { col: 4, value: task.completionPct / 100, format: 'pct2', style: 'right' },
        task.gapPct > 0
          ? { col: 5, value: task.gapPct / 100, format: 'pct0', style: 'text' }
          : { col: 5, value: '', style: 'text' },
        { col: 6, value: task.gapReason, style: 'text' },
        { col: 7, value: task.gapSolution, style: 'text' },
        { col: 8, value: task.remark, style: 'text' },
      ]
    );
  }

  push(24, [
    { col: 0, value: '…', style: 'no' },
    { col: 1, value: r.reviewsFooter, style: 'footer' },
    ...[2, 3, 4, 5, 6, 7, 8].map((col) => ({ col, value: '', style: 'text' as CellStyleKey })),
  ]);
  push(17.3);

  // Objectives (B:C, D) and reflections (F:I)
  push(26.3, [
    { col: 0, value: r.objNo, style: 'banner' },
    { col: 1, value: r.objTitle, style: 'banner', colSpan: 2 },
    { col: 3, value: r.objNote, style: 'banner' },
    { col: 5, value: r.refWentWellTitle, style: 'refHead', colSpan: 4 },
  ]);
  const reflectionCells: Array<[string, CellStyleKey]> = [
    [reflections.wentWell, 'refBody'],
    [r.refChallengingTitle, 'refHead'],
    [reflections.challenging, 'refBody'],
    [r.refProposalTitle, 'refHead'],
    [reflections.proposal, 'refBody'],
  ];
  const objectiveRowCount = Math.max(MIN_OBJECTIVE_ROWS, objectives.length);
  for (let i = 0; i < objectiveRowCount; i++) {
    const obj = objectives[i];
    const reflection = reflectionCells[i];
    const cells: ReportCell[] = [
      { col: 0, value: i + 1, style: 'objNo' },
      { col: 1, value: obj?.task ?? '', style: 'objText', colSpan: 2 },
      { col: 3, value: obj?.note ?? '', style: 'objText' },
    ];
    if (reflection) cells.push({ col: 5, value: reflection[0], style: reflection[1], colSpan: 4 });
    const reflectionText = reflection && reflection[1] === 'refBody' ? reflection[0] : '';
    push(
      Math.max(
        textRowHeight(26.3, [[obj?.task ?? '', 1], [obj?.note ?? '', 3]]),
        lineCount(reflectionText, 9.04, 11) * 14 + 6
      ),
      cells
    );
  }

  push(13.5);
  push(12.8);
  push(62.3, [
    { col: 1, value: r.sigEmployee, style: 'signature', colSpan: 2 },
    { col: 6, value: r.sigManager, style: 'signature', colSpan: 2 },
  ]);

  const year = weekDays[0].getFullYear();
  return {
    sheetName: `Week ${weekNum} - ${year}`,
    fileBase: `Weekly_Report_Week_${weekNum}_${year}_${fileNamePart(settings.userName || 'employee')}`,
    columns: COLUMN_WIDTHS_IN,
    rows,
    logo: buildLogo(settings, input.logoSize),
    lang,
  };
}

/** Display text of a cell (percent formats applied). */
export function cellText(cell: ReportCell): string {
  if (typeof cell.value === 'number' && cell.format) {
    const pct = cell.value * 100;
    return cell.format === 'pct2' ? `${pct.toFixed(2)}%` : `${Math.round(pct)}%`;
  }
  return String(cell.value);
}

export interface GridSlot {
  cell?: ReportCell;
  /** Anchor cell when this slot is covered by a merge. */
  coveredBy?: ReportCell;
}

/** Expands rows into a full row x column grid, resolving merges. */
export function toGrid(sheet: ReportSheet): GridSlot[][] {
  const grid: GridSlot[][] = sheet.rows.map(() => Array.from({ length: COLUMN_COUNT }, () => ({})));
  sheet.rows.forEach((row, r) => {
    for (const cell of row.cells) {
      grid[r][cell.col] = { cell };
      for (let dr = 0; dr < (cell.rowSpan ?? 1); dr++) {
        for (let dc = 0; dc < (cell.colSpan ?? 1); dc++) {
          if ((dr || dc) && grid[r + dr]) grid[r + dr][cell.col + dc] = { coveredBy: cell };
        }
      }
    }
  });
  return grid;
}
