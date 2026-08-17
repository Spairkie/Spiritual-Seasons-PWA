import { getSeasonIdForDay } from '@/content/content';
import type { Settings } from '@/types/store';

/** Applies the user's dark-mode and season choices to the document root as
 * data-theme/data-season attributes, matching the three-way CSS pattern in
 * src/styles/main.css (system => no attribute, explicit => attribute wins). */
export function applyTheme(settings: Settings, currentDay: number): void {
  const root = document.documentElement;

  if (settings.darkMode === 'system') {
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', settings.darkMode);
  }

  const season = settings.seasonTheme === 'auto' ? getSeasonIdForDay(currentDay) : settings.seasonTheme;
  root.setAttribute('data-season', season);
}
