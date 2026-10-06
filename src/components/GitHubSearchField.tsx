import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { GitPullRequest } from 'lucide-react';
import { useI18n } from '../i18n';
import type { UserSettings } from '../types';
import { searchGitHubIssuesAndPRs, type GitHubItem } from '../services/githubService';
import { useDismiss } from '../ui/useDismiss';

const DEBOUNCE_MS = 350;

interface GitHubSearchFieldProps {
  settings: UserSettings;
  onSelect: (item: GitHubItem) => void;
}

/**
 * Debounced GitHub issue / PR search. Each new query aborts the previous
 * request, so a slow old response can never overwrite newer results and
 * typing does not burn through the API rate limit.
 */
export const GitHubSearchField: React.FC<GitHubSearchFieldProps> = ({ settings, onSelect }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GitHubItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useDismiss(open, [wrapperRef], () => setOpen(false));

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await searchGitHubIssuesAndPRs(trimmed, settings.defaultRepos, settings.githubToken, controller.signal);
        setResults(items);
        setOpen(true);
      } catch {
        // Aborted by a newer query
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, settings.defaultRepos, settings.githubToken]);

  const choose = (item: GitHubItem) => {
    onSelect(item);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <label className="field-label" htmlFor="github-search">
        {t.dayLog.githubSearchLabel}
      </label>
      <div className="relative">
        <input
          id="github-search"
          type="search"
          autoComplete="off"
          maxLength={200}
          placeholder={t.dayLog.githubSearchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          className="input-field pl-9 pr-9 text-xs bg-neutral-50"
        />
        <GitPullRequest className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
        {loading && (
          <div
            className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin absolute right-3 top-1/2 -translate-y-1/2"
            aria-label={t.dayLog.githubSearching}
          />
        )}
      </div>

      <AnimatePresence>
        {open && query.trim().length >= 2 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl elevation-3 z-30 max-h-64 overflow-y-auto py-1"
            role="listbox"
          >
            {results.length === 0 ? (
              <p className="px-3 py-3 text-xs text-neutral-500">{t.dayLog.githubNoResult}</p>
            ) : (
              results.map((item) => (
                <button
                  key={`${item.repoName}#${item.number}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => choose(item)}
                  className="w-full px-3 py-2 text-left hover:bg-indigo-50 flex items-start gap-2.5 transition-colors"
                >
                  <GitPullRequest className={`w-4 h-4 shrink-0 mt-0.5 ${item.isPullRequest ? 'text-purple-600' : 'text-emerald-600'}`} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-semibold text-neutral-900 truncate">
                      #{item.number} {item.title}
                    </span>
                    <span className="block text-[10px] text-neutral-500">
                      {item.repoName} · {item.state}
                    </span>
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/** Picks the project whose name matches the repository, if any. */
export function projectForRepo(repoName: string, projects: string[]): string | undefined {
  const repo = repoName.split('/').pop()?.toLowerCase().replace(/[-_]/g, ' ') ?? '';
  return projects.find((p) => p.toLowerCase().replace(/[-_]/g, ' ') === repo);
}
