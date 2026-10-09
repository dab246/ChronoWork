import React from 'react';
import type { DayLog, TimeEntry, UserSettings, WeeklyObjective, WeeklyReflections } from '../../types';
import { formatHours, formatShortDate, getWeekNumber } from '../../utils/dateUtils';
import { getWorkingAndOffDaysInfo, sumHours } from '../../utils/workdays';
import { aggregateWeeklyTasks } from '../../report/aggregate';
import { reportLanguage } from '../../report/model';
import { getTranslations, useI18n, type Translations } from '../../i18n';
import { C, COLUMN_PCT } from './sheetStyles';
import { TaskRows } from './TaskRows';
import { ObjectiveRows } from './ObjectiveRows';

const Spacer: React.FC<{ height: number }> = ({ height }) => (
  <tr style={{ height }}><td colSpan={9} /></tr>
);

const CompanyMark: React.FC<{ settings: UserSettings }> = ({ settings }) => {
  if (settings.logoDataUrl) return <img src={settings.logoDataUrl} alt="" className="absolute left-0 top-0 h-[68px] max-w-[200px] object-contain" />;
  return settings.companyName ? <span className="absolute left-1 top-2 text-lg font-black text-rose-700">{settings.companyName}</span> : null;
};

interface SheetHeaderProps {
  r: Translations['reportDoc'];
  weekDays: Date[];
  weekEntries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
}

/** Title, employee and attendance rows at the top of the sheet. */
const SheetHeader: React.FC<SheetHeaderProps> = ({ r, weekDays, weekEntries, dayLogs, settings }) => {
  const { t } = useI18n();
  const info = getWorkingAndOffDaysInfo(weekDays, dayLogs, settings);
  const attendance = [
    [r.daysOffLabel, r.daysOffText(info.daysOffCount, info.daysOffDatesText)],
    [r.officeDaysLabel, r.officeDaysText(info.officeDaysCount, info.officeDatesText)],
  ];
  return (
    <>
      <tr style={{ height: 72 }}>
        <td colSpan={9} className="relative text-center align-middle">
          <CompanyMark settings={settings} />
          <div className="text-2xl font-bold leading-tight">{r.reportTitle}</div>
          <div className="text-2xl font-bold leading-tight">{r.weekFromTo(getWeekNumber(weekDays[0]), formatShortDate(weekDays[0]), formatShortDate(weekDays[4]))}</div>
          <span className="no-print absolute right-1 top-1 text-[11px] text-slate-500 font-sans">
            {t.report.totalHours}: <strong className="text-slate-900">{formatHours(sumHours(weekEntries))}h</strong>
          </span>
        </td>
      </tr>
      <tr style={{ height: 34 }}>
        <td colSpan={9} className="text-center text-[15px]">{r.employeeNameRole(settings.userName, settings.userRole)}</td>
      </tr>
      {attendance.map(([label, value]) => (
        <tr key={label} style={{ height: 34 }}>
          <td colSpan={2} className="font-bold text-[14px] leading-tight px-1 py-1" style={{ background: C.cell }}>{label}</td>
          <td colSpan={2} className="text-[14px] px-1" style={{ background: C.cell }}>{value}</td>
          <td colSpan={5} />
        </tr>
      ))}
    </>
  );
};

const SignatureRow: React.FC<{ r: Translations['reportDoc']; userName: string }> = ({ r, userName }) => (
  <tr style={{ height: 80 }}>
    <td />
    <td colSpan={2} className="text-center align-top text-[14px]">
      {r.sigEmployee}
      <div className="mt-10 text-slate-600">{userName}</div>
    </td>
    <td colSpan={3} />
    <td colSpan={2} className="text-center align-top text-[14px]">{r.sigManager}</td>
    <td />
  </tr>
);

interface ReportSheetProps {
  weekDays: Date[];
  weekEntries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  objectives: WeeklyObjective[];
  setObjectives: React.Dispatch<React.SetStateAction<WeeklyObjective[]>>;
  reflections: WeeklyReflections;
  setReflections: React.Dispatch<React.SetStateAction<WeeklyReflections>>;
  onUpdateEntry: (entry: TimeEntry) => void;
}

/** Report sheet preview, laid out like the exported template and in the report language. */
export const ReportSheet: React.FC<ReportSheetProps> = ({ weekDays, weekEntries, dayLogs, settings, onUpdateEntry, ...objectiveProps }) => {
  const doc = getTranslations(reportLanguage(settings));
  const r = doc.reportDoc;
  return (
    <div className="card p-3 sm:p-5 overflow-x-auto">
      <table className="min-w-[1080px] w-full border-collapse text-[12px] text-black" style={{ fontFamily: 'Arial, sans-serif', tableLayout: 'fixed' }}>
        <colgroup>
          {COLUMN_PCT.map((w, i) => (
            <col key={i} style={{ width: `${w}%` }} />
          ))}
        </colgroup>
        <tbody>
          <SheetHeader r={r} weekDays={weekDays} weekEntries={weekEntries} dayLogs={dayLogs} settings={settings} />
          <Spacer height={20} />
          <TaskRows tasks={aggregateWeeklyTasks(weekEntries)} weekEntries={weekEntries} r={r} linkLabel={doc.common.link} onUpdateEntry={onUpdateEntry} />
          <Spacer height={20} />
          <ObjectiveRows r={r} {...objectiveProps} />
          <Spacer height={40} />
          <SignatureRow r={r} userName={settings.userName} />
        </tbody>
      </table>
    </div>
  );
};
