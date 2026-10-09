import React from 'react';
import { useI18n } from '../../i18n';
import { useFeedback } from '../../ui/feedback';
import { CommitField, FieldGroup } from './fields';
import { parseRepos, type SettingsSectionProps } from './settingsModel';

/** Repositories searched by default and the optional read-only token. */
export const GithubSection: React.FC<SettingsSectionProps> = ({ settings, update }) => {
  const { t } = useI18n();
  const { notify } = useFeedback();
  const s = t.settings;

  const commitRepos = (text: string) => {
    const { repos, invalid } = parseRepos(text);
    update({ defaultRepos: repos });
    if (invalid.length) notify(s.reposInvalid(invalid.join(', ')), { tone: 'info' });
  };

  return (
    <FieldGroup title={s.sectionGithub} description={s.githubDesc}>
      <CommitField
        id="set-repos"
        label={s.reposLabel}
        placeholder={s.reposPlaceholder}
        value={settings.defaultRepos.join(', ')}
        onCommit={commitRepos}
        className="input-field text-xs font-mono"
      />
      <CommitField
        id="set-token"
        type="password"
        autoComplete="off"
        maxLength={255}
        label={s.tokenLabel}
        hint={s.tokenHint}
        placeholder="github_pat_…"
        value={settings.githubToken ?? ''}
        onCommit={(v) => update({ githubToken: v.trim() || undefined })}
        className="input-field text-xs font-mono"
      />
    </FieldGroup>
  );
};
