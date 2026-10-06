import ExcelJS from 'exceljs';
import { REPORT_STYLES, toGrid, type CellStyle, type GridSlot, type ReportCell, type ReportLogo, type ReportSheet } from './model';

const argb = (hex: string) => `FF${hex.replace('#', '').toUpperCase()}`;

/** Inches -> Excel column width (characters of the default 7px font). */
const columnWidth = (inches: number) => Math.round(((inches * 96 - 5) / 7) * 100) / 100;

function applyStyle(cell: ExcelJS.Cell, style: CellStyle) {
  cell.font = {
    name: style.font,
    size: style.size,
    bold: style.bold,
    italic: style.italic,
    underline: style.underline,
    color: { argb: argb(style.color) },
  };
  cell.alignment = { horizontal: style.h, vertical: style.v, wrapText: Boolean(style.wrap) };
  if (style.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(style.bg) } };
  if (style.border) {
    const side = { style: 'thin' as const, color: { argb: argb(style.border) } };
    cell.border = { top: side, left: side, bottom: side, right: side };
  }
}

function setValue(cell: ExcelJS.Cell, source: ReportCell) {
  if (source.link) {
    cell.value = { text: String(source.value), hyperlink: source.link };
  } else {
    cell.value = source.value === '' ? null : source.value;
  }
  if (source.format) cell.numFmt = source.format === 'pct2' ? '0.00%' : '0%';
}

function writeSlot(sheet: ExcelJS.Worksheet, slot: GridSlot, r: number, c: number) {
  const source = slot.cell ?? slot.coveredBy;
  if (!source) return;
  const cell = sheet.getCell(r + 1, c + 1);
  applyStyle(cell, REPORT_STYLES[source.style]);
  if (slot.cell) setValue(cell, slot.cell);
}

function mergeCell(sheet: ExcelJS.Worksheet, cell: ReportCell, r: number) {
  const rows = cell.rowSpan ?? 1;
  const cols = cell.colSpan ?? 1;
  if (rows * cols > 1) sheet.mergeCells(r + 1, cell.col + 1, r + rows, cell.col + cols);
}

function writeRows(sheet: ExcelJS.Worksheet, model: ReportSheet) {
  const grid = toGrid(model);
  model.rows.forEach((row, r) => {
    sheet.getRow(r + 1).height = row.height;
    grid[r].forEach((slot, c) => writeSlot(sheet, slot, r, c));
    row.cells.forEach((cell) => mergeCell(sheet, cell, r));
  });
}

function addLogo(workbook: ExcelJS.Workbook, sheet: ExcelJS.Worksheet, logo: ReportLogo) {
  const imageId = workbook.addImage({ base64: logo.dataUrl, extension: logo.mime === 'image/jpeg' ? 'jpeg' : 'png' });
  sheet.addImage(imageId, {
    tl: { col: 0, row: 0 },
    ext: { width: logo.width, height: logo.height },
    editAs: 'oneCell',
  });
}

export async function renderExcel(model: ReportSheet, author: string): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = author;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(model.sheetName, {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = model.columns.map((w) => ({ width: columnWidth(w) }));
  writeRows(sheet, model);
  if (model.logo) addLogo(workbook, sheet, model.logo);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
