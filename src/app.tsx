import { AppShell } from '@/app-shell/AppShell';
import { Card } from '@/components/ui';
import { currentRoute } from '@/router/router';
import { ROUTE_TITLES } from '@/app-shell/nav';

/** Route bodies land in tasks #19-24 (src/pages/*); this placeholder just
 * proves routing + the shell work together end to end in the meantime. */
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
  return (
    <AppShell>
      <RoutePlaceholder />
    </AppShell>
  );
}
