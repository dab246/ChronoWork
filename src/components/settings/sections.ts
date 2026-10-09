import type React from 'react';
import { Bell, Building, Clock, Database, FileImage, GitPullRequest, Languages } from 'lucide-react';
import type { SettingsSectionId } from '../../routing';
import type { Tone } from '../../ui/layout';
import type { SettingsSectionProps } from './settingsModel';
import { ProfileSection } from './ProfileSection';
import { WorkSection } from './WorkSection';
import { ReminderSection } from './ReminderSection';
import { LanguageSection } from './LanguageSection';
import { ReportSection } from './ReportSection';
import { GithubSection } from './GithubSection';
import { DataSection } from './DataSection';

export interface SettingsSectionDef {
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  Component: React.FC<SettingsSectionProps>;
}

/**
 * Every settings section, in menu order. Adding one: a component, an id in
 * SETTINGS_SECTIONS (routing.ts), an entry here and its `settings.nav` texts.
 */
export const SETTINGS_SECTION_DEFS: Record<SettingsSectionId, SettingsSectionDef> = {
  profile: { icon: Building, tone: 'indigo', Component: ProfileSection },
  work: { icon: Clock, tone: 'emerald', Component: WorkSection },
  reminder: { icon: Bell, tone: 'amber', Component: ReminderSection },
  language: { icon: Languages, tone: 'sky', Component: LanguageSection },
  report: { icon: FileImage, tone: 'violet', Component: ReportSection },
  github: { icon: GitPullRequest, tone: 'slate', Component: GithubSection },
  data: { icon: Database, tone: 'rose', Component: DataSection },
};
