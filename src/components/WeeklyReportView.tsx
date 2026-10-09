import React, { useState } from 'react';
import { FileSpreadsheet, HelpCircle } from 'lucide-react';
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
import { PageHeader, PageStack, Reveal } from '../ui/layout';

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
    <PageStack>
      <PageHeader
        className="no-print"
        icon={FileSpreadsheet}
        title={t.report.title}
        subtitle={t.report.subtitle}
        titleExtra={
          <button type="button" onClick={() => setGuideOpen(true)} className="btn-text py-1">
            <HelpCircle className="w-4 h-4" />
            {t.report.pasteGuide}
          </button>
        }
        actions={<WeekNavigator currentDate={currentDate} onChange={onChangeDate} />}
      />

      <Reveal className="no-print card p-3">
        <ExportToolbar actions={actions} />
      </Reveal>

      <Reveal>
        <WeekStatusPanel weekDays={weekDays} dayLogs={dayLogs} settings={settings} onUpdateDayStatus={onUpdateDayStatus} onResetWeekToDefault={onResetWeekToDefault} />
      </Reveal>

      <Reveal>
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
      </Reveal>

      <ReportGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} reportInput={reportInput} actions={actions} />
    </PageStack>
  );
};
