import { useEffect } from 'preact/hooks';
import { settingsSignal } from '@/state/settings';
import { msUntilNext, notificationPermission, showDailyReminder } from '@/lib/notifications';

/** Schedules the daily reminder while the app is open, matching the legacy
 * app's actual mechanism (legacy/js/modules/notifications.js) — there's no
 * server to push from, so this is a best-effort setTimeout that only fires
 * if a tab happens to be open around the reminder time, re-arming itself
 * for the following day each time it fires. */
export function useDailyReminder(): void {
  const settings = settingsSignal.value;
  const enabled = settings?.notificationsEnabled ?? false;
  const reminderTime = settings?.reminderTime ?? '09:00';

  useEffect(() => {
    if (!enabled || notificationPermission() !== 'granted') return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    function schedule() {
      timer = setTimeout(async () => {
        await showDailyReminder();
        schedule();
      }, msUntilNext(reminderTime));
    }

    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [enabled, reminderTime]);
}
