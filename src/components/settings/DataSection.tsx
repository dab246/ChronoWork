import React, { useRef } from 'react';
import { Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useFeedback } from '../../ui/feedback';
import { downloadBlob } from '../../utils/security';
import {
  DEFAULT_REFLECTIONS,
  MAX_BACKUP_BYTES,
  exportAllDataJson,
  generateSampleData,
  importAllDataJson,
  saveStoredDayLogs,
  saveStoredEntries,
  saveStoredObjectives,
  saveStoredReflections,
} from '../../utils/storage';
import { FieldGroup } from './fields';
import type { SettingsSectionProps } from './settingsModel';

/** Backup / restore, sample data and the delete-everything action. */
function useDataActions(onRefreshData: () => void) {
  const { t } = useI18n();
  const { notify, confirm } = useFeedback();
  const s = t.settings;

  const backup = () => {
    downloadBlob(new Blob([exportAllDataJson()], { type: 'application/json' }), `ChronoWork_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    notify(s.backupDone);
  };

  const restore = async (file: File) => {
    if (file.size > MAX_BACKUP_BYTES) return notify(s.restoreTooLarge, { tone: 'error' });
    const ok = await confirm({ title: s.confirmRestoreTitle, message: s.confirmRestore, confirmLabel: s.restore, danger: true });
    if (!ok) return;
    const result = importAllDataJson(await file.text());
    if (!result.ok) return notify(result.reason === 'too_large' ? s.restoreTooLarge : s.restoreInvalid, { tone: 'error' });
    onRefreshData();
    notify(s.restoreDone(result.entries));
  };

  const loadSample = async () => {
    const ok = await confirm({ title: s.confirmLoadSampleTitle, message: s.confirmLoadSample, confirmLabel: s.loadSample });
    if (!ok) return;
    const sample = generateSampleData();
    saveStoredEntries(sample.entries);
    saveStoredDayLogs(sample.dayLogs);
    onRefreshData();
    notify(s.sampleLoaded);
  };

  const clearAll = async () => {
    const ok = await confirm({ title: s.confirmClearAllTitle, message: s.confirmClearAll, confirmLabel: s.clearAll, danger: true });
    if (!ok) return;
    saveStoredEntries([]);
    saveStoredDayLogs({});
    saveStoredObjectives([]);
    saveStoredReflections(DEFAULT_REFLECTIONS);
    onRefreshData();
    notify(s.cleared, { tone: 'info' });
  };

  return { backup, restore, loadSample, clearAll };
}

export const DataSection: React.FC<SettingsSectionProps> = ({ onRefreshData }) => {
  const { t } = useI18n();
  const s = t.settings;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actions = useDataActions(onRefreshData);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void actions.restore(file);
  };

  return (
    <>
      <FieldGroup title={s.backupTitle} description={s.backupDesc}>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={actions.backup} className="btn-outlined">
            <Download className="w-3.5 h-3.5" />
            {s.backup}
          </button>
          <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outlined">
            <Upload className="w-3.5 h-3.5" />
            {s.restore}
          </button>
          <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
        </div>
      </FieldGroup>
      <FieldGroup title={s.sampleTitle} description={s.confirmLoadSample}>
        <button type="button" onClick={actions.loadSample} className="btn-tonal w-fit">
          <RotateCcw className="w-3.5 h-3.5" />
          {s.loadSample}
        </button>
      </FieldGroup>
      <FieldGroup title={s.dangerTitle} description={s.confirmClearAll}>
        <button type="button" onClick={actions.clearAll} className="btn-danger w-fit">
          <Trash2 className="w-3.5 h-3.5" />
          {s.clearAll}
        </button>
      </FieldGroup>
    </>
  );
};
