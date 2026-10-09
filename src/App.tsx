import React, { useEffect, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import type { TimeEntry, UserSettings } from './types';
import type { TaskTemplate } from './components/TaskForm';
import { getStoredSettings, saveStoredSettings } from './utils/storage';
import { formatDateIso, getWeekDays } from './utils/dateUtils';
import { exportReport } from './report';
import { I18nProvider, useI18n } from './i18n';
import { FeedbackProvider, useFeedback } from './ui/feedback';
import { usePersistentState, useWorkspaceData, type WorkspaceData } from './hooks/useWorkspaceData';
import { useDailyReminder } from './hooks/useDailyReminder';

import { Header, ActiveTab } from './components/Header';
import { DayLogView } from './components/DayLogView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { WeeklyTimesheetView } from './components/WeeklyTimesheetView';
import { CalendarLeaveView } from './components/CalendarLeaveView';
import { PerformanceView } from './components/PerformanceView';
import { ManualEntryModal } from './components/ManualEntryModal';
import { DayStatusModal } from './components/DayStatusModal';
import { SettingsModal } from './components/SettingsModal';

export default function App({ onReady }: { onReady?: () => void }) {
  const [settings, setSettings] = usePersistentState<UserSettings>(getStoredSettings, saveStoredSettings);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <I18nProvider lang={settings.language}>
      <MotionConfig reducedMotion="user">
        <FeedbackProvider>
          <Workspace settings={settings} setSettings={setSettings} />
        </FeedbackProvider>
      </MotionConfig>
    </I18nProvider>
  );
}

interface WorkspaceProps {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

interface TaskModalState {
  open: boolean;
  entry: TimeEntry | null;
  /** Task continued on `date` */
  template: TaskTemplate | null;
  date: string;
}

interface TabContentProps {
  tab: ActiveTab;
  data: WorkspaceData;
  settings: UserSettings;
  currentDate: Date;
  onChangeDate: (date: Date) => void;
  onNewTask: (dateIso?: string) => void;
  onEditTask: (entry: TimeEntry) => void;
  onContinueTask: (template: TaskTemplate, dateIso: string) => void;
  onOpenDayStatus: (dateIso: string) => void;
}

const TabContent: React.FC<TabContentProps> = ({ tab, data, settings, currentDate, onChangeDate, onNewTask, onEditTask, onContinueTask, onOpenDayStatus }) => {
  const weekProps = { currentDate, onChangeDate, entries: data.entries, dayLogs: data.dayLogs, settings };
  const views: Record<ActiveTab, () => React.ReactNode> = {
    daily: () => (
      <DayLogView
        selectedDate={currentDate}
        setSelectedDate={onChangeDate}
        entries={data.entries}
        dayLogs={data.dayLogs}
        settings={settings}
        projects={data.projects}
        onSaveTask={data.saveEntry}
        onDeleteTask={data.deleteEntry}
        onSetDayStatus={data.updateDayStatus}
        onOpenDayStatus={onOpenDayStatus}
      />
    ),
    report: () => (
      <WeeklyReportView
        {...weekProps}
        objectives={data.objectives}
        setObjectives={data.setObjectives}
        reflections={data.reflections}
        setReflections={data.setReflections}
        onUpdateDayStatus={data.updateDayStatus}
        onResetWeekToDefault={data.resetWeekToDefault}
        onUpdateEntry={data.updateEntry}
      />
    ),
    timesheet: () => (
      <WeeklyTimesheetView
        {...weekProps}
        onOpenNewTaskForDay={onNewTask}
        onEditTask={onEditTask}
        onContinueTask={onContinueTask}
        onOpenDayStatusModal={onOpenDayStatus}
      />
    ),
    calendar: () => <CalendarLeaveView dayLogs={data.dayLogs} settings={settings} onOpenDayStatusModal={onOpenDayStatus} />,
    performance: () => <PerformanceView {...weekProps} />,
  };
  return <>{views[tab]()}</>;
};

const AppFooter: React.FC<{ companyName: string }> = ({ companyName }) => {
  const { t } = useI18n();
  const prefix = companyName ? `${companyName} · ` : '';
  return (
    <footer className="no-print border-t border-slate-200/80 bg-white/70 backdrop-blur py-4 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>
          {prefix}
          {t.common.appName} – {t.footer.tagline}
        </span>
        <span>{t.footer.localData}</span>
      </div>
    </footer>
  );
};

/** Day status dialog bound to an optional date (closed when null). */
const DayStatusDialog: React.FC<{ date: string | null; data: WorkspaceData; settings: UserSettings; onClose: () => void }> = ({
  date,
  data,
  settings,
  onClose,
}) => {
  const dateIso = date ?? formatDateIso(new Date());
  return (
    <DayStatusModal
      isOpen={date !== null}
      onClose={onClose}
      dateIso={dateIso}
      currentDayLog={date ? data.dayLogs[date] : undefined}
      settings={settings}
      onSaveDayLog={data.saveDayLog}
    />
  );
};

const Workspace: React.FC<WorkspaceProps> = ({ settings, setSettings }) => {
  const { t } = useI18n();
  const { notify } = useFeedback();
  const data = useWorkspaceData(setSettings);

  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [taskModal, setTaskModal] = useState<TaskModalState>({ open: false, entry: null, template: null, date: formatDateIso(new Date()) });
  const [dayStatusDate, setDayStatusDate] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useDailyReminder({
    settings,
    entries: data.entries,
    dayLogs: data.dayLogs,
    onOpen: () => {
      setActiveTab('daily');
      setCurrentDate(new Date());
    },
  });

  const openNewTaskModal = (dateIso?: string) => setTaskModal({ open: true, entry: null, template: null, date: dateIso || formatDateIso(currentDate) });
  const openEditTaskModal = (entry: TimeEntry) => setTaskModal({ open: true, entry, template: null, date: entry.date });
  const openContinueTaskModal = (template: TaskTemplate, dateIso: string) => setTaskModal({ open: true, entry: null, template, date: dateIso });

  const handleQuickExport = async () => {
    const input = { weekDays: getWeekDays(currentDate), entries: data.entries, dayLogs: data.dayLogs, settings, objectives: data.objectives, reflections: data.reflections };
    try {
      notify(t.report.exported(await exportReport('csv', input)));
    } catch {
      notify(t.report.exportFailed, { tone: 'error' });
    }
  };

  return (
    <div className="app-canvas min-h-screen text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-950">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTask={() => openNewTaskModal()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onQuickExport={handleQuickExport}
        settings={settings}
        onSelectLanguage={(language) => setSettings((prev) => ({ ...prev, language }))}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          >
            <TabContent
              tab={activeTab}
              data={data}
              settings={settings}
              currentDate={currentDate}
              onChangeDate={setCurrentDate}
              onNewTask={openNewTaskModal}
              onEditTask={openEditTaskModal}
              onContinueTask={openContinueTaskModal}
              onOpenDayStatus={setDayStatusDate}
            />
          </motion.div>
        </AnimatePresence>
      </main>

      <AppFooter companyName={settings.companyName} />

      {/* Floating action button on small screens */}
      <motion.button
        type="button"
        onClick={() => openNewTaskModal()}
        aria-label={t.header.addTask}
        whileTap={{ scale: 0.92 }}
        className="no-print md:hidden fixed right-4 bottom-20 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white elevation-3 flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <ManualEntryModal
        isOpen={taskModal.open}
        onClose={() => setTaskModal((m) => ({ ...m, open: false }))}
        onSave={data.saveEntry}
        onDelete={data.deleteEntry}
        editingEntry={taskModal.entry}
        template={taskModal.template}
        projects={data.projects}
        entries={data.entries}
        defaultDate={taskModal.date}
        settings={settings}
      />

      <DayStatusDialog date={dayStatusDate} data={data} settings={settings} onClose={() => setDayStatusDate(null)} />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onRefreshData={data.refresh}
      />
    </div>
  );
};
