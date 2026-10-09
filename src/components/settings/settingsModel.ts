import type { UserSettings } from '../../types';

export const REPO_PATTERN = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const MAX_REPOS = 20;

/** Comma-separated "owner/repo" list split into the valid repositories (max 20) and the rejected entries. */
export function parseRepos(text: string): { repos: string[]; invalid: string[] } {
  const items = text
    .split(',')
    .map((r) => r.trim())
    .filter(Boolean);
  return {
    repos: items.filter((r) => REPO_PATTERN.test(r)).slice(0, MAX_REPOS),
    invalid: items.filter((r) => !REPO_PATTERN.test(r)),
  };
}

/** Settings change applied by a section; each one is saved right away. */
export type SettingsUpdate = (patch: Partial<UserSettings>) => void;

export interface SettingsSectionProps {
  settings: UserSettings;
  update: SettingsUpdate;
  /** Reloads entries, day logs… after a restore, sample data or clear */
  onRefreshData: () => void;
}
