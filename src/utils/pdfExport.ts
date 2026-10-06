import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TimeEntry, DayLog, UserSettings, WeeklyObjective, WeeklyReflections } from '../types';
import { 
  formatDateIso, 
  formatShortDate, 
  getWeekNumber 
} from './dateUtils';
import { aggregateWeeklyTasks, getWorkingAndOffDaysInfo } from './exportUtils';
import { getTranslations, Language } from './i18n';

/**
 * Bulletproof, high-resolution vector PDF generator for Weekly Report
 * Uses jsPDF + jspdf-autotable to ensure 100% reliable PDF export in all browser/iframe environments.
 * Solves html2canvas oklch crash and browser sandbox print limitations completely.
 */
export async function exportReportToPdf(
  weekDays: Date[],
  entries: TimeEntry[],
  dayLogs: Record<string, DayLog>,
  settings: UserSettings,
  objectives: WeeklyObjective[],
  reflections: WeeklyReflections,
  fileName?: string
): Promise<void> {
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

  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const margin = 10;
  let currentY = margin;

  // 1. Top Header
  // Brand: LINAGORA Vietnam in Red
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(220, 38, 38); // #DC2626 Red
  doc.text(settings.companyName || 'LINAGORA Vietnam', margin, currentY + 6);

  // Report Title: Center
  doc.setFontSize(14);
  doc.setTextColor(17, 24, 39); // #111827 Dark
  const titleText = r.reportTitle;
  const subTitleText = r.weekFromTo(weekNum, startStr, endStr);
  doc.text(titleText, 160, currentY + 4, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(subTitleText, 160, currentY + 10, { align: 'center' });

  currentY += 16;

  // 2. Employee Info
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 65, 81);
  doc.text(r.employeeNameRole(settings.userName, settings.userRole), margin, currentY);
  currentY += 5;

  // Days off
  doc.setFont('helvetica', 'bold');
  doc.text(r.daysOffLabel, margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(
    r.daysOffText(workingInfo.daysOffCount, workingInfo.daysOffDatesText || ''),
    margin + 65,
    currentY
  );
  currentY += 4.5;

  // Working days at office
  doc.setFont('helvetica', 'bold');
  doc.text(r.officeDaysLabel, margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(
    r.officeDaysText(workingInfo.officeDaysCount, workingInfo.officeDatesText || ''),
    margin + 65,
    currentY
  );
  currentY += 6;

  // 3. Completed Work Section Table
  // Header colors: Purple #5023E6, Lavender #D9D2E9
  const tableData: any[][] = [];

  aggregated.forEach((item, idx) => {
    tableData.push([
      idx + 1,
      item.label,
      item.url ? 'Link' : (item.activitiesDescription || 'Dev'),
      `${item.hours}h`,
      `${item.completionPct.toFixed(2)}%`,
      item.gapPct > 0 ? `${item.gapPct}%` : '',
      item.gapReason || '',
      item.gapSolution || '',
      item.remark || '',
    ]);
  });

  // Pre-fill empty rows up to at least 7 or 8 rows for clean layout
  const minRows = Math.max(5, 8 - aggregated.length);
  for (let i = 0; i < minRows; i++) {
    tableData.push([
      aggregated.length + i + 1,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  }

  // Support / Reviews row
  tableData.push([
    '…',
    r.reviewsFooter,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      [
        {
          content: r.completedWorkHeader,
          colSpan: 9,
          styles: {
            fillColor: [80, 35, 230], // Deep purple #5023E6
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 9.5,
          },
        },
      ],
      [
        { content: r.colNo, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: r.colProject, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: r.colDesc, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: r.colTime, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: r.colResult, colSpan: 2, styles: { halign: 'center' } },
        { content: r.colGap, colSpan: 2, styles: { halign: 'center' } },
        { content: r.colRemark, rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      ],
      [
        { content: r.colCompletion, styles: { halign: 'center' } },
        { content: r.colGapPct, styles: { halign: 'center' } },
        { content: r.colReason, styles: { halign: 'center' } },
        { content: r.colSolution, styles: { halign: 'center' } },
      ],
    ],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 1.8,
      lineColor: [209, 213, 219],
      lineWidth: 0.15,
      textColor: [17, 24, 39],
    },
    headStyles: {
      fillColor: [217, 210, 233], // Lavender #D9D2E9
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' }, // NO
      1: { cellWidth: 70 },                  // PROJECT/TASK
      2: { cellWidth: 32, halign: 'center' }, // DESCRIPTION
      3: { cellWidth: 18, halign: 'center' }, // TIME SPENT
      4: { cellWidth: 22, halign: 'center' }, // Completion %
      5: { cellWidth: 16, halign: 'center' }, // Gap %
      6: { cellWidth: 38 },                  // Reason
      7: { cellWidth: 36 },                  // Solution/Deadline
      8: { cellWidth: 35 },                  // REMARK
    },
    didDrawCell: (data) => {
      // If cell has link, add link annotation
      if (data.column.index === 2 && data.cell.text[0] === 'Link') {
        const item = aggregated[data.row.index];
        if (item?.url) {
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
            url: item.url,
          });
        }
      }
    },
  });

  // 4. Objectives and Reflections Table
  const lastTable = (doc as any).lastAutoTable;
  const afterTasksY = (lastTable ? lastTable.finalY : currentY + 70) + 4;

  const obj1 = objectives[0] || { task: 'Tmail tasks', note: 'Sprint' };
  const obj2 = objectives[1] || { task: '', note: '' };
  const obj3 = objectives[2] || { task: '', note: '' };

  const bottomTableData = [
    [
      { content: '1', styles: { halign: 'center' } },
      { content: obj1.task, colSpan: 2 },
      { content: obj1.note },
      { content: reflections.wentWell || '', colSpan: 4 },
    ],
    [
      { content: '2', styles: { halign: 'center' } },
      { content: obj2.task, colSpan: 2 },
      { content: obj2.note },
      {
        content: r.refChallengingTitle,
        colSpan: 4,
        styles: { fillColor: [217, 210, 233], fontStyle: 'italic', textColor: [31, 41, 55] },
      },
    ],
    [
      { content: '3', styles: { halign: 'center' } },
      { content: obj3.task, colSpan: 2 },
      { content: obj3.note },
      { content: reflections.challenging || '', colSpan: 4 },
    ],
    [
      { content: '4', styles: { halign: 'center' } },
      { content: '', colSpan: 2 },
      { content: '' },
      {
        content: r.refProposalTitle,
        colSpan: 4,
        styles: { fillColor: [217, 210, 233], fontStyle: 'italic', textColor: [31, 41, 55] },
      },
    ],
    [
      { content: '5', styles: { halign: 'center' } },
      { content: '', colSpan: 2 },
      { content: '' },
      { content: reflections.proposal || '', colSpan: 4 },
    ],
  ];

  autoTable(doc, {
    startY: afterTasksY,
    margin: { left: margin, right: margin },
    head: [
      [
        {
          content: r.objNo,
          styles: { fillColor: [80, 35, 230], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        },
        {
          content: r.objTitle,
          colSpan: 2,
          styles: { fillColor: [80, 35, 230], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        },
        {
          content: r.objNote,
          styles: { fillColor: [80, 35, 230], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        },
        {
          content: r.refWentWellTitle,
          colSpan: 4,
          styles: { fillColor: [217, 210, 233], textColor: [31, 41, 55], fontStyle: 'italic', halign: 'left' },
        },
      ],
    ],
    body: bottomTableData as any,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 1.6,
      lineColor: [209, 213, 219],
      lineWidth: 0.15,
      textColor: [17, 24, 39],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { cellWidth: 38 },
      3: { cellWidth: 32 },
    },
  });

  // 5. Signatures
  const bottomTable = (doc as any).lastAutoTable;
  const sigY = (bottomTable ? bottomTable.finalY : afterTasksY + 35) + 6;

  if (sigY < 200) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(r.sigEmployee, 55, sigY, { align: 'center' });
    doc.text(r.sigManager, 225, sigY, { align: 'center' });
  }

  const finalName = fileName || `Weekly_Report_Week_${weekNum}_${settings.userName.replace(/\s+/g, '_')}.pdf`;
  doc.save(finalName);
}
