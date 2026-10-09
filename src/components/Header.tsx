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
          compact ? 'px-3 py-1.5 text-xs' : 'px-3.5 py-1.5 text-[13px]'
        } font-semibold ${active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-900'}`}
      >
        {active && (
          <motion.span
            layoutId={layoutId}
            className="absolute inset-0 rounded-full bg-white elevation-1 ring-1 ring-slate-200/70"
            transition={{ type: 'spring', stiffness: 500, damping: 38 }}
          />
        )}
        <Icon className={`relative w-4 h-4 ${active ? 'text-indigo-600' : ''}`} />
        <span className="relative">{t.tabs[id]}</span>
      </button>
    );
  };

  return (
    <header className="no-print bg-white/75 backdrop-blur-xl backdrop-saturate-150 border-b border-slate-200/70 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center elevation-2 ring-1 ring-white/30">
              <Clock className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-950 leading-tight">{t.common.appName}</span>
              {settings.companyName && <span className="text-[11px] text-slate-500 font-medium">{settings.companyName}</span>}
            </div>
          </div>

          <nav
            aria-label={t.header.navigation}
            role="tablist"
            className="hidden xl:flex items-center gap-0.5 p-1 min-w-0 overflow-x-auto [scrollbar-width:none] bg-slate-100/80 rounded-full border border-slate-200/70"
          >
            {TABS.map(({ id, icon }) => tabButton(id, icon, 'tab-indicator'))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageMenu value={settings.language} onChange={onSelectLanguage} />

            <button type="button" onClick={onQuickExport} title={t.header.exportCsv} aria-label={t.header.exportCsv} className="hidden md:inline-flex icon-btn">
              <Download className="w-5 h-5" />
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
          className="flex xl:hidden items-center gap-0.5 p-1 mb-2 overflow-x-auto [scrollbar-width:none] bg-slate-100/80 rounded-full border border-slate-200/70"
        >
          {TABS.map(({ id, icon }) => tabButton(id, icon, 'tab-indicator-mobile', true))}
        </nav>
      </div>
    </header>
  );
};
