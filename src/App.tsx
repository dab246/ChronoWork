/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TimeEntry, 
  DayLog, 
  UserSettings, 
  DayStatusType,
  WeeklyObjective,
  WeeklyReflections 
} from './types';
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
  DEFAULT_PROJECTS 
} from './utils/storage';
import { formatDateIso, getWeekDays } from './utils/dateUtils';
import { exportWeeklyTemplateCsv } from './utils/exportUtils';

import { Header, ActiveTab } from './components/Header';
import { DayLogView } from './components/DayLogView';
import { WeeklyReportView } from './components/WeeklyReportView';
import { WeeklyTimesheetView } from './components/WeeklyTimesheetView';
import { CalendarLeaveView } from './components/CalendarLeaveView';
import { PerformanceView } from './components/PerformanceView';
import { ManualEntryModal } from './components/ManualEntryModal';
import { DayStatusModal } from './components/DayStatusModal';
import { SettingsModal } from './components/SettingsModal';

export default function App() {
  // Navigation tab: Default to daily log time cuối ngày
  const [activeTab, setActiveTab] = useState<ActiveTab>('daily');

  // Active date focus (for weekly navigation and daily view)
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());

  // Core Persistent State
  const [settings, setSettings] = useState<UserSettings>(() => getStoredSettings());
  const [entries, setEntries] = useState<TimeEntry[]>(() => getStoredEntries());
  const [dayLogs, setDayLogs] = useState<Record<string, DayLog>>(() => getStoredDayLogs());
  const [objectives, setObjectives] = useState<WeeklyObjective[]>(() => getStoredObjectives());
  const [reflections, setReflections] = useState<WeeklyReflections>(() => getStoredReflections());

  // Modals state
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [newTaskDefaultDate, setNewTaskDefaultDate] = useState<string>(formatDateIso(new Date()));

  const [isDayStatusModalOpen, setIsDayStatusModalOpen] = useState(false);
  const [activeDayStatusDate, setActiveDayStatusDate] = useState<string>(formatDateIso(new Date()));

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Sync state to LocalStorage
  useEffect(() => {
    saveStoredSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveStoredEntries(entries);
  }, [entries]);

  useEffect(() => {
    saveStoredDayLogs(dayLogs);
  }, [dayLogs]);

  useEffect(() => {
    saveStoredObjectives(objectives);
  }, [objectives]);

  useEffect(() => {
    saveStoredReflections(reflections);
  }, [reflections]);

  // Dynamic projects list (combine defaults with any custom project used in entries)
  const projectList = useMemo(() => {
    const set = new Set<string>(DEFAULT_PROJECTS);
    entries.forEach((e) => {
      if (e.project) set.add(e.project);
    });
    return Array.from(set);
  }, [entries]);

  // Week navigation helpers
  const handlePrevWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 7);
    setCurrentDate(d);
  };

  const handleNextWeek = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 7);
    setCurrentDate(d);
  };

  const handleResetToCurrentWeek = () => {
    setCurrentDate(new Date());
  };

  // CRUD Handlers for Time Entries
  const handleSaveEntry = (entryData: Omit<TimeEntry, 'id' | 'createdAt'>, editingId?: string) => {
    if (editingId) {
      setEntries((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...entryData } : item))
      );
    } else {
      const newEntry: TimeEntry = {
        ...entryData,
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: Date.now(),
      };
      setEntries((prev) => [newEntry, ...prev]);
    }
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((item) => item.id !== id));
  };

  // Day Log Handlers
  const handleSaveDayLog = (log: DayLog) => {
    setDayLogs((prev) => ({
      ...prev,
      [log.date]: log,
    }));
  };

  const handleUpdateDayStatus = (dateIso: string, status: DayStatusType) => {
    setDayLogs((prev) => ({
      ...prev,
      [dateIso]: {
        date: dateIso,
        status,
        note: prev[dateIso]?.note,
      },
    }));
  };

  // Reset week's Mon-Fri to default office days
  const handleResetWeekToDefault = (weekDays: Date[]) => {
    const updated = { ...dayLogs };
    weekDays.slice(0, 5).forEach((d) => {
      const iso = formatDateIso(d);
      const dayNum = d.getDay();
      const isOffice = settings.defaultOfficeDays.includes(dayNum);
      updated[iso] = {
        date: iso,
        status: isOffice ? 'work' : 'wfh',
        note: isOffice ? 'Văn phòng' : 'Làm từ xa',
      };
    });
    setDayLogs(updated);
  };

  // Modal openers
  const openNewTaskModal = (dateIso?: string) => {
    setEditingEntry(null);
    setNewTaskDefaultDate(dateIso || formatDateIso(currentDate));
    setIsNewTaskModalOpen(true);
  };

  const openEditTaskModal = (entry: TimeEntry) => {
    setEditingEntry(entry);
    setNewTaskDefaultDate(entry.date);
    setIsNewTaskModalOpen(true);
  };

  const openDayStatusModal = (dateIso: string) => {
    setActiveDayStatusDate(dateIso);
    setIsDayStatusModalOpen(true);
  };

  // Quick export CSV handler for top bar
  const handleQuickExport = () => {
    const weekDays = getWeekDays(currentDate);
    exportWeeklyTemplateCsv(weekDays, entries, dayLogs, settings, objectives, reflections);
  };

  // Reload data from storage after restore / demo seed
  const handleRefreshData = () => {
    setSettings(getStoredSettings());
    setEntries(getStoredEntries());
    setDayLogs(getStoredDayLogs());
    setObjectives(getStoredObjectives());
    setReflections(getStoredReflections());
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans selection:bg-neutral-900 selection:text-white">
      
      {/* Top Application Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTask={() => openNewTaskModal()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onQuickExport={handleQuickExport}
        settings={settings}
        onSelectLanguage={(newLang) => {
          const updated = { ...settings, language: newLang };
          setSettings(updated);
          saveStoredSettings(updated);
        }}
      />

      {/* Main Workspace Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Tab 1: Log time cuối ngày trước khi ra về */}
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

        {/* Tab 2: Báo cáo tuần chuẩn LINAGORA Vietnam */}
        {activeTab === 'report' && (
          <WeeklyReportView
            currentDate={currentDate}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            onResetToCurrentWeek={handleResetToCurrentWeek}
            entries={entries}
            dayLogs={dayLogs}
            settings={settings}
            objectives={objectives}
            setObjectives={setObjectives}
            reflections={reflections}
            setReflections={setReflections}
            onUpdateDayStatus={handleUpdateDayStatus}
            onResetWeekToDefault={handleResetWeekToDefault}
            onUpdateEntry={(entry) =>
              setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e)))
            }
          />
        )}

        {/* Tab 3: Bảng chấm công tuần */}
        {activeTab === 'timesheet' && (
          <WeeklyTimesheetView
            currentDate={currentDate}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            onResetToCurrentWeek={handleResetToCurrentWeek}
            entries={entries}
            dayLogs={dayLogs}
            settings={settings}
            onOpenNewTaskForDay={(dateIso) => openNewTaskModal(dateIso)}
            onEditTask={(entry) => openEditTaskModal(entry)}
            onOpenDayStatusModal={(dateIso) => openDayStatusModal(dateIso)}
          />
        )}

        {/* Tab 4: Lịch ngày công & ngày nghỉ */}
        {activeTab === 'calendar' && (
          <CalendarLeaveView
            dayLogs={dayLogs}
            onOpenDayStatusModal={(dateIso) => openDayStatusModal(dateIso)}
            onQuickSetStatus={handleUpdateDayStatus}
            settings={settings}
          />
        )}

        {/* Tab 5: Phân tích hiệu suất cá nhân */}
        {activeTab === 'performance' && (
          <PerformanceView
            currentDate={currentDate}
            onPrevWeek={handlePrevWeek}
            onNextWeek={handleNextWeek}
            onResetToCurrentWeek={handleResetToCurrentWeek}
            entries={entries}
            dayLogs={dayLogs}
            settings={settings}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print border-t border-neutral-200 bg-white py-4 text-xs text-neutral-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{settings.companyName} · Weekly Task Tracker & Timesheet Report</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-neutral-900 transition-colors"
            >
              Cài đặt & Tùy chỉnh
            </button>
            <button
              onClick={handleQuickExport}
              className="hover:text-neutral-900 transition-colors"
            >
              Xuất CSV Báo Cáo
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ManualEntryModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
        editingEntry={editingEntry}
        projects={projectList}
        defaultDate={newTaskDefaultDate}
        settings={settings}
      />

      <DayStatusModal
        isOpen={isDayStatusModalOpen}
        onClose={() => setIsDayStatusModalOpen(false)}
        dateIso={activeDayStatusDate}
        currentDayLog={dayLogs[activeDayStatusDate]}
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
}
