import { useEffect, useRef } from 'react';
import { DAY_STATUS_CONFIGS, type DayLog, type TimeEntry, type UserSettings } from '../types';
import { formatDateIso, localeOf } from '../utils/dateUtils';
import { getDayTargetHours, getEffectiveStatus, sumHours } from '../utils/workdays';
import { isReminderDue } from '../utils/reminder';
import { getReminderLastDate, saveReminderLastDate } from '../utils/storage';
import { alertReminder } from '../services/reminderService';
import { useI18n } from '../i18n';
import { useFeedback } from '../ui/feedback';

/** Background tabs run timers about once a minute at best, so a 30 s check is accurate enough. */
const CHECK_INTERVAL_MS = 30_000;

interface DailyReminderInput {
  settings: UserSettings;
  entries: TimeEntry[];
  dayLogs: Record<string, DayLog>;
  /** Brings the user to today's log (clicking the notification) */
  onOpen: () => void;
}

/** Message of the reminder: the one set in Settings, or the default of the interface language. */
export function useReminderMessage(message?: string): string {
  const { t } = useI18n();
  return message?.trim() || t.reminder.defaultMessage;
}

/**
 * Fires the end-of-day reminder once a day at the time set in Settings, while
 * the app is open (also in a background tab): system notification, chime,
 * spoken message and an in-app snackbar. Days off and days already logged in full are skipped.
 */
export function useDailyReminder({ settings, entries, dayLogs, onOpen }: DailyReminderInput) {
  const { t, lang } = useI18n();
  const { notify } = useFeedback();
  const message = useReminderMessage(settings.reminder.message);
  const latest = useRef({ settings, entries, dayLogs, onOpen, message, t, lang, notify });
  latest.current = { settings, entries, dayLogs, onOpen, message, t, lang, notify };

  useEffect(() => {
    if (!settings.reminder.enabled) return;
    const check = () => {
      const { settings: s, entries: all, dayLogs: logs, onOpen: open, message: text, t: tr, lang: language, notify: toast } = latest.current;
      const now = new Date();
      const today = formatDateIso(now);
      const due = isReminderDue({
        now,
        time: s.reminder.time,
        lastDate: getReminderLastDate(),
        isWorkDay: DAY_STATUS_CONFIGS[getEffectiveStatus(now, logs, s)].isWorkDay,
        loggedHours: sumHours(all.filter((e) => e.date === today)),
        targetHours: getDayTargetHours(now, logs, s),
      });
      if (!due) return;
      saveReminderLastDate(today);
      alertReminder({ title: tr.reminder.title, message: text, locale: localeOf(language), voice: s.reminder.voice, onOpen: open });
      toast(text, { tone: 'info' });
    };
    check();
    const timer = setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, [settings.reminder.enabled]);
}
