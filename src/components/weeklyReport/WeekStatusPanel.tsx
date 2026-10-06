import React from 'react';
import { RotateCcw } from 'lucide-react';
import type { DayLog, DayStatusType, UserSettings } from '../../types';
import { formatDateIso, formatShortDate, getDayName } from '../../utils/dateUtils';
import { getEffectiveStatus, isLeaveStatus } from '../../utils/workdays';
import { useI18n } from '../../i18n';

const CARD_TONE: Partial<Record<DayStatusType, string>> = {
  work: 'bg-violet-50 border-violet-200',
  wfh: 'bg-sky-50 border-sky-200',
};
const LEAVE_TONE = 'bg-amber-50 border-amber-200';

interface DayStatusCardProps {
  day: Date;
  status: DayStatusType;
  onUpdateDayStatus: (dateIso: string, status: DayStatusType) => void;
}

const DayStatusCard: React.FC<DayStatusCardProps> = ({ day, status, onUpdateDayStatus }) => {
  const { t, lang } = useI18n();
  const iso = formatDateIso(day);
  const options = [
    { id: 'work' as const, label: t.report.office, active: status === 'work', tone: 'bg-violet-700' },
    { id: 'wfh' as const, label: t.report.wfh, active: status === 'wfh', tone: 'bg-sky-600' },
    { id: 'paid_leave' as const, label: t.report.off, active: isLeaveStatus(status), tone: 'bg-amber-500' },
  ];
  return (
    <div className={`p-2.5 rounded-xl border text-xs transition-colors ${CARD_TONE[status] ?? LEAVE_TONE}`}>
      <div className="flex items-center justify-between font-bold text-neutral-800 mb-1.5">
        <span className="capitalize">{getDayName(day, lang)}</span>
        <span className="text-[11px] text-neutral-500 tabular-nums">{formatShortDate(day)}</span>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {options.map(({ id, label, active, tone }) => (
          <button
            key={id}
            type="button"
            aria-pressed={active}
            onClick={() => onUpdateDayStatus(iso, id)}
            className={`py-1 px-1 text-[11px] font-semibold rounded-full text-center transition-colors truncate ${
              active ? `${tone} text-white` : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

interface WeekStatusPanelProps {
  weekDays: Date[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  onUpdateDayStatus: (dateIso: string, status: DayStatusType) => void;
  onResetWeekToDefault: (weekDays: Date[]) => void;
}

/** Office days & days off of the working week. */
export const WeekStatusPanel: React.FC<WeekStatusPanelProps> = ({ weekDays, dayLogs, settings, onUpdateDayStatus, onResetWeekToDefault }) => {
  const { t } = useI18n();
  return (
    <div className="no-print card p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-neutral-100">
        <div>
          <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wide">{t.report.weekStatusTitle}</h3>
          <p className="text-[11px] text-neutral-500">{t.report.weekStatusSubtitle}</p>
        </div>
        <button type="button" onClick={() => onResetWeekToDefault(weekDays)} title={t.report.useDefaultDaysHint} className="btn-text">
          <RotateCcw className="w-3.5 h-3.5" />
          {t.report.useDefaultDays}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-3">
        {weekDays.slice(0, 5).map((d) => (
          <DayStatusCard key={formatDateIso(d)} day={d} status={getEffectiveStatus(d, dayLogs, settings)} onUpdateDayStatus={onUpdateDayStatus} />
        ))}
      </div>
    </div>
  );
};
