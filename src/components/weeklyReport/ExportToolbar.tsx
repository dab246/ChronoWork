import React from 'react';
import { Copy, Printer, Table } from 'lucide-react';
import { useI18n } from '../../i18n';
import type { ReportExport } from './useReportExport';

const Spinner = () => <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />;

export const ExportToolbar: React.FC<{ actions: ReportExport }> = ({ actions: { busy, exportOptions, runExport, copyToClipboard } }) => {
  const { t } = useI18n();
  const disabled = busy !== null;
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      {exportOptions.map(({ format, label, hint, icon: Icon, className }) => (
        <button key={format} type="button" onClick={() => runExport(format)} disabled={disabled} title={hint} className={className}>
          {busy === format ? <Spinner /> : <Icon className="w-3.5 h-3.5" />}
          {label}
        </button>
      ))}
      <button type="button" onClick={copyToClipboard} disabled={disabled} title={t.report.copyHint} className="btn-filled">
        <Copy className="w-3.5 h-3.5" />
        {t.report.copyToSheet}
      </button>
      <button type="button" onClick={() => runExport('csv')} disabled={disabled} className="btn-outlined">
        <Table className="w-3.5 h-3.5" />
        {t.report.exportCsv}
      </button>
      <button type="button" onClick={() => window.print()} className="btn-outlined">
        <Printer className="w-3.5 h-3.5" />
        {t.report.print}
      </button>
    </div>
  );
};
