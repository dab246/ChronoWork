import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link2, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { TASK_CATEGORIES, type TaskCategory, type TimeEntry, type UserSettings } from '../types';
import { DatePicker } from '../ui/DatePicker';
import { formatDateIso, formatLongDate, parseDateIso } from '../utils/dateUtils';
import { safeUrl } from '../utils/security';
import { GitHubSearchField, projectForRepo } from './GitHubSearchField';
import { initialState, toDraft, validationError, type FormState, type TaskDraft } from './taskFormModel';

export type { TaskDraft } from './taskFormModel';

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

type SetField = <K extends keyof FormState>(key: K, value: FormState[K]) => void;

const QUICK_HOURS = [1, 2, 4, 8];

const expand = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: 'auto' },
  exit: { opacity: 0, height: 0 },
};

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  id: string;
  label: string;
  onValue: (value: string) => void;
}

const TextField: React.FC<TextFieldProps> = ({ id, label, onValue, className = 'input-field text-xs', ...input }) => (
  <div>
    <label className="field-label" htmlFor={id}>
      {label}
    </label>
    <input id={id} type="text" {...input} onChange={(e) => onValue(e.target.value)} className={className} />
  </div>
);

const FormError: React.FC<{ message: string }> = ({ message }) => (
  <AnimatePresence>
    {message && (
      <motion.div {...expand} role="alert" className="px-3 py-2.5 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-xl font-medium">
        {message}
      </motion.div>
    )}
  </AnimatePresence>
);

const LinkPreview: React.FC<{ url: string; onRemove: () => void }> = ({ url, onRemove }) => {
  const { t } = useI18n();
  const href = safeUrl(url);
  if (!href) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-indigo-700 mt-1.5">
      <Link2 className="w-3.5 h-3.5 shrink-0" />
      <a href={href} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-xs">
        {url}
      </a>
      <button type="button" onClick={onRemove} className="icon-btn p-0.5" aria-label={t.entryModal.removeLink} title={t.entryModal.removeLink}>
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

const HoursField: React.FC<{ id: string; value: string; onValue: (value: string) => void }> = ({ id, value, onValue }) => {
  const { t } = useI18n();
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {t.dayLog.hoursLabel}
      </label>
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          id={id}
          type="number"
          step="0.25"
          min="0.25"
          max="24"
          inputMode="decimal"
          value={value}
          onChange={(e) => onValue(e.target.value)}
          className="input-field w-20 text-center font-bold tabular-nums"
        />
        {QUICK_HOURS.map((h) => {
          const active = Number(value) === h;
          return (
            <button
              key={h}
              type="button"
              onClick={() => onValue(String(h))}
              className={`px-2.5 py-1.5 text-xs font-bold rounded-full transition-colors ${active ? 'bg-indigo-600 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800'}`}
            >
              {h}h
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ProgressSection: React.FC<{ form: FormState; set: SetField; fieldId: (name: string) => string }> = ({ form, set, fieldId }) => {
  const { t } = useI18n();
  const gap = 100 - form.completionPct;
  const hasGap = gap > 0;
  return (
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
          {hasGap && <span className="text-xs text-amber-700 font-bold">({t.dayLog.gapLabel(gap)})</span>}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {hasGap && (
          <motion.div {...expand} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-neutral-200">
              <TextField
                id={fieldId('reason')}
                label={t.dayLog.gapReasonLabel}
                maxLength={2000}
                placeholder={t.dayLog.gapReasonPlaceholder}
                value={form.gapReason}
                onValue={(v) => set('gapReason', v)}
              />
              <TextField
                id={fieldId('solution')}
                label={t.dayLog.gapSolutionLabel}
                maxLength={2000}
                placeholder={t.dayLog.gapSolutionPlaceholder}
                value={form.gapSolution}
                onValue={(v) => set('gapSolution', v)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CategoryField: React.FC<{ id: string; value: TaskCategory; onValue: (value: TaskCategory) => void }> = ({ id, value, onValue }) => {
  const { t } = useI18n();
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {t.entryModal.categoryLabel}
      </label>
      <select id={id} value={value} onChange={(e) => onValue(e.target.value as TaskCategory)} className="input-field">
        {TASK_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {t.categories[c]}
          </option>
        ))}
      </select>
    </div>
  );
};

const DateField: React.FC<{ value: string; onValue: (value: string) => void }> = ({ value, onValue }) => {
  const { t, lang } = useI18n();
  return (
    <div>
      <span className="field-label">{t.entryModal.dateLabel}</span>
      <DatePicker variant="field" value={parseDateIso(value)} onChange={(d) => onValue(formatDateIso(d))} label={formatLongDate(value, lang)} />
    </div>
  );
};

export const TaskForm: React.FC<TaskFormProps> = ({ settings, projects, date, editing, showDate, submitLabel, onSubmit, actions }) => {
  const { t } = useI18n();
  const ids = useId();
  const [form, setForm] = useState<FormState>(() => initialState(editing, date));
  const [error, setError] = useState('');

  useEffect(() => {
    setForm(initialState(editing, date));
    setError('');
  }, [editing, date]);

  const set: SetField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const fieldId = (name: string) => `${ids}-${name}`;

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const message = validationError(form, t.dayLog);
    setError(message);
    if (message) return;
    onSubmit(toDraft(form));
    if (!editing) setForm(initialState(null, form.date));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError message={error} />

      <GitHubSearchField
        settings={settings}
        onSelect={(item) =>
          setForm((f) => ({
            ...f,
            taskName: `${item.title} #${item.number}`,
            githubUrl: item.html_url,
            githubNumber: item.number,
            project: projectForRepo(item.repoName, projects) ?? f.project,
          }))
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-7">
          <TextField
            id={fieldId('task')}
            label={t.dayLog.taskNameLabel}
            maxLength={500}
            placeholder={t.dayLog.taskNamePlaceholder}
            value={form.taskName}
            onValue={(v) => set('taskName', v)}
            className="input-field font-semibold"
          />
          <LinkPreview url={form.githubUrl} onRemove={() => set('githubUrl', '')} />
        </div>
        <div className="md:col-span-5">
          <TextField
            id={fieldId('project')}
            label={t.dayLog.projectLabel}
            list={fieldId('projects')}
            maxLength={120}
            placeholder={t.dayLog.projectPlaceholder}
            value={form.project}
            onValue={(v) => set('project', v)}
            className="input-field"
          />
          <datalist id={fieldId('projects')}>
            {projects.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {showDate && <DateField value={form.date} onValue={(v) => set('date', v)} />}
        <CategoryField id={fieldId('category')} value={form.category} onValue={(v) => set('category', v)} />
        <div className={showDate ? 'sm:col-span-2' : ''}>
          <HoursField id={fieldId('hours')} value={form.hours} onValue={(v) => set('hours', v)} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <TextField
          id={fieldId('link')}
          type="url"
          label={t.dayLog.linkLabel}
          maxLength={2048}
          placeholder={t.dayLog.linkPlaceholder}
          value={form.githubUrl}
          onValue={(v) => set('githubUrl', v)}
        />
        <TextField
          id={fieldId('desc')}
          label={t.dayLog.descriptionLabel}
          maxLength={2000}
          placeholder={t.dayLog.descriptionPlaceholder}
          value={form.description}
          onValue={(v) => set('description', v)}
        />
      </div>

      <ProgressSection form={form} set={set} fieldId={fieldId} />

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
