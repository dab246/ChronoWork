import React from 'react';
import { motion } from 'motion/react';
import { Clock, FileSpreadsheet, TrendingUp, Settings, Plus, CalendarDays, TableProperties, Download } from 'lucide-react';
import type { Language, UserSettings } from '../types';
import { useI18n } from '../i18n';
import { LanguageMenu } from '../ui/LanguageMenu';

export type ActiveTab = 'daily' | 'report' | 'timesheet' | 'calendar' | 'performance';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewTask: () => void;
  onOpenSettings: () => void;
  onQuickExport: () => void;
  settings: UserSettings;
  onSelectLanguage: (lang: Language) => void;
}

const TABS: { id: ActiveTab; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'daily', icon: Clock },
  { id: 'report', icon: FileSpreadsheet },
  { id: 'timesheet', icon: TableProperties },
  { id: 'calendar', icon: CalendarDays },
  { id: 'performance', icon: TrendingUp },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTask,
  onOpenSettings,
  onQuickExport,
  settings,
  onSelectLanguage,
}) => {
  const { t } = useI18n();

  const tabButton = (id: ActiveTab, Icon: React.ComponentType<{ className?: string }>, layoutId: string, compact = false) => {
    const active = activeTab === id;
    return (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setActiveTab(id)}
        className={`relative flex items-center gap-2 whitespace-nowrap rounded-full transition-colors ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
        } font-semibold ${active ? 'text-indigo-900' : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'}`}
      >
        {active && (
          <motion.span
            layoutId={layoutId}
            className="absolute inset-0 rounded-full bg-indigo-100"
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          />
        )}
        <Icon className="relative w-4 h-4" />
        <span className="relative">{t.tabs[id]}</span>
      </button>
    );
  };

  return (
    <header className="no-print bg-white/90 backdrop-blur border-b border-neutral-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-800 text-white flex items-center justify-center elevation-2">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-neutral-950 leading-tight">{t.common.appName}</span>
              {settings.companyName && <span className="text-[11px] text-neutral-500 font-medium">{settings.companyName}</span>}
            </div>
          </div>

          <nav aria-label={t.header.navigation} role="tablist" className="hidden lg:flex items-center gap-1">
            {TABS.map(({ id, icon }) => tabButton(id, icon, 'tab-indicator'))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageMenu value={settings.language} onChange={onSelectLanguage} />

            <button type="button" onClick={onQuickExport} title={t.header.exportCsv} className="hidden xl:inline-flex btn-outlined">
              <Download className="w-3.5 h-3.5" />
              <span>{t.header.exportCsv}</span>
            </button>

            <button type="button" onClick={onOpenNewTask} className="hidden md:inline-flex btn-filled">
              <Plus className="w-4 h-4" />
              <span>{t.header.addTask}</span>
            </button>

            <button type="button" onClick={onOpenSettings} title={t.header.settings} aria-label={t.header.settings} className="icon-btn">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav
          aria-label={t.header.navigation}
          role="tablist"
          className="flex lg:hidden items-center gap-1 py-2 border-t border-neutral-100 overflow-x-auto [scrollbar-width:none]"
        >
          {TABS.map(({ id, icon }) => tabButton(id, icon, 'tab-indicator-mobile', true))}
        </nav>
      </div>
    </header>
  );
};
