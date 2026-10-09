import React from 'react';
import { useI18n } from '../../i18n';
import { getWeekdayNames } from '../../utils/dateUtils';
import { clampNumber } from '../../utils/security';
import { CommitField, FieldGroup } from './fields';
import type { SettingsSectionProps } from './settingsModel';

const toggleDay = (days: number[], day: number) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort());

const OfficeDaysPicker: React.FC<{ value: number[]; onChange: (days: number[]) => void }> = ({ value, onChange }) => {
  const { lang } = useI18n();
  const weekdayNames = getWeekdayNames(lang, false).slice(0, 5);
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {weekdayNames.map((name, i) => {
        const day = i + 1;
        const selected = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(toggleDay(value, day))}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full border capitalize transition-all ${
              selected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
};

/** Weekly / daily targets and the default office days. */
export const WorkSection: React.FC<SettingsSectionProps> = ({ settings, update }) => {
  const { t } = useI18n();
  const s = t.settings;
  return (
    <>
      <FieldGroup title={s.hoursTitle} description={s.hoursDesc}>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <CommitField
            id="set-weekly"
            type="number"
            min="0"
            max="168"
            step="0.5"
            label={s.weeklyTarget}
            value={String(settings.weeklyTargetHours)}
            onCommit={(v) => update({ weeklyTargetHours: clampNumber(v, 0, 168, 40) })}
            className="input-field tabular-nums"
          />
          <CommitField
            id="set-daily"
            type="number"
            min="0"
            max="24"
            step="0.5"
            label={s.dailyStandard}
            value={String(settings.dailyStandardHours)}
            onCommit={(v) => update({ dailyStandardHours: clampNumber(v, 0, 24, 8) })}
            className="input-field tabular-nums"
          />
        </div>
      </FieldGroup>
      <FieldGroup title={s.officeDaysLabel} description={s.officeDaysDesc}>
        <OfficeDaysPicker value={settings.defaultOfficeDays} onChange={(days) => update({ defaultOfficeDays: days })} />
      </FieldGroup>
    </>
  );
};
