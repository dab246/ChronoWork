import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { DatePicker } from '../ui/DatePicker';
import { addDays, formatShortDate, getMondayOfWeek, getWeekNumber, isSameDay } from '../utils/dateUtils';

interface WeekNavigatorProps {
  currentDate: Date;
  onChange: (date: Date) => void;
}

/** Previous / next week buttons around a week date picker, plus a "this week" shortcut. */
export const WeekNavigator: React.FC<WeekNavigatorProps> = ({ currentDate, onChange }) => {
  const { t } = useI18n();
  const monday = getMondayOfWeek(currentDate);
  const isCurrentWeek = isSameDay(monday, getMondayOfWeek(new Date()));
  const label = t.common.weekRange(getWeekNumber(monday), formatShortDate(monday), formatShortDate(addDays(monday, 4)));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {!isCurrentWeek && (
        <button type="button" onClick={() => onChange(new Date())} className="btn-outlined">
          {t.common.thisWeek}
        </button>
      )}
      <div className="flex items-center bg-white border border-slate-300 rounded-full p-0.5 elevation-1">
        <button type="button" onClick={() => onChange(addDays(currentDate, -7))} aria-label={t.common.prevWeek} title={t.common.prevWeek} className="icon-btn p-1.5">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <DatePicker value={currentDate} onChange={onChange} mode="week" label={label} align="right" ariaLabel={t.datePicker.chooseWeek} />
        <button type="button" onClick={() => onChange(addDays(currentDate, 7))} aria-label={t.common.nextWeek} title={t.common.nextWeek} className="icon-btn p-1.5">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
