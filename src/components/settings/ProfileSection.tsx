import React from 'react';
import { useI18n } from '../../i18n';
import { CommitField, FieldGroup } from './fields';
import type { SettingsSectionProps } from './settingsModel';

/** Name, title and company printed on the report. */
export const ProfileSection: React.FC<SettingsSectionProps> = ({ settings, update }) => {
  const { t } = useI18n();
  const s = t.settings;
  const text = (value: string) => value.trim().slice(0, 120);
  return (
    <FieldGroup title={s.sectionProfile} description={s.profileDesc}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CommitField id="set-name" label={s.nameLabel} maxLength={120} value={settings.userName} onCommit={(v) => update({ userName: text(v) })} />
        <CommitField id="set-role" label={s.roleLabel} maxLength={120} value={settings.userRole} onCommit={(v) => update({ userRole: text(v) })} />
      </div>
      <CommitField id="set-company" label={s.companyLabel} maxLength={120} value={settings.companyName} onCommit={(v) => update({ companyName: text(v) })} />
    </FieldGroup>
  );
};
