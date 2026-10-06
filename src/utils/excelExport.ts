import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { TimeEntry, DayLog, UserSettings, WeeklyObjective, WeeklyReflections } from '../types';
import { 
  formatDateIso, 
  formatShortDate, 
  getWeekNumber 
} from './dateUtils';
import { aggregateWeeklyTasks, getWorkingAndOffDaysInfo } from './exportUtils';
import { getTranslations, Language } from './i18n';

/**
 * Generate a pixel-perfect, professionally styled Excel workbook (.xlsx)
 * matching the user's Linagora Vietnam Weekly Report template (Image 1) exactly.
 */
export async function exportToStyledExcel(
  weekDays: Date[],
  entries: TimeEntry[],
  dayLogs: Record<string, DayLog>,
  settings: UserSettings,
  objectives: WeeklyObjective[],
  reflections: WeeklyReflections
): Promise<void> {
  const lang: Language = settings.language || 'vi';
  const t = getTranslations(lang);
  const r = t.report;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = settings.userName;
  workbook.lastModifiedBy = settings.userName;
  workbook.created = new Date();
  workbook.modified = new Date();

  const weekNum = getWeekNumber(weekDays[0]);
  const startStr = formatShortDate(weekDays[0]);
  const endStr = formatShortDate(weekDays[4]); // Friday
  const sheetName = `Week ${weekNum} - ${weekDays[0].getFullYear()}`;

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ showGridLines: true }],
    pageSetup: { orientation: 'landscape', paperSize: 9 }, // A4
  });

  // Explicit column widths matching the exact Linagora template
  sheet.columns = [
    { key: 'A', width: 7 },   // NO
    { key: 'B', width: 44 },  // PROJECT/TASK
    { key: 'C', width: 22 },  // DESCRIPTION OF ACTIVITIES (Link / Dev)
    { key: 'D', width: 14 },  // TIME SPENT (e.g. 18h, 7h)
    { key: 'E', width: 15 },  // Completion (%)
    { key: 'F', width: 12 },  // Gap (%)
    { key: 'G', width: 28 },  // Reason
    { key: 'H', width: 26 },  // Solution/Deadline
    { key: 'I', width: 36 },  // REMARK
  ];

  const dateIsoList = weekDays.map((d) => formatDateIso(d));
  const weekEntries = entries.filter((e) => dateIsoList.includes(e.date));
  const aggregated = aggregateWeeklyTasks(weekEntries);
  const workingInfo = getWorkingAndOffDaysInfo(weekDays, dayLogs, settings);

  // Common styles
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  const purpleFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF5023E6' }, // Vivid Deep Purple #5023E6
  };

  const lavenderFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9D2E9' }, // Lavender #D9D2E9
  };

  // Row 1: Brand & Report Title
  // A1:C1 Merged: LINAGORA Vietnam in Bold Red
  sheet.mergeCells('A1:C1');
  const a1 = sheet.getCell('A1');
  a1.value = settings.companyName || 'LINAGORA Vietnam';
  a1.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFDC2626' } };
  a1.alignment = { vertical: 'middle', horizontal: 'left' };

  // D1:I1 Merged: WEEKLY REPORT & Week dates
  sheet.mergeCells('D1:I1');
  const d1 = sheet.getCell('D1');
  d1.value = `${r.reportTitle}\n${r.weekFromTo(weekNum, startStr, endStr)}`;
  d1.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF111827' } };
  d1.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  sheet.getRow(1).height = 40;

  // Row 2: Employee Name & Title
  sheet.mergeCells('D2:I2');
  const d2 = sheet.getCell('D2');
  d2.value = r.employeeNameRole(settings.userName, settings.userRole);
  d2.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF374151' } };
  d2.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(2).height = 20;

  // Row 3: Days off this week
  sheet.mergeCells('A3:B3');
  const a3 = sheet.getCell('A3');
  a3.value = r.daysOffLabel;
  a3.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF111827' } };
  a3.alignment = { vertical: 'middle', horizontal: 'left' };

  sheet.mergeCells('C3:I3');
  const c3 = sheet.getCell('C3');
  c3.value = r.daysOffText(workingInfo.daysOffCount, workingInfo.daysOffDatesText || '');
  c3.font = { name: 'Arial', size: 10, color: { argb: 'FF111827' } };
  c3.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(3).height = 20;

  // Row 4: Working days at office this week
  sheet.mergeCells('A4:B4');
  const a4 = sheet.getCell('A4');
  a4.value = r.officeDaysLabel;
  a4.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF111827' } };
  a4.alignment = { vertical: 'middle', horizontal: 'left' };

  sheet.mergeCells('C4:I4');
  const c4 = sheet.getCell('C4');
  c4.value = r.officeDaysText(workingInfo.officeDaysCount, workingInfo.officeDatesText || '');
  c4.font = { name: 'Arial', size: 10, color: { argb: 'FF111827' } };
  c4.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(4).height = 20;

  // Row 5: Blank spacer
  sheet.getRow(5).height = 12;

  // Row 6: COMPLETED WORK (Purple Banner)
  sheet.mergeCells('A6:I6');
  const a6 = sheet.getCell('A6');
  a6.value = r.completedWorkHeader;
  a6.fill = purpleFill;
  a6.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  a6.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(6).height = 24;

  // Row 7 & 8: Table Headers (Lavender #D9D2E9)
  // A7:A8 -> NO
  sheet.mergeCells('A7:A8');
  const a7 = sheet.getCell('A7');
  a7.value = r.colNo;
  a7.alignment = { vertical: 'middle', horizontal: 'center' };

  // B7:B8 -> PROJECT/TASK
  sheet.mergeCells('B7:B8');
  const b7 = sheet.getCell('B7');
  b7.value = r.colProject;
  b7.alignment = { vertical: 'middle', horizontal: 'center' };

  // C7:C8 -> DESCRIPTION OF ACTIVITIES
  sheet.mergeCells('C7:C8');
  const c7 = sheet.getCell('C7');
  c7.value = r.colDesc;
  c7.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // D7:D8 -> TIME SPENT
  sheet.mergeCells('D7:D8');
  const d7 = sheet.getCell('D7');
  d7.value = r.colTime;
  d7.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };

  // E7:F7 -> RESULT VS PLAN
  sheet.mergeCells('E7:F7');
  const e7 = sheet.getCell('E7');
  e7.value = r.colResult;
  e7.alignment = { vertical: 'middle', horizontal: 'center' };

  // G7:H7 -> GAP (if any)
  sheet.mergeCells('G7:H7');
  const g7 = sheet.getCell('G7');
  g7.value = r.colGap;
  g7.alignment = { vertical: 'middle', horizontal: 'center' };

  // I7:I8 -> REMARK
  sheet.mergeCells('I7:I8');
  const i7 = sheet.getCell('I7');
  i7.value = r.colRemark;
  i7.alignment = { vertical: 'middle', horizontal: 'center' };

  // Row 8: Subheaders
  const e8 = sheet.getCell('E8');
  e8.value = r.colCompletion;
  e8.alignment = { vertical: 'middle', horizontal: 'center' };

  const f8 = sheet.getCell('F8');
  f8.value = r.colGapPct;
  f8.alignment = { vertical: 'middle', horizontal: 'center' };

  const g8 = sheet.getCell('G8');
  g8.value = r.colReason;
  g8.alignment = { vertical: 'middle', horizontal: 'center' };

  const h8 = sheet.getCell('H8');
  h8.value = r.colSolution;
  h8.alignment = { vertical: 'middle', horizontal: 'center' };

  // Format rows 7 & 8 cells
  for (let rIdx = 7; rIdx <= 8; rIdx++) {
    sheet.getRow(rIdx).height = 20;
    for (let cCode = 65; cCode <= 73; cCode++) {
      const cell = sheet.getCell(`${String.fromCharCode(cCode)}${rIdx}`);
      cell.fill = lavenderFill;
      cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF111827' } };
      cell.border = borderThin;
    }
  }

  // Row 9+: Task Data Rows
  let currentRow = 9;
  aggregated.forEach((item, idx) => {
    const row = sheet.getRow(currentRow);
    row.height = 22;

    // Col A: NO
    const cellA = sheet.getCell(`A${currentRow}`);
    cellA.value = idx + 1;
    cellA.alignment = { vertical: 'middle', horizontal: 'center' };

    // Col B: PROJECT/TASK
    const cellB = sheet.getCell(`B${currentRow}`);
    cellB.value = item.label;
    cellB.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    // Col C: DESCRIPTION OF ACTIVITIES (Show 'Link' with hyperlink if URL exists)
    const cellC = sheet.getCell(`C${currentRow}`);
    if (item.url) {
      cellC.value = { text: 'Link', hyperlink: item.url };
      cellC.font = { name: 'Arial', size: 10, color: { argb: 'FF1155CC' }, underline: true };
      cellC.alignment = { vertical: 'middle', horizontal: 'center' };
    } else {
      cellC.value = item.activitiesDescription || '';
      cellC.alignment = { vertical: 'middle', horizontal: 'center' };
    }

    // Col D: TIME SPENT (e.g. 18h, 7h)
    const cellD = sheet.getCell(`D${currentRow}`);
    cellD.value = `${item.hours}h`;
    cellD.alignment = { vertical: 'middle', horizontal: 'center' };

    // Col E: Completion (%)
    const cellE = sheet.getCell(`E${currentRow}`);
    cellE.value = `${item.completionPct.toFixed(2)}%`;
    cellE.alignment = { vertical: 'middle', horizontal: 'center' };

    // Col F: Gap (%)
    const cellF = sheet.getCell(`F${currentRow}`);
    cellF.value = item.gapPct > 0 ? `${item.gapPct}%` : '';
    cellF.alignment = { vertical: 'middle', horizontal: 'center' };

    // Col G: Reason
    const cellG = sheet.getCell(`G${currentRow}`);
    cellG.value = item.gapReason || '';
    cellG.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    // Col H: Solution/Deadline
    const cellH = sheet.getCell(`H${currentRow}`);
    cellH.value = item.gapSolution || '';
    cellH.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    // Col I: REMARK
    const cellI = sheet.getCell(`I${currentRow}`);
    cellI.value = item.remark || '';
    cellI.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

    // Apply borders and fonts
    for (let cCode = 65; cCode <= 73; cCode++) {
      const cell = sheet.getCell(`${String.fromCharCode(cCode)}${currentRow}`);
      cell.border = borderThin;
      if (!cell.font) {
        cell.font = { name: 'Arial', size: 9.5, color: { argb: 'FF111827' } };
      }
    }

    currentRow++;
  });

  // Pre-fill empty rows up to row 30 (numbers pre-filled in Col A, up to 22)
  const emptyRowsTarget = Math.max(currentRow, 30);
  for (; currentRow <= emptyRowsTarget; currentRow++) {
    const row = sheet.getRow(currentRow);
    row.height = 20;

    const cellA = sheet.getCell(`A${currentRow}`);
    cellA.value = currentRow - 8;
    cellA.alignment = { vertical: 'middle', horizontal: 'center' };
    cellA.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF4B5563' } };

    for (let cCode = 65; cCode <= 73; cCode++) {
      const cell = sheet.getCell(`${String.fromCharCode(cCode)}${currentRow}`);
      cell.border = borderThin;
      if (cCode > 65) cell.value = '';
    }
  }

  // Row 31: Reviews, meetings, support, community...
  const row31 = sheet.getRow(31);
  row31.height = 22;
  const a31 = sheet.getCell('A31');
  a31.value = '…';
  a31.alignment = { vertical: 'middle', horizontal: 'center' };
  a31.font = { name: 'Arial', size: 10, bold: true };

  const b31 = sheet.getCell('B31');
  b31.value = r.reviewsFooter;
  b31.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF4B5563' } };
  b31.alignment = { vertical: 'middle', horizontal: 'left' };

  for (let cCode = 65; cCode <= 73; cCode++) {
    sheet.getCell(`${String.fromCharCode(cCode)}31`).border = borderThin;
  }

  // Row 32: Blank spacer
  sheet.getRow(32).height = 12;

  // Rows 33 to 38: OBJECTIVE FOR NEXT WEEK & REFLECTIONS
  // Row 33 Header
  sheet.getRow(33).height = 24;

  // A33: No (Purple)
  const a33 = sheet.getCell('A33');
  a33.value = r.objNo;
  a33.fill = purpleFill;
  a33.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  a33.alignment = { vertical: 'middle', horizontal: 'center' };
  a33.border = borderThin;

  // B33:D33 Merged: OBJECTIVE FOR NEXT WEEK (Purple)
  sheet.mergeCells('B33:D33');
  const b33 = sheet.getCell('B33');
  b33.value = r.objTitle;
  b33.fill = purpleFill;
  b33.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  b33.alignment = { vertical: 'middle', horizontal: 'center' };
  b33.border = borderThin;

  // E33: Note (Purple)
  const e33 = sheet.getCell('E33');
  e33.value = r.objNote;
  e33.fill = purpleFill;
  e33.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
  e33.alignment = { vertical: 'middle', horizontal: 'center' };
  e33.border = borderThin;

  // G33:I33 Merged: * The things that went particularly well... (Lavender)
  sheet.mergeCells('G33:I33');
  const g33 = sheet.getCell('G33');
  g33.value = r.refWentWellTitle;
  g33.fill = lavenderFill;
  g33.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF1F2937' } };
  g33.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  g33.border = borderThin;

  // Row 34: Obj 1 & Reflection 1 content
  sheet.getRow(34).height = 24;
  sheet.getCell('A34').value = 1;
  sheet.getCell('A34').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell('A34').border = borderThin;

  sheet.mergeCells('B34:D34');
  const b34 = sheet.getCell('B34');
  b34.value = objectives[0]?.task || 'Tmail tasks';
  b34.alignment = { vertical: 'middle', horizontal: 'left' };
  b34.border = borderThin;

  const e34 = sheet.getCell('E34');
  e34.value = objectives[0]?.note || 'July sprint';
  e34.alignment = { vertical: 'middle', horizontal: 'center' };
  e34.border = borderThin;

  sheet.mergeCells('G34:I34');
  const g34 = sheet.getCell('G34');
  g34.value = reflections.wentWell || '';
  g34.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  g34.border = borderThin;

  // Row 35: Obj 2 & Reflection 2 Header (Lavender)
  sheet.getRow(35).height = 24;
  sheet.getCell('A35').value = 2;
  sheet.getCell('A35').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell('A35').border = borderThin;

  sheet.mergeCells('B35:D35');
  const b35 = sheet.getCell('B35');
  b35.value = objectives[1]?.task || '';
  b35.alignment = { vertical: 'middle', horizontal: 'left' };
  b35.border = borderThin;

  const e35 = sheet.getCell('E35');
  e35.value = objectives[1]?.note || '';
  e35.alignment = { vertical: 'middle', horizontal: 'center' };
  e35.border = borderThin;

  sheet.mergeCells('G35:I35');
  const g35 = sheet.getCell('G35');
  g35.value = r.refChallengingTitle;
  g35.fill = lavenderFill;
  g35.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF1F2937' } };
  g35.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  g35.border = borderThin;

  // Row 36: Obj 3 & Reflection 2 content
  sheet.getRow(36).height = 24;
  sheet.getCell('A36').value = 3;
  sheet.getCell('A36').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell('A36').border = borderThin;

  sheet.mergeCells('B36:D36');
  const b36 = sheet.getCell('B36');
  b36.value = objectives[2]?.task || '';
  b36.alignment = { vertical: 'middle', horizontal: 'left' };
  b36.border = borderThin;

  const e36 = sheet.getCell('E36');
  e36.value = objectives[2]?.note || '';
  e36.alignment = { vertical: 'middle', horizontal: 'center' };
  e36.border = borderThin;

  sheet.mergeCells('G36:I36');
  const g36 = sheet.getCell('G36');
  g36.value = reflections.challenging || '';
  g36.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  g36.border = borderThin;

  // Row 37: Obj 4 & Reflection 3 Header (Lavender)
  sheet.getRow(37).height = 24;
  sheet.getCell('A37').value = 4;
  sheet.getCell('A37').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell('A37').border = borderThin;

  sheet.mergeCells('B37:D37');
  const b37 = sheet.getCell('B37');
  b37.value = objectives[3]?.task || '';
  b37.alignment = { vertical: 'middle', horizontal: 'left' };
  b37.border = borderThin;

  const e37 = sheet.getCell('E37');
  e37.value = objectives[3]?.note || '';
  e37.alignment = { vertical: 'middle', horizontal: 'center' };
  e37.border = borderThin;

  sheet.mergeCells('G37:I37');
  const g37 = sheet.getCell('G37');
  g37.value = r.refProposalTitle;
  g37.fill = lavenderFill;
  g37.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF1F2937' } };
  g37.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  g37.border = borderThin;

  // Row 38: Obj 5 & Reflection 3 content
  sheet.getRow(38).height = 24;
  sheet.getCell('A38').value = 5;
  sheet.getCell('A38').alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getCell('A38').border = borderThin;

  sheet.mergeCells('B38:D38');
  const b38 = sheet.getCell('B38');
  b38.value = objectives[4]?.task || '';
  b38.alignment = { vertical: 'middle', horizontal: 'left' };
  b38.border = borderThin;

  const e38 = sheet.getCell('E38');
  e38.value = objectives[4]?.note || '';
  e38.alignment = { vertical: 'middle', horizontal: 'center' };
  e38.border = borderThin;

  sheet.mergeCells('G38:I38');
  const g38 = sheet.getCell('G38');
  g38.value = reflections.proposal || '';
  g38.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
  g38.border = borderThin;

  // Row 39: Blank spacer
  sheet.getRow(39).height = 14;

  // Row 41: Signatures
  sheet.getRow(41).height = 22;
  sheet.mergeCells('B41:C41');
  const b41 = sheet.getCell('B41');
  b41.value = r.sigEmployee;
  b41.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF111827' } };
  b41.alignment = { vertical: 'middle', horizontal: 'center' };

  sheet.mergeCells('G41:H41');
  const g41 = sheet.getCell('G41');
  g41.value = r.sigManager;
  g41.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF111827' } };
  g41.alignment = { vertical: 'middle', horizontal: 'center' };

  // Write and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Weekly_Report_Week_${weekNum}_${settings.userName.replace(/\s+/g, '_')}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate OpenDocument Spreadsheet (.ods) file
 */
export function exportToStyledOds(
  weekDays: Date[],
  entries: TimeEntry[],
  dayLogs: Record<string, DayLog>,
  settings: UserSettings,
  objectives: WeeklyObjective[],
  reflections: WeeklyReflections
): void {
  const lang: Language = settings.language || 'vi';
  const t = getTranslations(lang);
  const r = t.report;

  const weekNum = getWeekNumber(weekDays[0]);
  const startStr = formatShortDate(weekDays[0]);
  const endStr = formatShortDate(weekDays[4]);
  const sheetName = `Week ${weekNum} - ${weekDays[0].getFullYear()}`;

  const dateIsoList = weekDays.map((d) => formatDateIso(d));
  const weekEntries = entries.filter((e) => dateIsoList.includes(e.date));
  const aggregated = aggregateWeeklyTasks(weekEntries);
  const workingInfo = getWorkingAndOffDaysInfo(weekDays, dayLogs, settings);

  const rows: (string | number)[][] = [];

  // Row 1: Brand & Title
  rows.push([
    settings.companyName || 'LINAGORA Vietnam', '', '',
    `${r.reportTitle}\n${r.weekFromTo(weekNum, startStr, endStr)}`, '', '', '', '', ''
  ]);

  // Row 2: Employee
  rows.push([
    '', '', '',
    r.employeeNameRole(settings.userName, settings.userRole), '', '', '', '', ''
  ]);

  // Row 3: Days off
  rows.push([
    r.daysOffLabel, '',
    r.daysOffText(workingInfo.daysOffCount, workingInfo.daysOffDatesText || ''), '', '', '', '', '', ''
  ]);

  // Row 4: Working days at office
  rows.push([
    r.officeDaysLabel, '',
    r.officeDaysText(workingInfo.officeDaysCount, workingInfo.officeDatesText || ''), '', '', '', '', '', ''
  ]);

  // Row 5: Blank
  rows.push(['', '', '', '', '', '', '', '', '']);

  // Row 6: Completed work banner
  rows.push([r.completedWorkHeader, '', '', '', '', '', '', '', '']);

  // Row 7 & 8: Headers
  rows.push([
    r.colNo, r.colProject, r.colDesc, r.colTime,
    r.colResult, '', r.colGap, '', r.colRemark
  ]);

  rows.push([
    '', '', '', '',
    r.colCompletion, r.colGapPct, r.colReason, r.colSolution, ''
  ]);

  // Data rows
  aggregated.forEach((item, idx) => {
    rows.push([
      idx + 1,
      item.label,
      item.url || item.activitiesDescription || 'Link',
      `${item.hours}h`,
      `${item.completionPct.toFixed(2)}%`,
      item.gapPct > 0 ? `${item.gapPct}%` : '',
      item.gapReason || '',
      item.gapSolution || '',
      item.remark || '',
    ]);
  });

  const placeholderCount = Math.max(0, 22 - aggregated.length);
  for (let i = 0; i < placeholderCount; i++) {
    rows.push([aggregated.length + i + 1, '', '', '', '', '', '', '', '']);
  }

  rows.push(['…', r.reviewsFooter, '', '', '', '', '', '', '']);
  rows.push(['', '', '', '', '', '', '', '', '']);

  // Objectives & reflections
  rows.push([
    r.objNo, r.objTitle, '', '', r.objNote, '',
    r.refWentWellTitle, '', ''
  ]);

  rows.push([
    1, objectives[0]?.task || 'Tmail tasks', '', '', objectives[0]?.note || 'July sprint', '',
    reflections.wentWell || '', '', ''
  ]);

  rows.push([
    2, objectives[1]?.task || '', '', '', objectives[1]?.note || '', '',
    r.refChallengingTitle, '', ''
  ]);

  rows.push([
    3, objectives[2]?.task || '', '', '', objectives[2]?.note || '', '',
    reflections.challenging || '', '', ''
  ]);

  rows.push([
    4, objectives[3]?.task || '', '', '', objectives[3]?.note || '', '',
    r.refProposalTitle, '', ''
  ]);

  rows.push([
    5, objectives[4]?.task || '', '', '', objectives[4]?.note || '', '',
    reflections.proposal || '', '', ''
  ]);

  rows.push(['', '', '', '', '', '', '', '', '']);
  rows.push(['', r.sigEmployee, '', '', '', '', r.sigManager, '', '']);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // A1:C1
    { s: { r: 0, c: 3 }, e: { r: 0, c: 8 } }, // D1:I1
    { s: { r: 1, c: 3 }, e: { r: 1, c: 8 } }, // D2:I2
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } }, // A3:B3
    { s: { r: 2, c: 2 }, e: { r: 2, c: 8 } }, // C3:I3
    { s: { r: 3, c: 0 }, e: { r: 3, c: 1 } }, // A4:B4
    { s: { r: 3, c: 2 }, e: { r: 3, c: 8 } }, // C4:I4
    { s: { r: 5, c: 0 }, e: { r: 5, c: 8 } }, // A6:I6
    { s: { r: 6, c: 0 }, e: { r: 7, c: 0 } }, // A7:A8
    { s: { r: 6, c: 1 }, e: { r: 7, c: 1 } }, // B7:B8
    { s: { r: 6, c: 2 }, e: { r: 7, c: 2 } }, // C7:C8
    { s: { r: 6, c: 3 }, e: { r: 7, c: 3 } }, // D7:D8
    { s: { r: 6, c: 4 }, e: { r: 6, c: 5 } }, // E7:F7
    { s: { r: 6, c: 6 }, e: { r: 6, c: 7 } }, // G7:H7
    { s: { r: 6, c: 8 }, e: { r: 7, c: 8 } }, // I7:I8
  ];

  ws['!cols'] = [
    { wch: 7 },
    { wch: 44 },
    { wch: 22 },
    { wch: 14 },
    { wch: 15 },
    { wch: 12 },
    { wch: 28 },
    { wch: 26 },
    { wch: 36 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const outBuffer = XLSX.write(wb, { bookType: 'ods', type: 'array' });
  const blob = new Blob([outBuffer], {
    type: 'application/vnd.oasis.opendocument.spreadsheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Weekly_Report_Week_${weekNum}_${settings.userName.replace(/\s+/g, '_')}.ods`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Builds the formatted HTML table + TSV text
 * Perfectly matching Image 1: LINAGORA Vietnam brand, purple headers, lavender subheaders,
 * 'Link' hyperlink in column C, hours in 'Xh', and clean borders for pasting into any sheet!
 */
export function buildReportExportContent(
  weekDays: Date[],
  entries: TimeEntry[],
  dayLogs: Record<string, DayLog>,
  settings: UserSettings,
  objectives: WeeklyObjective[],
  reflections: WeeklyReflections
): { html: string; tsv: string } {
  const lang: Language = settings.language || 'vi';
  const t = getTranslations(lang);
  const r = t.report;

  const weekNum = getWeekNumber(weekDays[0]);
  const startStr = formatShortDate(weekDays[0]);
  const endStr = formatShortDate(weekDays[4]);

  const dateIsoList = weekDays.map((d) => formatDateIso(d));
  const weekEntries = entries.filter((e) => dateIsoList.includes(e.date));
  const aggregated = aggregateWeeklyTasks(weekEntries);
  const workingInfo = getWorkingAndOffDaysInfo(weekDays, dayLogs, settings);

  // 1. Plain text TSV
  const tsvLines: string[] = [];
  tsvLines.push(`${settings.companyName || 'LINAGORA Vietnam'}\t\t\t"${r.reportTitle}\n${r.weekFromTo(weekNum, startStr, endStr)}"\t\t\t\t\t`);
  tsvLines.push(`\t\t\t"${r.employeeNameRole(settings.userName, settings.userRole)}"\t\t\t\t\t`);
  tsvLines.push(`"${r.daysOffLabel}"\t\t"${r.daysOffText(workingInfo.daysOffCount, workingInfo.daysOffDatesText || '')}"\t\t\t\t\t\t`);
  tsvLines.push(`"${r.officeDaysLabel}"\t\t"${r.officeDaysText(workingInfo.officeDaysCount, workingInfo.officeDatesText || '')}"\t\t\t\t\t\t`);
  tsvLines.push('\t\t\t\t\t\t\t\t');
  tsvLines.push(`${r.completedWorkHeader}\t\t\t\t\t\t\t\t`);
  tsvLines.push(`${r.colNo}\t${r.colProject}\t${r.colDesc}\t${r.colTime}\t${r.colResult}\t\t${r.colGap}\t\t${r.colRemark}`);
  tsvLines.push(`\t\t\t\t${r.colCompletion}\t${r.colGapPct}\t${r.colReason}\t${r.colSolution}\t`);

  aggregated.forEach((item, idx) => {
    tsvLines.push([
      idx + 1,
      item.label,
      item.url || item.activitiesDescription || 'Link',
      `${item.hours}h`,
      `${item.completionPct.toFixed(2)}%`,
      item.gapPct > 0 ? `${item.gapPct}%` : '',
      item.gapReason || '',
      item.gapSolution || '',
      item.remark || '',
    ].join('\t'));
  });

  const emptyRowsNeeded = Math.max(0, 22 - aggregated.length);
  for (let i = 0; i < emptyRowsNeeded; i++) {
    tsvLines.push(`${aggregated.length + i + 1}\t\t\t\t\t\t\t\t`);
  }

  tsvLines.push(`…\t"${r.reviewsFooter}"\t\t\t\t\t\t\t`);
  tsvLines.push('\t\t\t\t\t\t\t\t');
  tsvLines.push(`${r.objNo}\t"${r.objTitle}"\t\t"${r.objNote}"\t\t"${r.refWentWellTitle}"\t\t\t`);
  tsvLines.push(`1\t${objectives[0]?.task || 'Tmail tasks'}\t\t${objectives[0]?.note || 'July sprint'}\t\t${reflections.wentWell || ''}\t\t\t`);
  tsvLines.push(`2\t${objectives[1]?.task || ''}\t\t${objectives[1]?.note || ''}\t\t"${r.refChallengingTitle}"\t\t\t`);
  tsvLines.push(`3\t${objectives[2]?.task || ''}\t\t${objectives[2]?.note || ''}\t\t${reflections.challenging || ''}\t\t\t`);
  tsvLines.push(`4\t${objectives[3]?.task || ''}\t\t${objectives[3]?.note || ''}\t\t"${r.refProposalTitle}"\t\t\t`);
  tsvLines.push(`5\t${objectives[4]?.task || ''}\t\t${objectives[4]?.note || ''}\t\t${reflections.proposal || ''}\t\t\t`);
  tsvLines.push('\t\t\t\t\t\t\t\t');
  tsvLines.push(`\t"${r.sigEmployee}"\t\t\t\t"${r.sigManager}"\t\t`);

  const textPlain = tsvLines.join('\n');

  // 2. High-Fidelity Rich HTML Table
  let html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10pt; color: #111827; }
  td, th { border: 1px solid #d1d5db; padding: 4px 6px; }
  .brand { font-size: 14pt; font-weight: bold; color: #dc2626; border: 1px solid #d1d5db; }
  .title { font-size: 12pt; font-weight: bold; text-align: center; border: 1px solid #d1d5db; }
  .emp { font-weight: bold; text-align: center; color: #374151; }
  .banner-purple { background-color: #5023e6; color: #ffffff; font-weight: bold; text-align: center; font-size: 11pt; }
  .head-lavender { background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center; }
  .ref-lavender { background-color: #d9d2e9; color: #1f2937; font-style: italic; font-size: 9pt; }
  .center { text-align: center; }
  .link { color: #1155cc; text-decoration: underline; font-weight: 500; }
</style>
</head>
<body>
<table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif; font-size: 10pt; width: 100%;">
  <!-- Row 1: Brand & Title -->
  <tr style="height: 40px;">
    <td colspan="3" class="brand" style="color: #dc2626; font-size: 14pt; font-weight: bold; vertical-align: middle;">${settings.companyName || 'LINAGORA Vietnam'}</td>
    <td colspan="6" class="title" align="center" style="font-size: 12pt; font-weight: bold; text-align: center; vertical-align: middle;">
      ${r.reportTitle}<br/>
      <span style="font-size: 11pt; font-weight: bold;">${r.weekFromTo(weekNum, startStr, endStr)}</span>
    </td>
  </tr>

  <!-- Row 2: Employee info -->
  <tr style="height: 22px;">
    <td colspan="3" style="border: 1px solid #d1d5db;"></td>
    <td colspan="6" class="emp" align="center" style="font-weight: bold; text-align: center; color: #374151;">
      ${r.employeeNameRole(settings.userName, settings.userRole)}
    </td>
  </tr>

  <!-- Row 3: Days off -->
  <tr style="height: 20px;">
    <td colspan="2" style="font-weight: bold; border: 1px solid #d1d5db;">${r.daysOffLabel}</td>
    <td colspan="7" style="border: 1px solid #d1d5db;">${r.daysOffText(workingInfo.daysOffCount, workingInfo.daysOffDatesText || '')}</td>
  </tr>

  <!-- Row 4: Office days -->
  <tr style="height: 20px;">
    <td colspan="2" style="font-weight: bold; border: 1px solid #d1d5db;">${r.officeDaysLabel}</td>
    <td colspan="7" style="border: 1px solid #d1d5db;">${r.officeDaysText(workingInfo.officeDaysCount, workingInfo.officeDatesText || '')}</td>
  </tr>

  <!-- Row 5: Spacer -->
  <tr style="height: 12px;"><td colspan="9" style="border: none;"></td></tr>

  <!-- Row 6: Completed Work Banner (Purple #5023E6) -->
  <tr style="height: 26px;">
    <td colspan="9" bgcolor="#5023e6" class="banner-purple" style="background-color: #5023e6; color: #ffffff; font-weight: bold; text-align: center; font-size: 11pt;">
      ${r.completedWorkHeader}
    </td>
  </tr>

  <!-- Row 7 & 8: Headers (Lavender #D9D2E9) -->
  <tr style="height: 22px;">
    <th rowspan="2" bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center; vertical-align: middle;">${r.colNo}</th>
    <th rowspan="2" bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center; vertical-align: middle;">${r.colProject}</th>
    <th rowspan="2" bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center; vertical-align: middle;">${r.colDesc}</th>
    <th rowspan="2" bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center; vertical-align: middle;">${r.colTime}</th>
    <th colspan="2" bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center;">${r.colResult}</th>
    <th colspan="2" bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center;">${r.colGap}</th>
    <th rowspan="2" bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center; vertical-align: middle;">${r.colRemark}</th>
  </tr>
  <tr style="height: 20px;">
    <th bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center;">${r.colCompletion}</th>
    <th bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center;">${r.colGapPct}</th>
    <th bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center;">${r.colReason}</th>
    <th bgcolor="#d9d2e9" class="head-lavender" style="background-color: #d9d2e9; color: #111827; font-weight: bold; text-align: center;">${r.colSolution}</th>
  </tr>
`;

  // Task rows
  aggregated.forEach((item, idx) => {
    const linkHtml = item.url
      ? `<a href="${item.url}" class="link" style="color: #1155cc; text-decoration: underline; font-weight: bold;">Link</a>`
      : (item.activitiesDescription || '');

    html += `
  <tr style="height: 22px;">
    <td align="center" class="center" style="text-align: center;">${idx + 1}</td>
    <td style="text-align: left;">${item.label}</td>
    <td align="center" class="center" style="text-align: center;">${linkHtml}</td>
    <td align="center" class="center" style="text-align: center;">${item.hours}h</td>
    <td align="center" class="center" style="text-align: center;">${item.completionPct.toFixed(2)}%</td>
    <td align="center" class="center" style="text-align: center;">${item.gapPct > 0 ? `${item.gapPct}%` : ''}</td>
    <td style="text-align: left;">${item.gapReason || ''}</td>
    <td style="text-align: left;">${item.gapSolution || ''}</td>
    <td style="text-align: left;">${item.remark || ''}</td>
  </tr>`;
  });

  // Empty rows up to 22
  for (let i = 0; i < emptyRowsNeeded; i++) {
    html += `
  <tr style="height: 20px;">
    <td align="center" class="center" style="text-align: center; font-weight: bold; color: #4b5563;">${aggregated.length + i + 1}</td>
    <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
  </tr>`;
  }

  // Row 31: Reviews
  html += `
  <tr style="height: 22px;">
    <td align="center" class="center" style="text-align: center; font-weight: bold;">…</td>
    <td colspan="8" style="font-style: italic; color: #4b5563;">${r.reviewsFooter}</td>
  </tr>
  <tr style="height: 12px;"><td colspan="9" style="border: none;"></td></tr>

  <!-- Objectives & Reflections -->
  <tr style="height: 24px;">
    <th bgcolor="#5023e6" class="banner-purple" style="background-color: #5023e6; color: #ffffff; font-weight: bold; text-align: center;">${r.objNo}</th>
    <th colspan="3" bgcolor="#5023e6" class="banner-purple" style="background-color: #5023e6; color: #ffffff; font-weight: bold; text-align: center;">${r.objTitle}</th>
    <th bgcolor="#5023e6" class="banner-purple" style="background-color: #5023e6; color: #ffffff; font-weight: bold; text-align: center;">${r.objNote}</th>
    <th colspan="4" bgcolor="#d9d2e9" class="ref-lavender" style="background-color: #d9d2e9; color: #1f2937; font-style: italic; text-align: left;">${r.refWentWellTitle}</th>
  </tr>

  <tr style="height: 24px;">
    <td align="center" class="center" style="text-align: center;">1</td>
    <td colspan="3">${objectives[0]?.task || 'Tmail tasks'}</td>
    <td align="center" class="center" style="text-align: center;">${objectives[0]?.note || 'July sprint'}</td>
    <td colspan="4">${reflections.wentWell || ''}</td>
  </tr>

  <tr style="height: 24px;">
    <td align="center" class="center" style="text-align: center;">2</td>
    <td colspan="3">${objectives[1]?.task || ''}</td>
    <td align="center" class="center" style="text-align: center;">${objectives[1]?.note || ''}</td>
    <td colspan="4" bgcolor="#d9d2e9" class="ref-lavender" style="background-color: #d9d2e9; color: #1f2937; font-style: italic; text-align: left;">${r.refChallengingTitle}</td>
  </tr>

  <tr style="height: 24px;">
    <td align="center" class="center" style="text-align: center;">3</td>
    <td colspan="3">${objectives[2]?.task || ''}</td>
    <td align="center" class="center" style="text-align: center;">${objectives[2]?.note || ''}</td>
    <td colspan="4">${reflections.challenging || ''}</td>
  </tr>

  <tr style="height: 24px;">
    <td align="center" class="center" style="text-align: center;">4</td>
    <td colspan="3">${objectives[3]?.task || ''}</td>
    <td align="center" class="center" style="text-align: center;">${objectives[3]?.note || ''}</td>
    <td colspan="4" bgcolor="#d9d2e9" class="ref-lavender" style="background-color: #d9d2e9; color: #1f2937; font-style: italic; text-align: left;">${r.refProposalTitle}</td>
  </tr>

  <tr style="height: 24px;">
    <td align="center" class="center" style="text-align: center;">5</td>
    <td colspan="3">${objectives[4]?.task || ''}</td>
    <td align="center" class="center" style="text-align: center;">${objectives[4]?.note || ''}</td>
    <td colspan="4">${reflections.proposal || ''}</td>
  </tr>

  <tr style="height: 16px;"><td colspan="9" style="border: none;"></td></tr>

  <!-- Signatures -->
  <tr style="height: 22px;">
    <td></td>
    <td colspan="2" align="center" style="text-align: center; font-weight: bold; border: none;">${r.sigEmployee}</td>
    <td colspan="3" style="border: none;"></td>
    <td colspan="3" align="center" style="text-align: center; font-weight: bold; border: none;">${r.sigManager}</td>
  </tr>
</table>
</body>
</html>`;

  return { html, tsv: textPlain };
}

/**
 * Copies formatted report to clipboard with fallback mechanisms
 */
export async function copyFullReportToClipboard(
  weekDays: Date[],
  entries: TimeEntry[],
  dayLogs: Record<string, DayLog>,
  settings: UserSettings,
  objectives: WeeklyObjective[],
  reflections: WeeklyReflections
): Promise<{ success: boolean; richCopied: boolean }> {
  const { html, tsv } = buildReportExportContent(
    weekDays,
    entries,
    dayLogs,
    settings,
    objectives,
    reflections
  );

  try {
    if (navigator.clipboard && typeof window.ClipboardItem !== 'undefined') {
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobText = new Blob([tsv], { type: 'text/plain' });
      const item = new window.ClipboardItem({
        'text/html': blobHtml,
        'text/plain': blobText,
      });
      await navigator.clipboard.write([item]);
      return { success: true, richCopied: true };
    }
  } catch (err) {
    console.warn('ClipboardItem API blocked or failed, trying execCommand fallback', err);
  }

  // Fallback: document.execCommand('copy') with hidden div
  try {
    const hiddenContainer = document.createElement('div');
    hiddenContainer.innerHTML = html;
    hiddenContainer.style.position = 'fixed';
    hiddenContainer.style.left = '-9999px';
    hiddenContainer.style.top = '-9999px';
    hiddenContainer.style.opacity = '0';
    document.body.appendChild(hiddenContainer);

    const range = document.createRange();
    range.selectNode(hiddenContainer);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const successful = document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(hiddenContainer);
      if (successful) {
        return { success: true, richCopied: true };
      }
    }
  } catch (e) {
    console.warn('execCommand copy fallback failed', e);
  }

  // Plain text fallback
  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(tsv);
      return { success: true, richCopied: false };
    }
  } catch {
    // ignore
  }

  return { success: false, richCopied: false };
}
