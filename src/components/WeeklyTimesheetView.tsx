import React, { createContext, useContext, useMemo, useState } from 'react';
import { Plus, Clock, Briefcase, Coffee, Zap, GitPullRequest, TableProperties, Move } from 'lucide-react';
import { CATEGORY_COLORS, DAY_STATUS_CONFIGS, type DayLog, type DayStatusType, type TimeEntry, type UserSettings } from '../types';
import { formatDateIso, formatHours, formatShortDate, getDayName, getWeekDays, isToday, isWeekendDay } from '../utils/dateUtils';
import {
  entryHours,
  filterEntriesForDays,
  getDayTargetHours,
  getEffectiveStatus,
  getWeeklyTargetHours,
  getWorkingAndOffDaysInfo,
  isLeaveStatus,
  sumHours,
} from '../utils/workdays';
import { safeUrl } from '../utils/security';
import { taskKey } from '../utils/taskHistory';
import { useI18n, type Translations } from '../i18n';
import { IconTile, PageHeader, PageStack, Reveal, type Tone } from '../ui/layout';
import { WeekNavigator } from './WeekNavigator';
import type { TaskTemplate } from './TaskForm';

interface WeeklyTimesheetViewProps {
  currentDate: Date;
  onChangeDate: (d: Date) => void;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  onOpenNewTaskForDay: (dateIso: string) => void;
  onEditTask: (entry: TimeEntry) => void;
  /** Opens the task dialog on `dateIso`, prefilled from an entry logged before */
  onContinueTask: (template: TaskTemplate, dateIso: string) => void;
  onOpenDayStatusModal: (dateIso: string) => void;
}

interface TaskGroup {
  key: string;
  taskName: string;
  githubUrl?: string;
  byDay: Record<string, TimeEntry[]>;
  totalHours: number;
  /** Most recent entry of the week: what "+" and drag & drop continue from */
  latest: TimeEntry;
}

interface ProjectGroup {
  projectName: string;
  tasks: TaskGroup[];
  totalHours: number;
}

const latestOf = (a: TimeEntry, b: TimeEntry) => (a.date === b.date ? (a.createdAt >= b.createdAt ? a : b) : a.date > b.date ? a : b);

/** Rows per project, then per task; names that differ only by case are the same task. */
function groupByProject(entries: TimeEntry[], noProject: string): ProjectGroup[] {
  const projects = new Map<string, ProjectGroup>();
  for (const entry of entries) {
    const name = entry.project || noProject;
    const project = projects.get(name) ?? { projectName: name, tasks: [], totalHours: 0 };
    projects.set(name, project);
    const hours = entryHours(entry);
    project.totalHours += hours;

    const key = taskKey(entry.taskName);
    let task = project.tasks.find((t) => t.key === key);
    if (!task) {
      task = { key, taskName: entry.taskName, byDay: {}, totalHours: 0, latest: entry };
      project.tasks.push(task);
    }
    task.latest = latestOf(task.latest, entry);
    task.taskName = task.latest.taskName;
    task.githubUrl = safeUrl(task.latest.githubUrl) ?? task.githubUrl ?? safeUrl(entry.githubUrl);
    task.totalHours += hours;
    (task.byDay[entry.date] ??= []).push(entry);
  }
  return [...projects.values()].sort((a, b) => b.totalHours - a.totalHours);
}

/* ---------- Drag & drop ---------- */

interface DragState {
  entry: TimeEntry;
  fromIso: string;
}

interface TimesheetDnd {
  drag: DragState | null;
  overIso: string | null;
  canDrop: (iso: string) => boolean;
  start: (entry: TimeEntry, fromIso: string) => void;
  enter: (iso: string) => void;
  drop: (iso: string) => void;
  end: () => void;
}

const DndContext = createContext<TimesheetDnd | null>(null);
const useDnd = () => useContext(DndContext)!;

/** Dropping an entry on another working day opens the task dialog there, prefilled from it. */
function useTimesheetDnd(blockedDays: Set<string>, onContinueTask: WeeklyTimesheetViewProps['onContinueTask']): TimesheetDnd {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [overIso, setOverIso] = useState<string | null>(null);
  const canDrop = (iso: string) => !!drag && iso !== drag.fromIso && !blockedDays.has(iso);
  const end = () => {
    setDrag(null);
    setOverIso(null);
  };
  return {
    drag,
    overIso,
    canDrop,
    start: (entry, fromIso) => setDrag({ entry, fromIso }),
    enter: (iso) => setOverIso(iso),
    drop: (iso) => {
      if (drag && canDrop(iso)) onContinueTask(drag.entry, iso);
      end();
    },
    end,
  };
}

/** Drop-zone props and highlight classes for a cell of the `iso` column. */
function useDropZone(iso: string) {
  const dnd = useDnd();
  if (!dnd.drag) return { className: '', handlers: {}, over: false };
  const allowed = dnd.canDrop(iso);
  const over = dnd.overIso === iso;
  const className = !allowed ? 'drop-blocked' : over ? 'drop-column' : '';
  const handlers = {
    onDragEnter: () => dnd.enter(iso),
    onDragOver: (e: React.DragEvent) => {
      if (!allowed) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      dnd.drop(iso);
    },
  };
  return { className, handlers, over: over && allowed };
}

/* ---------- KPIs ---------- */

interface Kpi {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  value: string;
  unit: string;
  note?: string;
  bar?: number;
}

const KpiCard: React.FC<{ kpi: Kpi }> = ({ kpi: { label, icon, tone, value, unit, note, bar } }) => (
  <Reveal className="card card-hover p-4">
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500 font-semibold">{label}</span>
      <IconTile icon={icon} tone={tone} size="sm" />
    </div>
    <div className="mt-2 flex items-baseline gap-2 flex-wrap">
      <span className="text-2xl font-black text-slate-950 tabular-nums">{value}</span>
      <span className="text-xs text-slate-500">{unit}</span>
    </div>
    {bar !== undefined ? (
      <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${bar >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`} style={{ width: `${bar}%` }} />
      </div>
    ) : (
      <p className="mt-2 text-[11px] text-slate-500 truncate">{note}</p>
    )}
  </Reveal>
);

/* ---------- Table cells ---------- */

function columnTone(day: Date, iso: string): string {
  if (isToday(iso)) return 'bg-indigo-50/50';
  return isWeekendDay(day) ? 'hatched' : '';
}

const DayHeaderCell: React.FC<{ day: Date; iso: string }> = ({ day, iso }) => {
  const { lang } = useI18n();
  const { className, handlers } = useDropZone(iso);
  const today = isToday(iso);
  return (
    <th {...handlers} className={`py-3 px-2 text-center w-[92px] border-l border-slate-200/70 transition-colors ${columnTone(day, iso)} ${className}`}>
      <div className="flex flex-col items-center gap-1">
        <span className={today ? 'text-indigo-600' : ''}>{getDayName(day, lang, true)}</span>
        <span className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded-full ${today ? 'bg-indigo-600 text-white' : 'text-slate-900'}`}>{formatShortDate(day)}</span>
      </div>
    </th>
  );
};

interface TaskDayCellProps {
  iso: string;
  day: Date;
  task: TaskGroup;
  onEditTask: (entry: TimeEntry) => void;
  onContinue: (task: TaskGroup, iso: string) => void;
}

const TaskDayCell: React.FC<TaskDayCellProps> = ({ iso, day, task, onEditTask, onContinue }) => {
  const { t } = useI18n();
  const dnd = useDnd();
  const { className, handlers, over } = useDropZone(iso);
  const dayEntries = task.byDay[iso] ?? [];
  const hours = sumHours(dayEntries);
  const source = dayEntries.reduce<TimeEntry | null>((latest, e) => (latest ? latestOf(latest, e) : e), null);
  const dragging = dnd.drag?.entry === source && source !== null;
  return (
    <td {...handlers} className={`py-1.5 px-1.5 text-center border-l border-slate-200/70 transition-colors ${columnTone(day, iso)} ${className} ${over ? 'drop-target' : ''}`}>
      {source ? (
        <button
          type="button"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', source.taskName);
            dnd.start(source, iso);
          }}
          onDragEnd={dnd.end}
          onClick={() => onEditTask(source)}
          title={t.timesheet.cellTitle(dayEntries.length, formatHours(hours))}
          className={`relative w-full py-1.5 pl-2.5 pr-1.5 rounded-lg bg-white border border-slate-200 elevation-1 text-slate-900 text-[11px] font-bold tabular-nums cursor-grab active:cursor-grabbing hover:border-indigo-300 hover:elevation-2 transition-[box-shadow,border-color,opacity] ${
            dragging ? 'opacity-40' : ''
          }`}
        >
          <span className="absolute left-1 top-1.5 bottom-1.5 w-1 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[source.category ?? 'other'] }} aria-hidden="true" />
          {formatHours(hours)}h
          {source.completionPct >= 100 && <span className="ml-1 text-emerald-600">✓</span>}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onContinue(task, iso)}
          aria-label={t.timesheet.continueOn(formatShortDate(day))}
          title={t.timesheet.continueOn(formatShortDate(day))}
          className="w-full py-1.5 text-slate-300 group-hover:text-slate-400 hover:!text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <Plus className="w-3.5 h-3.5 mx-auto" />
        </button>
      )}
    </td>
  );
};

const DailyTotalCell: React.FC<{ hours: number; target: number }> = ({ hours, target }) => {
  const { t } = useI18n();
  const enough = hours >= target;
  const pct = target > 0 ? Math.min(100, (hours / target) * 100) : 0;
  return (
    <td className="py-3 px-2 text-center border-l border-slate-200/70 tabular-nums">
      <div className="flex flex-col items-center gap-1">
        <span className="text-sm font-black text-slate-900">{formatHours(hours)}h</span>
        {target > 0 && (
          <>
            <span className="w-12 h-1 rounded-full bg-slate-200 overflow-hidden">
              <span className={`block h-full rounded-full ${enough ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
            </span>
            <span className={`text-[10px] font-semibold ${enough ? 'text-emerald-700' : 'text-amber-700'}`}>
              {enough ? `✓ ${t.timesheet.enough}` : t.timesheet.missing(formatHours(target - hours))}
            </span>
          </>
        )}
      </div>
    </td>
  );
};

interface StatusRowProps {
  weekDays: Date[];
  isoDates: string[];
  statuses: DayStatusType[];
  workedDays: number;
  leaveDays: number;
  onOpenDayStatusModal: (dateIso: string) => void;
}

const StatusRow: React.FC<StatusRowProps> = ({ weekDays, isoDates, statuses, workedDays, leaveDays, onOpenDayStatusModal }) => {
  const { t } = useI18n();
  return (
    <tr className="border-b border-slate-200 text-xs">
      <td className="sticky left-0 z-10 bg-white py-2.5 px-4 text-xs font-semibold text-slate-700">
        {t.timesheet.dayStatusRow} <span className="text-[10px] text-slate-400 font-normal italic">{t.timesheet.clickToChange}</span>
      </td>
      {statuses.map((status, idx) => (
        <td key={`status-${isoDates[idx]}`} className={`py-2 px-1.5 text-center border-l border-slate-200/70 ${columnTone(weekDays[idx], isoDates[idx])}`}>
          <button
            type="button"
            onClick={() => onOpenDayStatusModal(isoDates[idx])}
            title={t.timesheet.changeStatus(t.status[status].label)}
            className={`w-full py-1 px-1 text-[11px] font-semibold rounded-full border truncate transition-shadow hover:elevation-1 ${DAY_STATUS_CONFIGS[status].badgeClass}`}
          >
            {t.status[status].short}
          </button>
        </td>
      ))}
      <td className="py-2 px-2 text-center border-l border-slate-200 bg-slate-50 text-[11px] text-slate-500 font-medium">{t.timesheet.workedVsLeave(workedDays, leaveDays)}</td>
    </tr>
  );
};

const EmptyRow: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const { t } = useI18n();
  return (
    <tr>
      <td colSpan={9} className="py-14 text-center text-slate-500">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
          <TableProperties className="w-6 h-6" />
        </div>
        <p className="mt-3 text-sm font-medium text-slate-700">{t.timesheet.empty}</p>
        <button type="button" onClick={onAdd} className="btn-filled mt-4">
          <Plus className="w-4 h-4" />
          {t.timesheet.addLog}
        </button>
      </td>
    </tr>
  );
};

interface ProjectRowsProps {
  proj: ProjectGroup;
  weekDays: Date[];
  isoDates: string[];
  onEditTask: (entry: TimeEntry) => void;
  onContinue: (task: TaskGroup, iso: string) => void;
}

const ProjectRows: React.FC<ProjectRowsProps> = ({ proj, weekDays, isoDates, onEditTask, onContinue }) => {
  const { t } = useI18n();
  return (
    <>
      <tr className="bg-slate-50/80 font-bold text-slate-900 border-t border-slate-200">
        <td className="sticky left-0 z-10 bg-slate-50 py-2.5 px-4">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
              <span className="truncate">{proj.projectName}</span>
            </span>
            <span className="text-[11px] font-medium text-slate-500 shrink-0">{t.common.tasks(proj.tasks.length)}</span>
          </div>
        </td>
        {isoDates.map((iso) => {
          const hours = proj.tasks.reduce((sum, task) => sum + sumHours(task.byDay[iso] ?? []), 0);
          return (
            <td key={iso} className="py-2 px-2 text-center border-l border-slate-200/70 font-semibold text-slate-600 tabular-nums">
              {hours > 0 ? `${formatHours(hours)}h` : '–'}
            </td>
          );
        })}
        <td className="py-2 px-2 text-center border-l border-slate-200 bg-slate-100/80 font-black tabular-nums">{formatHours(proj.totalHours)}h</td>
      </tr>

      {proj.tasks.map((task) => (
        <tr key={`${proj.projectName}-${task.key}`} className="group hover:bg-slate-50/60 transition-colors">
          <td className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 transition-colors py-2 px-4 pl-8">
            <div className="flex items-center gap-1.5">
              {task.githubUrl && (
                <a href={task.githubUrl} target="_blank" rel="noopener noreferrer" title={t.timesheet.openLink} aria-label={t.timesheet.openLink} className="text-violet-600 hover:text-violet-800 shrink-0">
                  <GitPullRequest className="w-3.5 h-3.5" />
                </a>
              )}
              <span className="text-slate-800 font-medium truncate max-w-[240px]" title={task.taskName}>
                {task.taskName}
              </span>
            </div>
          </td>
          {isoDates.map((iso, idx) => (
            <TaskDayCell key={iso} iso={iso} day={weekDays[idx]} task={task} onEditTask={onEditTask} onContinue={onContinue} />
          ))}
          <td className="py-2 px-2 text-center border-l border-slate-200 bg-slate-50/70 font-bold text-slate-900 tabular-nums">{formatHours(task.totalHours)}h</td>
        </tr>
      ))}
    </>
  );
};

interface WeekStats {
  totalWeekHours: number;
  targetWeekHours: number;
  targetPercent: number;
  workedDays: number;
  leaveDays: number;
  taskCount: number;
  workingInfo: ReturnType<typeof getWorkingAndOffDaysInfo>;
}

function buildKpis(t: Translations, s: WeekStats): Kpi[] {
  const ts = t.timesheet;
  return [
    {
      label: ts.totalWeek,
      icon: Clock,
      tone: 'indigo',
      value: `${formatHours(s.totalWeekHours)}h`,
      unit: ts.ofTarget(formatHours(s.targetWeekHours)),
      bar: Math.min(100, s.targetPercent),
    },
    { label: ts.workDays, icon: Briefcase, tone: 'emerald', value: String(s.workedDays), unit: ts.workDaysUnit, note: ts.officeAndWfh(s.workingInfo.officeDaysCount) },
    {
      label: ts.leaveDays,
      icon: Coffee,
      tone: 'amber',
      value: String(s.leaveDays),
      unit: ts.leaveUnit,
      note: s.workingInfo.daysOffDatesText ? ts.leaveDates(s.workingInfo.daysOffDatesText) : ts.noLeave,
    },
    {
      label: ts.progress,
      icon: Zap,
      tone: 'violet',
      value: `${s.targetPercent}%`,
      unit: s.totalWeekHours >= s.targetWeekHours ? ts.onTarget : ts.missing(formatHours(s.targetWeekHours - s.totalWeekHours)),
      note: ts.tasksLogged(s.taskCount),
    },
  ];
}

export const WeeklyTimesheetView: React.FC<WeeklyTimesheetViewProps> = ({
  currentDate,
  onChangeDate,
  entries,
  dayLogs,
  settings,
  onOpenNewTaskForDay,
  onEditTask,
  onContinueTask,
  onOpenDayStatusModal,
}) => {
  const { t } = useI18n();
  const weekDays = getWeekDays(currentDate);
  const isoDates = weekDays.map(formatDateIso);
  const weekEntries = filterEntriesForDays(entries, weekDays);
  const workingInfo = getWorkingAndOffDaysInfo(weekDays, dayLogs, settings);

  const totalWeekHours = sumHours(weekEntries);
  const targetWeekHours = getWeeklyTargetHours(weekDays, dayLogs, settings);
  const targetPercent = targetWeekHours > 0 ? Math.round((totalWeekHours / targetWeekHours) * 100) : 100;
  const dailyTotals = isoDates.map((iso) => sumHours(weekEntries.filter((e) => e.date === iso)));

  const statuses = weekDays.map((d) => getEffectiveStatus(d, dayLogs, settings));
  const workedDays = statuses.filter((s) => DAY_STATUS_CONFIGS[s].isWorkDay).length;
  const leaveDays = statuses.filter(isLeaveStatus).length;
  const offDays = new Set(isoDates.filter((_, idx) => isLeaveStatus(statuses[idx])));

  const projects = useMemo(() => groupByProject(weekEntries, t.common.noProject), [weekEntries, t]);
  const dnd = useTimesheetDnd(offDays, onContinueTask);
  const continueTask = (task: TaskGroup, iso: string) => onContinueTask(task.latest, iso);

  const kpis = buildKpis(t, { totalWeekHours, targetWeekHours, targetPercent, workedDays, leaveDays, taskCount: weekEntries.length, workingInfo });

  return (
    <PageStack>
      <PageHeader
        icon={TableProperties}
        title={t.timesheet.title}
        subtitle={t.timesheet.subtitle(formatHours(settings.dailyStandardHours), formatHours(settings.weeklyTargetHours))}
        actions={<WeekNavigator currentDate={currentDate} onChange={onChangeDate} />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <Reveal className="card overflow-hidden">
        {projects.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-white text-xs text-indigo-900">
            <Move className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
            <span>{t.timesheet.dragHint}</span>
          </div>
        )}
        <DndContext.Provider value={dnd}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]" onDragEnd={dnd.end}>
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="sticky left-0 z-10 bg-slate-50 py-3 px-4 w-[300px]">{t.timesheet.colProject}</th>
                  {weekDays.map((day, idx) => (
                    <DayHeaderCell key={isoDates[idx]} day={day} iso={isoDates[idx]} />
                  ))}
                  <th className="py-3 px-3 text-center w-[90px] border-l border-slate-200 bg-slate-100 text-slate-900 font-bold">{t.timesheet.colTotal}</th>
                </tr>

                <StatusRow
                  weekDays={weekDays}
                  isoDates={isoDates}
                  statuses={statuses}
                  workedDays={workedDays}
                  leaveDays={leaveDays}
                  onOpenDayStatusModal={onOpenDayStatusModal}
                />
              </thead>

              <tbody className="divide-y divide-slate-100 text-xs">
                {projects.length === 0 ? (
                  <EmptyRow onAdd={() => onOpenNewTaskForDay(isoDates[0])} />
                ) : (
                  projects.map((proj) => (
                    <ProjectRows key={proj.projectName} proj={proj} weekDays={weekDays} isoDates={isoDates} onEditTask={onEditTask} onContinue={continueTask} />
                  ))
                )}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold text-xs text-slate-900">
                  <td className="sticky left-0 z-10 bg-slate-50 py-3 px-4 uppercase tracking-wider text-[11px]">{t.timesheet.dailyTotal}</td>
                  {dailyTotals.map((hours, idx) => (
                    <DailyTotalCell key={isoDates[idx]} hours={hours} target={getDayTargetHours(weekDays[idx], dayLogs, settings)} />
                  ))}
                  <td className="py-3 px-3 text-center border-l border-slate-200 bg-indigo-50 text-base font-black text-indigo-950 tabular-nums">{formatHours(totalWeekHours)}h</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </DndContext.Provider>
      </Reveal>
    </PageStack>
  );
};
