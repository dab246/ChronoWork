import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { TimeEntry, DayLog, UserSettings, WeeklyObjective, WeeklyReflections, DayStatusType } from '../types';
import { getWeekDays } from '../utils/dateUtils';
import { filterEntriesForDays } from '../utils/workdays';
import { useI18n } from '../i18n';
import { WeekNavigator } from './WeekNavigator';
import { useReportExport } from './weeklyReport/useReportExport';
import { ExportToolbar } from './weeklyReport/ExportToolbar';
import { WeekStatusPanel } from './weeklyReport/WeekStatusPanel';
import { ReportSheet } from './weeklyReport/ReportSheet';
import { ReportGuideModal } from './weeklyReport/ReportGuideModal';

interface WeeklyReportViewProps {
  currentDate: Date;
  onChangeDate: (d: Date) => void;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  settings: UserSettings;
  objectives: WeeklyObjective[];
  setObjectives: React.Dispatch<React.SetStateAction<WeeklyObjective[]>>;
  reflections: WeeklyReflections;
  setReflections: React.Dispatch<React.SetStateAction<WeeklyReflections>>;
  onUpdateDayStatus: (dateIso: string, status: DayStatusType) => void;
  onResetWeekToDefault: (weekDays: Date[]) => void;
  onUpdateEntry: (entry: TimeEntry) => void;
}

export const WeeklyReportView: React.FC<WeeklyReportViewProps> = ({
  currentDate,
  onChangeDate,
  entries,
  dayLogs,
  settings,
  objectives,
  setObjectives,
  reflections,
  setReflections,
  onUpdateDayStatus,
  onResetWeekToDefault,
  onUpdateEntry,
}) => {
  const { t } = useI18n();
  const [guideOpen, setGuideOpen] = useState(false);

  const weekDays = getWeekDays(currentDate);
  const weekEntries = filterEntriesForDays(entries, weekDays);
  const reportInput = { weekDays, entries, dayLogs, settings, objectives, reflections };
  const actions = useReportExport(reportInput);

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="no-print flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">{t.report.title}</h2>
            <button type="button" onClick={() => setGuideOpen(true)} className="btn-text py-1">
              <HelpCircle className="w-4 h-4" />
              {t.report.pasteGuide}
            </button>
          </div>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">{t.report.subtitle}</p>
        </div>
        <WeekNavigator currentDate={currentDate} onChange={onChangeDate} />
      </div>

      <ExportToolbar actions={actions} />

      <WeekStatusPanel weekDays={weekDays} dayLogs={dayLogs} settings={settings} onUpdateDayStatus={onUpdateDayStatus} onResetWeekToDefault={onResetWeekToDefault} />

      <ReportSheet
        weekDays={weekDays}
        weekEntries={weekEntries}
        dayLogs={dayLogs}
        settings={settings}
        objectives={objectives}
        setObjectives={setObjectives}
        reflections={reflections}
        setReflections={setReflections}
        onUpdateEntry={onUpdateEntry}
      />

      <ReportGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} reportInput={reportInput} actions={actions} />
    </div>
  );
};
