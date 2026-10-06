import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { DayLog, DayStatusType, TimeEntry, UserSettings, WeeklyObjective, WeeklyReflections } from '../types';
import {
  getStoredDayLogs,
  getStoredEntries,
  getStoredObjectives,
  getStoredReflections,
  getStoredSettings,
  newId,
  saveStoredDayLogs,
  saveStoredEntries,
  saveStoredObjectives,
  saveStoredReflections,
} from '../utils/storage';
import { formatDateIso } from '../utils/dateUtils';
import { useI18n } from '../i18n';
import { useFeedback } from '../ui/feedback';
import type { TaskDraft } from '../components/TaskForm';

/** Keeps a piece of state in sync with localStorage. */
export function usePersistentState<T>(load: () => T, save: (value: T) => unknown) {
  const [value, setValue] = useState<T>(load);
  useEffect(() => {
    save(value);
  }, [value, save]);
  return [value, setValue] as const;
}

/** Projects offered in the task forms: every project already used, most recent first. */
function recentProjects(entries: TimeEntry[]): string[] {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  return Array.from(new Set(sorted.map((e) => e.project).filter(Boolean)));
}

/** Quick status change keeps the note and check-in times; the target hours follow the new status. */
function withStatus(logs: Record<string, DayLog>, dateIso: string, status: DayStatusType): Record<string, DayLog> {
  const { targetHours: _resetTarget, ...rest } = logs[dateIso] ?? { date: dateIso, status };
  return { ...logs, [dateIso]: { ...rest, date: dateIso, status } };
}

function withoutWeekdays(logs: Record<string, DayLog>, weekDays: Date[]): Record<string, DayLog> {
  const updated = { ...logs };
  weekDays.slice(0, 5).forEach((d) => delete updated[formatDateIso(d)]);
  return updated;
}

/** Persistent work data (entries, day logs, objectives, reflections) and the actions on it. */
export function useWorkspaceData(setSettings: React.Dispatch<React.SetStateAction<UserSettings>>) {
  const { t } = useI18n();
  const { notify } = useFeedback();

  const [entries, setEntries] = usePersistentState<TimeEntry[]>(getStoredEntries, saveStoredEntries);
  const [dayLogs, setDayLogs] = usePersistentState<Record<string, DayLog>>(getStoredDayLogs, saveStoredDayLogs);
  const [objectives, setObjectives] = usePersistentState<WeeklyObjective[]>(getStoredObjectives, saveStoredObjectives);
  const [reflections, setReflections] = usePersistentState<WeeklyReflections>(getStoredReflections, saveStoredReflections);

  const projects = useMemo(() => recentProjects(entries), [entries]);

  const saveEntry = useCallback(
    (draft: TaskDraft, editingId?: string) => {
      if (editingId) {
        setEntries((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...draft } : item)));
        notify(t.dayLog.updated);
        return;
      }
      setEntries((prev) => [{ ...draft, id: newId('task'), createdAt: Date.now() }, ...prev]);
      notify(t.dayLog.saved);
    },
    [setEntries, notify, t]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => prev.filter((item) => item.id !== id));
      notify(t.dayLog.deleted, { tone: 'info' });
    },
    [setEntries, notify, t]
  );

  const updateEntry = useCallback(
    (entry: TimeEntry) => setEntries((prev) => prev.map((e) => (e.id === entry.id ? entry : e))),
    [setEntries]
  );

  const saveDayLog = (log: DayLog) => {
    setDayLogs((prev) => ({ ...prev, [log.date]: log }));
    notify(t.dayStatusModal.saved);
  };

  const updateDayStatus = useCallback(
    (dateIso: string, status: DayStatusType) => setDayLogs((prev) => withStatus(prev, dateIso, status)),
    [setDayLogs]
  );

  const resetWeekToDefault = (weekDays: Date[]) => setDayLogs((prev) => withoutWeekdays(prev, weekDays));

  /** Reloads everything from storage (after a restore, sample data or clear). */
  const refresh = () => {
    setSettings(getStoredSettings());
    setEntries(getStoredEntries());
    setDayLogs(getStoredDayLogs());
    setObjectives(getStoredObjectives());
    setReflections(getStoredReflections());
  };

  return {
    entries,
    dayLogs,
    objectives,
    setObjectives,
    reflections,
    setReflections,
    projects,
    saveEntry,
    deleteEntry,
    updateEntry,
    saveDayLog,
    updateDayStatus,
    resetWeekToDefault,
    refresh,
  };
}

export type WorkspaceData = ReturnType<typeof useWorkspaceData>;
