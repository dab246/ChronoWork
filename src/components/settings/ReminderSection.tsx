import React from 'react';
import { useI18n } from '../../i18n';
import { requestNotificationPermission } from '../../services/reminderService';
import { FieldGroup } from './fields';
import { ReminderSettingsFields } from './ReminderSettingsFields';
import type { SettingsSectionProps } from './settingsModel';

/** End-of-day reminder: time, message, voice and notification permission. */
export const ReminderSection: React.FC<SettingsSectionProps> = ({ settings, update }) => {
  const { t } = useI18n();
  return (
    <FieldGroup title={t.settings.sectionReminder} description={t.settings.reminderHint}>
      <ReminderSettingsFields
        value={settings.reminder}
        onChange={(reminder) => {
          // Turning the reminder on is a click, so the browser lets us ask for the permission here
          if (reminder.enabled && !settings.reminder.enabled) void requestNotificationPermission();
          update({ reminder });
        }}
      />
    </FieldGroup>
  );
};
