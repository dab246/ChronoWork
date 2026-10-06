import React, { useMemo } from 'react';
import { Plus, Clock, Briefcase, Coffee, Zap, GitPullRequest } from 'lucide-react';
import { DAY_STATUS_CONFIGS, type TimeEntry, type DayLog, type UserSettings } from '../types';
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
import { useI18n } from '../i18n';
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
  const { t, lang } = useI18n();
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

  const kpis = [
    {
      label: t.timesheet.totalWeek,
      icon: Clock,
      value: `${formatHours(totalWeekHours)}h`,
      unit: t.timesheet.ofTarget(formatHours(targetWeekHours)),
      bar: Math.min(100, targetPercent),
    },
    { label: t.timesheet.workDays, icon: Briefcase, value: String(workedDays), unit: t.timesheet.workDaysUnit, note: t.timesheet.officeAndWfh(workingInfo.officeDaysCount) },
    {
      label: t.timesheet.leaveDays,
      icon: Coffee,
      value: String(leaveDays),
      unit: t.timesheet.leaveUnit,
      note: workingInfo.daysOffDatesText ? t.timesheet.leaveDates(workingInfo.daysOffDatesText) : t.timesheet.noLeave,
    },
    {
      label: t.timesheet.progress,
      icon: Zap,
      value: `${targetPercent}%`,
      unit: totalWeekHours >= targetWeekHours ? t.timesheet.onTarget : t.timesheet.missing(formatHours(targetWeekHours - totalWeekHours)),
      note: t.timesheet.tasksLogged(weekEntries.length),
    },
  ];

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
        {kpis.map(({ label, icon: Icon, value, unit, note, bar }) => (
          <div key={label} className="card card-hover p-4">
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
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-[300px]">{t.timesheet.colProject}</th>
                {weekDays.map((day, idx) => (
                  <th
                    key={isoDates[idx]}
                    className={`py-3 px-2 text-center w-[85px] border-l border-neutral-200/60 ${
                      isToday(isoDates[idx]) ? 'bg-indigo-50 text-indigo-950' : isWeekendDay(day) ? 'bg-neutral-100/60 text-neutral-500' : ''
                    }`}
                  >
                    <div className="flex flex-col items-center">
                      <span>{getDayName(day, lang, true)}</span>
                      <span className="text-xs font-bold text-neutral-900 tabular-nums mt-0.5">{formatShortDate(day)}</span>
                    </div>
                  </th>
                ))}
                <th className="py-3 px-3 text-center w-[90px] border-l border-neutral-200 bg-neutral-100 text-neutral-900 font-bold">{t.timesheet.colTotal}</th>
              </tr>

              <tr className="border-b border-neutral-200 bg-neutral-50/40 text-xs">
                <td className="py-2.5 px-4 text-xs font-semibold text-neutral-700">
                  {t.timesheet.dayStatusRow} <span className="text-[10px] text-neutral-400 font-normal italic">{t.timesheet.clickToChange}</span>
                </td>
                {weekDays.map((_, idx) => {
                  const status = statuses[idx];
                  return (
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
                  );
                })}
                <td className="py-2 px-2 text-center border-l border-neutral-200 bg-neutral-50 text-[11px] text-neutral-500 font-medium">
                  {t.timesheet.workedVsLeave(workedDays, leaveDays)}
                </td>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 text-xs">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    <p className="text-sm font-medium text-neutral-700">{t.timesheet.empty}</p>
                    <button type="button" onClick={() => onOpenNewTaskForDay(isoDates[0])} className="btn-filled mt-4">
                      <Plus className="w-4 h-4" />
                      {t.timesheet.addLog}
                    </button>
                  </td>
                </tr>
              ) : (
                projects.map((proj) => (
                  <React.Fragment key={proj.projectName}>
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
                        {isoDates.map((iso) => {
                          const dayEntries = task.byDay[iso] ?? [];
                          const hours = sumHours(dayEntries);
                          return (
                            <td key={iso} className="py-2 px-1 text-center border-l border-neutral-200/60">
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
                                  onClick={() => onOpenNewTaskForDay(iso)}
                                  aria-label={t.timesheet.addLog}
                                  className="w-full py-1 text-neutral-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs transition-colors"
                                >
                                  +
                                </button>
                              )}
                            </td>
                          );
                        })}
                        <td className="py-2 px-2 text-center border-l border-neutral-200 bg-neutral-50/60 font-bold text-neutral-900 tabular-nums">{formatHours(task.totalHours)}h</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>

            <tfoot>
              <tr className="border-t-2 border-neutral-300 bg-neutral-100 font-bold text-xs text-neutral-900">
                <td className="py-3 px-4 uppercase tracking-wider">{t.timesheet.dailyTotal}</td>
                {dailyTotals.map((hours, idx) => {
                  const target = getDayTargetHours(weekDays[idx], dayLogs, settings);
                  return (
                    <td key={isoDates[idx]} className="py-3 px-2 text-center border-l border-neutral-200/80 tabular-nums">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold">{formatHours(hours)}h</span>
                        {target > 0 && (
                          <span className={`text-[10px] font-normal ${hours >= target ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {hours >= target ? `✓ ${t.timesheet.enough}` : t.timesheet.missing(formatHours(target - hours))}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-center border-l border-neutral-200 bg-neutral-200/80 text-sm font-extrabold tabular-nums">{formatHours(totalWeekHours)}h</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
