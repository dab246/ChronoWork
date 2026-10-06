import { useState } from 'react';
import type React from 'react';
import { Download, FileDown, FileSpreadsheet } from 'lucide-react';
import { copyReportToClipboard, exportReport, type ExportFormat } from '../../report';
import type { ReportInput } from '../../report/model';
import { useI18n } from '../../i18n';
import { useFeedback } from '../../ui/feedback';

export interface ExportOption {
  format: ExportFormat;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}

export interface ReportExport {
  busy: ExportFormat | 'copy' | null;
  exportOptions: ExportOption[];
  runExport: (format: ExportFormat) => Promise<void>;
  copyToClipboard: () => Promise<void>;
}

/** Export / copy actions of the weekly report, with a shared busy state and user feedback. */
export function useReportExport(reportInput: ReportInput): ReportExport {
  const { t } = useI18n();
  const { notify } = useFeedback();
  const [busy, setBusy] = useState<ReportExport['busy']>(null);

  const runExport = async (format: ExportFormat) => {
    setBusy(format);
    try {
      notify(t.report.exported(await exportReport(format, reportInput)));
    } catch (err) {
      console.error('Report export failed', err);
      notify(t.report.exportFailed, { tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const copyToClipboard = async () => {
    setBusy('copy');
    const result = await copyReportToClipboard(reportInput);
    setBusy(null);
    if (result === 'failed') notify(t.report.clipboardBlocked, { tone: 'error' });
    else notify(result === 'rich' ? t.report.copiedRich : t.report.copiedPlain, { detail: t.report.pasteTip });
  };

  const exportOptions: ExportOption[] = [
    { format: 'xlsx', label: t.report.exportExcel, hint: t.report.exportExcelHint, icon: Download, className: 'btn-filled bg-emerald-700 hover:bg-emerald-800' },
    { format: 'ods', label: t.report.exportOds, hint: t.report.exportOdsHint, icon: FileSpreadsheet, className: 'btn-filled bg-violet-700 hover:bg-violet-800' },
    { format: 'pdf', label: busy === 'pdf' ? t.report.exportingPdf : t.report.exportPdf, hint: t.report.exportPdfHint, icon: FileDown, className: 'btn-filled bg-rose-700 hover:bg-rose-800' },
  ];

  return { busy, exportOptions, runExport, copyToClipboard };
}
