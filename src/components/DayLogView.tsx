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

const QUICK_STATUSES: { id: DayStatusType; icon: React.ComponentType<{ className?: string }>; active: string }[] = [
  { id: 'work', icon: Building2, active: 'bg-emerald-600 text-white border-emerald-600' },
  { id: 'wfh', icon: Home, active: 'bg-sky-600 text-white border-sky-600' },
  { id: 'paid_leave', icon: Coffee, active: 'bg-amber-500 text-white border-amber-500' },
  { id: 'sick_leave', icon: HeartPulse, active: 'bg-rose-600 text-white border-rose-600' },
];

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
  const { t, lang } = useI18n();
  const { confirm } = useFeedback();
  const [editing, setEditing] = useState<TimeEntry | null>(null);

  const dateIso = formatDateIso(selectedDate);
  const currentStatus = getEffectiveStatus(selectedDate, dayLogs, settings);
  const isOffDay = isLeaveStatus(currentStatus);
  const dayEntries = entries.filter((e) => e.date === dateIso);
  const totalDayHours = sumHours(dayEntries);
  const targetDayHours = getDayTargetHours(selectedDate, dayLogs, settings);
  const progress = targetDayHours > 0 ? Math.min(100, (totalDayHours / targetDayHours) * 100) : 100;

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
    if (ok) {
      onDeleteTask(task.id);
      if (editing?.id === task.id) setEditing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">{t.dayLog.title}</h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">{t.dayLog.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {!isToday(dateIso) && (
            <button type="button" onClick={() => changeDate(new Date())} className="btn-outlined">
              {t.common.today}
            </button>
          )}
          <div className="flex items-center bg-white border border-neutral-300 rounded-full p-0.5 elevation-1">
            <button type="button" onClick={() => changeDate(addDays(selectedDate, -1))} aria-label={t.common.prevDay} title={t.common.prevDay} className="icon-btn p-1.5">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <DatePicker value={selectedDate} onChange={changeDate} label={formatLongDate(selectedDate, lang)} align="right" />
            <button type="button" onClick={() => changeDate(addDays(selectedDate, 1))} aria-label={t.common.nextDay} title={t.common.nextDay} className="icon-btn p-1.5">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="card p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">{t.dayLog.dayStatus}</div>
            <div className="flex items-center gap-2 flex-wrap" role="radiogroup" aria-label={t.dayLog.dayStatus}>
              {QUICK_STATUSES.map(({ id, icon: Icon, active }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={currentStatus === id}
                  onClick={() => onSetDayStatus(dateIso, id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-full border transition-all ${
                    currentStatus === id ? `${active} elevation-1` : 'bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{t.status[id].label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-neutral-100">
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
            <div>
              <div className="text-xs text-neutral-500 font-medium">{t.dayLog.totalHoursToday}</div>
              <div className="text-2xl font-black text-neutral-900 tabular-nums">
                {formatHours(totalDayHours)}h <span className="text-xs font-normal text-neutral-400">/ {formatHours(targetDayHours)}h</span>
              </div>
            </div>
            <div className="text-xs">
              {isOffDay ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-300 rounded-full font-bold">
                  <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  {t.dayLog.offDayValid}
                </span>
              ) : totalDayHours >= targetDayHours ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {t.dayLog.hoursCompleted(formatHours(targetDayHours))}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  {t.dayLog.hoursRemaining(formatHours(targetDayHours - totalDayHours))}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {isOffDay ? (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="card border-amber-200 p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-800 mx-auto flex items-center justify-center">
            <Coffee className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">{t.dayLog.leaveNoticeTitle(t.status[currentStatus].label)}</h3>
          <p className="text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">{t.dayLog.leaveNoticeDesc}</p>
        </motion.div>
      ) : (
        <div className="card p-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wide flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>{editing ? t.dayLog.formEditTitle : t.dayLog.formTitle}</span>
            </h3>
            {editing && (
              <button type="button" onClick={() => setEditing(null)} className="btn-text">
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
            onSubmit={(draft) => {
              onSaveTask(draft, editing?.id);
              setEditing(null);
            }}
          />
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-50/60 text-xs font-bold text-neutral-800 uppercase tracking-wider">
          {t.dayLog.loggedTitle(dayEntries.length, formatHours(totalDayHours))}
        </div>

        {dayEntries.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-xs italic">{t.dayLog.empty}</div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            <AnimatePresence initial={false}>
              {dayEntries.map((task) => {
                const link = safeUrl(task.githubUrl);
                return (
                  <motion.li
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 12, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`p-4 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      editing?.id === task.id ? 'bg-indigo-50/60' : 'hover:bg-neutral-50/70'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-neutral-900 break-words">{task.taskName}</span>
                        {task.project && <span className="text-xs font-medium text-neutral-500">· {task.project}</span>}
                        {task.category && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">{t.categories[task.category]}</span>
                        )}
                        {link && (
                          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 underline">
                            <ExternalLink className="w-3 h-3" />
                            {t.common.link}
                          </a>
                        )}
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full tabular-nums ${task.gapPct > 0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                          {task.completionPct}%
                        </span>
                      </div>
                      {task.description && <p className="text-xs text-neutral-600 mt-1">{task.description}</p>}
                      {task.gapReason && (
                        <p className="text-xs text-amber-800 mt-0.5 italic">
                          {t.dayLog.reason}: {task.gapReason}
                          {task.gapSolution && ` · ${t.dayLog.solution}: ${task.gapSolution}`}
                        </p>
                      )}
                      {(task.remark || task.notes) && (
                        <p className="text-[11px] text-neutral-500 mt-0.5">
                          {t.dayLog.remark}: {task.remark || task.notes}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-3 shrink-0">
                      <span className="text-base font-black text-neutral-900 tabular-nums">{formatHours(task.hours)}h</span>
                      <div className="flex items-center">
                        <button type="button" onClick={() => setEditing(task)} title={t.dayLog.editTask} aria-label={t.dayLog.editTask} className="icon-btn">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(task)}
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
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
};
