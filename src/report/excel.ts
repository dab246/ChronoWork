import ExcelJS from 'exceljs';
import { REPORT_STYLES, toGrid, type CellStyle, type ReportCell, type ReportSheet } from './model';

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

export async function renderExcel(sheetModel: ReportSheet, author: string): Promise<Blob> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = author;
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetModel.sheetName, {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  sheet.columns = sheetModel.columns.map((w) => ({ width: columnWidth(w) }));

  const grid = toGrid(sheetModel);
  sheetModel.rows.forEach((row, r) => {
    sheet.getRow(r + 1).height = row.height;
    grid[r].forEach((slot, c) => {
      const source = slot.cell ?? slot.coveredBy;
      if (!source) return;
      const cell = sheet.getCell(r + 1, c + 1);
      applyStyle(cell, REPORT_STYLES[source.style]);
      if (slot.cell) setValue(cell, slot.cell);
    });
    for (const cell of row.cells) {
      if ((cell.colSpan ?? 1) > 1 || (cell.rowSpan ?? 1) > 1) {
        sheet.mergeCells(r + 1, cell.col + 1, r + (cell.rowSpan ?? 1), cell.col + (cell.colSpan ?? 1));
      }
    }
  });

  if (sheetModel.logo) {
    const imageId = workbook.addImage({
      base64: sheetModel.logo.dataUrl,
      extension: sheetModel.logo.mime === 'image/jpeg' ? 'jpeg' : 'png',
    });
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: sheetModel.logo.width, height: sheetModel.logo.height },
      editAs: 'oneCell',
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
