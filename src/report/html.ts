import { csvCell, escapeHtml, neutralizeSpreadsheetCell, tsvCell } from '../utils/security';
import { REPORT_STYLES, cellText, toGrid, type CellStyle, type GridSlot, type ReportCell, type ReportSheet } from './model';

const PX_PER_IN = 96;

const FONT_STACK = { Arial: 'Arial, sans-serif', 'Times New Roman': "'Times New Roman', serif" } as const;
const MSO_FORMAT = { pct2: "mso-number-format:'0.00%'", pct0: "mso-number-format:'0%'" } as const;

/** `on` when the flag is set, otherwise `off` (empty declarations are dropped). */
const either = (flag: unknown, on: string, off = '') => (flag ? on : off);

function cssFor(style: CellStyle, height?: number): string {
  return [
    `font-family:${FONT_STACK[style.font]}`,
    `font-size:${style.size}pt`,
    `color:${style.color}`,
    either(style.bg, `background-color:${style.bg}`),
    either(style.bold, 'font-weight:bold', 'font-weight:normal'),
    either(style.italic, 'font-style:italic'),
    either(style.underline, 'text-decoration:underline'),
    `text-align:${style.h}`,
    `vertical-align:${style.v}`,
    either(style.wrap, 'white-space:normal', 'white-space:nowrap'),
    either(style.border, `border:0.5pt solid ${style.border}`, 'border:none'),
    either(height, `height:${height}pt`),
    'padding:2px 4px',
  ]
    .filter(Boolean)
    .join(';');
}

function cellContent(cell: ReportCell): string {
  const text = neutralizeSpreadsheetCell(cellText(cell));
  const html = escapeHtml(text).replace(/\n/g, '<br/>');
  if (!cell.link) return html;
  return `<a href="${escapeHtml(cell.link)}" style="color:${REPORT_STYLES.link.color};text-decoration:underline">${html}</a>`;
}

function spanAttrs(cell: ReportCell): string {
  const colSpan = cell.colSpan ?? 1;
  const rowSpan = cell.rowSpan ?? 1;
  return either(colSpan > 1, ` colspan="${colSpan}"`) + either(rowSpan > 1, ` rowspan="${rowSpan}"`);
}

function logoHtml(sheet: ReportSheet): string {
  const logo = sheet.logo;
  return logo ? `<img src="${escapeHtml(logo.dataUrl)}" width="${logo.width}" height="${logo.height}" alt="" style="float:left">` : '';
}

function filledCellHtml(cell: ReportCell, height: number, prefix: string): string {
  const css = [cssFor(REPORT_STYLES[cell.style], height), either(cell.format, MSO_FORMAT[cell.format!])].filter(Boolean).join(';');
  const num = either(cell.format, ` x:num="${cell.value}"`);
  return `<td${spanAttrs(cell)} style="${css}"${num}>${prefix}${cellContent(cell)}</td>`;
}

function slotHtml(slot: GridSlot, height: number, prefix: string): string {
  if (slot.coveredBy) return '';
  if (slot.cell) return filledCellHtml(slot.cell, height, prefix);
  return `<td style="${cssFor(REPORT_STYLES.blank, height)}">${prefix}</td>`;
}

/** Rich HTML table for the clipboard: pasting into Excel / Calc / Sheets keeps colors, merges and links. */
export function renderHtml(sheet: ReportSheet): string {
  const totalWidth = Math.round(sheet.columns.reduce((a, b) => a + b, 0) * PX_PER_IN);
  const cols = sheet.columns.map((w) => `<col width="${Math.round(w * PX_PER_IN)}" style="width:${Math.round(w * PX_PER_IN)}px">`).join('');
  const logo = logoHtml(sheet);

  const rows = toGrid(sheet)
    .map((slots, r) => {
      const height = sheet.rows[r].height;
      const cells = slots.map((slot, c) => slotHtml(slot, height, r + c === 0 ? logo : '')).join('');
      return `<tr style="height:${height}pt">${cells}</tr>`;
    })
    .join('');

  return (
    '<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>' +
    `<table border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;table-layout:fixed;width:${totalWidth}px">${cols}${rows}</table>` +
    '</body></html>'
  );
}

function gridValues(sheet: ReportSheet): string[][] {
  return toGrid(sheet).map((slots) => slots.map((slot) => (slot.cell ? cellText(slot.cell) : '')));
}

/** Plain TSV fallback (and the text/plain clipboard flavour). */
export function renderTsv(sheet: ReportSheet): string {
  return gridValues(sheet)
    .map((row) => row.map(tsvCell).join('\t'))
    .join('\n');
}

export function renderCsv(sheet: ReportSheet): string {
  const body = gridValues(sheet)
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
  return `\uFEFF${body}`;
}
