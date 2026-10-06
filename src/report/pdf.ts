import { jsPDF } from 'jspdf';
import regularFontUrl from '@expo-google-fonts/plus-jakarta-sans/400Regular/PlusJakartaSans_400Regular.ttf?url';
import boldFontUrl from '@expo-google-fonts/plus-jakarta-sans/700Bold/PlusJakartaSans_700Bold.ttf?url';
import italicFontUrl from '@expo-google-fonts/plus-jakarta-sans/400Regular_Italic/PlusJakartaSans_400Regular_Italic.ttf?url';
import { REPORT_STYLES, cellText, type CellStyle, type ReportCell, type ReportSheet } from './model';

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
    let height = row.height * PT_TO_MM * 0.62 * zoom;
    for (const cell of row.cells) {
      if ((cell.rowSpan ?? 1) > 1) continue;
      const width = colW.slice(cell.col, cell.col + (cell.colSpan ?? 1)).reduce((a, b) => a + b, 0);
      const lines = wrapLines(doc, cell, width).length;
      height = Math.max(height, lines * lineHeight(REPORT_STYLES[cell.style]) + pad() * 2);
    }
    return height;
  });
  return { colX, colW, rowH, scale };
}

function drawCellBox(doc: jsPDF, cell: ReportCell, x: number, y: number, w: number, h: number) {
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

/**
 * Draws the text of a cell. Non-wrapping text may overflow into the empty
 * cells on its right (like a spreadsheet) and is shrunk if it still does not fit.
 */
function drawCellText(doc: jsPDF, cell: ReportCell, x: number, y: number, w: number, h: number, overflowW: number) {
  const style = REPORT_STYLES[cell.style];
  const lines = wrapLines(doc, cell, w);
  if (!lines.length) return;

  let size = fontSize(style);
  if (!style.wrap) {
    const widest = Math.max(...lines.map((line) => doc.getTextWidth(line)));
    const available = overflowW - pad() * 2;
    if (widest > available) {
      size = (size * available) / widest;
      doc.setFontSize(size);
    }
  }
  const lh = size * PT_TO_MM * 1.25;
  const blockH = lines.length * lh;
  const firstBaseline =
    style.v === 'top'
      ? y + pad() + lh * 0.8
      : style.v === 'bottom'
        ? y + h - pad() - blockH + lh * 0.8
        : y + (h - blockH) / 2 + lh * 0.8;
  const tx = style.h === 'center' ? x + w / 2 : style.h === 'right' ? x + w - pad() : x + pad();

  doc.setTextColor(...hexToRgb(style.color));
  lines.forEach((line, i) => {
    const baseline = firstBaseline + i * lh;
    doc.text(line, tx, baseline, { align: style.h });
    if (style.underline) {
      const tw = doc.getTextWidth(line);
      const startX = style.h === 'center' ? tx - tw / 2 : style.h === 'right' ? tx - tw : tx;
      doc.setDrawColor(...hexToRgb(style.color));
      doc.setLineWidth(0.15);
      doc.line(startX, baseline + 0.5, startX + tw, baseline + 0.5);
    }
  });
  if (cell.link) doc.link(x, y, w, h, { url: cell.link });
}

/** Width a left-aligned, non-wrapping cell may use: itself plus the empty cells to its right. */
function overflowWidth(sheet: ReportSheet, rowIndex: number, cell: ReportCell, layout: Layout): number {
  const end = cell.col + (cell.colSpan ?? 1);
  let width = layout.colW.slice(cell.col, end).reduce((a, b) => a + b, 0);
  if (REPORT_STYLES[cell.style].h !== 'left') return width;
  const occupied = new Set(
    sheet.rows[rowIndex].cells.filter((c) => c !== cell && c.value !== '').flatMap((c) => Array.from({ length: c.colSpan ?? 1 }, (_, i) => c.col + i))
  );
  for (let col = end; col < layout.colW.length && !occupied.has(col); col++) width += layout.colW[col];
  return width;
}

/** Rows that start a vertical merge are kept on the same page as the rows they span. */
function groupEnd(sheet: ReportSheet, r: number): number {
  return sheet.rows[r].cells.reduce((end, cell) => Math.max(end, r + (cell.rowSpan ?? 1) - 1), r);
}

export async function renderPdf(sheet: ReportSheet, author: string): Promise<Blob> {
  const fonts = await loadFonts();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  for (const [style, data] of Object.entries(fonts)) {
    const file = `${FONT}-${style}.ttf`;
    doc.addFileToVFS(file, data);
    doc.addFont(file, FONT, style);
  }
  doc.setProperties({ title: sheet.sheetName, author, creator: 'ChronoWork' });

  // Measure at 100%, then zoom out (wrapping is unchanged since width and font scale together)
  zoom = 1;
  const usableH = PAGE.height - PAGE.margin * 2;
  const fullHeight = computeLayout(doc, sheet).rowH.reduce((a, b) => a + b, 0);
  zoom = Math.max(MIN_ZOOM, Math.min(1, (usableH / fullHeight) * 0.98));
  const layout = computeLayout(doc, sheet);
  const bottom = PAGE.height - PAGE.margin;

  // 1. Paginate: page and y position of every row
  const placement: { page: number; y: number }[] = [];
  let page = 1;
  let y = PAGE.margin;
  for (let r = 0; r < sheet.rows.length; r++) {
    const groupHeight = layout.rowH.slice(r, groupEnd(sheet, r) + 1).reduce((a, b) => a + b, 0);
    if (y + groupHeight > bottom && y > PAGE.margin) {
      page++;
      y = PAGE.margin;
    }
    placement[r] = { page, y };
    y += layout.rowH[r];
  }
  for (let p = 2; p <= page; p++) doc.addPage();

  const eachCell = (draw: (cell: ReportCell, r: number, x: number, y: number, w: number, h: number) => void) => {
    sheet.rows.forEach((row, r) => {
      doc.setPage(placement[r].page);
      for (const cell of row.cells) {
        const w = layout.colW.slice(cell.col, cell.col + (cell.colSpan ?? 1)).reduce((a, b) => a + b, 0);
        const h = layout.rowH.slice(r, r + (cell.rowSpan ?? 1)).reduce((a, b) => a + b, 0);
        draw(cell, r, layout.colX[cell.col], placement[r].y, w, h);
      }
    });
  };

  // 2. Fills and borders first, then text, so overflowing text is never painted over
  eachCell((cell, _r, x, cy, w, h) => drawCellBox(doc, cell, x, cy, w, h));
  eachCell((cell, r, x, cy, w, h) => drawCellText(doc, cell, x, cy, w, h, overflowWidth(sheet, r, cell, layout)));

  if (sheet.logo) {
    doc.setPage(1);
    const ratio = sheet.logo.height / sheet.logo.width;
    const maxH = layout.rowH[0] - 2;
    let w = (sheet.logo.width / 96) * 25.4 * layout.scale * 1.35;
    if (w * ratio > maxH) w = maxH / ratio;
    doc.addImage(sheet.logo.dataUrl, sheet.logo.mime === 'image/jpeg' ? 'JPEG' : 'PNG', layout.colX[0] + 1, placement[0].y + 1, w, w * ratio);
  }

  return doc.output('blob');
}
