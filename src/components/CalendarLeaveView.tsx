import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Briefcase, 
  Home, 
  Coffee, 
  HeartPulse, 
  Flag, 
  Plus, 
  Check, 
  Clock,
  Sparkles
} from 'lucide-react';
import { DayLog, DayStatusType, DAY_STATUS_CONFIGS, UserSettings } from '../types';
import { 
  formatDateIso, 
  formatVietnameseDate, 
  formatShortDate, 
  isToday, 
  isWeekendDay,
  getVietnameseDayName
} from '../utils/dateUtils';

interface CalendarLeaveViewProps {
  dayLogs: Record<string, DayLog>;
  onOpenDayStatusModal: (dateIso: string) => void;
  onQuickSetStatus: (dateIso: string, status: DayStatusType) => void;
  settings: UserSettings;
}

export const CalendarLeaveView: React.FC<CalendarLeaveViewProps> = ({
  dayLogs,
  onOpenDayStatusModal,
  onQuickSetStatus,
  settings,
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  // Generate calendar days
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const totalDays = lastDayOfMonth.getDate();

  // Find padding days before 1st of month (Monday start)
  const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7; // 0 for Monday, 6 for Sunday

  const calendarDays: { dateIso: string; dayNumber: number; inMonth: boolean; dateObj: Date }[] = [];

  // Previous month padding
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    calendarDays.push({
      dateIso: formatDateIso(d),
      dayNumber: d.getDate(),
      inMonth: false,
      dateObj: d,
    });
  }

  // Current month days
  for (let i = 1; i <= totalDays; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({
      dateIso: formatDateIso(d),
      dayNumber: i,
      inMonth: true,
      dateObj: d,
    });
  }

  // Next month padding to fill 35 or 42 grid cells
  const remaining = (7 - (calendarDays.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    calendarDays.push({
      dateIso: formatDateIso(d),
      dayNumber: i,
      inMonth: false,
      dateObj: d,
    });
  }

  // Monthly statistics
  let workCount = 0;
  let wfhCount = 0;
  let paidLeaveCount = 0;
  let sickLeaveCount = 0;
  let holidayCount = 0;
  let otCount = 0;
  let unpaidCount = 0;

  calendarDays.forEach((cd) => {
    if (!cd.inMonth) return;
    const log = dayLogs[cd.dateIso];
    const isWk = isWeekendDay(cd.dateObj);
    const status = log ? log.status : isWk ? 'weekend' : 'work';

    if (status === 'work') workCount++;
    else if (status === 'wfh') wfhCount++;
    else if (status === 'paid_leave') paidLeaveCount++;
    else if (status === 'sick_leave') sickLeaveCount++;
    else if (status === 'holiday') holidayCount++;
    else if (status === 'overtime') otCount++;
    else if (status === 'unpaid_leave') unpaidCount++;
  });

  const totalLeave = paidLeaveCount + sickLeaveCount + holidayCount + unpaidCount;

  return (
    <div className="space-y-6">
      
      {/* Month Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            Lịch Ngày Công & Quản Lý Ngày Nghỉ
          </h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Theo dõi ngày làm việc tại văn phòng, WFH, ngày nghỉ phép, nghỉ ốm và nghỉ lễ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCurrentMonth}
            className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors"
          >
            Tháng hiện tại
          </button>

          <div className="flex items-center bg-white border border-neutral-300 rounded-lg p-0.5 shadow-2xs">
            <button
              onClick={handlePrevMonth}
              title="Tháng trước"
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 text-xs font-semibold text-neutral-800">
              Tháng {month + 1} / {year}
            </span>

            <button
              onClick={handleNextMonth}
              title="Tháng sau"
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Tại văn phòng</span>
            <Briefcase className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-950 font-mono tabular-nums">
            {workCount} <span className="text-xs font-normal text-emerald-700">ngày</span>
          </div>
        </div>

        <div className="p-3.5 bg-sky-50/60 border border-sky-200 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-800">
            <span>Làm từ xa (WFH)</span>
            <Home className="w-4 h-4 text-sky-600" />
          </div>
          <div className="mt-1 text-2xl font-bold text-sky-950 font-mono tabular-nums">
            {wfhCount} <span className="text-xs font-normal text-sky-700">ngày</span>
          </div>
        </div>

        <div className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-800">
            <span>Nghỉ phép / Lễ</span>
            <Coffee className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-950 font-mono tabular-nums">
            {totalLeave} <span className="text-xs font-normal text-amber-700">ngày</span>
          </div>
          <div className="text-[10px] text-amber-700 mt-0.5">
            {paidLeaveCount} phép · {sickLeaveCount} ốm · {holidayCount} lễ
          </div>
        </div>

        <div className="p-3.5 bg-violet-50/60 border border-violet-200 rounded-xl">
          <div className="flex items-center justify-between text-xs font-semibold text-violet-800">
            <span>Làm thêm / Tăng ca</span>
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <div className="mt-1 text-2xl font-bold text-violet-950 font-mono tabular-nums">
            {otCount} <span className="text-xs font-normal text-violet-700">ngày</span>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-neutral-200 rounded-xl shadow-2xs overflow-hidden">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-600 uppercase text-center py-2.5">
          <div>Thứ 2</div>
          <div>Thứ 3</div>
          <div>Thứ 4</div>
          <div>Thứ 5</div>
          <div>Thứ 6</div>
          <div className="text-neutral-400">Thứ 7</div>
          <div className="text-neutral-400">Chủ Nhật</div>
        </div>

        {/* Days matrix */}
        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-100">
          {calendarDays.map((cd) => {
            const log = dayLogs[cd.dateIso];
            const isWk = isWeekendDay(cd.dateObj);
            const statusKey = log ? log.status : isWk ? 'weekend' : 'work';
            const cfg = DAY_STATUS_CONFIGS[statusKey];
            const today = isToday(cd.dateIso);

            return (
              <div
                key={cd.dateIso}
                onClick={() => onOpenDayStatusModal(cd.dateIso)}
                className={`min-h-[96px] p-2 transition-colors cursor-pointer group flex flex-col justify-between ${
                  !cd.inMonth
                    ? 'bg-neutral-50/50 opacity-40'
                    : today
                    ? 'bg-indigo-50/40 hover:bg-indigo-50/70'
                    : 'hover:bg-neutral-50/80 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      today
                        ? 'w-6 h-6 rounded-full bg-neutral-900 text-white flex items-center justify-center'
                        : isWk
                        ? 'text-neutral-400'
                        : 'text-neutral-800'
                    }`}
                  >
                    {cd.dayNumber}
                  </span>

                  {log?.targetHours !== undefined && log.targetHours > 0 && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {log.targetHours}h
                    </span>
                  )}
                </div>

                {/* Status tag */}
                <div className="mt-1">
                  <div
                    className={`px-1.5 py-0.5 text-[10px] font-semibold rounded border truncate transition-shadow group-hover:shadow-xs ${cfg.badgeClass}`}
                  >
                    {cfg.shortLabel}
                  </div>

                  {log?.note && (
                    <p className="text-[10px] text-neutral-500 truncate mt-1" title={log.note}>
                      {log.note}
                    </p>
                  )}
                </div>

                <div className="text-[9px] text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity text-right">
                  Đổi
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status Legend */}
      <div className="bg-neutral-50 p-4 border border-neutral-200 rounded-xl">
        <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
          Chú thích các trạng thái ngày:
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {Object.values(DAY_STATUS_CONFIGS).map((cfg) => (
            <div key={cfg.id} className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded border ${cfg.badgeClass}`}>
                {cfg.shortLabel}
              </span>
              <span className="text-neutral-600 text-[11px] truncate">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
