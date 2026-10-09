import React, { useEffect, useRef, useState } from 'react';
import { Settings, Download, Upload, RotateCcw, Trash2, Building, Github, Languages, Clock, ImageIcon, X } from 'lucide-react';
import { LANGUAGES, type Language, type UserSettings } from '../types';
import {
  exportAllDataJson,
  importAllDataJson,
  generateSampleData,
  saveStoredEntries,
  saveStoredDayLogs,
  saveStoredObjectives,
  saveStoredReflections,
  DEFAULT_REFLECTIONS,
  MAX_BACKUP_BYTES,
  MAX_LOGO_CHARS,
} from '../utils/storage';
import { getWeekdayNames } from '../utils/dateUtils';
import { clampNumber, downloadBlob } from '../utils/security';
import { useI18n } from '../i18n';
import { Modal } from '../ui/Modal';
import { useFeedback } from '../ui/feedback';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (settings: UserSettings) => void;
  onRefreshData: () => void;
}

const REPO_PATTERN = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024;
const LOGO_MAX_WIDTH = 800;

/**
 * Decodes the image and re-encodes it as PNG through a canvas, so only plain
 * pixels are stored (no SVG scripts, no metadata) and the size stays small.
 */
async function processLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('invalid');
  if (file.size > MAX_LOGO_FILE_BYTES) throw new Error('too_large');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LOGO_MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/png');
  if (dataUrl.length > MAX_LOGO_CHARS) throw new Error('too_large');
  return dataUrl;
}

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <section className="space-y-3 pt-4 first:pt-0 border-t first:border-t-0 border-slate-100">
    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
      {icon}
      <span>{title}</span>
    </h4>
    {children}
  </section>
);

const LogoPicker: React.FC<{ value?: string; onChange: (logo: string | undefined) => void }> = ({ value, onChange }) => {
  const { t } = useI18n();
  const { notify } = useFeedback();
  const s = t.settings;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await processLogo(file));
    } catch (err) {
      notify((err as Error).message === 'too_large' ? s.logoTooLarge : s.logoInvalid, { tone: 'error' });
    }
  };

  return (
    <>
      <p className="text-[11px] text-slate-500">{s.logoHint}</p>
      <div className="flex items-center gap-3 flex-wrap">
        {value && (
          <>
            <div className="h-14 px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center">
              <img src={value} alt="" className="h-full w-auto object-contain" />
            </div>
            <button type="button" onClick={() => inputRef.current?.click()} className="btn-tonal">
              <Upload className="w-3.5 h-3.5" />
              {s.logoReplace}
            </button>
            <button type="button" onClick={() => onChange(undefined)} className="btn-text text-rose-600 hover:bg-rose-50">
              <X className="w-3.5 h-3.5" />
              {s.logoRemove}
            </button>
          </>
        )}
        {!value && (
          <button type="button" onClick={() => inputRef.current?.click()} className="btn-tonal">
            <Upload className="w-3.5 h-3.5" />
            {s.logoUpload}
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={handleFile} className="hidden" />
      </div>
    </>
  );
};

const toggleDay = (days: number[], day: number) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort());

const OfficeDaysPicker: React.FC<{ value: number[]; onChange: (days: number[]) => void }> = ({ value, onChange }) => {
  const { lang } = useI18n();
  const weekdayNames = getWeekdayNames(lang, false).slice(0, 5);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {weekdayNames.map((name, i) => {
        const day = i + 1;
        const selected = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(toggleDay(value, day))}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border capitalize transition-all ${
              selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
};

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, settings, onSaveSettings, onRefreshData }) => {
  const { t } = useI18n();
  const { notify, confirm } = useFeedback();
  const s = t.settings;

  const [form, setForm] = useState(settings);
  const [repos, setRepos] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reload the fields from the current settings every time the dialog opens
  useEffect(() => {
    if (isOpen) {
      setForm(settings);
      setRepos(settings.defaultRepos.join(', '));
    }
  }, [isOpen, settings]);

  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const repoList = repos.split(',').map((r) => r.trim()).filter(Boolean);
    const invalid = repoList.filter((r) => !REPO_PATTERN.test(r));
    onSaveSettings({
      ...form,
      userName: form.userName.trim(),
      userRole: form.userRole.trim(),
      companyName: form.companyName.trim(),
      weeklyTargetHours: clampNumber(form.weeklyTargetHours, 0, 168, 40),
      dailyStandardHours: clampNumber(form.dailyStandardHours, 0, 24, 8),
      defaultRepos: repoList.filter((r) => REPO_PATTERN.test(r)).slice(0, 20),
      githubToken: form.githubToken?.trim() || undefined,
    });
    notify(s.saved, invalid.length ? { tone: 'info', detail: s.reposInvalid(invalid.join(', ')) } : undefined);
    onClose();
  };

  const handleExportBackup = () => {
    downloadBlob(new Blob([exportAllDataJson()], { type: 'application/json' }), `ChronoWork_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    notify(s.backupDone);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) return notify(s.restoreTooLarge, { tone: 'error' });
    const ok = await confirm({ title: s.confirmRestoreTitle, message: s.confirmRestore, confirmLabel: s.restore, danger: true });
    if (!ok) return;
    const result = importAllDataJson(await file.text());
    if (result.ok) {
      onRefreshData();
      notify(s.restoreDone(result.entries));
      onClose();
    } else {
      notify(result.reason === 'too_large' ? s.restoreTooLarge : s.restoreInvalid, { tone: 'error' });
    }
  };

  const handleLoadSample = async () => {
    const ok = await confirm({ title: s.confirmLoadSampleTitle, message: s.confirmLoadSample, confirmLabel: s.loadSample });
    if (!ok) return;
    const sample = generateSampleData();
    saveStoredEntries(sample.entries);
    saveStoredDayLogs(sample.dayLogs);
    onRefreshData();
    notify(s.sampleLoaded);
    onClose();
  };

  const handleClearAll = async () => {
    const ok = await confirm({ title: s.confirmClearAllTitle, message: s.confirmClearAll, confirmLabel: s.clearAll, danger: true });
    if (!ok) return;
    saveStoredEntries([]);
    saveStoredDayLogs({});
    saveStoredObjectives([]);
    saveStoredReflections(DEFAULT_REFLECTIONS);
    onRefreshData();
    notify(s.cleared, { tone: 'info' });
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={onClose} size="lg" icon={<Settings className="w-5 h-5" />} title={s.title}>
      <form onSubmit={handleSave} className="space-y-4">
        <Section icon={<Building className="w-3.5 h-3.5 text-slate-500" />} title={s.sectionProfile}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="set-name">{s.nameLabel}</label>
              <input id="set-name" type="text" maxLength={120} value={form.userName} onChange={(e) => set('userName', e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="field-label" htmlFor="set-role">{s.roleLabel}</label>
              <input id="set-role" type="text" maxLength={120} value={form.userRole} onChange={(e) => set('userRole', e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="set-company">{s.companyLabel}</label>
            <input id="set-company" type="text" maxLength={120} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} className="input-field" />
          </div>
        </Section>

        <Section icon={<ImageIcon className="w-3.5 h-3.5 text-slate-500" />} title={s.sectionBranding}>
          <LogoPicker value={form.logoDataUrl} onChange={(logo) => set('logoDataUrl', logo)} />
        </Section>

        <Section icon={<Clock className="w-3.5 h-3.5 text-slate-500" />} title={s.sectionWork}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="set-weekly">{s.weeklyTarget}</label>
              <input id="set-weekly" type="number" min="0" max="168" step="0.5" value={form.weeklyTargetHours} onChange={(e) => set('weeklyTargetHours', Number(e.target.value))} className="input-field tabular-nums" />
            </div>
            <div>
              <label className="field-label" htmlFor="set-daily">{s.dailyStandard}</label>
              <input id="set-daily" type="number" min="0" max="24" step="0.5" value={form.dailyStandardHours} onChange={(e) => set('dailyStandardHours', Number(e.target.value))} className="input-field tabular-nums" />
            </div>
          </div>
          <div>
            <span className="field-label">{s.officeDaysLabel}</span>
            <p className="text-[11px] text-slate-500 mb-2">{s.officeDaysDesc}</p>
            <OfficeDaysPicker value={form.defaultOfficeDays} onChange={(days) => set('defaultOfficeDays', days)} />
          </div>
        </Section>

        <Section icon={<Languages className="w-3.5 h-3.5 text-slate-500" />} title={s.sectionLanguage}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="field-label" htmlFor="set-lang">{s.uiLanguage}</label>
              <select id="set-lang" value={form.language} onChange={(e) => set('language', e.target.value as Language)} className="input-field">
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{t.language.names[l]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="set-report-lang">{s.reportLanguage}</label>
              <select
                id="set-report-lang"
                value={form.reportLanguage ?? 'en'}
                onChange={(e) => set('reportLanguage', e.target.value as Language)}
                className="input-field"
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{t.language.names[l]}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        <Section icon={<Github className="w-3.5 h-3.5 text-slate-700" />} title={s.sectionGithub}>
          <div>
            <label className="field-label" htmlFor="set-repos">{s.reposLabel}</label>
            <input id="set-repos" type="text" value={repos} onChange={(e) => setRepos(e.target.value)} placeholder={s.reposPlaceholder} className="input-field text-xs font-mono" />
          </div>
          <div>
            <label className="field-label" htmlFor="set-token">{s.tokenLabel}</label>
            <input
              id="set-token"
              type="password"
              autoComplete="off"
              maxLength={255}
              value={form.githubToken ?? ''}
              onChange={(e) => set('githubToken', e.target.value)}
              placeholder="github_pat_…"
              className="input-field text-xs font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">{s.tokenHint}</p>
          </div>
        </Section>

        <button type="submit" className="btn-filled w-full py-2.5">{s.save}</button>

        <Section icon={<Download className="w-3.5 h-3.5 text-slate-500" />} title={s.sectionData}>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={handleExportBackup} className="btn-outlined">
              <Download className="w-3.5 h-3.5" />
              {s.backup}
            </button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-outlined">
              <Upload className="w-3.5 h-3.5" />
              {s.restore}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" onChange={handleImportFile} className="hidden" />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button type="button" onClick={handleLoadSample} className="btn-text">
              <RotateCcw className="w-3.5 h-3.5" />
              {s.loadSample}
            </button>
            <button type="button" onClick={handleClearAll} className="btn-text text-rose-600 hover:bg-rose-50">
              <Trash2 className="w-3.5 h-3.5" />
              {s.clearAll}
            </button>
          </div>
        </Section>
      </form>
    </Modal>
  );
};
