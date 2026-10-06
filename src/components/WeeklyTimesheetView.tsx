import React, { useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  Plus, 
  Clock, 
  Briefcase, 
  Coffee, 
  Zap,
  GitPullRequest,
  ExternalLink
} from 'lucide-react';
import { TimeEntry, DayLog, UserSettings, DAY_STATUS_CONFIGS, CATEGORY_LABELS } from '../types';
import { 
  getWeekDays, 
  formatDateIso, 
  formatShortDate, 
  getVietnameseDayName, 
  getWeekNumber,
  isToday,
  isWeekendDay
} from '../utils/dateUtils';
import { getWorkingAndOffDaysInfo } from '../utils/exportUtils';

interface WeeklyTimesheetViewProps {
  currentDate: Date;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onResetToCurrentWeek: () => void;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  onOpenNewTaskForDay: (dateIso: string) => void;
  onEditTask: (entry: TimeEntry) => void;
  onOpenDayStatusModal: (dateIso: string) => void;
  onSelectDate?: (d: Date) => void;
}

export const WeeklyTimesheetView: React.FC<WeeklyTimesheetViewProps> = ({
  currentDate,
  onPrevWeek,
  onNextWeek,
  onResetToCurrentWeek,
  entries,
  dayLogs,
  settings,
  onOpenNewTaskForDay,
  onEditTask,
  onOpenDayStatusModal,
  onSelectDate,
}) => {
  const weekPickerRef = useRef<HTMLInputElement>(null);

  const weekDays = getWeekDays(currentDate);
  const weekIsoDates = weekDays.map((d) => formatDateIso(d));
  const weekEntries = entries.filter((e) => weekIsoDates.includes(e.date));
  const workingInfo = getWorkingAndOffDaysInfo(weekDays, dayLogs, settings);

  // Compute total weekly hours (1 day = 8h, 1 week Mon-Fri = 40h minus days off)
  const totalWeekHours = weekEntries.reduce(
    (acc, curr) => acc + (curr.hours ?? (curr.durationMinutes ? curr.durationMinutes / 60 : 0)),
    0
  );
  // Adjusted target: days off / sick leave reduce the required hours!
  const targetWeekHours = Math.max(0, (settings.weeklyTargetHours || 40) - (workingInfo.daysOffCount * 8));
  const targetPercent = targetWeekHours > 0 ? Math.min(150, Math.round((totalWeekHours / targetWeekHours) * 100)) : 100;

  // Daily totals in hours
  const dailyHourTotals = weekIsoDates.map((iso) => {
    const dayEntries = weekEntries.filter((e) => e.date === iso);
    return dayEntries.reduce(
      (sum, e) => sum + (e.hours ?? (e.durationMinutes ? e.durationMinutes / 60 : 0)),
      0
    );
  });

  // Count worked days vs leave days
  let workedDaysCount = 0;
  let leaveDaysCount = 0;
  weekIsoDates.forEach((iso, idx) => {
    const log = dayLogs[iso];
    const isWeekend = isWeekendDay(weekDays[idx]);
    if (log) {
      if (log.status === 'work' || log.status === 'wfh' || log.status === 'overtime') {
        workedDaysCount++;
      } else if (log.status !== 'weekend') {
        leaveDaysCount++;
      }
    } else {
      if (!isWeekend) workedDaysCount++;
    }
  });

  // Group entries by Project -> Task
  interface GroupedProject {
    projectName: string;
    tasks: {
      taskName: string;
      category: string;
      githubUrl?: string;
      dailyEntries: Record<string, TimeEntry[]>;
      totalHours: number;
    }[];
    totalHours: number;
  }

  const projectMap: Record<string, GroupedProject> = {};

  weekEntries.forEach((entry) => {
    if (!projectMap[entry.project]) {
      projectMap[entry.project] = {
        projectName: entry.project,
        tasks: [],
        totalHours: 0,
      };
    }
    const proj = projectMap[entry.project];
    const entryHours = entry.hours ?? ((entry.durationMinutes || 0) / 60);
    proj.totalHours += entryHours;

    let taskGroup = proj.tasks.find((t) => t.taskName === entry.taskName);
    if (!taskGroup) {
      taskGroup = {
        taskName: entry.taskName,
        category: entry.category || 'development',
        githubUrl: entry.githubUrl,
        dailyEntries: {},
        totalHours: 0,
      };
      proj.tasks.push(taskGroup);
    }
    taskGroup.totalHours += entryHours;
    if (!taskGroup.dailyEntries[entry.date]) {
      taskGroup.dailyEntries[entry.date] = [];
    }
    taskGroup.dailyEntries[entry.date].push(entry);
  });

  const sortedProjects = Object.values(projectMap).sort((a, b) => b.totalHours - a.totalHours);

  const weekNum = getWeekNumber(weekDays[0]);
  const startStr = formatShortDate(weekDays[0]);
  const endStr = formatShortDate(weekDays[4]);

  return (
    <div className="space-y-6">
      
      {/* Top Header & Week Navigator */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            Bảng Chấm Công & Log Time Tuần
          </h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Quy chuẩn 8 tiếng/ngày · 40 tiếng/tuần (Thứ 2 đến Thứ 6)
          </p>
        </div>

        {/* Week navigation controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={onResetToCurrentWeek}
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Tuần này
          </button>
          <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={onPrevWeek}
              title="Tuần trước"
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                try {
                  weekPickerRef.current?.showPicker();
                } catch {
                  weekPickerRef.current?.focus();
                }
              }}
              title="Mở lịch chọn tuần / ngày bất kỳ"
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer tabular-nums"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Tuần {weekNum} ({startStr} - {endStr})</span>
            </button>
            <input
              ref={weekPickerRef}
              type="date"
              value={formatDateIso(weekDays[0])}
              onChange={(e) => {
                if (e.target.value && onSelectDate) {
                  const parts = e.target.value.split('-');
                  onSelectDate(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
                }
              }}
              className="sr-only"
            />
            <button
              onClick={onNextWeek}
              title="Tuần sau"
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total hours */}
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Tổng giờ tuần</span>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-950 tabular-nums">
              {totalWeekHours.toFixed(1)}h
            </span>
            <span className="text-xs text-neutral-500">
              / {targetWeekHours}h mục tiêu
            </span>
          </div>
          <div className="mt-2 w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                targetPercent >= 100 ? 'bg-emerald-600' : 'bg-neutral-900'
              }`}
              style={{ width: `${Math.min(100, targetPercent)}%` }}
            />
          </div>
        </div>

        {/* Workdays */}
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Ngày làm việc</span>
            <Briefcase className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-950 tabular-nums">
              {workedDaysCount}
            </span>
            <span className="text-xs text-neutral-500">ngày công</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            Văn phòng ({workingInfo.officeDaysCount} ngày) & WFH
          </p>
        </div>

        {/* Days off & leave */}
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Ngày nghỉ / Phép</span>
            <Coffee className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-950 tabular-nums">
              {leaveDaysCount}
            </span>
            <span className="text-xs text-neutral-500">ngày nghỉ phép/lễ</span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            {workingInfo.daysOffDatesText ? `Ngày: ${workingInfo.daysOffDatesText}` : 'Không nghỉ ngày nào'}
          </p>
        </div>

        {/* Performance / Completion */}
        <div className="p-4 bg-white border border-neutral-200 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
            <span>Tiến độ 40h</span>
            <Zap className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-neutral-950 tabular-nums">
              {targetPercent}%
            </span>
            <span className="text-xs text-neutral-500">
              {totalWeekHours >= targetWeekHours ? 'Đạt chỉ tiêu' : `Thiếu ${(targetWeekHours - totalWeekHours).toFixed(1)}h`}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            {weekEntries.length} tasks đã ghi nhận
          </p>
        </div>
      </div>

      {/* Main Timesheet Matrix Table */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[840px]">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-[300px]">Dự án & Nhiệm vụ / PR</th>
                {weekDays.map((day, idx) => {
                  const iso = weekIsoDates[idx];
                  const today = isToday(iso);
                  const isWeekend = isWeekendDay(day);
                  return (
                    <th
                      key={iso}
                      className={`py-3 px-2 text-center w-[85px] border-l border-neutral-200/60 ${
                        today ? 'bg-indigo-50/70 text-indigo-950 font-bold' : isWeekend ? 'bg-neutral-100/60 text-neutral-500' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>{getVietnameseDayName(day, true)}</span>
                        <span className="text-xs font-bold text-neutral-900 tabular-nums mt-0.5">
                          {formatShortDate(day)}
                        </span>
                      </div>
                    </th>
                  );
                })}
                <th className="py-3 px-3 text-center w-[90px] border-l border-neutral-200 bg-neutral-100 text-neutral-900 font-bold">
                  Tổng
                </th>
              </tr>

              {/* Day Status Row */}
              <tr className="border-b border-neutral-200 bg-neutral-50/40 text-xs">
                <td className="py-2.5 px-4 text-xs font-semibold text-neutral-700">
                  <div className="flex items-center justify-between">
                    <span>Trạng thái ngày:</span>
                    <span className="text-[10px] text-neutral-400 font-normal italic">
                      (Nhấn để đổi)
                    </span>
                  </div>
                </td>
                {weekDays.map((day, idx) => {
                  const iso = weekIsoDates[idx];
                  const dayLog = dayLogs[iso];
                  const isWeekend = isWeekendDay(day);
                  const statusKey = dayLog ? dayLog.status : isWeekend ? 'weekend' : 'work';
                  const cfg = DAY_STATUS_CONFIGS[statusKey];

                  return (
                    <td
                      key={`status-${iso}`}
                      className="py-2 px-1 text-center border-l border-neutral-200/60 align-middle"
                    >
                      <button
                        onClick={() => onOpenDayStatusModal(iso)}
                        title={`Đổi trạng thái ngày: ${cfg.label}`}
                        className={`w-full py-1 px-1 text-[11px] font-semibold rounded border transition-transform active:scale-95 cursor-pointer truncate ${cfg.badgeClass}`}
                      >
                        {cfg.shortLabel}
                      </button>
                    </td>
                  );
                })}
                <td className="py-2 px-2 text-center border-l border-neutral-200 bg-neutral-50 text-[11px] text-neutral-500 font-medium">
                  {workedDaysCount} làm / {leaveDaysCount} nghỉ
                </td>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-100 text-xs">
              {sortedProjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-neutral-500">
                    <p className="text-sm font-medium text-neutral-700">Chưa có task nào được log trong tuần này</p>
                    <button
                      onClick={() => onOpenNewTaskForDay(weekIsoDates[0])}
                      className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm log công việc</span>
                    </button>
                  </td>
                </tr>
              ) : (
                sortedProjects.map((proj) => (
                  <React.Fragment key={proj.projectName}>
                    {/* Project Header */}
                    <tr className="bg-neutral-50/80 font-bold text-neutral-900 border-t border-neutral-200">
                      <td className="py-2.5 px-4 flex items-center justify-between">
                        <span className="truncate">{proj.projectName}</span>
                        <span className="text-[11px] font-normal text-neutral-500">
                          {proj.tasks.length} tasks
                        </span>
                      </td>
                      {weekIsoDates.map((iso) => {
                        const dayHours = proj.tasks.reduce((sum, t) => {
                          const entriesForDay = t.dailyEntries[iso] || [];
                          return sum + entriesForDay.reduce((s, e) => s + (e.hours ?? ((e.durationMinutes || 0) / 60)), 0);
                        }, 0);

                        return (
                          <td
                            key={`proj-${proj.projectName}-${iso}`}
                            className="py-2 px-2 text-center border-l border-neutral-200/60 font-semibold text-neutral-800 tabular-nums"
                          >
                            {dayHours > 0 ? `${dayHours}h` : '-'}
                          </td>
                        );
                      })}
                      <td className="py-2 px-2 text-center border-l border-neutral-200 bg-neutral-100/70 font-bold text-neutral-900 tabular-nums">
                        {proj.totalHours}h
                      </td>
                    </tr>

                    {/* Task sub-rows */}
                    {proj.tasks.map((task) => (
                      <tr key={`task-${proj.projectName}-${task.taskName}`} className="hover:bg-neutral-50/60 transition-colors">
                        <td className="py-2 px-4 pl-8">
                          <div className="flex items-center gap-1.5">
                            {task.githubUrl && (
                              <a
                                href={task.githubUrl}
                                target="_blank"
                                rel="noreferrer"
                                title="Mở link PR/Issue GitHub"
                                className="text-purple-600 hover:text-purple-800 shrink-0"
                              >
                                <GitPullRequest className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <span className="text-neutral-900 font-medium truncate max-w-[220px]" title={task.taskName}>
                              {task.taskName}
                            </span>
                          </div>
                        </td>

                        {weekIsoDates.map((iso) => {
                          const entriesForDay = task.dailyEntries[iso] || [];
                          const dayHours = entriesForDay.reduce(
                            (sum, e) => sum + (e.hours ?? ((e.durationMinutes || 0) / 60)),
                            0
                          );

                          return (
                            <td
                              key={`cell-${task.taskName}-${iso}`}
                              className="py-2 px-1 text-center border-l border-neutral-200/60 align-middle"
                            >
                              {dayHours > 0 ? (
                                <button
                                  onClick={() => onEditTask(entriesForDay[0])}
                                  title={`${entriesForDay.length} log (${dayHours}h) - Bấm để chỉnh sửa`}
                                  className="w-full py-1 px-1.5 rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-900 font-mono text-[11px] font-bold tabular-nums transition-colors"
                                >
                                  {dayHours}h
                                </button>
                              ) : (
                                <button
                                  onClick={() => onOpenNewTaskForDay(iso)}
                                  className="w-full py-1 text-neutral-300 hover:text-neutral-600 hover:bg-neutral-100 rounded text-xs transition-colors"
                                >
                                  +
                                </button>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-2 px-2 text-center border-l border-neutral-200 bg-neutral-50/60 font-mono font-bold text-neutral-900 tabular-nums">
                          {task.totalHours}h
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))
              )}
            </tbody>

            {/* Table Footer */}
            <tfoot>
              <tr className="border-t-2 border-neutral-300 bg-neutral-100 font-bold text-xs text-neutral-900">
                <td className="py-3 px-4 uppercase tracking-wider">
                  Tổng Giờ Trong Ngày (Chuẩn 8h)
                </td>
                {dailyHourTotals.map((hours, idx) => {
                  const iso = weekIsoDates[idx];
                  const dayLog = dayLogs[iso];
                  const target = dayLog?.targetHours ?? (isWeekendDay(weekDays[idx]) ? 0 : 8);
                  const isEnough = hours >= target;

                  return (
                    <td
                      key={`total-${iso}`}
                      className="py-3 px-2 text-center border-l border-neutral-200/80 font-mono tabular-nums"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold">{hours > 0 ? `${hours}h` : '0h'}</span>
                        {target > 0 && (
                          <span className={`text-[10px] font-normal ${isEnough ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {isEnough ? '✓ Đủ 8h' : `Thiếu ${(target - hours).toFixed(1)}h`}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
                <td className="py-3 px-3 text-center border-l border-neutral-200 bg-neutral-200/80 font-mono text-sm font-extrabold text-neutral-950 tabular-nums">
                  {totalWeekHours.toFixed(1)}h
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

    </div>
  );
};
