import { csvCell, escapeHtml, neutralizeSpreadsheetCell, tsvCell } from '../utils/security';
import { REPORT_STYLES, cellText, toGrid, type CellStyle, type ReportCell, type ReportSheet } from './model';

const PX_PER_IN = 96;

function cssFor(style: CellStyle, height?: number): string {
  return [
    `font-family:${style.font === 'Arial' ? 'Arial, sans-serif' : "'Times New Roman', serif"}`,
    `font-size:${style.size}pt`,
    `color:${style.color}`,
    style.bg ? `background-color:${style.bg}` : '',
    style.bold ? 'font-weight:bold' : 'font-weight:normal',
    style.italic ? 'font-style:italic' : '',
    style.underline ? 'text-decoration:underline' : '',
    `text-align:${style.h}`,
    `vertical-align:${style.v}`,
    style.wrap ? 'white-space:normal' : 'white-space:nowrap',
    style.border ? `border:0.5pt solid ${style.border}` : 'border:none',
    height ? `height:${height}pt` : '',
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

const MSO_FORMAT = { pct2: "mso-number-format:'0.00%'", pct0: "mso-number-format:'0%'" } as const;

/** Rich HTML table for the clipboard: pasting into Excel / Calc / Sheets keeps colors, merges and links. */
export function renderHtml(sheet: ReportSheet): string {
  const grid = toGrid(sheet);
  const totalWidth = Math.round(sheet.columns.reduce((a, b) => a + b, 0) * PX_PER_IN);
  const cols = sheet.columns.map((w) => `<col width="${Math.round(w * PX_PER_IN)}" style="width:${Math.round(w * PX_PER_IN)}px">`).join('');

  const rows = grid
    .map((slots, r) => {
      const height = sheet.rows[r].height;
      const cells = slots
        .map((slot, c) => {
          if (slot.coveredBy) return '';
          const cell = slot.cell;
          const style = cell ? REPORT_STYLES[cell.style] : REPORT_STYLES.blank;
          const spans = cell
            ? `${(cell.colSpan ?? 1) > 1 ? ` colspan="${cell.colSpan}"` : ''}${(cell.rowSpan ?? 1) > 1 ? ` rowspan="${cell.rowSpan}"` : ''}`
            : '';
          const logo =
            r === 0 && c === 0 && sheet.logo
              ? `<img src="${escapeHtml(sheet.logo.dataUrl)}" width="${sheet.logo.width}" height="${sheet.logo.height}" alt="" style="float:left">`
              : '';
          const css = [cssFor(style, height), cell?.format ? MSO_FORMAT[cell.format] : ''].filter(Boolean).join(';');
          const num = cell?.format ? ` x:num="${cell.value}"` : '';
          return `<td${spans} style="${css}"${num}>${logo}${cell ? cellContent(cell) : ''}</td>`;
        })
        .join('');
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
