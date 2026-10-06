export interface GitHubItem {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: string;
  repoName: string;
  isPullRequest: boolean;
  author: string;
}

/**
 * Parse a GitHub URL (Issue or PR) into owner, repo, and issue/PR number
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string; type: 'pull' | 'issues'; number: number } | null {
  const trimmed = url.trim();
  const match = trimmed.match(/github\.com\/([^/]+)\/([^/]+)\/(pull|issues)\/(\d+)/i);
  if (!match) return null;
  return {
    owner: match[1],
    repo: match[2],
    type: match[3].toLowerCase() as 'pull' | 'issues',
    number: parseInt(match[4], 10),
  };
}

/**
 * Fetch issue or pull request metadata from GitHub public API
 */
export async function fetchGitHubDetailsByUrl(url: string, token?: string): Promise<GitHubItem | null> {
  const parsed = parseGitHubUrl(url);
  if (!parsed) return null;

  const endpoint = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/issues/${parsed.number}`;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    const res = await fetch(endpoint, { headers });
    if (!res.ok) {
      // Fallback: create item from url itself
      return {
        id: parsed.number,
        number: parsed.number,
        title: `${parsed.repo} #${parsed.number}`,
        html_url: url,
        state: 'open',
        repoName: `${parsed.owner}/${parsed.repo}`,
        isPullRequest: parsed.type === 'pull',
        author: parsed.owner,
      };
    }
    const data = await res.json();
    return {
      id: data.id,
      number: data.number,
      title: data.title,
      html_url: data.html_url,
      state: data.state,
      repoName: `${parsed.owner}/${parsed.repo}`,
      isPullRequest: Boolean(data.pull_request),
      author: data.user?.login || '',
    };
  } catch (err) {
    console.warn('Failed to fetch github details:', err);
    return {
      id: parsed.number,
      number: parsed.number,
      title: `${parsed.repo} #${parsed.number}`,
      html_url: url,
      state: 'open',
      repoName: `${parsed.owner}/${parsed.repo}`,
      isPullRequest: parsed.type === 'pull',
      author: parsed.owner,
    };
  }
}

/**
 * Search issues and PRs across repos or public search
 */
export async function searchGitHubIssuesAndPRs(
  query: string,
  repos: string[] = [],
  token?: string
): Promise<GitHubItem[]> {
  if (!query.trim()) return [];

  // Check if query is a direct URL
  if (query.includes('github.com/')) {
    const directItem = await fetchGitHubDetailsByUrl(query, token);
    return directItem ? [directItem] : [];
  }

  // Construct GitHub search query
  let searchQuery = query;
  if (repos.length > 0) {
    const repoQualifier = repos.map((r) => `repo:${r}`).join(' ');
    searchQuery = `${query} ${repoQualifier}`;
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (token) {
    headers.Authorization = `token ${token}`;
  }

  try {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(searchQuery)}&per_page=10`;
    const res = await fetch(url, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: any) => {
      // repo url is https://api.github.com/repos/owner/repo
      const repoParts = item.repository_url?.split('/') || [];
      const repoName = repoParts.length >= 2 ? `${repoParts[repoParts.length - 2]}/${repoParts[repoParts.length - 1]}` : '';
      return {
        id: item.id,
        number: item.number,
        title: item.title,
        html_url: item.html_url,
        state: item.state,
        repoName: repoName,
        isPullRequest: Boolean(item.pull_request),
        author: item.user?.login || '',
      };
    });
  } catch (err) {
    console.warn('GitHub search error:', err);
    return [];
  }
}
