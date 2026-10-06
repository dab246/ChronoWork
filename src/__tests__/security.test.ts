import { describe, expect, it } from 'vitest';
import { csvCell, escapeHtml, neutralizeSpreadsheetCell, safeUrl, tsvCell } from '../utils/security';
import { parseGitHubUrl } from '../services/githubService';

describe('escapeHtml', () => {
  it('escapes markup characters', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    expect(escapeHtml("a & 'b'")).toBe('a &amp; &#39;b&#39;');
  });
});

describe('safeUrl', () => {
  it('keeps http(s) links', () => {
    expect(safeUrl('https://github.com/org/repo/pull/1')).toBe('https://github.com/org/repo/pull/1');
    expect(safeUrl(' http://example.com ')).toBe('http://example.com/');
  });

  it.each(['javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,<script>', 'vbscript:x', '/relative', '', 42, null])(
    'rejects %s',
    (value) => {
      expect(safeUrl(value)).toBeUndefined();
    }
  );
});

describe('spreadsheet formula injection', () => {
  it.each(['=HYPERLINK("http://evil")', '@SUM(A1)', '+cmd|calc', '-2+3+cmd', '\t=1'])('neutralizes %s', (value) => {
    expect(neutralizeSpreadsheetCell(value).startsWith("'")).toBe(true);
  });

  it('leaves plain text and numbers alone', () => {
    expect(neutralizeSpreadsheetCell('Fix login')).toBe('Fix login');
    expect(neutralizeSpreadsheetCell('-10')).toBe('-10');
    expect(neutralizeSpreadsheetCell('+5.5%')).toBe('+5.5%');
  });

  it('quotes CSV cells and flattens TSV cells', () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(tsvCell('a\tb\nc')).toBe('a b c');
  });
});

describe('parseGitHubUrl', () => {
  it('parses issue and PR URLs', () => {
    expect(parseGitHubUrl('https://github.com/org/repo/pull/42')).toEqual({ owner: 'org', repo: 'repo', type: 'pull', number: 42 });
    expect(parseGitHubUrl('https://www.github.com/org/my.repo/issues/7#comment')).toEqual({ owner: 'org', repo: 'my.repo', type: 'issues', number: 7 });
  });

  it.each([
    'https://evilgithub.com/org/repo/pull/1',
    'https://github.com.evil.com/org/repo/pull/1',
    'http://github.com/org/repo/pull/1',
    'https://github.com/../../user/pull/1',
    'https://github.com/org/repo/pull/abc',
    'https://github.com/or%2Fg/repo/pull/1',
    'not a url',
  ])('rejects %s', (url) => {
    expect(parseGitHubUrl(url)).toBeNull();
  });
});
