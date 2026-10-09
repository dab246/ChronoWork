import React, { useState } from 'react';
import { BellRing, CheckCircle2, Info, Volume2 } from 'lucide-react';
import type { ReminderSettings } from '../../types';
import { useI18n } from '../../i18n';
import { useFeedback } from '../../ui/feedback';
import { Switch } from '../../ui/Switch';
import { CommitField } from './fields';
import { localeOf } from '../../utils/dateUtils';
import { useReminderMessage } from '../../hooks/useDailyReminder';
import { alertReminder, notificationState, requestNotificationPermission, type NotificationState } from '../../services/reminderService';

interface ReminderSettingsFieldsProps {
  value: ReminderSettings;
  onChange: (value: ReminderSettings) => void;
}

const STATE_TONES: Record<NotificationState, string> = {
  granted: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  default: 'bg-slate-50 border-slate-200 text-slate-700',
  denied: 'bg-amber-50 border-amber-200 text-amber-900',
  unsupported: 'bg-slate-50 border-slate-200 text-slate-600',
};

/** Whether the browser may show system notifications, with a button to ask when it has not been decided yet. */
const PermissionStatus: React.FC<{ state: NotificationState; onAllow: () => void }> = ({ state, onAllow }) => {
  const { t } = useI18n();
  const s = t.settings;
  const text: Record<NotificationState, string> = {
    granted: s.notifyGranted,
    default: s.notifyDefault,
    denied: s.notifyDenied,
    unsupported: s.notifyUnsupported,
  };
  const StateIcon = state === 'granted' ? CheckCircle2 : Info;
  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap px-3 py-2 rounded-xl border text-[11px] ${STATE_TONES[state]}`} role="status">
      <span className="flex items-start gap-1.5 min-w-0">
        <StateIcon className="w-3.5 h-3.5 shrink-0 mt-px" />
        {text[state]}
      </span>
      {state === 'default' && (
        <button type="button" onClick={onAllow} className="btn-tonal py-1">
          <BellRing className="w-3.5 h-3.5" />
          {s.notifyAllow}
        </button>
      )}
    </div>
  );
};

/** Settings of the end-of-day reminder: on / off, time, message, voice, permission and a test button. */
export const ReminderSettingsFields: React.FC<ReminderSettingsFieldsProps> = ({ value, onChange }) => {
  const { t, lang } = useI18n();
  const { notify } = useFeedback();
  const s = t.settings;
  const [permission, setPermission] = useState<NotificationState>(notificationState);
  const message = useReminderMessage(value.message);
  const set = <K extends keyof ReminderSettings>(key: K, next: ReminderSettings[K]) => onChange({ ...value, [key]: next });

  const allow = async () => setPermission(await requestNotificationPermission());

  const test = async () => {
    setPermission(await requestNotificationPermission());
    alertReminder({ title: t.reminder.title, message, locale: localeOf(lang), voice: value.voice, onOpen: () => undefined });
    notify(message, { tone: 'info' });
  };

  return (
    <div className="space-y-3">
      <Switch checked={value.enabled} onChange={(on) => set('enabled', on)} label={s.reminderEnabled} />
      <div className={`space-y-3 ${value.enabled ? '' : 'opacity-50 pointer-events-none'}`} aria-disabled={!value.enabled}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="field-label" htmlFor="set-reminder-time">{s.reminderTime}</label>
            <input
              id="set-reminder-time"
              type="time"
              required
              value={value.time}
              onChange={(e) => e.target.value && set('time', e.target.value)}
              className="input-field tabular-nums"
            />
          </div>
          <div className="sm:col-span-2">
            <CommitField
              id="set-reminder-message"
              type="text"
              maxLength={200}
              label={s.reminderMessage}
              value={value.message ?? ''}
              placeholder={t.reminder.defaultMessage}
              onCommit={(text) => set('message', text.trim() || undefined)}
            />
          </div>
        </div>
        <Switch checked={value.voice} onChange={(on) => set('voice', on)} label={<span className="inline-flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" />{s.reminderVoice}</span>} />
        <PermissionStatus state={permission} onAllow={allow} />
        <button type="button" onClick={test} className="btn-outlined">
          <BellRing className="w-3.5 h-3.5" />
          {s.reminderTest}
        </button>
      </div>
    </div>
  );
};
