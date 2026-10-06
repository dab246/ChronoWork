import React, { useState } from 'react';
import { Check, Edit2 } from 'lucide-react';
import type { TimeEntry } from '../../types';
import { formatHours } from '../../utils/dateUtils';
import { safeUrl } from '../../utils/security';
import { normalizeTaskKey, type AggregatedTask } from '../../report/aggregate';
import { useI18n, type Translations } from '../../i18n';
import { C, PREVIEW_MIN_TASK_ROWS, banner, grey, head, inputClass, serif } from './sheetStyles';

type QuickField = 'completionPct' | 'gapReason' | 'gapSolution' | 'remark';
type TextField = Exclude<QuickField, 'completionPct'>;
type ReportDoc = Translations['reportDoc'];

const TEXT_FIELDS: TextField[] = ['gapReason', 'gapSolution', 'remark'];

/** The entry with `field` set from the quick-edit input; completion also updates the gap. */
function applyQuickEdit(entry: TimeEntry, field: QuickField, value: string): TimeEntry {
  if (field === 'completionPct') {
    const completion = Math.min(100, Math.max(0, Number(value) || 0));
    return { ...entry, completionPct: completion, gapPct: 100 - completion };
  }
  return { ...entry, [field]: value, ...(field === 'remark' ? { notes: undefined } : {}) };
}

type UpdateTask = (taskKey: string, field: QuickField, value: string) => void;

const DescriptionCell: React.FC<{ task: AggregatedTask; linkLabel: string }> = ({ task, linkLabel }) => {
  const url = safeUrl(task.url);
  return (
    <td className="text-center px-1" style={grey}>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: C.link }}>{linkLabel}</a>
      ) : (
        task.activitiesDescription
      )}
    </td>
  );
};

interface TaskRowProps {
  task: AggregatedTask;
  index: number;
  editing: boolean;
  linkLabel: string;
  onUpdate: UpdateTask;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, index, editing, linkLabel, onUpdate }) => {
  const { t } = useI18n();
  const placeholders: Record<TextField, string> = {
    gapReason: t.report.reasonPlaceholder,
    gapSolution: t.report.solutionPlaceholder,
    remark: t.report.remarkPlaceholder,
  };
  return (
    <tr style={{ minHeight: 32 }}>
      <td className="text-center py-1.5" style={grey}>{index + 1}</td>
      <td className="px-1.5 py-1.5" style={{ ...grey, ...serif }}>{task.label}</td>
      <DescriptionCell task={task} linkLabel={linkLabel} />
      <td className="text-right px-1.5" style={grey}>{formatHours(task.hours)}h</td>
      <td className="text-right px-1.5" style={grey}>
        {editing ? (
          <input type="number" min="0" max="100" value={task.completionPct} onChange={(e) => onUpdate(task.key, 'completionPct', e.target.value)} className={`${inputClass} text-right`} />
        ) : (
          `${task.completionPct.toFixed(2)}%`
        )}
      </td>
      <td className="px-1.5" style={grey}>{task.gapPct > 0 ? `${task.gapPct}%` : ''}</td>
      {TEXT_FIELDS.map((field) => (
        <td key={field} className="px-1.5 py-1" style={grey}>
          {editing ? (
            <input type="text" value={task[field]} placeholder={placeholders[field]} onChange={(e) => onUpdate(task.key, field, e.target.value)} className={inputClass} />
          ) : (
            task[field]
          )}
        </td>
      ))}
    </tr>
  );
};

const TaskColumnHeaders: React.FC<{ r: ReportDoc }> = ({ r }) => (
  <>
    <tr style={{ height: 24 }}>
      {[r.colNo, r.colProject, r.colDesc, r.colTime].map((label) => (
        <td key={label} rowSpan={2} className="text-center px-1" style={head}>{label}</td>
      ))}
      <td colSpan={2} className="text-center" style={head}>{r.colResult}</td>
      <td colSpan={2} className="text-center" style={head}>{r.colGap}</td>
      <td rowSpan={2} className="text-center" style={head}>{r.colRemark}</td>
    </tr>
    <tr style={{ height: 22 }}>
      {[r.colCompletion, r.colGapPct, r.colReason, r.colSolution].map((label) => (
        <td key={label} className="text-center px-1" style={head}>{label}</td>
      ))}
    </tr>
  </>
);

/** Blank numbered rows so the preview keeps the template's minimum height, then the reviews footer. */
const TaskFiller: React.FC<{ taskCount: number; r: ReportDoc }> = ({ taskCount, r }) => (
  <>
    {Array.from({ length: Math.max(0, PREVIEW_MIN_TASK_ROWS - taskCount) }).map((_, i) => (
      <tr key={`blank-${i}`} style={{ height: 22 }}>
        <td className="text-center" style={grey}>{taskCount + i + 1}</td>
        {Array.from({ length: 8 }).map((__, c) => (
          <td key={c} style={grey} />
        ))}
      </tr>
    ))}
    <tr style={{ height: 30 }}>
      <td className="text-center" style={grey}>…</td>
      <td className="italic px-1.5" style={grey}>{r.reviewsFooter}</td>
      {Array.from({ length: 7 }).map((_, c) => (
        <td key={c} style={grey} />
      ))}
    </tr>
  </>
);

interface TaskRowsProps {
  tasks: AggregatedTask[];
  weekEntries: TimeEntry[];
  r: ReportDoc;
  linkLabel: string;
  onUpdateEntry: (entry: TimeEntry) => void;
}

/** "Completed work" section of the sheet, with quick edit of progress, gap and remark. */
export const TaskRows: React.FC<TaskRowsProps> = ({ tasks, weekEntries, r, linkLabel, onUpdateEntry }) => {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);

  const updateTask: UpdateTask = (taskKey, field, value) => {
    weekEntries
      .filter((e) => normalizeTaskKey(e.taskName || '') === taskKey)
      .forEach((entry) => onUpdateEntry(applyQuickEdit(entry, field, value)));
  };

  return (
    <>
      <tr style={{ height: 38 }}>
        <td colSpan={9} className="relative text-center font-bold text-[15px]" style={banner}>
          {r.completedWorkHeader}
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            title={t.report.quickEditHint}
            className="no-print absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-3 py-1 text-[11px] font-semibold rounded-full bg-white/15 hover:bg-white/25 font-sans"
          >
            {editing ? <Check className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
            {editing ? t.common.done : t.report.quickEdit}
          </button>
        </td>
      </tr>
      <TaskColumnHeaders r={r} />

      {tasks.length === 0 && (
        <tr>
          <td colSpan={9} className="py-6 text-center text-neutral-500 italic font-sans" style={grey}>{t.report.empty}</td>
        </tr>
      )}
      {tasks.map((task, idx) => (
        <TaskRow key={task.key} task={task} index={idx} editing={editing} linkLabel={linkLabel} onUpdate={updateTask} />
      ))}
      <TaskFiller taskCount={tasks.length} r={r} />
    </>
  );
};
