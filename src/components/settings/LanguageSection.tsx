import React from 'react';
import { LANGUAGES, type Language } from '../../types';
import { useI18n } from '../../i18n';
import { FieldGroup } from './fields';
import type { SettingsSectionProps } from './settingsModel';

const LanguageSelect: React.FC<{ id: string; label: string; value: Language; onChange: (lang: Language) => void }> = ({ id, label, value, onChange }) => {
  const { t } = useI18n();
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as Language)} className="input-field">
        {LANGUAGES.map((l) => (
          <option key={l} value={l}>
            {t.language.names[l]}
          </option>
        ))}
      </select>
    </div>
  );
};

/** Interface language and the language of the report and its exports. */
export const LanguageSection: React.FC<SettingsSectionProps> = ({ settings, update }) => {
  const { t } = useI18n();
  const s = t.settings;
  return (
    <FieldGroup title={s.sectionLanguage} description={s.languageDesc}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <LanguageSelect id="set-lang" label={s.uiLanguage} value={settings.language} onChange={(language) => update({ language })} />
        <LanguageSelect id="set-report-lang" label={s.reportLanguage} value={settings.reportLanguage ?? 'en'} onChange={(reportLanguage) => update({ reportLanguage })} />
      </div>
    </FieldGroup>
  );
};
