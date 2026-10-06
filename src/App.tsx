import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { TimeEntry, DayLog, UserSettings, DayStatusType, WeeklyObjective, WeeklyReflections } from './types';
import {
  getStoredSettings,
  saveStoredSettings,
  getStoredEntries,
  saveStoredEntries,
  getStoredDayLogs,
  saveStoredDayLogs,
  getStoredObjectives,
  saveStoredObjectives,
  getStoredReflections,
  saveStoredReflections,
  newId,
} from './utils/storage';
import { formatDateIso, getWeekDays } from './utils/dateUtils';
import { exportReport } from './report';
import { I18nProvider, useI18n } from './i18n';
import { FeedbackProvider, useFeedback } from './ui/feedback';

import { Header, ActiveTab } from './components/Header';
import { DayLogView } from './components/DayLogView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { WeeklyTimesheetView } from './components/WeeklyTimesheetView';
import { CalendarLeaveView } from './components/CalendarLeaveView';
import { PerformanceView } from './components/PerformanceView';
import { ManualEntryModal } from './components/ManualEntryModal';
import { DayStatusModal } from './components/DayStatusModal';
import { SettingsModal } from './components/SettingsModal';
import type { TaskDraft } from './components/TaskForm';

/** Keeps a piece of state in sync with localStorage. */
function usePersistentState<T>(load: () => T, save: (value: T) => unknown) {
  const [value, setValue] = useState<T>(load);
  useEffect(() => {
    save(value);
  }, [value, save]);
  return [value, setValue] as const;
}

export default function App({ onReady }: { onReady?: () => void }) {
  const [settings, setSettings] = usePersistentState<UserSettings>(getStoredSettings, saveStoredSettings);

  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <I18nProvider lang={settings.language}>
      <FeedbackProvider>
        <Workspace settings={settings} setSettings={setSettings} />
      </FeedbackProvider>
    </I18nProvider>
  );
}

interface WorkspaceProps {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
}

const Workspace: React.FC<WorkspaceProps> = ({ settings, setSettings }) => {
  const { t } = useI18n();
  const { notify } = useFeedback();

  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  const [entries, setEntries] = usePersistentState<TimeEntry[]>(getStoredEntries, saveStoredEntries);
  const [dayLogs, setDayLogs] = usePersistentState<Record<string, DayLog>>(getStoredDayLogs, saveStoredDayLogs);
  const [objectives, setObjectives] = usePersistentState<WeeklyObjective[]>(getStoredObjectives, saveStoredObjectives);
  const [reflections, setReflections] = usePersistentState<WeeklyReflections>(getStoredReflections, saveStoredReflections);

  const [taskModal, setTaskModal] = useState<{ open: boolean; entry: TimeEntry | null; date: string }>({
    open: false,
    entry: null,
    date: formatDateIso(new Date()),
  });
  const [dayStatusDate, setDayStatusDate] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Projects offered in the task forms: every project already used, most recent first
  const projectList = useMemo(() => {
    const seen = new Set<string>();
    [...entries].sort((a, b) => b.createdAt - a.createdAt).forEach((e) => e.project && seen.add(e.project));
    return Array.from(seen);
  }, [entries]);

  const handleSaveEntry = useCallback(
    (draft: TaskDraft, editingId?: string) => {
      if (editingId) {
        setEntries((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...draft } : item)));
        notify(t.dayLog.updated);
      } else {
        setEntries((prev) => [{ ...draft, id: newId('task'), createdAt: Date.now() }, ...prev]);
        notify(t.dayLog.saved);
      }
    },
    [setEntries, notify, t]
  );

  const handleDeleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((item) => item.id !== id));
      notify(t.dayLog.deleted, { tone: 'info' });
    },
    [setEntries, notify, t]
  );

  const handleUpdateEntry = useCallback(
    (entry: TimeEntry) => setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e))),
    [setEntries]
  );

  const handleSaveDayLog = (log: DayLog) => {
    setDayLogs((prev) => ({ ...prev, [log.date]: log }));
    notify(t.dayStatusModal.saved);
  };

  /** Quick status change keeps the note and check-in times; the target hours follow the new status. */
  const handleUpdateDayStatus = useCallback(
    (dateIso: string, status: DayStatusType) => {
      setDayLogs((prev) => {
        const { targetHours: _resetTarget, ...rest } = prev[dateIso] ?? { date: dateIso, status };
        return { ...prev, [dateIso]: { ...rest, date: dateIso, status } };
      });
    },
    [setDayLogs]
  );

  const handleResetWeekToDefault = (weekDays: Date[]) => {
    setDayLogs((prev) => {
      const updated = { ...prev };
      weekDays.slice(0, 5).forEach((d) => delete updated[formatDateIso(d)]);
      return updated;
    });
  };

  const openNewTaskModal = (dateIso?: string) => setTaskModal({ open: true, entry: null, date: dateIso || formatDateIso(currentDate) });
  const openEditTaskModal = (entry: TimeEntry) => setTaskModal({ open: true, entry, date: entry.date });

  const handleQuickExport = async () => {
    try {
      const file = await exportReport('csv', {
        weekDays: getWeekDays(currentDate),
        entries,
        dayLogs,
        settings,
        objectives,
        reflections,
      });
      notify(t.report.exported(file));
    } catch {
      notify(t.report.exportFailed, { tone: 'error' });
    }
  };

  const handleRefreshData = () => {
    setSettings(getStoredSettings());
    setEntries(getStoredEntries());
    setDayLogs(getStoredDayLogs());
    setObjectives(getStoredObjectives());
    setReflections(getStoredReflections());
  };

  const weekProps = { currentDate, onChangeDate: setCurrentDate, entries, dayLogs, settings };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-950">
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
            {activeTab === 'daily' && (
              <DayLogView
                selectedDate={currentDate}
                setSelectedDate={setCurrentDate}
                entries={entries}
                dayLogs={dayLogs}
                settings={settings}
                projects={projectList}
                onSaveTask={handleSaveEntry}
                onDeleteTask={handleDeleteEntry}
                onSetDayStatus={handleUpdateDayStatus}
              />
            )}

            {activeTab === 'report' && (
              <WeeklyReportView
                {...weekProps}
                objectives={objectives}
                setObjectives={setObjectives}
                reflections={reflections}
                setReflections={setReflections}
                onUpdateDayStatus={handleUpdateDayStatus}
                onResetWeekToDefault={handleResetWeekToDefault}
                onUpdateEntry={handleUpdateEntry}
              />
            )}

            {activeTab === 'timesheet' && (
              <WeeklyTimesheetView
                {...weekProps}
                onOpenNewTaskForDay={openNewTaskModal}
                onEditTask={openEditTaskModal}
                onOpenDayStatusModal={setDayStatusDate}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarLeaveView dayLogs={dayLogs} settings={settings} onOpenDayStatusModal={setDayStatusDate} />
            )}

            {activeTab === 'performance' && <PerformanceView {...weekProps} />}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="no-print border-t border-neutral-200 bg-white py-4 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {settings.companyName ? `${settings.companyName} · ` : ''}
            {t.common.appName} – {t.footer.tagline}
          </span>
          <span>{t.footer.localData}</span>
        </div>
      </footer>

      {/* Floating action button on small screens */}
      <motion.button
        type="button"
        onClick={() => openNewTaskModal()}
        aria-label={t.header.addTask}
        whileTap={{ scale: 0.92 }}
        className="no-print md:hidden fixed right-4 bottom-20 z-30 w-14 h-14 rounded-2xl bg-indigo-600 text-white elevation-3 flex items-center justify-center"
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <ManualEntryModal
        isOpen={taskModal.open}
        onClose={() => setTaskModal((m) => ({ ...m, open: false }))}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
        editingEntry={taskModal.entry}
        projects={projectList}
        defaultDate={taskModal.date}
        settings={settings}
      />

      <DayStatusModal
        isOpen={dayStatusDate !== null}
        onClose={() => setDayStatusDate(null)}
        dateIso={dayStatusDate ?? formatDateIso(new Date())}
        currentDayLog={dayStatusDate ? dayLogs[dayStatusDate] : undefined}
        settings={settings}
        onSaveDayLog={handleSaveDayLog}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onRefreshData={handleRefreshData}
      />
    </div>
  );
};
