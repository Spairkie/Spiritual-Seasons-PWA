import { useState } from 'preact/hooks';
import { Button, Sheet } from '@/components/ui';
import { getReflectionQuestions } from '@/content/weeklyReflectionQuestions';
import * as store from '@/store';

export interface WeeklyReflectionSheetProps {
  week: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function WeeklyReflectionSheet({ week, open, onClose, onSaved }: WeeklyReflectionSheetProps) {
  const questions = getReflectionQuestions(week);
  const [responses, setResponses] = useState<string[]>(() => questions.map(() => ''));
  const [saving, setSaving] = useState(false);

  function setResponse(index: number, value: string) {
    setResponses((prev) => prev.map((r, i) => (i === index ? value : r)));
  }

  async function save() {
    if (!responses.some((r) => r.trim().length > 0)) return;
    setSaving(true);
    await store.saveWeeklyReflection({ week, questions, responses });
    setSaving(false);
    onSaved();
  }

  const hasContent = responses.some((r) => r.trim().length > 0);

  return (
    <Sheet open={open} onClose={onClose} title={`Week ${week} reflection`}>
      <p class="text-ink-2">
        You've completed a week of devotions. Take a moment to reflect on your journey.
      </p>
      <div class="mt-4 flex flex-col gap-4">
        {questions.map((question, index) => (
          <div key={index}>
            <label class="mb-1.5 block text-sm font-medium text-ink" for={`reflection-${index}`}>
              {question}
            </label>
            <textarea
              id={`reflection-${index}`}
              value={responses[index]}
              onInput={(e) => setResponse(index, (e.target as HTMLTextAreaElement).value)}
              rows={3}
              placeholder="Reflect on this question…"
              class="w-full resize-none rounded-control border border-line bg-paper p-3 text-[15px] text-ink outline-none focus-visible:border-accent"
            />
          </div>
        ))}
      </div>
      <div class="mt-5 flex gap-3">
        <Button class="flex-1" onClick={() => void save()} disabled={!hasContent || saving}>
          Save reflection
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Skip for now
        </Button>
      </div>
    </Sheet>
  );
}
