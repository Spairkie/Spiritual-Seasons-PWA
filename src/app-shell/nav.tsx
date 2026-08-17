import type { ComponentType } from 'preact';
import { ContentsIcon, HomeIcon, ProgressIcon, ReadIcon, SettingsIcon } from '@/components/icons';
import type { RouteName } from '@/router/router';

export interface NavEntry {
  route: Extract<RouteName, 'home' | 'read' | 'contents' | 'progress' | 'settings'>;
  label: string;
  icon: ComponentType<{ class?: string }>;
}

/** Quiz and intro are entry-point flows (onboarding, retaking the quiz from
 * Settings), not persistent nav destinations — matches the legacy app and
 * master plan's IA (favourites folded into Contents as a filter, so it
 * doesn't get its own nav slot either). */
export const NAV_ENTRIES: NavEntry[] = [
  { route: 'home', label: 'Home', icon: HomeIcon },
  { route: 'read', label: 'Read', icon: ReadIcon },
  { route: 'contents', label: 'Contents', icon: ContentsIcon },
  { route: 'progress', label: 'Progress', icon: ProgressIcon },
  { route: 'settings', label: 'Settings', icon: SettingsIcon },
];

export const ROUTE_TITLES: Record<RouteName, string> = {
  home: 'Home',
  read: 'Read',
  contents: 'Contents',
  progress: 'Progress',
  settings: 'Settings',
  quiz: 'Find Your Season',
  intro: 'Welcome',
};
