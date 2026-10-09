import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CheckCircle2, Settings } from 'lucide-react';
import type { UserSettings } from '../../types';
import { useI18n } from '../../i18n';
import { SETTINGS_SECTIONS, routeHash, type SettingsSectionId } from '../../routing';
import { IconTile, PageHeader, PageStack, Reveal } from '../../ui/layout';
import { SETTINGS_SECTION_DEFS } from './sections';
import type { SettingsUpdate } from './settingsModel';

interface SettingsPageProps {
  section: SettingsSectionId;
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  onRefreshData: () => void;
}

/** "Saved" badge that lights up for a moment after each change. */
function useSavedFlash(): [boolean, () => void] {
  const [flash, setFlash] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const trigger = () => {
    setFlash(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFlash(false), 1600);
  };
  return [flash, trigger];
}

const SavedBadge: React.FC<{ flash: boolean }> = ({ flash }) => {
  const { t } = useI18n();
  return (
    <span
      role="status"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors duration-300 ${
        flash ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-slate-500'
      }`}
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      {flash ? t.settings.saved : t.settings.autoSave}
    </span>
  );
};

/** Section menu: a sidebar on large screens, a scrollable row of chips on small ones. */
const SectionNav: React.FC<{ current: SettingsSectionId }> = ({ current }) => {
  const { t } = useI18n();
  return (
    <nav aria-label={t.settings.title} className="flex lg:flex-col gap-1 overflow-x-auto [scrollbar-width:none] -mx-1 px-1 pb-1 lg:pb-0">
      {SETTINGS_SECTIONS.map((id) => {
        const { icon, tone } = SETTINGS_SECTION_DEFS[id];
        const active = id === current;
        return (
          <a
            key={id}
            href={routeHash({ page: 'settings', section: id })}
            aria-current={active ? 'page' : undefined}
            className={`relative shrink-0 flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors ${active ? '' : 'hover:bg-white/70'}`}
          >
            {active && (
              <motion.span layoutId="settings-nav" className="absolute inset-0 rounded-xl bg-white elevation-1 ring-1 ring-slate-200/70" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />
            )}
            <span className="relative">
              <IconTile icon={icon} tone={tone} size="sm" />
            </span>
            <span className="relative min-w-0 pr-2">
              <span className={`block text-[13px] font-semibold whitespace-nowrap ${active ? 'text-slate-900' : 'text-slate-600'}`}>{t.settings.nav[id].label}</span>
              <span className="hidden lg:block text-[11px] text-slate-500 truncate max-w-[180px]">{t.settings.nav[id].description}</span>
            </span>
          </a>
        );
      })}
    </nav>
  );
};

/** Settings on their own page (#/settings/<section>), saved as soon as a field is changed. */
export const SettingsPage: React.FC<SettingsPageProps> = ({ section, settings, setSettings, onRefreshData }) => {
  const { t } = useI18n();
  const [flash, flashSaved] = useSavedFlash();
  const { icon, tone, Component } = SETTINGS_SECTION_DEFS[section];
  const nav = t.settings.nav[section];

  const update: SettingsUpdate = (patch) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    flashSaved();
  };

  return (
    <PageStack>
      <PageHeader icon={Settings} title={t.settings.title} subtitle={t.settings.subtitle} actions={<SavedBadge flash={flash} />} />
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        <Reveal className="lg:sticky lg:top-24">
          <SectionNav current={section} />
        </Reveal>
        <Reveal className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              key={section}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="card overflow-hidden"
              aria-labelledby="settings-section-title"
            >
              <header className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
                <IconTile icon={icon} tone={tone} />
                <div className="min-w-0">
                  <h3 id="settings-section-title" className="text-base font-bold text-slate-900">
                    {nav.label}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{nav.description}</p>
                </div>
              </header>
              <div className="px-6 py-5">
                <Component settings={settings} update={update} onRefreshData={onRefreshData} />
              </div>
            </motion.section>
          </AnimatePresence>
        </Reveal>
      </div>
    </PageStack>
  );
};
