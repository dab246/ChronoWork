import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Briefcase, Home, Coffee, Sparkles, CalendarDays } from 'lucide-react';
import { DAY_STATUSES, DAY_STATUS_CONFIGS, type DayLog, type DayStatusType, type UserSettings } from '../types';
import { addDays, formatDateIso, formatHours, formatMonthYear, getMondayOfWeek, getWeekdayNames, isToday, isWeekendDay } from '../utils/dateUtils';
import { getEffectiveStatus } from '../utils/workdays';
import { useI18n } from '../i18n';
import { DatePicker } from '../ui/DatePicker';
import { IconTile, PageHeader, PageStack, Reveal, type Tone } from '../ui/layout';

interface CalendarLeaveViewProps {
  dayLogs: Record<string, DayLog>;
  onOpenDayStatusModal: (dateIso: string) => void;
  settings: UserSettings;
}

const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

/** Whole weeks (Monday first) covering the month. */
function monthGridDays(month: Date): Date[] {
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leading = (month.getDay() + 6) % 7;
  const cellCount = Math.ceil((leading + lastDay) / 7) * 7;
  const start = getMondayOfWeek(month);
  return Array.from({ length: cellCount }, (_, i) => addDays(start, i));
}

function countStatuses(days: Date[], dayLogs: Record<string, DayLog>, settings: UserSettings): Record<DayStatusType, number> {
  const counts = Object.fromEntries(DAY_STATUSES.map((s) => [s, 0])) as Record<DayStatusType, number>;
  days.forEach((d) => counts[getEffectiveStatus(d, dayLogs, settings)]++);
  return counts;
}


const MonthNavigator: React.FC<{ month: Date; onChange: (month: Date) => void }> = ({ month, onChange }) => {
  const { t, lang } = useI18n();
  const current = firstOfMonth(new Date());
  const shift = (delta: number) => onChange(new Date(month.getFullYear(), month.getMonth() + delta, 1));
  return (
    <div className="flex items-center gap-2">
      {month.getTime() !== current.getTime() && (
        <button type="button" onClick={() => onChange(current)} className="btn-outlined">
          {t.common.thisMonth}
        </button>
      )}
      <div className="flex items-center bg-white border border-slate-200 rounded-full p-0.5 elevation-1">
        <button type="button" onClick={() => shift(-1)} aria-label={t.common.prevMonth} title={t.common.prevMonth} className="icon-btn p-1.5">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <DatePicker
          value={month}
          onChange={(d) => onChange(firstOfMonth(d))}
          mode="month"
          label={formatMonthYear(month, lang)}
          align="right"
          ariaLabel={t.datePicker.chooseMonth}
        />
        <button type="button" onClick={() => shift(1)} aria-label={t.common.nextMonth} title={t.common.nextMonth} className="icon-btn p-1.5">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const MonthSummary: React.FC<{ counts: Record<DayStatusType, number> }> = ({ counts }) => {
  const { t } = useI18n();
  const totalLeave = counts.paid_leave + counts.sick_leave + counts.holiday + counts.unpaid_leave;
  const summary = [
    { label: t.calendar.office, value: counts.work, icon: Briefcase, tone: 'emerald', detail: '' },
    { label: t.calendar.wfh, value: counts.wfh, icon: Home, tone: 'sky', detail: '' },
    { label: t.calendar.leave, value: totalLeave, icon: Coffee, tone: 'amber', detail: t.calendar.leaveBreakdown(counts.paid_leave, counts.sick_leave, counts.holiday) },
    { label: t.calendar.overtime, value: counts.overtime, icon: Sparkles, tone: 'violet', detail: '' },
  ] satisfies { label: string; value: number; icon: React.ComponentType<{ className?: string }>; tone: Tone; detail: string }[];
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {summary.map(({ label, value, icon, tone, detail }) => (
        <Reveal key={label} className="card card-hover p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">{label}</span>
            <IconTile icon={icon} tone={tone} size="sm" />
          </div>
          <div className="mt-2 text-2xl font-black text-slate-950 tabular-nums">{t.common.days(value)}</div>
          {detail && <div className="text-[11px] text-slate-500 mt-0.5">{detail}</div>}
        </Reveal>
      ))}
    </div>
  );
};

function cellClass(inMonth: boolean, today: boolean): string {
  if (!inMonth) return 'bg-slate-50/60 opacity-40';
  return today ? 'bg-indigo-50/60 hover:bg-indigo-50' : 'bg-white hover:bg-slate-50';
}

function dayNumberClass(date: Date, today: boolean): string {
  if (today) return 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center';
  return isWeekendDay(date) ? 'text-slate-400' : 'text-slate-800';
}

interface DayCellProps {
  date: Date;
  inMonth: boolean;
  status: DayStatusType;
  log?: DayLog;
  onOpen: (dateIso: string) => void;
}

const CalendarDayCell: React.FC<DayCellProps> = ({ date, inMonth, status, log, onOpen }) => {
  const { t } = useI18n();
  const iso = formatDateIso(date);
  const today = isToday(iso);
  const targetHours = log?.targetHours ?? 0;
  return (
    <button
      type="button"
      onClick={() => onOpen(iso)}
      aria-label={`${iso}: ${t.status[status].label}`}
      className={`min-h-[92px] p-2 text-left transition-colors group flex flex-col justify-between ${cellClass(inMonth, today)}`}
    >
      <div className="flex items-center justify-between w-full">
        <span className={`text-xs font-bold tabular-nums ${dayNumberClass(date, today)}`}>{date.getDate()}</span>
        {targetHours > 0 && <span className="text-[10px] text-slate-400 tabular-nums">{formatHours(targetHours)}h</span>}
      </div>
      <div className="mt-1 w-full">
        <div className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md border truncate transition-shadow group-hover:elevation-1 ${DAY_STATUS_CONFIGS[status].badgeClass}`}>
          {t.status[status].short}
        </div>
        {log?.note && (
          <p className="text-[10px] text-slate-500 truncate mt-1" title={log.note}>
            {log.note}
          </p>
        )}
      </div>
    </button>
  );
};

const StatusLegend: React.FC = () => {
  const { t } = useI18n();
  return (
    <Reveal className="card p-4">
      <h4 className="eyebrow mb-3">{t.calendar.legend}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {DAY_STATUSES.map((id) => (
          <div key={id} className="flex items-center gap-2">
            <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border ${DAY_STATUS_CONFIGS[id].badgeClass}`}>{t.status[id].short}</span>
            <span className="text-slate-600 text-[11px] truncate">{t.status[id].label}</span>
          </div>
        ))}
      </div>
    </Reveal>
  );
};

export const CalendarLeaveView: React.FC<CalendarLeaveViewProps> = ({ dayLogs, onOpenDayStatusModal, settings }) => {
  const { t, lang } = useI18n();
  const [currentMonth, setCurrentMonth] = useState(() => firstOfMonth(new Date()));

  const month = currentMonth.getMonth();
  const calendarDays = monthGridDays(currentMonth);
  const counts = countStatuses(calendarDays.filter((d) => d.getMonth() === month), dayLogs, settings);

  return (
    <PageStack>
      <PageHeader icon={CalendarDays} title={t.calendar.title} subtitle={t.calendar.subtitle} actions={<MonthNavigator month={currentMonth} onChange={setCurrentMonth} />} />

      <MonthSummary counts={counts} />

      <motion.div key={currentMonth.getTime()} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center py-2.5">
          {getWeekdayNames(lang, true).map((name, i) => (
            <div key={name} className={i >= 5 ? 'text-slate-400' : ''}>
              {name}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
          {calendarDays.map((d) => (
            <CalendarDayCell
              key={formatDateIso(d)}
              date={d}
              inMonth={d.getMonth() === month}
              status={getEffectiveStatus(d, dayLogs, settings)}
              log={dayLogs[formatDateIso(d)]}
              onOpen={onOpenDayStatusModal}
            />
          ))}
        </div>
      </motion.div>

      <StatusLegend />
    </PageStack>
  );
};
