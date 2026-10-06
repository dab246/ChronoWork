import React, { useMemo } from 'react';
import { Plus, Clock, Briefcase, Coffee, Zap, GitPullRequest } from 'lucide-react';
import { DAY_STATUS_CONFIGS, type DayLog, type DayStatusType, type TimeEntry, type UserSettings } from '../types';
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
import { useI18n, type Translations } from '../i18n';
import { WeekNavigator } from './WeekNavigator';

interface WeeklyTimesheetViewProps {
  currentDate: Date;
  onChangeDate: (d: Date) => void;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  onOpenNewTaskForDay: (dateIso: string) => void;
  onEditTask: (entry: TimeEntry) => void;
  onOpenDayStatusModal: (dateIso: string) => void;
}

interface TaskGroup {
  taskName: string;
  githubUrl?: string;
  byDay: Record<string, TimeEntry[]>;
  totalHours: number;
}

interface ProjectGroup {
  projectName: string;
  tasks: TaskGroup[];
  totalHours: number;
}

function groupByProject(entries: TimeEntry[], noProject: string): ProjectGroup[] {
  const projects = new Map<string, ProjectGroup>();
  for (const entry of entries) {
    const name = entry.project || noProject;
    const project = projects.get(name) ?? { projectName: name, tasks: [], totalHours: 0 };
    projects.set(name, project);
    const hours = entryHours(entry);
    project.totalHours += hours;

    let task = project.tasks.find((t) => t.taskName === entry.taskName);
    if (!task) {
      task = { taskName: entry.taskName, githubUrl: safeUrl(entry.githubUrl), byDay: {}, totalHours: 0 };
      project.tasks.push(task);
    }
    task.totalHours += hours;
    (task.byDay[entry.date] ??= []).push(entry);
  }
  return [...projects.values()].sort((a, b) => b.totalHours - a.totalHours);
}

interface Kpi {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  unit: string;
  note?: string;
  bar?: number;
}

const KpiCard: React.FC<{ kpi: Kpi }> = ({ kpi: { label, icon: Icon, value, unit, note, bar } }) => (
  <div className="card card-hover p-4">
    <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
      <span>{label}</span>
      <Icon className="w-4 h-4 text-indigo-400" />
    </div>
    <div className="mt-2 flex items-baseline gap-2 flex-wrap">
      <span className="text-2xl font-bold text-neutral-950 tabular-nums">{value}</span>
      <span className="text-xs text-neutral-500">{unit}</span>
    </div>
    {bar !== undefined ? (
      <div className="mt-2 w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${bar >= 100 ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${bar}%` }} />
      </div>
    ) : (
      <p className="mt-2 text-[11px] text-neutral-500">{note}</p>
    )}
  </div>
);

function dayHeaderClass(day: Date, iso: string): string {
  if (isToday(iso)) return 'bg-indigo-50 text-indigo-950';
  return isWeekendDay(day) ? 'bg-neutral-100/60 text-neutral-500' : '';
}

const DayHeaderCell: React.FC<{ day: Date; iso: string }> = ({ day, iso }) => {
  const { lang } = useI18n();
  return (
    <th className={`py-3 px-2 text-center w-[85px] border-l border-neutral-200/60 ${dayHeaderClass(day, iso)}`}>
      <div className="flex flex-col items-center">
        <span>{getDayName(day, lang, true)}</span>
        <span className="text-xs font-bold text-neutral-900 tabular-nums mt-0.5">{formatShortDate(day)}</span>
      </div>
    </th>
  );
};

interface TaskDayCellProps {
  iso: string;
  dayEntries: TimeEntry[];
  onEditTask: (entry: TimeEntry) => void;
  onAdd: (iso: string) => void;
}

const TaskDayCell: React.FC<TaskDayCellProps> = ({ iso, dayEntries, onEditTask, onAdd }) => {
  const { t } = useI18n();
  const hours = sumHours(dayEntries);
  return (
    <td className="py-2 px-1 text-center border-l border-neutral-200/60">
      {hours > 0 ? (
        <button
          type="button"
          onClick={() => onEditTask(dayEntries[0])}
          title={t.timesheet.cellTitle(dayEntries.length, formatHours(hours))}
          className="w-full py-1 px-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-950 text-[11px] font-bold tabular-nums transition-colors"
        >
          {formatHours(hours)}h
        </button>
      ) : (
        <button
          type="button"
          onClick={() => onAdd(iso)}
          aria-label={t.timesheet.addLog}
          className="w-full py-1 text-neutral-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs transition-colors"
        >
          +
        </button>
      )}
    </td>
  );
};

const DailyTotalCell: React.FC<{ hours: number; target: number }> = ({ hours, target }) => {
  const { t } = useI18n();
  const enough = hours >= target;
  return (
    <td className="py-3 px-2 text-center border-l border-neutral-200/80 tabular-nums">
      <div className="flex flex-col items-center">
        <span className="text-sm font-bold">{formatHours(hours)}h</span>
        {target > 0 && (
          <span className={`text-[10px] font-normal ${enough ? 'text-emerald-700' : 'text-amber-700'}`}>
            {enough ? `✓ ${t.timesheet.enough}` : t.timesheet.missing(formatHours(target - hours))}
          </span>
        )}
      </div>
    </td>
  );
};

interface StatusRowProps {
  isoDates: string[];
  statuses: DayStatusType[];
  workedDays: number;
  leaveDays: number;
  onOpenDayStatusModal: (dateIso: string) => void;
}

const StatusRow: React.FC<StatusRowProps> = ({ isoDates, statuses, workedDays, leaveDays, onOpenDayStatusModal }) => {
  const { t } = useI18n();
  return (
    <tr className="border-b border-neutral-200 bg-neutral-50/40 text-xs">
      <td className="py-2.5 px-4 text-xs font-semibold text-neutral-700">
        {t.timesheet.dayStatusRow} <span className="text-[10px] text-neutral-400 font-normal italic">{t.timesheet.clickToChange}</span>
      </td>
      {statuses.map((status, idx) => (
        <td key={`status-${isoDates[idx]}`} className="py-2 px-1 text-center border-l border-neutral-200/60">
          <button
            type="button"
            onClick={() => onOpenDayStatusModal(isoDates[idx])}
            title={t.timesheet.changeStatus(t.status[status].label)}
            className={`w-full py-1 px-1 text-[11px] font-semibold rounded-full border truncate ${DAY_STATUS_CONFIGS[status].badgeClass}`}
          >
            {t.status[status].short}
          </button>
        </td>
      ))}
      <td className="py-2 px-2 text-center border-l border-neutral-200 bg-neutral-50 text-[11px] text-neutral-500 font-medium">
        {t.timesheet.workedVsLeave(workedDays, leaveDays)}
      </td>
    </tr>
  );
};

const EmptyRow: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const { t } = useI18n();
  return (
    <tr>
      <td colSpan={9} className="py-12 text-center text-neutral-500">
        <p className="text-sm font-medium text-neutral-700">{t.timesheet.empty}</p>
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
  isoDates: string[];
  onEditTask: (entry: TimeEntry) => void;
  onAdd: (iso: string) => void;
}

const ProjectRows: React.FC<ProjectRowsProps> = ({ proj, isoDates, onEditTask, onAdd }) => {
  const { t } = useI18n();
  return (
    <>
      <tr className="bg-neutral-50/80 font-bold text-neutral-900">
        <td className="py-2.5 px-4">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{proj.projectName}</span>
            <span className="text-[11px] font-normal text-neutral-500">{t.common.tasks(proj.tasks.length)}</span>
          </div>
        </td>
        {isoDates.map((iso) => {
          const hours = proj.tasks.reduce((sum, task) => sum + sumHours(task.byDay[iso] ?? []), 0);
          return (
            <td key={iso} className="py-2 px-2 text-center border-l border-neutral-200/60 font-semibold text-neutral-800 tabular-nums">
              {hours > 0 ? `${formatHours(hours)}h` : '–'}
            </td>
          );
        })}
        <td className="py-2 px-2 text-center border-l border-neutral-200 bg-neutral-100/70 font-bold tabular-nums">{formatHours(proj.totalHours)}h</td>
      </tr>

      {proj.tasks.map((task) => (
        <tr key={`${proj.projectName}-${task.taskName}`} className="hover:bg-neutral-50/60 transition-colors">
          <td className="py-2 px-4 pl-8">
            <div className="flex items-center gap-1.5">
              {task.githubUrl && (
                <a href={task.githubUrl} target="_blank" rel="noopener noreferrer" title={t.timesheet.openLink} aria-label={t.timesheet.openLink} className="text-purple-600 hover:text-purple-800 shrink-0">
                  <GitPullRequest className="w-3.5 h-3.5" />
                </a>
              )}
              <span className="text-neutral-900 font-medium truncate max-w-[220px]" title={task.taskName}>
                {task.taskName}
              </span>
            </div>
          </td>
          {isoDates.map((iso) => (
            <TaskDayCell key={iso} iso={iso} dayEntries={task.byDay[iso] ?? []} onEditTask={onEditTask} onAdd={onAdd} />
          ))}
          <td className="py-2 px-2 text-center border-l border-neutral-200 bg-neutral-50/60 font-bold text-neutral-900 tabular-nums">{formatHours(task.totalHours)}h</td>
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
      value: `${formatHours(s.totalWeekHours)}h`,
      unit: ts.ofTarget(formatHours(s.targetWeekHours)),
      bar: Math.min(100, s.targetPercent),
    },
    { label: ts.workDays, icon: Briefcase, value: String(s.workedDays), unit: ts.workDaysUnit, note: ts.officeAndWfh(s.workingInfo.officeDaysCount) },
    {
      label: ts.leaveDays,
      icon: Coffee,
      value: String(s.leaveDays),
      unit: ts.leaveUnit,
      note: s.workingInfo.daysOffDatesText ? ts.leaveDates(s.workingInfo.daysOffDatesText) : ts.noLeave,
    },
    {
      label: ts.progress,
      icon: Zap,
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

  const projects = useMemo(() => groupByProject(weekEntries, t.common.noProject), [weekEntries, t]);

  const kpis = buildKpis(t, { totalWeekHours, targetWeekHours, targetPercent, workedDays, leaveDays, taskCount: weekEntries.length, workingInfo });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">{t.timesheet.title}</h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            {t.timesheet.subtitle(formatHours(settings.dailyStandardHours), formatHours(settings.weeklyTargetHours))}
          </p>
        </div>
        <WeekNavigator currentDate={currentDate} onChange={onChangeDate} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-[300px]">{t.timesheet.colProject}</th>
                {weekDays.map((day, idx) => (
                  <DayHeaderCell key={isoDates[idx]} day={day} iso={isoDates[idx]} />
                ))}
                <th className="py-3 px-3 text-center w-[90px] border-l border-neutral-200 bg-neutral-100 text-neutral-900 font-bold">{t.timesheet.colTotal}</th>
              </tr>

              <StatusRow isoDates={isoDates} statuses={statuses} workedDays={workedDays} leaveDays={leaveDays} onOpenDayStatusModal={onOpenDayStatusModal} />
            </thead>

            <tbody className="divide-y divide-neutral-100 text-xs">
              {projects.length === 0 ? (
                <EmptyRow onAdd={() => onOpenNewTaskForDay(isoDates[0])} />
              ) : (
                projects.map((proj) => (
                  <ProjectRows key={proj.projectName} proj={proj} isoDates={isoDates} onEditTask={onEditTask} onAdd={onOpenNewTaskForDay} />
                ))
              )}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-neutral-300 bg-neutral-100 font-bold text-xs text-neutral-900">
                <td className="py-3 px-4 uppercase tracking-wider">{t.timesheet.dailyTotal}</td>
                {dailyTotals.map((hours, idx) => (
                  <DailyTotalCell key={isoDates[idx]} hours={hours} target={getDayTargetHours(weekDays[idx], dayLogs, settings)} />
                ))}
                <td className="py-3 px-3 text-center border-l border-neutral-200 bg-neutral-200/80 text-sm font-extrabold tabular-nums">{formatHours(totalWeekHours)}h</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
