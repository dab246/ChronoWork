import React, { useEffect, useState } from 'react';
import { Copy, FileSpreadsheet } from 'lucide-react';
import { getReportTsv } from '../../report';
import type { ReportInput } from '../../report/model';
import { useI18n } from '../../i18n';
import { useFeedback } from '../../ui/feedback';
import { Modal } from '../../ui/Modal';
import type { ReportExport } from './useReportExport';

type GuideTab = 'paste' | 'data';

const PasteGuide: React.FC<{ actions: ReportExport }> = ({ actions: { busy, exportOptions, runExport } }) => {
  const { t } = useI18n();
  const g = t.report.guide;
  return (
    <div className="space-y-4 text-xs">
      <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 space-y-2">
        <h4 className="font-bold text-indigo-950 text-sm">{g.method1Title}</h4>
        <ol className="list-decimal list-inside space-y-1.5 text-indigo-900 font-medium leading-relaxed">
          {g.method1Steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
        <h4 className="font-bold text-emerald-950 text-sm">{g.method2Title}</h4>
        <p className="text-emerald-900">{g.method2Desc}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {exportOptions.map(({ format, label, icon: Icon, className }) => (
            <button key={format} type="button" disabled={busy !== null} onClick={() => runExport(format)} className={className}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const TsvData: React.FC<{ tsv: string }> = ({ tsv }) => {
  const { t } = useI18n();
  const { notify } = useFeedback();
  const copyTsv = async () => {
    try {
      await navigator.clipboard.writeText(tsv);
      notify(t.report.guide.tsvCopied);
    } catch {
      notify(t.report.clipboardBlocked, { tone: 'error' });
    }
  };
  return (
    <div className="text-xs">
      <div className="flex items-center justify-between pb-1.5">
        <span className="font-bold text-slate-800">{t.report.guide.tsvLabel}</span>
        <button type="button" onClick={copyTsv} className="btn-text">
          {t.report.guide.copyTsv}
        </button>
      </div>
      <textarea readOnly rows={10} value={tsv} className="w-full font-mono text-[11px] p-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800" />
    </div>
  );
};

interface ReportGuideModalProps {
  open: boolean;
  onClose: () => void;
  reportInput: ReportInput;
  actions: ReportExport;
}

/** How to paste the report into the company sheet, plus the raw TSV data. */
export const ReportGuideModal: React.FC<ReportGuideModalProps> = ({ open, onClose, reportInput, actions }) => {
  const { t } = useI18n();
  const g = t.report.guide;
  const [tab, setTab] = useState<GuideTab>('paste');
  const [tsv, setTsv] = useState('');
  const tabLabels: Record<GuideTab, string> = { paste: g.tabPaste, data: g.tabData };

  useEffect(() => {
    if (open && tab === 'data') getReportTsv(reportInput).then(setTsv);
  }, [open, tab]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      icon={<FileSpreadsheet className="w-5 h-5" />}
      title={g.title}
      subtitle={g.subtitle}
      footer={
        <div className="flex items-center justify-between">
          <button type="button" onClick={actions.copyToClipboard} className="btn-filled">
            <Copy className="w-3.5 h-3.5" />
            {g.copyNow}
          </button>
          <button type="button" onClick={onClose} className="btn-text">
            {t.common.close}
          </button>
        </div>
      }
    >
      <div role="tablist" className="flex border-b border-slate-200 gap-4 text-xs font-semibold mb-4">
        {(['paste', 'data'] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`pb-2.5 border-b-2 transition-colors ${tab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {tabLabels[id]}
          </button>
        ))}
      </div>
      {tab === 'paste' ? <PasteGuide actions={actions} /> : <TsvData tsv={tsv} />}
    </Modal>
  );
};
