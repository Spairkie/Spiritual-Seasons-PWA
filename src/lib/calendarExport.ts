import { loadBookData } from '@/content/content';

function formatICSDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

interface EventInput {
  uid: string;
  summary: string;
  description: string;
  startDate: Date;
  durationMinutes: number;
  location: string;
  category: string;
}

function createEvent({ uid, summary, description, startDate, durationMinutes, location, category }: EventInput): string {
  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@spiritualseasons.app`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(startDate)}`,
    `DTEND:${formatICSDate(endDate)}`,
    `SUMMARY:${escapeICSText(summary)}`,
    `DESCRIPTION:${escapeICSText(description)}`,
    `LOCATION:${escapeICSText(location)}`,
    `CATEGORIES:${escapeICSText(category)}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeICSText(summary)}`,
    'END:VALARM',
    'END:VEVENT',
  ].join('\r\n');
}

/** One event per devotional day, starting at `startDate` (which already
 * carries the desired time-of-day) and stepping forward a day at a time —
 * ported from legacy/js/modules/calendar-integration.js. */
export async function generateICS(startDate: Date): Promise<string> {
  const book = await loadBookData();
  const uidPrefix = `spiritual-seasons-${Date.now()}`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spiritual Seasons//Devotional Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Spiritual Seasons Devotional',
    'X-WR-CALDESC:120-day devotional journey through the spiritual seasons',
  ];

  let dayNumber = 1;
  for (const season of book.seasons) {
    const seasonName = season.title.split(' — ')[0] ?? season.title;
    for (const day of season.days) {
      const eventDate = new Date(startDate);
      eventDate.setDate(eventDate.getDate() + (dayNumber - 1));

      lines.push(
        createEvent({
          uid: `${uidPrefix}-day-${dayNumber}`,
          summary: `Day ${dayNumber}: ${day.scriptureRef}`,
          description: `${day.scriptureText}\n\n${day.prompt}`,
          startDate: eventDate,
          durationMinutes: 30,
          location: 'Spiritual Seasons App',
          category: seasonName,
        })
      );
      dayNumber++;
    }
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(icsContent: string, filename = 'spiritual-seasons-devotional'): void {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportDevotionalCalendar(startDate: Date): Promise<{ success: boolean; message: string }> {
  try {
    const icsContent = await generateICS(startDate);
    downloadICS(icsContent);
    return { success: true, message: 'Calendar file downloaded — open it to add all 120 days.' };
  } catch {
    return { success: false, message: 'Failed to export calendar.' };
  }
}
