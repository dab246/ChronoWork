import { useCallback, useEffect, useState } from 'react';

/**
 * Hash routes (#/daily, #/settings/reminder…): they work on any static host,
 * GitHub Pages included, with deep links and the browser's Back button.
 */

export const TABS = ['daily', 'report', 'timesheet', 'calendar', 'performance'] as const;
export type ActiveTab = (typeof TABS)[number];

export const SETTINGS_SECTIONS = ['profile', 'work', 'reminder', 'language', 'report', 'github', 'data'] as const;
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number];

export type Route = { page: ActiveTab } | { page: 'settings'; section: SettingsSectionId };

export const DEFAULT_ROUTE: Route = { page: 'daily' };

const isOneOf = <T extends string>(values: readonly T[], value: string | undefined): value is T => values.includes(value as T);

/** Route of a location hash; anything unknown falls back to the daily log. */
export function parseRoute(hash: string): Route {
  const [page, section] = hash.replace(/^#\/?/, '').split('/');
  if (isOneOf(TABS, page)) return { page };
  if (page === 'settings') return { page, section: isOneOf(SETTINGS_SECTIONS, section) ? section : SETTINGS_SECTIONS[0] };
  return DEFAULT_ROUTE;
}

export function routeHash(route: Route): string {
  return route.page === 'settings' ? `#/settings/${route.section}` : `#/${route.page}`;
}

/** Current route, following the location hash. */
export function useHashRoute(): [Route, (route: Route) => void] {
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    const onChange = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Route) => {
    const hash = routeHash(next);
    if (window.location.hash !== hash) window.location.hash = hash;
    setRoute(next);
  }, []);

  return [route, navigate];
}
