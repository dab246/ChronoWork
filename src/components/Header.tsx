import React from 'react';
import { 
  Clock, 
  FileSpreadsheet, 
  TrendingUp, 
  Settings, 
  Plus, 
  CalendarDays,
  TableProperties,
  Download,
  CalendarCheck,
  Languages
} from 'lucide-react';
import { UserSettings } from '../types';
import { getTranslations, Language } from '../utils/i18n';

export type ActiveTab = 'daily' | 'report' | 'timesheet' | 'calendar' | 'performance';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewTask: () => void;
  onOpenSettings: () => void;
  onQuickExport: () => void;
  settings: UserSettings;
  onSelectLanguage?: (lang: Language) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTask,
  onOpenSettings,
  onQuickExport,
  settings,
  onSelectLanguage,
}) => {
  const currentLang = settings.language || 'vi';
  const t = getTranslations(currentLang);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'vi', label: 'VI', flag: '🇻🇳' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
  ];

  return (
    <header className="no-print bg-white border-b border-neutral-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Zone 1: Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-neutral-950 leading-tight">
                {t.appName}
              </span>
              <span className="text-[11px] text-neutral-500 font-medium">
                {settings.companyName || 'LINAGORA Vietnam'}
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 overflow-x-auto py-1">
            <button
              onClick={() => setActiveTab('daily')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'daily'
                  ? 'bg-neutral-100 text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>{t.tabs.daily}</span>
            </button>

            <button
              onClick={() => setActiveTab('report')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'report'
                  ? 'bg-neutral-100 text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-purple-600" />
              <span>{t.tabs.report}</span>
            </button>

            <button
              onClick={() => setActiveTab('timesheet')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'timesheet'
                  ? 'bg-neutral-100 text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <TableProperties className="w-4 h-4" />
              <span>Bảng tuần</span>
            </button>

            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'calendar'
                  ? 'bg-neutral-100 text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <CalendarDays className="w-4 h-4" />
              <span>{t.tabs.calendar}</span>
            </button>

            <button
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md whitespace-nowrap transition-colors ${
                activeTab === 'performance'
                  ? 'bg-neutral-100 text-neutral-950 font-bold shadow-2xs'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>{t.tabs.performance}</span>
            </button>
          </nav>

          {/* Zone 3: Actions & Language Selector */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Language Switcher */}
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200">
              {languages.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => onSelectLanguage && onSelectLanguage(l.code)}
                  title={`Switch language to ${l.code === 'vi' ? 'Tiếng Việt' : l.code === 'en' ? 'English' : 'Français'}`}
                  className={`px-2 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    currentLang === l.code
                      ? 'bg-white text-neutral-900 shadow-2xs'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  <span>{l.flag}</span>
                  <span className="hidden sm:inline">{l.label}</span>
                </button>
              ))}
            </div>

            <button
              onClick={onQuickExport}
              title={t.actions.exportCsv}
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.actions.exportCsv}</span>
            </button>

            <button
              onClick={onOpenNewTask}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors whitespace-nowrap shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t.actions.addTask}</span>
            </button>

            <button
              onClick={onOpenSettings}
              title={t.actions.settings}
              className="p-2 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-neutral-100 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-2 py-1 font-semibold rounded ${
              activeTab === 'daily' ? 'bg-neutral-100 text-neutral-950 font-bold' : 'text-neutral-600'
            }`}
          >
            {t.tabs.daily}
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-2 py-1 font-semibold rounded ${
              activeTab === 'report' ? 'bg-neutral-100 text-neutral-950 font-bold' : 'text-neutral-600'
            }`}
          >
            {t.tabs.report}
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-2 py-1 font-semibold rounded ${
              activeTab === 'calendar' ? 'bg-neutral-100 text-neutral-950 font-bold' : 'text-neutral-600'
            }`}
          >
            {t.tabs.calendar}
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-2 py-1 font-semibold rounded ${
              activeTab === 'performance' ? 'bg-neutral-100 text-neutral-950 font-bold' : 'text-neutral-600'
            }`}
          >
            {t.tabs.performance}
          </button>
        </div>
      </div>
    </header>
  );
};
