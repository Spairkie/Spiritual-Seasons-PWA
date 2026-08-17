import { useEffect, useState } from 'preact/hooks';
import * as store from '@/store';

/** Scaffold placeholder — replaced by the real router + app shell
 * (tasks #16-18). Verifies the build pipeline and store layer boot
 * together before the actual UI is built on top. */
export function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    store.init().then(() => setReady(true));
  }, []);

  return (
    <div class="flex min-h-screen items-center justify-center bg-paper font-sans text-ink">
      <p class="font-serif text-2xl">
        Spiritual Seasons — rebuild scaffold {ready ? 'ready' : 'initializing…'}
      </p>
    </div>
  );
}
