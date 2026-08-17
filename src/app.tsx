import { useState } from 'preact/hooks';
import {
  Badge,
  Button,
  Card,
  ListRow,
  NavItem,
  ProgressRing,
  Sheet,
  Toggle,
} from '@/components/ui';

/** Temporary component showcase — visually verifies the UI primitives
 * (tokens, radii, shadows, focus states, the sheet's animation/focus trap)
 * before the real app shell (task #18) replaces this file. */
export function App() {
  const [toggled, setToggled] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('home');

  return (
    <div class="min-h-screen bg-paper p-6 font-sans text-ink" data-season="winter">
      <h1 class="mb-6 font-serif text-3xl font-semibold">Spiritual Seasons — UI primitives</h1>

      <div class="mb-6 flex flex-wrap gap-3">
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        <Button variant="primary" disabled>
          Disabled
        </Button>
        <Button variant="primary" size="sm">
          Small
        </Button>
      </div>

      <div class="mb-6 flex flex-wrap gap-3">
        <Badge variant="accent">Winter</Badge>
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="danger">Danger</Badge>
      </div>

      <Card class="mb-6 max-w-sm">
        <ListRow title="Bible translation" subtitle="NLT" onClick={() => setSheetOpen(true)} />
        <ListRow
          title="Notifications"
          trailing={<Toggle checked={toggled} onChange={setToggled} label="Notifications" />}
        />
      </Card>

      <div class="mb-6 flex items-center gap-4">
        <ProgressRing percent={62} label="Journey progress">
          <span class="font-serif text-lg font-semibold">62%</span>
        </ProgressRing>
      </div>

      <div class="mb-6 flex max-w-xs rounded-panel border border-line bg-surface p-2">
        <NavItem
          icon={<span>🏠</span>}
          label="Home"
          active={activeNav === 'home'}
          onClick={() => setActiveNav('home')}
        />
        <NavItem
          icon={<span>📖</span>}
          label="Read"
          active={activeNav === 'read'}
          onClick={() => setActiveNav('read')}
        />
      </div>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Bible translation">
        <p class="text-ink-2">Sheet content and focus trap check.</p>
        <Button class="mt-4" onClick={() => setSheetOpen(false)}>
          Close
        </Button>
      </Sheet>
    </div>
  );
}
