import { Button, Card } from '@/components/ui';
import { useContent } from '@/content/content';
import { navigate } from '@/router/router';
import * as store from '@/store';

export function IntroPage() {
  const { book, error } = useContent();

  if (error) {
    return (
      <div class="p-5">
        <Card padding="lg">
          <p class="text-danger-deep">Couldn't load the introduction. Please try again.</p>
        </Card>
      </div>
    );
  }

  if (!book) {
    return (
      <div class="p-5">
        <p class="text-ink-3">Loading…</p>
      </div>
    );
  }

  async function skipToApp() {
    await store.saveSetting('onboardingCompleted', true);
    navigate('home');
  }

  const { introduction, howToUse } = book.frontMatter;

  return (
    <div class="mx-auto max-w-lg p-5">
      <Card padding="lg">
        <p class="text-sm font-semibold uppercase tracking-wide text-accent-deep">{book.author}</p>
        <h2 class="mt-1 font-serif text-2xl font-semibold text-ink">{book.title}</h2>
        <p class="mt-1 text-ink-3">{book.subtitle}</p>

        <p class="mt-5 text-ink-2">{introduction.text}</p>

        <blockquote class="mt-5 border-l-2 border-accent pl-4">
          <p class="font-serif italic text-ink-2">“{introduction.scripture.text}”</p>
          <cite class="mt-1 block text-sm not-italic text-ink-3">{introduction.scripture.reference}</cite>
        </blockquote>

        <p class="mt-5 text-ink-2">{introduction.purpose}</p>

        <h3 class="mt-6 font-serif text-lg font-semibold text-ink">How to use this devotional</h3>
        <ol class="mt-2 flex flex-col gap-2">
          {howToUse.steps.map((step, i) => (
            <li key={i} class="flex gap-3 text-ink-2">
              <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-tint text-xs font-semibold text-accent-deep">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        <Button class="mt-7" fullWidth onClick={() => navigate('quiz')}>
          Find my season
        </Button>
        <button
          type="button"
          onClick={() => void skipToApp()}
          class="mt-3 w-full text-center text-sm font-semibold text-ink-3 hover:text-ink-2"
        >
          I already know my season — skip
        </button>
      </Card>
    </div>
  );
}
