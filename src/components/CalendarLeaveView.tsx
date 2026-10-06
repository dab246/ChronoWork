import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Briefcase, Home, Coffee, Sparkles } from 'lucide-react';
import { DAY_STATUSES, DAY_STATUS_CONFIGS, type DayLog, type DayStatusType, type UserSettings } from '../types';
import { addDays, formatDateIso, formatHours, formatMonthYear, getMondayOfWeek, getWeekdayNames, isToday, isWeekendDay } from '../utils/dateUtils';
import { getEffectiveStatus } from '../utils/workdays';
import { useI18n } from '../i18n';
import { DatePicker } from '../ui/DatePicker';

interface CalendarLeaveViewProps {
  dayLogs: Record<string, DayLog>;
  onOpenDayStatusModal: (dateIso: string) => void;
  settings: UserSettings;
}

export const CalendarLeaveView: React.FC<CalendarLeaveViewProps> = ({ dayLogs, onOpenDayStatusModal, settings }) => {
  const { t, lang } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const now = new Date();
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  const lastDay = new Date(year, month + 1, 0);
  const start = getMondayOfWeek(currentMonth);
  const cellCount = Math.ceil(((currentMonth.getDay() + 6) % 7 + lastDay.getDate()) / 7) * 7;
  const calendarDays = Array.from({ length: cellCount }, (_, i) => addDays(start, i));

  const counts = {} as Record<DayStatusType, number>;
  DAY_STATUSES.forEach((s) => (counts[s] = 0));
  calendarDays
    .filter((d) => d.getMonth() === month)
    .forEach((d) => counts[getEffectiveStatus(d, dayLogs, settings)]++);
  const totalLeave = counts.paid_leave + counts.sick_leave + counts.holiday + counts.unpaid_leave;

  const summary = [
    { label: t.calendar.office, value: counts.work, icon: Briefcase, tone: 'emerald' },
    { label: t.calendar.wfh, value: counts.wfh, icon: Home, tone: 'sky' },
    { label: t.calendar.leave, value: totalLeave, icon: Coffee, tone: 'amber', detail: t.calendar.leaveBreakdown(counts.paid_leave, counts.sick_leave, counts.holiday) },
    { label: t.calendar.overtime, value: counts.overtime, icon: Sparkles, tone: 'violet' },
  ] as const;

  const TONES = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    sky: 'bg-sky-50 border-sky-200 text-sky-800',
    amber: 'bg-amber-50 border-amber-200 text-amber-800',
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">{t.calendar.title}</h2>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">{t.calendar.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {!isCurrentMonth && (
            <button type="button" onClick={() => setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))} className="btn-outlined">
              {t.common.thisMonth}
            </button>
          )}
          <div className="flex items-center bg-white border border-neutral-300 rounded-full p-0.5 elevation-1">
            <button type="button" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} aria-label={t.common.prevMonth} title={t.common.prevMonth} className="icon-btn p-1.5">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <DatePicker
              value={currentMonth}
              onChange={(d) => setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1))}
              mode="month"
              label={formatMonthYear(currentMonth, lang)}
              align="right"
              ariaLabel={t.datePicker.chooseMonth}
            />
            <button type="button" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} aria-label={t.common.nextMonth} title={t.common.nextMonth} className="icon-btn p-1.5">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summary.map(({ label, value, icon: Icon, tone, ...rest }) => (
          <div key={label} className={`card card-hover p-4 border ${TONES[tone]}`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>{label}</span>
              <Icon className="w-4 h-4" />
            </div>
            <div className="mt-1 text-xl font-bold text-neutral-950">{t.common.days(value)}</div>
            {'detail' in rest && <div className="text-[10px] mt-0.5">{rest.detail}</div>}
          </div>
        ))}
      </div>

      <motion.div key={`${year}-${month}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-50 text-[11px] font-semibold text-neutral-600 uppercase text-center py-2.5">
          {getWeekdayNames(lang, true).map((name, i) => (
            <div key={name} className={i >= 5 ? 'text-neutral-400' : ''}>
              {name}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 divide-x divide-y divide-neutral-100">
          {calendarDays.map((d) => {
            const iso = formatDateIso(d);
            const log = dayLogs[iso];
            const status = getEffectiveStatus(d, dayLogs, settings);
            const inMonth = d.getMonth() === month;
            const today = isToday(iso);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onOpenDayStatusModal(iso)}
                aria-label={`${iso}: ${t.status[status].label}`}
                className={`min-h-[92px] p-2 text-left transition-colors group flex flex-col justify-between ${
                  !inMonth ? 'bg-neutral-50/50 opacity-40' : today ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'bg-white hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-bold tabular-nums ${
                      today ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center' : isWeekendDay(d) ? 'text-neutral-400' : 'text-neutral-800'
                    }`}
                  >
                    {d.getDate()}
                  </span>
                  {log?.targetHours !== undefined && log.targetHours > 0 && (
                    <span className="text-[10px] text-neutral-400 tabular-nums">{formatHours(log.targetHours)}h</span>
                  )}
                </div>
                <div className="mt-1 w-full">
                  <div className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md border truncate transition-shadow group-hover:elevation-1 ${DAY_STATUS_CONFIGS[status].badgeClass}`}>
                    {t.status[status].short}
                  </div>
                  {log?.note && (
                    <p className="text-[10px] text-neutral-500 truncate mt-1" title={log.note}>
                      {log.note}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>

      <div className="bg-neutral-100/70 p-4 border border-neutral-200 rounded-2xl">
        <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">{t.calendar.legend}</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {DAY_STATUSES.map((id) => (
            <div key={id} className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${DAY_STATUS_CONFIGS[id].badgeClass}`}>{t.status[id].short}</span>
              <span className="text-neutral-600 text-[11px] truncate">{t.status[id].label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
