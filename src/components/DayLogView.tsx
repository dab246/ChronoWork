import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Trash2, Edit3, ExternalLink, Clock, Building2, Home, Coffee, HeartPulse, CheckCircle2, AlertCircle } from 'lucide-react';
import type { TimeEntry, DayLog, UserSettings, DayStatusType } from '../types';
import { addDays, formatDateIso, formatHours, formatLongDate, isToday } from '../utils/dateUtils';
import { getDayTargetHours, getEffectiveStatus, isLeaveStatus, sumHours } from '../utils/workdays';
import { safeUrl } from '../utils/security';
import { useI18n } from '../i18n';
import { useFeedback } from '../ui/feedback';
import { DatePicker } from '../ui/DatePicker';
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
}

type Icon = React.ComponentType<{ className?: string }>;

const QUICK_STATUSES: { id: DayStatusType; icon: Icon; active: string }[] = [
  { id: 'work', icon: Building2, active: 'bg-emerald-600 text-white border-emerald-600' },
  { id: 'wfh', icon: Home, active: 'bg-sky-600 text-white border-sky-600' },
  { id: 'paid_leave', icon: Coffee, active: 'bg-amber-500 text-white border-amber-500' },
  { id: 'sick_leave', icon: HeartPulse, active: 'bg-rose-600 text-white border-rose-600' },
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
      <div className="flex items-center bg-white border border-neutral-300 rounded-full p-0.5 elevation-1">
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

const QuickStatusButtons: React.FC<{ current: DayStatusType; onSelect: (status: DayStatusType) => void }> = ({ current, onSelect }) => {
  const { t } = useI18n();
  return (
    <div>
      <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t.dayLog.dayStatus}</div>
      <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label={t.dayLog.dayStatus}>
        {QUICK_STATUSES.map(({ id, icon: StatusIcon, active }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={current === id}
            onClick={() => onSelect(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full border transition-all ${
              current === id ? `${active} elevation-1` : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
            }`}
          >
            <StatusIcon className="w-3.5 h-3.5" />
            <span>{t.status[id].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const ProgressRing: React.FC<{ progress: number }> = ({ progress }) => (
  <div className="relative w-14 h-14 shrink-0" aria-hidden="true">
    <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
      <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-neutral-100" strokeWidth="4" />
      <motion.circle
        cx="18"
        cy="18"
        r="15.5"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className={progress >= 100 ? 'stroke-emerald-500' : 'stroke-indigo-600'}
        strokeDasharray="97.4"
        initial={false}
        animate={{ strokeDashoffset: 97.4 * (1 - progress / 100) }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      />
    </svg>
  </div>
);

const BADGE_TONES = {
  leave: 'bg-amber-50 text-amber-900 border-amber-300 font-bold',
  done: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
  missing: 'bg-amber-50 text-amber-800 border-amber-300 font-semibold',
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
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-full text-xs ${BADGE_TONES[kind]}`}>
      <BadgeIcon className={`w-4 h-4 ${iconClass}`} />
      {text}
    </span>
  );
};

interface DayStatusCardProps {
  status: DayStatusType;
  total: number;
  target: number;
  onSelectStatus: (status: DayStatusType) => void;
}

const DayStatusCard: React.FC<DayStatusCardProps> = ({ status, total, target, onSelectStatus }) => {
  const { t } = useI18n();
  const progress = target > 0 ? Math.min(100, (total / target) * 100) : 100;
  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <QuickStatusButtons current={status} onSelect={onSelectStatus} />
        <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
          <ProgressRing progress={progress} />
          <div>
            <div className="text-xs text-neutral-500 font-medium">{t.dayLog.totalHoursToday}</div>
            <div className="text-2xl font-black text-neutral-900 tabular-nums">
              {formatHours(total)}h <span className="text-xs font-normal text-neutral-400">/ {formatHours(target)}h</span>
            </div>
          </div>
          <HoursBadge isOffDay={isLeaveStatus(status)} total={total} target={target} />
        </div>
      </div>
    </div>
  );
};

const LeaveNotice: React.FC<{ status: DayStatusType }> = ({ status }) => {
  const { t } = useI18n();
  return (
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card border-amber-200 p-8 text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
        <Coffee className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-neutral-900">{t.dayLog.leaveNoticeTitle(t.status[status].label)}</h3>
      <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">{t.dayLog.leaveNoticeDesc}</p>
    </motion.div>
  );
};

interface TaskEntryCardProps {
  settings: UserSettings;
  projects: string[];
  dateIso: string;
  editing: TimeEntry | null;
  onCancelEdit: () => void;
  onSubmit: (draft: TaskDraft) => void;
}

const TaskEntryCard: React.FC<TaskEntryCardProps> = ({ settings, projects, dateIso, editing, onCancelEdit, onSubmit }) => {
  const { t } = useI18n();
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
        <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span>{editing ? t.dayLog.formEditTitle : t.dayLog.formTitle}</span>
        </h3>
        {editing && (
          <button type="button" onClick={onCancelEdit} className="btn-text">
            {t.dayLog.cancelEdit}
          </button>
        )}
      </div>
      <TaskForm
        settings={settings}
        projects={projects}
        date={dateIso}
        editing={editing}
        submitLabel={editing ? t.dayLog.submitUpdate : t.dayLog.submitAdd}
        onSubmit={onSubmit}
      />
    </div>
  );
};

const TaskDetails: React.FC<{ task: TimeEntry }> = ({ task }) => {
  const { t } = useI18n();
  const remark = task.remark || task.notes;
  return (
    <>
      {task.description && <p className="text-xs text-neutral-600 mt-1">{task.description}</p>}
      {task.gapReason && (
        <p className="text-xs text-amber-800 mt-0.5 italic">
          {t.dayLog.reason}: {task.gapReason}
          {task.gapSolution && ` · ${t.dayLog.solution}: ${task.gapSolution}`}
        </p>
      )}
      {remark && (
        <p className="text-[11px] text-neutral-500 mt-0.5">
          {t.dayLog.remark}: {remark}
        </p>
      )}
    </>
  );
};

const TaskTitleRow: React.FC<{ task: TimeEntry }> = ({ task }) => {
  const { t } = useI18n();
  const link = safeUrl(task.githubUrl);
  const completionTone = task.gapPct > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800';
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm font-bold text-neutral-900 break-words">{task.taskName}</span>
      {task.project && <span className="text-xs font-medium text-neutral-500">· {task.project}</span>}
      {task.category && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">{t.categories[task.category]}</span>}
      {link && (
        <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline">
          <ExternalLink className="w-3 h-3" />
          {t.common.link}
        </a>
      )}
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${completionTone}`}>{task.completionPct}%</span>
    </div>
  );
};

interface LoggedTaskItemProps {
  task: TimeEntry;
  isEditing: boolean;
  onEdit: (task: TimeEntry) => void;
  onDelete: (task: TimeEntry) => void;
}

const LoggedTaskItem: React.FC<LoggedTaskItemProps> = ({ task, isEditing, onEdit, onDelete }) => {
  const { t } = useI18n();
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0 }}
      transition={{ duration: 0.2 }}
      className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${isEditing ? 'bg-indigo-50/60' : 'hover:bg-neutral-50/70'}`}
    >
      <div className="flex-1 min-w-0">
        <TaskTitleRow task={task} />
        <TaskDetails task={task} />
      </div>
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
        <span className="text-base font-black text-neutral-900 tabular-nums">{formatHours(task.hours)}h</span>
        <div className="flex items-center">
          <button type="button" onClick={() => onEdit(task)} title={t.dayLog.editTask} aria-label={t.dayLog.editTask} className="icon-btn">
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task)}
            title={t.dayLog.deleteTask}
            aria-label={t.dayLog.deleteTask}
            className="icon-btn hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50/60 text-xs font-bold text-neutral-800 uppercase tracking-wider">
        {t.dayLog.loggedTitle(tasks.length, formatHours(sumHours(tasks)))}
      </div>
      {tasks.length === 0 && <div className="p-8 text-center text-neutral-400 text-xs italic">{t.dayLog.empty}</div>}
      {tasks.length > 0 && (
        <ul className="divide-y divide-neutral-100">
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <LoggedTaskItem key={task.id} task={task} isEditing={editingId === task.id} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">{t.dayLog.title}</h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">{t.dayLog.subtitle}</p>
        </div>
        <DayNavigator date={selectedDate} onChange={changeDate} />
      </div>

      <DayStatusCard
        status={currentStatus}
        total={sumHours(dayEntries)}
        target={getDayTargetHours(selectedDate, dayLogs, settings)}
        onSelectStatus={(status) => onSetDayStatus(dateIso, status)}
      />

      {isLeaveStatus(currentStatus) ? (
        <LeaveNotice status={currentStatus} />
      ) : (
        <TaskEntryCard
          settings={settings}
          projects={projects}
          dateIso={dateIso}
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onSubmit={(draft) => {
            onSaveTask(draft, editing?.id);
            setEditing(null);
          }}
        />
      )}

      <LoggedTaskList tasks={dayEntries} editingId={editing?.id} onEdit={setEditing} onDelete={handleDelete} />
    </div>
  );
};
