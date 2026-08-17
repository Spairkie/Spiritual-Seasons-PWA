import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { currentRoute, navigate } from '@/router/router';
import { settingsSignal, initSettings } from '@/state/settings';
import { applyTheme } from '@/state/theme';
import * as store from '@/store';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { ROUTE_TITLES } from './nav';

export interface AppShellProps {
  children: ComponentChildren;
}

export function AppShell({ children }: AppShellProps) {
  const [streak, setStreak] = useState(0);
  const [currentDay, setCurrentDay] = useState(1);
  // settingsSignal is a module-level singleton that outlives any one mount —
  // it can still hold a stale snapshot from a previous AppShell mount (e.g.
  // the pre-onboarding redirect at boot) on the very first render of a new
  // mount, before this mount's own fetch below has had a chance to refresh
  // it. Gating the onboarding check on a mount-local "loaded" flag, instead
  // of trusting settings-is-non-null, is what prevents that stale read from
  // firing a bogus redirect back to onboarding right after finishing it.
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Top-level signal reads — this is what makes AppShell re-render when the
  // route or settings change (@preact/signals subscribes whatever a
  // component reads .value from during its own render).
  const route = currentRoute.value;
  const settings = settingsSignal.value;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await store.init();
      await initSettings();
      const [streakData, day] = await Promise.all([store.getStreak(), store.getCurrentDay()]);
      if (!cancelled) {
        setStreak(streakData.current);
        setCurrentDay(day);
        setSettingsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (settings) applyTheme(settings, currentDay);
  }, [settings, currentDay]);

  useEffect(() => {
    // AppShell only renders for the 5 main destinations (intro/quiz render
    // full-screen, see app.tsx) — reaching here with onboarding incomplete
    // means this is a first launch that landed on a direct/default route.
    if (settingsLoaded && settings && !settings.onboardingCompleted) navigate('intro');
  }, [settingsLoaded, settings]);

  const title = ROUTE_TITLES[route.name];

  return (
    <div class="min-h-screen bg-paper">
      <Sidebar active={route.name} streak={streak} />
      <div class="md:pl-sidebar">
        <Header title={title} streak={streak} />
        <main
          class={[
            'min-h-[calc(100dvh-var(--spacing-header))]',
            'pb-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom))] md:pb-0',
          ].join(' ')}
        >
          {children}
        </main>
      </div>
      <BottomNav active={route.name} />
    </div>
  );
}
