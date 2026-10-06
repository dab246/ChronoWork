import type { TaskCategory, TimeEntry } from '../types';
import { clampNumber, safeUrl } from '../utils/security';

export type TaskDraft = Omit<TimeEntry, 'id' | 'createdAt'>;

export interface FormState {
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

const EMPTY_FORM: Omit<FormState, 'date'> = {
  taskName: '',
  project: '',
  category: 'development',
  hours: '1',
  githubUrl: '',
  githubNumber: undefined,
  description: '',
  completionPct: 100,
  gapReason: '',
  gapSolution: '',
  remark: '',
};

function definedOnly<T extends object>(values: T): Partial<T> {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined)) as Partial<T>;
}

/** Form values for a new task on `date`, or for editing an existing entry. */
export function initialState(editing: TimeEntry | null | undefined, date: string): FormState {
  if (!editing) return { ...EMPTY_FORM, date };
  return {
    ...EMPTY_FORM,
    ...definedOnly({
      taskName: editing.taskName,
      project: editing.project,
      category: editing.category,
      hours: String(editing.hours),
      githubUrl: editing.githubUrl,
      githubNumber: editing.githubNumber,
      description: editing.description,
      completionPct: editing.completionPct,
      gapReason: editing.gapReason,
      gapSolution: editing.gapSolution,
      remark: editing.remark ?? editing.notes,
    }),
    date: editing.date,
  };
}

export interface ValidationMessages {
  taskRequired: string;
  hoursInvalid: string;
  linkInvalid: string;
}

const isValidHours = (hours: number) => hours === clampNumber(hours, 0.25, 24, Number.NaN);

/** First validation error, or an empty string when the form is valid. */
export function validationError(form: FormState, messages: ValidationMessages): string {
  const url = form.githubUrl.trim();
  const checks: Array<[failed: boolean, message: string]> = [
    [!form.taskName.trim(), messages.taskRequired],
    [!isValidHours(Number(form.hours)), messages.hoursInvalid],
    [url !== '' && !safeUrl(url), messages.linkInvalid],
  ];
  return checks.find(([failed]) => failed)?.[1] ?? '';
}

const optional = (text: string) => text.trim() || undefined;

/** Converts valid form values into a time entry draft. */
export function toDraft(form: FormState): TaskDraft {
  const hours = Number(form.hours);
  const url = form.githubUrl.trim();
  const completionPct = clampNumber(form.completionPct, 0, 100, 100);
  const hasGap = completionPct < 100;
  return {
    date: form.date,
    taskName: form.taskName.trim().slice(0, 500),
    project: form.project.trim().slice(0, 120),
    category: form.category,
    hours,
    durationMinutes: Math.round(hours * 60),
    githubUrl: safeUrl(url),
    githubNumber: url ? form.githubNumber : undefined,
    description: optional(form.description),
    completionPct,
    gapPct: 100 - completionPct,
    gapReason: hasGap ? optional(form.gapReason) : undefined,
    gapSolution: hasGap ? optional(form.gapSolution) : undefined,
    remark: optional(form.remark),
    notes: undefined,
    isCompleted: completionPct === 100,
  };
}
