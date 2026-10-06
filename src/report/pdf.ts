import { jsPDF } from 'jspdf';
import regularFontUrl from '@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf?url';
import boldFontUrl from '@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf?url';
import italicFontUrl from '@expo-google-fonts/plus-jakarta-sans/400Regular_Italic/PlusJakartaSans_400Regular_Italic.ttf?url';
import { REPORT_STYLES, cellText, type CellStyle, type ReportCell, type ReportLogo, type ReportSheet } from './model';

const FONT = 'PlusJakartaSans';
const PAGE = { width: 297, height: 210, margin: 8 }; // A4 landscape, mm
const PT_TO_MM = 0.3528;
const FONT_SCALE = 0.72; // template sizes are for a ~47cm wide sheet
const BASE_PADDING = 1.2;

let fontCache: Promise<Record<'normal' | 'bold' | 'italic', string>> | null = null;

async function toBase64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/** Unicode font (Vietnamese / French accents); the built-in Helvetica cannot render them. */
function loadFonts() {
  fontCache ??= Promise.all([toBase64(regularFontUrl), toBase64(boldFontUrl), toBase64(italicFontUrl)]).then(
    ([normal, bold, italic]) => ({ normal, bold, italic })
  );
  return fontCache;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const fontStyle = (style: CellStyle) => (style.bold ? 'bold' : style.italic ? 'italic' : 'normal');
/** Uniform zoom applied so the whole sheet fits on one page when possible. */
let zoom = 1;
const MIN_ZOOM = 0.62;

const pad = () => BASE_PADDING * zoom;
const fontSize = (style: CellStyle) => style.size * FONT_SCALE * zoom;
const lineHeight = (style: CellStyle) => fontSize(style) * PT_TO_MM * 1.25;

function wrapLines(doc: jsPDF, cell: ReportCell, width: number): string[] {
  const style = REPORT_STYLES[cell.style];
  doc.setFont(FONT, fontStyle(style));
  doc.setFontSize(fontSize(style));
  const text = cellText(cell);
  if (!text) return [];
  return style.wrap ? doc.splitTextToSize(text, Math.max(4, width - pad() * 2)) : text.split('\n');
}

interface Layout {
  colX: number[];
  colW: number[];
  rowH: number[];
  scale: number;
}

function computeLayout(doc: jsPDF, sheet: ReportSheet): Layout {
  const usable = (PAGE.width - PAGE.margin * 2) * zoom;
  const left = (PAGE.width - usable) / 2;
  const totalIn = sheet.columns.reduce((a, b) => a + b, 0);
  const colW = sheet.columns.map((w) => (w / totalIn) * usable);
  const colX = colW.map((_, i) => left + colW.slice(0, i).reduce((a, b) => a + b, 0));
  const scale = usable / (totalIn * 25.4);

  const rowH = sheet.rows.map((row) => {
    const singleRowCells = row.cells.filter((cell) => (cell.rowSpan ?? 1) === 1);
    const textHeights = singleRowCells.map((cell) => {
      const width = colW.slice(cell.col, cell.col + (cell.colSpan ?? 1)).reduce((a, b) => a + b, 0);
      return wrapLines(doc, cell, width).length * lineHeight(REPORT_STYLES[cell.style]) + pad() * 2;
    });
    return Math.max(row.height * PT_TO_MM * 0.62 * zoom, ...textHeights);
  });
  return { colX, colW, rowH, scale };
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const spanWidth = (layout: Layout, cell: ReportCell) => sum(layout.colW.slice(cell.col, cell.col + (cell.colSpan ?? 1)));

function drawCellBox(doc: jsPDF, cell: ReportCell, { x, y, w, h }: Rect) {
  const style = REPORT_STYLES[cell.style];
  if (style.bg) {
    doc.setFillColor(...hexToRgb(style.bg));
    doc.rect(x, y, w, h, 'F');
  }
  if (style.border) {
    doc.setDrawColor(...hexToRgb(style.border));
    doc.setLineWidth(0.15);
    doc.rect(x, y, w, h, 'S');
  }
}

/** Shrinks non-wrapping text that is wider than the space it may overflow into. */
function fitFontSize(doc: jsPDF, style: CellStyle, lines: string[], overflowW: number): number {
  const size = fontSize(style);
  if (style.wrap) return size;
  const widest = Math.max(...lines.map((line) => doc.getTextWidth(line)));
  const available = overflowW - pad() * 2;
  if (widest <= available) return size;
  const fitted = (size * available) / widest;
  doc.setFontSize(fitted);
  return fitted;
}

const FIRST_BASELINE: Record<CellStyle['v'], (rect: Rect, blockH: number, lh: number) => number> = {
  top: (rect, _blockH, lh) => rect.y + pad() + lh * 0.8,
  middle: (rect, blockH, lh) => rect.y + (rect.h - blockH) / 2 + lh * 0.8,
  bottom: (rect, blockH, lh) => rect.y + rect.h - pad() - blockH + lh * 0.8,
};

const TEXT_X: Record<CellStyle['h'], (rect: Rect) => number> = {
  left: (rect) => rect.x + pad(),
  center: (rect) => rect.x + rect.w / 2,
  right: (rect) => rect.x + rect.w - pad(),
};

/** Start of a text line drawn at `tx` with the given alignment. */
const LINE_START: Record<CellStyle['h'], (tx: number, width: number) => number> = {
  left: (tx) => tx,
  center: (tx, width) => tx - width / 2,
  right: (tx, width) => tx - width,
};

function drawUnderline(doc: jsPDF, style: CellStyle, line: string, [tx, baseline]: [number, number]) {
  const width = doc.getTextWidth(line);
  const startX = LINE_START[style.h](tx, width);
  doc.setDrawColor(...hexToRgb(style.color));
  doc.setLineWidth(0.15);
  doc.line(startX, baseline + 0.5, startX + width, baseline + 0.5);
}

/**
 * Draws the text of a cell. Non-wrapping text may overflow into the empty
 * cells on its right (like a spreadsheet) and is shrunk if it still does not fit.
 */
function drawCellText(doc: jsPDF, cell: ReportCell, rect: Rect, overflowW: number) {
  const style = REPORT_STYLES[cell.style];
  const lines = wrapLines(doc, cell, rect.w);
  if (!lines.length) return;

  const lh = fitFontSize(doc, style, lines, overflowW) * PT_TO_MM * 1.25;
  const firstBaseline = FIRST_BASELINE[style.v](rect, lines.length * lh, lh);
  const tx = TEXT_X[style.h](rect);

  doc.setTextColor(...hexToRgb(style.color));
  lines.forEach((line, i) => {
    const baseline = firstBaseline + i * lh;
    doc.text(line, tx, baseline, { align: style.h });
    if (style.underline) drawUnderline(doc, style, line, [tx, baseline]);
  });
  if (cell.link) doc.link(rect.x, rect.y, rect.w, rect.h, { url: cell.link });
}

/** Columns of a row that hold a non-empty cell (other than `cell`). */
function occupiedColumns(row: ReportSheet['rows'][number], cell: ReportCell): Set<number> {
  const others = row.cells.filter((c) => c !== cell && c.value !== '');
  return new Set(others.flatMap((c) => Array.from({ length: c.colSpan ?? 1 }, (_, i) => c.col + i)));
}

/** Width a left-aligned, non-wrapping cell may use: itself plus the empty cells to its right. */
function overflowWidth(sheet: ReportSheet, rowIndex: number, cell: ReportCell, layout: Layout): number {
  const own = spanWidth(layout, cell);
  if (REPORT_STYLES[cell.style].h !== 'left') return own;
  const occupied = occupiedColumns(sheet.rows[rowIndex], cell);
  const start = cell.col + (cell.colSpan ?? 1);
  const firstBlocked = layout.colW.findIndex((_, col) => col >= start && occupied.has(col));
  const end = firstBlocked === -1 ? layout.colW.length : firstBlocked;
  return own + sum(layout.colW.slice(start, end));
}

/** Rows that start a vertical merge are kept on the same page as the rows they span. */
function groupEnd(sheet: ReportSheet, r: number): number {
  return sheet.rows[r].cells.reduce((end, cell) => Math.max(end, r + (cell.rowSpan ?? 1) - 1), r);
}

interface Placement {
  page: number;
  y: number;
}

/** Page and y position of every row. */
function paginate(sheet: ReportSheet, layout: Layout): Placement[] {
  const bottom = PAGE.height - PAGE.margin;
  const placement: Placement[] = [];
  let page = 1;
  let y = PAGE.margin;
  sheet.rows.forEach((_, r) => {
    const groupHeight = sum(layout.rowH.slice(r, groupEnd(sheet, r) + 1));
    const overflows = y + groupHeight > bottom;
    if (overflows && y > PAGE.margin) {
      page++;
      y = PAGE.margin;
    }
    placement[r] = { page, y };
    y += layout.rowH[r];
  });
  return placement;
}

function drawLogo(doc: jsPDF, logo: ReportLogo, layout: Layout, top: number) {
  const ratio = logo.height / logo.width;
  const maxWidth = (layout.rowH[0] - 2) / ratio;
  const w = Math.min((logo.width / 96) * 25.4 * layout.scale * 1.35, maxWidth);
  doc.setPage(1);
  doc.addImage(logo.dataUrl, logo.mime === 'image/jpeg' ? 'JPEG' : 'PNG', layout.colX[0] + 1, top + 1, w, w * ratio);
}

function registerFonts(doc: jsPDF, fonts: Record<string, string>) {
  for (const [style, data] of Object.entries(fonts)) {
    const file = `${FONT}-${style}.ttf`;
    doc.addFileToVFS(file, data);
    doc.addFont(file, FONT, style);
  }
}

/** Measures at 100%, then zooms out so the sheet fits one page (wrapping is unchanged since width and font scale together). */
function fitLayout(doc: jsPDF, sheet: ReportSheet): Layout {
  zoom = 1;
  const usableH = PAGE.height - PAGE.margin * 2;
  const fullHeight = sum(computeLayout(doc, sheet).rowH);
  zoom = Math.max(MIN_ZOOM, Math.min(1, (usableH / fullHeight) * 0.98));
  return computeLayout(doc, sheet);
}

export async function renderPdf(sheet: ReportSheet, author: string): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  registerFonts(doc, await loadFonts());
  doc.setProperties({ title: sheet.sheetName, author, creator: 'ChronoWork' });

  const layout = fitLayout(doc, sheet);
  const placement = paginate(sheet, layout);
  const pages = Math.max(...placement.map((p) => p.page));
  for (let p = 2; p <= pages; p++) doc.addPage();

  const eachCell = (draw: (cell: ReportCell, r: number, rect: Rect) => void) => {
    sheet.rows.forEach((row, r) => {
      doc.setPage(placement[r].page);
      for (const cell of row.cells) {
        const h = sum(layout.rowH.slice(r, r + (cell.rowSpan ?? 1)));
        draw(cell, r, { x: layout.colX[cell.col], y: placement[r].y, w: spanWidth(layout, cell), h });
      }
    });
  };

  // Fills and borders first, then text, so overflowing text is never painted over
  eachCell((cell, _r, rect) => drawCellBox(doc, cell, rect));
  eachCell((cell, r, rect) => drawCellText(doc, cell, rect, overflowWidth(sheet, r, cell, layout)));
  if (sheet.logo) drawLogo(doc, sheet.logo, layout, placement[0].y);

  return doc.output('blob');
}
