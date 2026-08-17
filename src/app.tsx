import { AppShell } from '@/app-shell/AppShell';
import { Card } from '@/components/ui';
import { currentRoute } from '@/router/router';
import { ROUTE_TITLES } from '@/app-shell/nav';
import { IntroPage } from '@/pages/IntroPage';
import { QuizPage } from '@/pages/QuizPage';
import { HomePage } from '@/pages/HomePage';
import { ReadPage } from '@/pages/ReadPage';
import { ContentsPage } from '@/pages/ContentsPage';

/** Route bodies for the remaining destinations land in tasks #21-24
 * (src/pages/*); this placeholder just proves routing + the shell work
 * together in the meantime. */
function RoutePlaceholder() {
  const route = currentRoute.value;
  return (
    <div class="p-5">
      <Card padding="lg">
        <p class="font-serif text-lg text-ink">{ROUTE_TITLES[route.name]}</p>
        <p class="mt-1 text-sm text-ink-3">This page is built next.</p>
      </Card>
    </div>
  );
}

export function App() {
  const route = currentRoute.value;

  // Onboarding (intro + quiz) renders full-screen, without the persistent
  // nav chrome — same reasoning as most app first-run flows: don't let
  // someone navigate away mid-onboarding via a nav they haven't seen yet.
  if (route.name === 'intro') return <IntroPage />;
  if (route.name === 'quiz') return <QuizPage />;

  let body = <RoutePlaceholder />;
  if (route.name === 'home') body = <HomePage />;
  if (route.name === 'read') body = <ReadPage key={route.params.param ?? 'current'} />;
  if (route.name === 'contents') body = <ContentsPage />;

  return <AppShell>{body}</AppShell>;
}
