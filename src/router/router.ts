/** Minimal typed hash router. Hash-based on purpose (per master plan §10,
 * decision 4): works unmodified on any static host with zero server
 * rewrite rules, matching the legacy app's URL scheme closely enough that
 * old bookmarks/links still resolve to something sensible. */

import { signal } from '@preact/signals';

export const ROUTE_NAMES = [
  'home',
  'quiz',
  'intro',
  'read',
  'contents',
  'progress',
  'settings',
] as const;

export type RouteName = (typeof ROUTE_NAMES)[number];

export interface Route {
  name: RouteName;
  params: Record<string, string>;
}

const DEFAULT_ROUTE: Route = { name: 'home', params: {} };

function isRouteName(value: string): value is RouteName {
  return (ROUTE_NAMES as readonly string[]).includes(value);
}

export function parseHash(hash: string): Route {
  const clean = hash.replace(/^#\/?/, '');
  const [pathPart = '', queryPart = ''] = clean.split('?');
  const segments = pathPart.split('/').filter(Boolean);
  const rawName = segments[0] ?? 'home';
  const name = isRouteName(rawName) ? rawName : 'home';

  const params: Record<string, string> = {};
  if (segments[1]) params.param = segments[1];

  for (const pair of queryPart.split('&')) {
    if (!pair) continue;
    const [key, value = ''] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value);
  }

  return { name, params };
}

function serializeRoute(name: RouteName, params: Record<string, string | number> = {}): string {
  let hash = `#${name}`;
  const { param, ...rest } = params as Record<string, string | number | undefined>;
  if (param !== undefined) hash += `/${param}`;

  const query = Object.entries(rest)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  if (query) hash += `?${query}`;

  return hash;
}

export const currentRoute = signal<Route>(
  typeof location !== 'undefined' ? parseHash(location.hash) : DEFAULT_ROUTE
);

if (typeof window !== 'undefined') {
  window.addEventListener('hashchange', () => {
    currentRoute.value = parseHash(location.hash);
  });
}

export function navigate(name: RouteName, params: Record<string, string | number> = {}): void {
  const hash = serializeRoute(name, params);
  // Update the signal synchronously — don't rely solely on the 'hashchange'
  // event, since browsers (and jsdom) dispatch it as a queued task, not
  // synchronously, and never at all when the hash string doesn't change
  // (e.g. re-navigating to the same devotional day from a different entry
  // point still needs to notify listeners).
  currentRoute.value = parseHash(hash);
  if (location.hash !== hash) {
    location.hash = hash;
  }
}
