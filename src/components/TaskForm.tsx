import React, { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Link2, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { TASK_CATEGORIES, type TaskCategory, type TimeEntry, type UserSettings } from '../types';
import { DatePicker } from '../ui/DatePicker';
import { formatDateIso, formatLongDate, parseDateIso } from '../utils/dateUtils';
import { safeUrl } from '../utils/security';
import { buildTaskSuggestions, clampProgress, groupByTask, progressBounds, taskKey, type ProgressBounds, type TaskSuggestion } from '../utils/taskHistory';
import { GitHubSearchField, projectForRepo } from './GitHubSearchField';
import { ProgressField } from './ProgressField';
import { TaskNameField } from './TaskNameField';
import { applyTemplate, initialState, toDraft, validationError, type FormState, type TaskDraft, type TaskTemplate } from './taskFormModel';

export type { TaskDraft, TaskTemplate } from './taskFormModel';

interface TaskFormProps {
  settings: UserSettings;
  projects: string[];
  /** Every logged entry: source of the task name suggestions and of the progress history */
  entries: TimeEntry[];
  date: string;
  editing?: TimeEntry | null;
  /** Task to continue on `date` (new entry prefilled from it) */
  template?: TaskTemplate | null;
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
              className={`px-2.5 py-1.5 text-xs font-bold rounded-full transition-colors ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-800'}`}
            >
              {h}h
            </button>
          );
        })}
      </div>
    </div>
  );
};

const GapFields: React.FC<{ form: FormState; set: SetField; fieldId: (name: string) => string }> = ({ form, set, fieldId }) => {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-200/80">
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
  );
};

/** Numbered group of fields, so the form reads as three short steps. */
const FormGroup: React.FC<{ step: number; title: string; aside?: React.ReactNode; tinted?: boolean; children: React.ReactNode }> = ({
  step,
  title,
  aside,
  tinted,
  children,
}) => (
  <fieldset className={`rounded-2xl border p-4 space-y-3 ${tinted ? 'bg-slate-50/70 border-slate-200/80' : 'bg-white border-slate-200/80'}`}>
    <legend className="sr-only">{title}</legend>
    <div className="flex items-center justify-between gap-2" aria-hidden="true">
      <div className="flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">{step}</span>
        <span className="eyebrow text-slate-700">{title}</span>
      </div>
      {aside}
    </div>
    {children}
  </fieldset>
);

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

interface GroupProps {
  form: FormState;
  set: SetField;
  fieldId: (name: string) => string;
}

interface TaskGroupProps extends GroupProps {
  settings: UserSettings;
  projects: string[];
  suggestions: TaskSuggestion[];
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onTaskName: (taskName: string) => void;
  onPick: (item: TaskSuggestion) => void;
}

const ProjectField: React.FC<GroupProps & { projects: string[] }> = ({ form, set, fieldId, projects }) => {
  const { t } = useI18n();
  return (
    <>
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
    </>
  );
};

/** Step 1: what was worked on (GitHub search, name with suggestions, project, link, description). */
const TaskGroup: React.FC<TaskGroupProps> = ({ form, set, fieldId, settings, projects, suggestions, setForm, onTaskName, onPick }) => {
  const { t } = useI18n();
  return (
    <FormGroup step={1} title={t.dayLog.groupTask}>
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
          <TaskNameField
            id={fieldId('task')}
            label={t.dayLog.taskNameLabel}
            placeholder={t.dayLog.taskNamePlaceholder}
            value={form.taskName}
            suggestions={suggestions}
            onChange={onTaskName}
            onPick={onPick}
          />
          <LinkPreview url={form.githubUrl} onRemove={() => set('githubUrl', '')} />
        </div>
        <div className="md:col-span-5">
          <ProjectField form={form} set={set} fieldId={fieldId} projects={projects} />
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
          className="input-field"
        />
        <TextField
          id={fieldId('desc')}
          label={t.dayLog.descriptionLabel}
          maxLength={2000}
          placeholder={t.dayLog.descriptionPlaceholder}
          value={form.description}
          onValue={(v) => set('description', v)}
          className="input-field"
        />
      </div>
    </FormGroup>
  );
};

/** Step 2: date (dialog only), category and time spent. */
const TimeGroup: React.FC<GroupProps & { showDate?: boolean }> = ({ form, set, fieldId, showDate }) => {
  const { t } = useI18n();
  return (
    <FormGroup step={2} title={t.dayLog.groupTime}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {showDate && <DateField value={form.date} onValue={(v) => set('date', v)} />}
        <CategoryField id={fieldId('category')} value={form.category} onValue={(v) => set('category', v)} />
        <div className={showDate ? 'sm:col-span-2' : ''}>
          <HoursField id={fieldId('hours')} value={form.hours} onValue={(v) => set('hours', v)} />
        </div>
      </div>
    </FormGroup>
  );
};

/** Remark and the submit row. */
const FormFooter: React.FC<{ form: FormState; set: SetField; submitLabel: string; actions?: React.ReactNode }> = ({ form, set, submitLabel, actions }) => {
  const { t } = useI18n();
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <input
        type="text"
        maxLength={2000}
        aria-label={t.dayLog.remark}
        placeholder={t.dayLog.remarkPlaceholder}
        value={form.remark}
        onChange={(e) => set('remark', e.target.value)}
        className="input-field flex-1"
      />
      <div className="flex items-center justify-end gap-2">
        {actions}
        <button type="submit" className="btn-filled px-5 py-2.5 text-sm">
          {submitLabel}
        </button>
      </div>
    </div>
  );
};

/** Progress bounds of the task being typed, from the entries logged before and after it. */
function useProgressBounds(entries: TimeEntry[], form: FormState, editing?: TimeEntry | null) {
  const groups = useMemo(() => groupByTask(entries), [entries]);
  const boundsFor = (taskName: string, date: string): ProgressBounds =>
    progressBounds(groups.get(taskKey(taskName)) ?? [], taskName, { date, createdAt: editing?.createdAt, excludeId: editing?.id });
  return { bounds: boundsFor(form.taskName, form.date), boundsFor };
}

/** Completion to start from when the task changes: where it was left, or 100% for a new task. */
const startingPct = (bounds: ProgressBounds) => (bounds.previous ? bounds.min : clampProgress(100, bounds));

export const TaskForm: React.FC<TaskFormProps> = ({ settings, projects, entries, date, editing, template, showDate, submitLabel, onSubmit, actions }) => {
  const { t } = useI18n();
  const ids = useId();
  const [form, setForm] = useState<FormState>(() => initialState(editing, date, template));
  const [error, setError] = useState('');
  const suggestions = useMemo(() => buildTaskSuggestions(entries), [entries]);
  const { bounds, boundsFor } = useProgressBounds(entries, form, editing);
  const completionPct = clampProgress(form.completionPct, bounds);

  useEffect(() => {
    setForm(initialState(editing, date, template));
    setError('');
  }, [editing, date, template]);

  const set: SetField = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const fieldId = (name: string) => `${ids}-${name}`;
  const group = { form, set, fieldId };

  /** Typing the name of a task logged before picks up its progress (new entries only). */
  const changeTaskName = (taskName: string) =>
    setForm((f) => {
      const next = { ...f, taskName };
      if (editing || taskKey(taskName) === taskKey(f.taskName)) return next;
      const before = boundsFor(f.taskName, f.date);
      const after = boundsFor(taskName, f.date);
      return after.previous || before.previous ? { ...next, completionPct: startingPct(after) } : next;
    });

  const pickSuggestion = (item: TaskSuggestion) =>
    setForm((f) => ({ ...applyTemplate(f, item), completionPct: startingPct(boundsFor(item.taskName, f.date)) }));

  const handleSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const message = validationError(form, t.dayLog);
    setError(message);
    if (message) return;
    onSubmit(toDraft(form, bounds));
    if (!editing) setForm(initialState(null, form.date));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormError message={error} />
      <TaskGroup
        {...group}
        settings={settings}
        projects={projects}
        suggestions={suggestions}
        setForm={setForm}
        onTaskName={changeTaskName}
        onPick={pickSuggestion}
      />
      <TimeGroup {...group} showDate={showDate} />
      <FormGroup step={3} title={t.dayLog.progressTitle} tinted>
        <ProgressField id={fieldId('pct')} value={completionPct} bounds={bounds} onChange={(pct) => set('completionPct', pct)}>
          <GapFields {...group} />
        </ProgressField>
      </FormGroup>
      <FormFooter form={form} set={set} submitLabel={submitLabel} actions={actions} />
    </form>
  );
};
