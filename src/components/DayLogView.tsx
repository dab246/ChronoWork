import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  ExternalLink,
  Clock,
  Building2,
  Home,
  Coffee,
  CheckCircle2,
  AlertCircle,
  PenLine,
  ListChecks,
  CalendarCog,
  ClipboardList,
} from 'lucide-react';
import { CATEGORY_COLORS, DAY_STATUS_CONFIGS, type TimeEntry, type DayLog, type UserSettings, type DayStatusType } from '../types';
import { addDays, formatDateIso, formatHours, formatLongDate, isToday } from '../utils/dateUtils';
import { getDayTargetHours, getEffectiveStatus, isLeaveStatus, sumHours } from '../utils/workdays';
import { safeUrl } from '../utils/security';
import { useI18n } from '../i18n';
import { useFeedback } from '../ui/feedback';
import { DatePicker } from '../ui/DatePicker';
import { PageHeader, PageStack, Reveal, SectionCard } from '../ui/layout';
import { TaskForm, type TaskDraft } from './TaskForm';

interface DayLogViewProps {
  selectedDate: Date;
  setSelectedDate: (d: Date) => void;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  projects: string[];
  onSaveTask: (entry: TaskDraft, editingId?: string) => void;
  onDeleteTask: (id: string) => void;
  onSetDayStatus: (dateIso: string, status: DayStatusType) => void;
  /** Opens the full day status dialog (leave, holiday, overtime…) */
  onOpenDayStatus: (dateIso: string) => void;
}

type Icon = React.ComponentType<{ className?: string }>;

/** Leave days are set from the attendance calendar or the day status dialog; the daily log only switches office / remote. */
const QUICK_STATUSES: { id: DayStatusType; icon: Icon }[] = [
  { id: 'work', icon: Building2 },
  { id: 'wfh', icon: Home },
];

const DayNavigator: React.FC<{ date: Date; onChange: (date: Date) => void }> = ({ date, onChange }) => {
  const { t, lang } = useI18n();
  return (
    <div className="flex items-center gap-2">
      {!isToday(formatDateIso(date)) && (
        <button type="button" onClick={() => onChange(new Date())} className="btn-outlined">
          {t.common.today}
        </button>
      )}
      <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5 elevation-1">
        <button type="button" onClick={() => onChange(addDays(date, -1))} aria-label={t.common.prevDay} title={t.common.prevDay} className="icon-btn p-1.5">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <DatePicker value={date} onChange={onChange} label={formatLongDate(date, lang)} align="right" />
        <button type="button" onClick={() => onChange(addDays(date, 1))} aria-label={t.common.nextDay} title={t.common.nextDay} className="icon-btn p-1.5">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

/** Office / remote switch; any other status (leave, holiday…) shows as a chip that opens the day status dialog. */
const StatusSwitch: React.FC<{ current: DayStatusType; onSelect: (status: DayStatusType) => void; onMore: () => void }> = ({ current, onSelect, onMore }) => {
  const { t } = useI18n();
  const isQuick = QUICK_STATUSES.some((s) => s.id === current);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="segmented" role="radiogroup" aria-label={t.dayLog.dayStatus}>
        {QUICK_STATUSES.map(({ id, icon: StatusIcon }) => {
          const active = current === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(id)}
              className={`relative flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors ${
                active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {active && (
                <motion.span layoutId="day-status-pill" className="absolute inset-0 rounded-full bg-white elevation-1" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
              )}
              <StatusIcon className={`relative w-3.5 h-3.5 ${active ? (id === 'work' ? 'text-emerald-600' : 'text-sky-600') : ''}`} />
              <span className="relative">{t.status[id].label}</span>
            </button>
          );
        })}
      </div>
      {!isQuick && (
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${DAY_STATUS_CONFIGS[current].badgeClass}`}>{t.status[current].label}</span>
      )}
      <button type="button" onClick={onMore} className="btn-text py-1.5" title={t.dayLog.moreStatuses}>
        <CalendarCog className="w-3.5 h-3.5" />
        {t.dayLog.moreStatuses}
      </button>
    </div>
  );
};

const ProgressRing: React.FC<{ progress: number; label: string }> = ({ progress, label }) => (
  <div className="relative w-16 h-16 shrink-0" aria-hidden="true">
    <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
      <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-slate-100" strokeWidth="3.5" />
      <motion.circle
        cx="18"
        cy="18"
        r="15.5"
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className={progress >= 100 ? 'stroke-emerald-500' : 'stroke-indigo-600'}
        strokeDasharray="97.4"
        initial={false}
        animate={{ strokeDashoffset: 97.4 * (1 - progress / 100) }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      />
    </svg>
    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-slate-800 tabular-nums">{label}</span>
  </div>
);

const BADGE_TONES = {
  leave: 'bg-amber-50 text-amber-900 border-amber-200',
  done: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  missing: 'bg-amber-50 text-amber-800 border-amber-200',
};

const HoursBadge: React.FC<{ isOffDay: boolean; total: number; target: number }> = ({ isOffDay, total, target }) => {
  const { t } = useI18n();
  const badges = {
    leave: { icon: CheckCircle2, iconClass: 'text-amber-600', text: t.dayLog.offDayValid },
    done: { icon: CheckCircle2, iconClass: 'text-emerald-600', text: t.dayLog.hoursCompleted(formatHours(target)) },
    missing: { icon: AlertCircle, iconClass: 'text-amber-600', text: t.dayLog.hoursRemaining(formatHours(target - total)) },
  };
  const kind = isOffDay ? 'leave' : total >= target ? 'done' : 'missing';
  const { icon: BadgeIcon, iconClass, text } = badges[kind];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs font-semibold ${BADGE_TONES[kind]}`}>
      <BadgeIcon className={`w-3.5 h-3.5 ${iconClass}`} />
      {text}
    </span>
  );
};

interface DaySummaryProps {
  date: Date;
  status: DayStatusType;
  total: number;
  target: number;
  taskCount: number;
  onSelectStatus: (status: DayStatusType) => void;
  onMoreStatuses: () => void;
}

/** The day at a glance: status switch on the left, hours against the target on the right. */
const DaySummary: React.FC<DaySummaryProps> = ({ date, status, total, target, taskCount, onSelectStatus, onMoreStatuses }) => {
  const { t, lang } = useI18n();
  const progress = target > 0 ? Math.min(100, (total / target) * 100) : 100;
  return (
    <Reveal className="card p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="space-y-3 min-w-0">
          <div>
            <div className="eyebrow">{t.dayLog.dayStatus}</div>
            <div className="text-lg font-bold text-slate-900 capitalize mt-0.5">{formatLongDate(date, lang)}</div>
          </div>
          <StatusSwitch current={status} onSelect={onSelectStatus} onMore={onMoreStatuses} />
        </div>
        <div className="flex items-center gap-4 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-slate-100 lg:pl-6">
          <ProgressRing progress={progress} label={`${Math.round(progress)}%`} />
          <div className="space-y-1.5">
            <div className="text-xs text-slate-500 font-medium">{t.dayLog.totalHoursToday}</div>
            <div className="text-3xl font-black text-slate-900 tabular-nums leading-none">
              {formatHours(total)}h <span className="text-sm font-semibold text-slate-400">/ {formatHours(target)}h</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <HoursBadge isOffDay={isLeaveStatus(status)} total={total} target={target} />
              <span className="text-xs text-slate-500">{t.common.tasks(taskCount)}</span>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
};

const LeaveNotice: React.FC<{ status: DayStatusType; onChangeStatus: () => void }> = ({ status, onChangeStatus }) => {
  const { t } = useI18n();
  return (
    <Reveal className="card border-amber-200 p-8 text-center space-y-3">
      <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 mx-auto flex items-center justify-center">
        <Coffee className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900">{t.dayLog.leaveNoticeTitle(t.status[status].label)}</h3>
      <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">{t.dayLog.leaveNoticeDesc}</p>
      <button type="button" onClick={onChangeStatus} className="btn-outlined">
        <CalendarCog className="w-3.5 h-3.5" />
        {t.dayLog.moreStatuses}
      </button>
    </Reveal>
  );
};

const TaskDetails: React.FC<{ task: TimeEntry }> = ({ task }) => {
  const { t } = useI18n();
  const remark = task.remark || task.notes;
  return (
    <>
      {task.description && <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{task.description}</p>}
      {task.gapReason && (
        <p className="text-xs text-amber-800 mt-1 italic">
          {t.dayLog.reason}: {task.gapReason}
          {task.gapSolution && ` · ${t.dayLog.solution}: ${task.gapSolution}`}
        </p>
      )}
      {remark && (
        <p className="text-[11px] text-slate-500 mt-1">
          {t.dayLog.remark}: {remark}
        </p>
      )}
    </>
  );
};

const CompletionMeter: React.FC<{ pct: number }> = ({ pct }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className="w-14 h-1.5 rounded-full bg-slate-200 overflow-hidden">
      <span className={`block h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
    </span>
    <span className={`text-[11px] font-bold tabular-nums ${pct >= 100 ? 'text-emerald-700' : 'text-slate-700'}`}>{pct}%</span>
  </span>
);

interface LoggedTaskItemProps {
  task: TimeEntry;
  isEditing: boolean;
  onEdit: (task: TimeEntry) => void;
  onDelete: (task: TimeEntry) => void;
}

const LoggedTaskItem: React.FC<LoggedTaskItemProps> = ({ task, isEditing, onEdit, onDelete }) => {
  const { t } = useI18n();
  const link = safeUrl(task.githubUrl);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 16, transition: { duration: 0.15 } }}
      transition={{ duration: 0.22 }}
      className={`group relative pl-4 pr-3 py-3.5 rounded-xl border transition-colors ${
        isEditing ? 'bg-indigo-50/70 border-indigo-200' : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
      }`}
    >
      <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ backgroundColor: CATEGORY_COLORS[task.category ?? 'other'] }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 break-words leading-snug">{task.taskName}</p>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap text-[11px]">
            {task.project && <span className="font-semibold text-slate-500">{task.project}</span>}
            {task.category && <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{t.categories[task.category]}</span>}
            <CompletionMeter pct={task.completionPct} />
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800">
                <ExternalLink className="w-3 h-3" />
                {t.common.link}
              </a>
            )}
          </div>
          <TaskDetails task={task} />
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-lg font-black text-slate-900 tabular-nums leading-none">{formatHours(task.hours)}h</span>
          <div className="flex items-center opacity-70 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button type="button" onClick={() => onEdit(task)} title={t.dayLog.editTask} aria-label={t.dayLog.editTask} className="icon-btn p-1.5">
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(task)}
              title={t.dayLog.deleteTask}
              aria-label={t.dayLog.deleteTask}
              className="icon-btn p-1.5 hover:text-rose-600 hover:bg-rose-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.li>
  );
};

interface LoggedTaskListProps {
  tasks: TimeEntry[];
  editingId?: string;
  onEdit: (task: TimeEntry) => void;
  onDelete: (task: TimeEntry) => void;
}

const LoggedTaskList: React.FC<LoggedTaskListProps> = ({ tasks, editingId, onEdit, onDelete }) => {
  const { t } = useI18n();
  return (
    <SectionCard
      icon={ListChecks}
      tone="emerald"
      title={t.dayLog.loggedHeading}
      description={t.dayLog.loggedSummary(tasks.length, formatHours(sumHours(tasks)))}
      bodyClassName="p-3"
    >
      {tasks.length === 0 ? (
        <div className="py-10 px-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <ClipboardList className="w-6 h-6" />
          </div>
          <p className="mt-3 text-xs text-slate-500 leading-relaxed">{t.dayLog.empty}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <LoggedTaskItem key={task.id} task={task} isEditing={editingId === task.id} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </SectionCard>
  );
};

interface EntryPanelProps {
  status: DayStatusType;
  dateIso: string;
  settings: UserSettings;
  projects: string[];
  entries: TimeEntry[];
  editing: TimeEntry | null;
  onCancelEdit: () => void;
  onSubmit: (draft: TaskDraft) => void;
  onOpenDayStatus: (dateIso: string) => void;
}

/** Left column: the task form, or the leave notice on a day off. */
const EntryPanel: React.FC<EntryPanelProps> = ({ status, dateIso, settings, projects, entries, editing, onCancelEdit, onSubmit, onOpenDayStatus }) => {
  const { t } = useI18n();
  if (isLeaveStatus(status)) return <LeaveNotice status={status} onChangeStatus={() => onOpenDayStatus(dateIso)} />;
  const labels = editing
    ? { title: t.dayLog.formEditTitle, submit: t.dayLog.submitUpdate }
    : { title: t.dayLog.formTitle, submit: t.dayLog.submitAdd };
  const cancel = editing && (
    <button type="button" onClick={onCancelEdit} className="btn-text">
      {t.dayLog.cancelEdit}
    </button>
  );
  return (
    <SectionCard icon={PenLine} title={labels.title} description={t.dayLog.formHint} actions={cancel} bodyClassName="p-4 sm:p-5">
      <TaskForm settings={settings} projects={projects} entries={entries} date={dateIso} editing={editing} submitLabel={labels.submit} onSubmit={onSubmit} />
    </SectionCard>
  );
};

export const DayLogView: React.FC<DayLogViewProps> = ({
  selectedDate,
  setSelectedDate,
  entries,
  dayLogs,
  settings,
  projects,
  onSaveTask,
  onDeleteTask,
  onSetDayStatus,
  onOpenDayStatus,
}) => {
  const { t } = useI18n();
  const { confirm } = useFeedback();
  const [editing, setEditing] = useState<TimeEntry | null>(null);

  const dateIso = formatDateIso(selectedDate);
  const currentStatus = getEffectiveStatus(selectedDate, dayLogs, settings);
  const dayEntries = entries.filter((e) => e.date === dateIso);

  const changeDate = (d: Date) => {
    setSelectedDate(d);
    setEditing(null);
  };

  const handleDelete = async (task: TimeEntry) => {
    const ok = await confirm({
      title: t.dayLog.confirmDeleteTitle,
      message: t.dayLog.confirmDelete(task.taskName),
      confirmLabel: t.common.delete,
      danger: true,
    });
    if (!ok) return;
    onDeleteTask(task.id);
    setEditing((current) => (current?.id === task.id ? null : current));
  };

  const handleSubmit = (draft: TaskDraft) => {
    onSaveTask(draft, editing?.id);
    setEditing(null);
  };

  return (
    <PageStack>
      <PageHeader icon={Clock} title={t.dayLog.title} subtitle={t.dayLog.subtitle} actions={<DayNavigator date={selectedDate} onChange={changeDate} />} />

      <DaySummary
        date={selectedDate}
        status={currentStatus}
        total={sumHours(dayEntries)}
        target={getDayTargetHours(selectedDate, dayLogs, settings)}
        taskCount={dayEntries.length}
        onSelectStatus={(status) => onSetDayStatus(dateIso, status)}
        onMoreStatuses={() => onOpenDayStatus(dateIso)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <EntryPanel
            status={currentStatus}
            dateIso={dateIso}
            settings={settings}
            projects={projects}
            entries={entries}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            onSubmit={handleSubmit}
            onOpenDayStatus={onOpenDayStatus}
          />
        </div>
        <div className="lg:col-span-5 lg:sticky lg:top-24">
          <LoggedTaskList tasks={dayEntries} editingId={editing?.id} onEdit={setEditing} onDelete={handleDelete} />
        </div>
      </div>
    </PageStack>
  );
};
