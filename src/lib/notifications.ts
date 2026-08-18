import { getDayEntry, getSeasonForDay, loadBookData } from '@/content/content';
import * as store from '@/store';

export function isNotificationSupported(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return isNotificationSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  return Notification.requestPermission();
}

/** Shows the day's reminder via the service worker registration rather than
 * `new Notification()` — the latter throws on Android Chrome, which only
 * allows showing notifications through an active SW registration. */
async function showNotification(title: string, body: string, day: number): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body,
    icon: '/assets/icons/icon-192.png',
    badge: '/assets/icons/icon-72.png',
    tag: 'daily-devotional',
    data: { day },
  });
}

export async function showDailyReminder(): Promise<void> {
  if (notificationPermission() !== 'granted') return;

  const day = (await store.getCurrentDay()) || 1;
  const book = await loadBookData();
  const season = getSeasonForDay(book, day);
  const entry = getDayEntry(book, day);
  const progress = await store.getDayProgress(day);
  const isCompleted = !!progress?.completed;

  const title = isCompleted ? `Day ${day} complete` : `Day ${day} — ${season.title.split(' — ')[0]}`;
  const body = isCompleted
    ? "Great job! Ready for tomorrow's devotion?"
    : entry.prompt.length > 100
      ? `${entry.prompt.slice(0, 100)}…`
      : entry.prompt;

  await showNotification(title, body, day);
}

/** Computes the delay in ms until the next occurrence of `HH:MM` local time
 * (today if it hasn't passed yet, otherwise tomorrow). */
export function msUntilNext(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hours ?? 9, minutes ?? 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}
