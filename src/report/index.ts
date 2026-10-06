import { downloadBlob } from '../utils/security';
import { buildReportSheet, type ReportInput, type ReportSheet } from './model';
import { renderCsv, renderHtml, renderTsv } from './html';

export type ExportFormat = 'xlsx' | 'ods' | 'pdf' | 'csv';

function imageSize(dataUrl: string): Promise<{ width: number; height: number } | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve(undefined);
    img.src = dataUrl;
  });
}

export async function prepareReport(input: ReportInput): Promise<ReportSheet> {
  const logoSize = input.settings.logoDataUrl ? await imageSize(input.settings.logoDataUrl) : undefined;
  return buildReportSheet({ ...input, logoSize });
}

/** Builds the report in the given format and downloads it. Heavy libraries are loaded on demand. */
export async function exportReport(format: ExportFormat, input: ReportInput): Promise<string> {
  const sheet = await prepareReport(input);
  const author = input.settings.userName || 'ChronoWork';
  const fileName = `${sheet.fileBase}.${format}`;

  let blob: Blob;
  switch (format) {
    case 'xlsx':
      blob = await (await import('./excel')).renderExcel(sheet, author);
      break;
    case 'ods':
      blob = await (await import('./ods')).renderOds(sheet, author);
      break;
    case 'pdf':
      blob = await (await import('./pdf')).renderPdf(sheet, author);
      break;
    case 'csv':
      blob = new Blob([renderCsv(sheet)], { type: 'text/csv;charset=utf-8' });
      break;
  }
  downloadBlob(blob, fileName);
  return fileName;
}

export async function getReportTsv(input: ReportInput): Promise<string> {
  return renderTsv(await prepareReport(input));
}

export type CopyResult = 'rich' | 'plain' | 'failed';

/** Copies the formatted report (HTML + TSV) to the clipboard. */
export async function copyReportToClipboard(input: ReportInput): Promise<CopyResult> {
  const sheet = await prepareReport(input);
  const html = renderHtml(sheet);
  const tsv = renderTsv(sheet);

  try {
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([tsv], { type: 'text/plain' }),
        }),
      ]);
      return 'rich';
    }
  } catch {
    // Fall through to the plain-text fallback
  }

  try {
    await navigator.clipboard.writeText(tsv);
    return 'plain';
  } catch {
    return 'failed';
  }
}
