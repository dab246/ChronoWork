import { safeUrl } from '../utils/security';

export interface GitHubItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  repoName: string;
  isPullRequest: boolean;
}

const API_BASE = 'https://api.github.com';
const NAME_SEGMENT = /^[A-Za-z0-9_.-]{1,100}$/;
const REPO_PATTERN = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
const MAX_QUERY_LENGTH = 200;

function isValidSegment(segment: string): boolean {
  return NAME_SEGMENT.test(segment) && segment !== '.' && segment !== '..';
}

/**
 * Parse a GitHub issue / pull request URL. Only https://github.com URLs with
 * plain owner and repo names are accepted, so nothing else can be spliced
 * into the API path that the token is sent to.
 */
export function parseGitHubUrl(
  value: string
): { owner: string; repo: string; type: 'pull' | 'issues'; number: number } | null {
  const url = toGitHubUrl(value);
  if (!url) return null;
  const [owner = '', repo = '', type = '', num = ''] = url.pathname.split('/').filter(Boolean);
  const valid =
    isValidSegment(owner) && isValidSegment(repo) && (type === 'pull' || type === 'issues') && ISSUE_NUMBER.test(num);
  return valid ? { owner, repo, type: type as 'pull' | 'issues', number: Number(num) } : null;
}

const ISSUE_NUMBER = /^\d{1,9}$/;
const GITHUB_HOSTS = new Set(['github.com', 'www.github.com']);

function toGitHubUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && GITHUB_HOSTS.has(url.hostname) ? url : null;
  } catch {
    return null;
  }
}

export interface GitHubRequestOptions {
  token?: string;
  signal?: AbortSignal;
}

export interface GitHubSearchOptions extends GitHubRequestOptions {
  repos?: string[];
}

function requestInit({ token, signal }: GitHubRequestOptions): RequestInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return { headers, signal, referrerPolicy: 'no-referrer', credentials: 'omit' };
}

/** JSON body of a successful response, or null on HTTP / network errors. Aborts are rethrown. */
async function getJson(url: string, options: GitHubRequestOptions): Promise<unknown> {
  try {
    const res = await fetch(url, requestInit(options));
    return res.ok ? await res.json() : null;
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    return null;
  }
}

function toItem(data: Record<string, unknown>, repoName: string): GitHubItem | null {
  const htmlUrl = safeUrl(data.html_url);
  if (!htmlUrl || !htmlUrl.startsWith('https://github.com/')) return null;
  return {
    id: Number(data.id) || 0,
    number: Number(data.number) || 0,
    title: String(data.title ?? '').slice(0, 300),
    html_url: htmlUrl,
    state: String(data.state ?? '').slice(0, 20),
    repoName,
    isPullRequest: Boolean(data.pull_request),
  };
}

/**
 * Fetch issue or pull request metadata. Falls back to an item built from the
 * URL itself when the API is unreachable or rate limited.
 */
export async function fetchGitHubDetailsByUrl(url: string, options: GitHubRequestOptions = {}): Promise<GitHubItem | null> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) return null;

  const repoName = `${parsed.owner}/${parsed.repo}`;
  const fallback: GitHubItem = {
    id: parsed.number,
    number: parsed.number,
    title: `${parsed.repo} #${parsed.number}`,
    html_url: `https://github.com/${repoName}/${parsed.type}/${parsed.number}`,
    state: 'open',
    repoName,
    isPullRequest: parsed.type === 'pull',
  };

  const endpoint = `${API_BASE}/repos/${encodeURIComponent(parsed.owner)}/${encodeURIComponent(parsed.repo)}/issues/${parsed.number}`;
  const data = (await getJson(endpoint, options)) as Record<string, unknown> | null;
  return (data && toItem(data, repoName)) ?? fallback;
}

/** `query` restricted to the valid configured repositories. */
function buildSearchQuery(query: string, repos: string[]): string {
  const qualifiers = repos.filter((r) => REPO_PATTERN.test(r)).map((r) => `repo:${r}`);
  return [query, ...qualifiers].join(' ');
}

/**
 * Search issues and PRs, restricted to the configured repositories when set.
 */
export async function searchGitHubIssuesAndPRs(query: string, options: GitHubSearchOptions = {}): Promise<GitHubItem[]> {
  const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
  if (!trimmed) return [];

  if (trimmed.includes('github.com/')) {
    const directItem = await fetchGitHubDetailsByUrl(trimmed, options);
    return directItem ? [directItem] : [];
  }

  const searchQuery = buildSearchQuery(trimmed, options.repos ?? []);
  const url = `${API_BASE}/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=10`;
  return parseSearchItems(await getJson(url, options));
}

function parseSearchItems(data: unknown): GitHubItem[] {
  const items = (data as { items?: unknown })?.items;
  if (!Array.isArray(items)) return [];
  return items
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      // repository_url is https://api.github.com/repos/{owner}/{repo}
      const repoName = String(item.repository_url ?? '').split('/').slice(-2).join('/');
      return toItem(item, repoName);
    })
    .filter((item): item is GitHubItem => item !== null);
}
