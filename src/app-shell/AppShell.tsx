import { useEffect, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { currentRoute } from '@/router/router';
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
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (settings) applyTheme(settings, currentDay);
  }, [settings, currentDay]);

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
