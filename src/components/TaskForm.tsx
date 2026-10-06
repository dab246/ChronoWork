import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link2, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { TASK_CATEGORIES, type TaskCategory, type TimeEntry, type UserSettings } from '../types';
import { DatePicker } from '../ui/DatePicker';
import { formatDateIso, formatLongDate, parseDateIso } from '../utils/dateUtils';
import { clampNumber, safeUrl } from '../utils/security';
import { GitHubSearchField, projectForRepo } from './GitHubSearchField';

export type TaskDraft = Omit<TimeEntry, 'id' | 'createdAt'>;

interface TaskFormProps {
  settings: UserSettings;
  projects: string[];
  date: string;
  editing?: TimeEntry | null;
  showDate?: boolean;
  submitLabel: string;
  onSubmit: (draft: TaskDraft) => void;
  /** Extra buttons rendered left of the submit button */
  actions?: React.ReactNode;
}

interface FormState {
  taskName: string;
  project: string;
  category: TaskCategory;
  date: string;
  hours: string;
  githubUrl: string;
  githubNumber?: number;
  description: string;
  completionPct: number;
  gapReason: string;
  gapSolution: string;
  remark: string;
}

function initialState(editing: TimeEntry | null | undefined, date: string): FormState {
  return {
    taskName: editing?.taskName ?? '',
    project: editing?.project ?? '',
    category: editing?.category ?? 'development',
    date: editing?.date ?? date,
    hours: String(editing?.hours ?? 1),
    githubUrl: editing?.githubUrl ?? '',
    githubNumber: editing?.githubNumber,
    description: editing?.description ?? '',
    completionPct: editing?.completionPct ?? 100,
    gapReason: editing?.gapReason ?? '',
    gapSolution: editing?.gapSolution ?? '',
    remark: editing?.remark ?? editing?.notes ?? '',
  };
}

const QUICK_HOURS = [1, 2, 4, 8];

export const TaskForm: React.FC<TaskFormProps> = ({ settings, projects, date, editing, showDate, submitLabel, onSubmit, actions }) => {
  const { t, lang } = useI18n();
  const ids = useId();
  const [form, setForm] = useState<FormState>(() => initialState(editing, date));
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initialState(editing, date));
    setError('');
  }, [editing, date]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const gap = 100 - form.completionPct;

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const taskName = form.taskName.trim();
    const hours = Number(form.hours);
    const url = form.githubUrl.trim();
    if (!taskName) return setError(t.dayLog.taskRequired);
    if (!Number.isFinite(hours) || hours < 0.25 || hours > 24) return setError(t.dayLog.hoursInvalid);
    if (url && !safeUrl(url)) return setError(t.dayLog.linkInvalid);

    const completionPct = clampNumber(form.completionPct, 0, 100, 100);
    onSubmit({
      date: form.date,
      taskName: taskName.slice(0, 500),
      project: form.project.trim().slice(0, 120),
      category: form.category,
      hours,
      durationMinutes: Math.round(hours * 60),
      githubUrl: safeUrl(url),
      githubNumber: url ? form.githubNumber : undefined,
      description: form.description.trim() || undefined,
      completionPct,
      gapPct: 100 - completionPct,
      gapReason: completionPct < 100 ? form.gapReason.trim() || undefined : undefined,
      gapSolution: completionPct < 100 ? form.gapSolution.trim() || undefined : undefined,
      remark: form.remark.trim() || undefined,
      notes: undefined,
      isCompleted: completionPct === 100,
    });
    if (!editing) setForm(initialState(null, form.date));
    setError('');
  };

  const fieldId = (name: string) => `${ids}-${name}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            role="alert"
            className="px-3 py-2.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl font-medium"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <GitHubSearchField
        settings={settings}
        onSelect={(item) => {
          setForm((f) => ({
            ...f,
            taskName: `${item.title} #${item.number}`,
            githubUrl: item.html_url,
            githubNumber: item.number,
            project: projectForRepo(item.repoName, projects) ?? f.project,
          }));
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-7">
          <label className="field-label" htmlFor={fieldId('task')}>
            {t.dayLog.taskNameLabel}
          </label>
          <input
            id={fieldId('task')}
            type="text"
            maxLength={500}
            placeholder={t.dayLog.taskNamePlaceholder}
            value={form.taskName}
            onChange={(e) => set('taskName', e.target.value)}
            className="input-field font-semibold"
          />
          {form.githubUrl && safeUrl(form.githubUrl) && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-700 mt-1.5">
              <Link2 className="w-3.5 h-3.5 shrink-0" />
              <a href={safeUrl(form.githubUrl)} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-xs">
                {form.githubUrl}
              </a>
              <button type="button" onClick={() => set('githubUrl', '')} className="icon-btn p-0.5" aria-label={t.entryModal.removeLink} title={t.entryModal.removeLink}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="md:col-span-5">
          <label className="field-label" htmlFor={fieldId('project')}>
            {t.dayLog.projectLabel}
          </label>
          <input
            id={fieldId('project')}
            type="text"
            list={fieldId('projects')}
            maxLength={120}
            placeholder={t.dayLog.projectPlaceholder}
            value={form.project}
            onChange={(e) => set('project', e.target.value)}
            className="input-field"
          />
          <datalist id={fieldId('projects')}>
            {projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${showDate ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {showDate && (
          <div>
            <span className="field-label">{t.entryModal.dateLabel}</span>
            <DatePicker
              variant="field"
              value={parseDateIso(form.date)}
              onChange={(d) => set('date', formatDateIso(d))}
              label={formatLongDate(form.date, lang)}
            />
          </div>
        )}
        <div>
          <label className="field-label" htmlFor={fieldId('category')}>
            {t.entryModal.categoryLabel}
          </label>
          <select id={fieldId('category')} value={form.category} onChange={(e) => set('category', e.target.value as TaskCategory)} className="input-field">
            {TASK_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t.categories[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor={fieldId('hours')}>
            {t.dayLog.hoursLabel}
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id={fieldId('hours')}
              type="number"
              step="0.25"
              min="0.25"
              max="24"
              inputMode="decimal"
              value={form.hours}
              onChange={(e) => set('hours', e.target.value)}
              className="input-field w-20 text-center font-bold tabular-nums"
            />
            {QUICK_HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => set('hours', String(h))}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-full transition-colors ${
                  Number(form.hours) === h ? 'bg-indigo-600 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'
                }`}
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="field-label" htmlFor={fieldId('link')}>
            {t.dayLog.linkLabel}
          </label>
          <input
            id={fieldId('link')}
            type="url"
            maxLength={2048}
            placeholder={t.dayLog.linkPlaceholder}
            value={form.githubUrl}
            onChange={(e) => set('githubUrl', e.target.value)}
            className="input-field text-xs"
          />
        </div>
        <div>
          <label className="field-label" htmlFor={fieldId('desc')}>
            {t.dayLog.descriptionLabel}
          </label>
          <input
            id={fieldId('desc')}
            type="text"
            maxLength={2000}
            placeholder={t.dayLog.descriptionPlaceholder}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="input-field text-xs"
          />
        </div>
      </div>

      <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-bold text-neutral-800">{t.dayLog.progressTitle}</span>
          <div className="flex items-center gap-2">
            <label htmlFor={fieldId('pct')} className="text-xs text-neutral-500 font-medium">
              {t.dayLog.completionLabel}
            </label>
            <input
              id={fieldId('pct')}
              type="range"
              min="0"
              max="100"
              step="5"
              value={form.completionPct}
              onChange={(e) => set('completionPct', Number(e.target.value))}
              className="w-28 accent-indigo-600"
            />
            <span className="w-11 text-right text-xs font-black tabular-nums">{form.completionPct}%</span>
            {gap > 0 && <span className="text-xs text-amber-700 font-bold">({t.dayLog.gapLabel(gap)})</span>}
          </div>
        </div>

        <AnimatePresence initial={false}>
          {gap > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-neutral-200">
                <div>
                  <label className="field-label" htmlFor={fieldId('reason')}>
                    {t.dayLog.gapReasonLabel}
                  </label>
                  <input
                    id={fieldId('reason')}
                    type="text"
                    maxLength={2000}
                    placeholder={t.dayLog.gapReasonPlaceholder}
                    value={form.gapReason}
                    onChange={(e) => set('gapReason', e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor={fieldId('solution')}>
                    {t.dayLog.gapSolutionLabel}
                  </label>
                  <input
                    id={fieldId('solution')}
                    type="text"
                    maxLength={2000}
                    placeholder={t.dayLog.gapSolutionPlaceholder}
                    value={form.gapSolution}
                    onChange={(e) => set('gapSolution', e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <input
          type="text"
          maxLength={2000}
          aria-label={t.dayLog.remark}
          placeholder={t.dayLog.remarkPlaceholder}
          value={form.remark}
          onChange={(e) => set('remark', e.target.value)}
          className="input-field text-xs flex-1"
        />
        <div className="flex items-center justify-end gap-2">
          {actions}
          <button type="submit" className="btn-filled px-5 py-2.5">
            {submitLabel}
          </button>
        </div>
      </div>
    </form>
  );
};
