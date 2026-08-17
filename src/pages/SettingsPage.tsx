import { useRef, useState } from 'preact/hooks';
import { Button, Card, ListRow, Sheet, Toggle } from '@/components/ui';
import { navigate } from '@/router/router';
import * as store from '@/store';
import { settingsSignal, updateSetting } from '@/state/settings';
import type { Settings } from '@/types/store';

type OptionKey = 'darkMode' | 'seasonTheme' | 'fontSize' | 'lineSpacing';

const OPTIONS: Record<OptionKey, { label: string; sheetTitle: string; choices: Array<{ value: string; label: string }> }> = {
  darkMode: {
    label: 'Appearance',
    sheetTitle: 'Appearance',
    choices: [
      { value: 'light', label: 'Light' },
      { value: 'dark', label: 'Dark' },
      { value: 'system', label: 'Match system' },
    ],
  },
  seasonTheme: {
    label: 'Season colour',
    sheetTitle: 'Season colour',
    choices: [
      { value: 'auto', label: 'Follow my current season' },
      { value: 'winter', label: 'Winter' },
      { value: 'spring', label: 'Spring' },
      { value: 'summer', label: 'Summer' },
      { value: 'autumn', label: 'Autumn' },
    ],
  },
  fontSize: {
    label: 'Text size',
    sheetTitle: 'Text size',
    choices: [
      { value: 'small', label: 'Small' },
      { value: 'medium', label: 'Medium' },
      { value: 'large', label: 'Large' },
      { value: 'extra-large', label: 'Extra large' },
    ],
  },
  lineSpacing: {
    label: 'Line spacing',
    sheetTitle: 'Line spacing',
    choices: [
      { value: 'compact', label: 'Compact' },
      { value: 'normal', label: 'Normal' },
      { value: 'relaxed', label: 'Relaxed' },
      { value: 'loose', label: 'Loose' },
    ],
  },
};

export function SettingsPage() {
  const settings = settingsSignal.value;
  const [openSheet, setOpenSheet] = useState<OptionKey | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!settings) {
    return (
      <div class="p-5">
        <p class="text-ink-3">Loading…</p>
      </div>
    );
  }

  function currentLabel(key: OptionKey) {
    const value = settings![key];
    return OPTIONS[key].choices.find((c) => c.value === value)?.label ?? '';
  }

  async function exportData() {
    const data = await store.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spiritual-seasons-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importData(file: File) {
    setImportMessage(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await store.importData(data);
      setImportMessage(result.message);
    } catch {
      setImportMessage('Import failed: the file is not valid JSON.');
    }
  }

  async function resetAllData() {
    if (!window.confirm('This permanently deletes all your journal entries, progress, and settings. This cannot be undone.')) {
      return;
    }
    await store.resetAllData();
    window.location.reload();
  }

  return (
    <div class="p-5">
      <div class="mx-auto flex max-w-2xl flex-col gap-6">
        <section>
          <h2 class="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-3">Appearance</h2>
          <Card padding="none">
            <ListRow title="Appearance" subtitle={currentLabel('darkMode')} onClick={() => setOpenSheet('darkMode')} />
            <ListRow title="Season colour" subtitle={currentLabel('seasonTheme')} onClick={() => setOpenSheet('seasonTheme')} />
            <ListRow title="Text size" subtitle={currentLabel('fontSize')} onClick={() => setOpenSheet('fontSize')} />
            <ListRow title="Line spacing" subtitle={currentLabel('lineSpacing')} onClick={() => setOpenSheet('lineSpacing')} />
          </Card>
        </section>

        <section>
          <h2 class="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-3">Journaling</h2>
          <Card padding="none">
            <ListRow
              title="Autosave journal entries"
              subtitle="Save as you type, without a Save button"
              trailing={
                <Toggle
                  checked={settings.autoSave}
                  onChange={(v) => void updateSetting('autoSave', v)}
                  label="Autosave journal entries"
                />
              }
            />
            <ListRow
              title="Keyboard shortcuts"
              subtitle="Navigate with arrow keys and shortcuts"
              trailing={
                <Toggle
                  checked={settings.keyboardShortcuts}
                  onChange={(v) => void updateSetting('keyboardShortcuts', v)}
                  label="Keyboard shortcuts"
                />
              }
            />
          </Card>
        </section>

        <section>
          <h2 class="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-3">Reminders</h2>
          <Card padding="none">
            <ListRow
              title="Daily reminder"
              subtitle="A gentle nudge to read each day"
              trailing={
                <Toggle
                  checked={settings.notificationsEnabled}
                  onChange={(v) => void updateSetting('notificationsEnabled', v)}
                  label="Daily reminder"
                />
              }
            />
            {settings.notificationsEnabled && (
              <ListRow
                title="Reminder time"
                trailing={
                  <input
                    type="time"
                    value={settings.reminderTime}
                    onChange={(e) => void updateSetting('reminderTime', (e.target as HTMLInputElement).value)}
                    class="rounded-control border border-line bg-paper px-2 py-1 text-sm text-ink"
                  />
                }
              />
            )}
          </Card>
        </section>

        <section>
          <h2 class="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-3">Your journey</h2>
          <Card padding="none">
            <ListRow title="Retake the season quiz" onClick={() => navigate('quiz')} />
            <ListRow title="View the introduction" onClick={() => navigate('intro')} />
          </Card>
        </section>

        <section>
          <h2 class="mb-2 px-1 text-sm font-semibold uppercase tracking-wide text-ink-3">Data &amp; privacy</h2>
          <Card padding="lg">
            <div class="flex flex-col gap-2 text-sm text-ink-2">
              <p>✓ All your data is stored locally on this device</p>
              <p>✓ Nothing is sent to any server — this app works fully offline</p>
              <p>✓ Your journal entries stay completely private</p>
              <p>✓ You can export or delete your data at any time</p>
            </div>

            <div class="mt-5 flex flex-col gap-2">
              <Button variant="secondary" onClick={() => void exportData()}>
                Export my data
              </Button>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Import data
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                class="hidden"
                onChange={(e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) void importData(file);
                }}
              />
              {importMessage && <p class="text-sm text-ink-3">{importMessage}</p>}
            </div>

            <div class="mt-5 border-t border-line pt-5">
              <Button variant="danger" onClick={() => void resetAllData()}>
                Delete all my data
              </Button>
            </div>
          </Card>
        </section>
      </div>

      {(Object.keys(OPTIONS) as OptionKey[]).map((key) => (
        <Sheet key={key} open={openSheet === key} onClose={() => setOpenSheet(null)} title={OPTIONS[key].sheetTitle}>
          <div class="flex flex-col gap-1">
            {OPTIONS[key].choices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                onClick={() => {
                  void updateSetting(key, choice.value as Settings[OptionKey]);
                  setOpenSheet(null);
                }}
                class={[
                  'flex items-center justify-between rounded-control px-3 py-2.5 text-left text-[15px]',
                  settings![key] === choice.value ? 'bg-tint font-semibold text-accent-deep' : 'text-ink hover:bg-surface-2',
                ].join(' ')}
              >
                {choice.label}
              </button>
            ))}
          </div>
        </Sheet>
      ))}
    </div>
  );
}
