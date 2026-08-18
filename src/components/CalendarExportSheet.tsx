import { useState } from 'preact/hooks';
import { Button, Sheet } from '@/components/ui';
import { exportDevotionalCalendar } from '@/lib/calendarExport';

export interface CalendarExportSheetProps {
  open: boolean;
  onClose: () => void;
}

function defaultStartDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().slice(0, 10);
}

export function CalendarExportSheet({ open, onClose }: CalendarExportSheetProps) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [time, setTime] = useState('08:00');
  const [status, setStatus] = useState<'idle' | 'exporting'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    if (!startDate || !time) {
      setMessage('Please choose both a start date and a daily time.');
      return;
    }
    setStatus('exporting');
    setMessage(null);
    const [hours, minutes] = time.split(':').map(Number);
    const start = new Date(`${startDate}T00:00:00`);
    start.setHours(hours ?? 8, minutes ?? 0, 0, 0);
    const result = await exportDevotionalCalendar(start);
    setStatus('idle');
    setMessage(result.message);
  }

  return (
    <Sheet open={open} onClose={onClose} title="Export to calendar">
      <div class="flex flex-col gap-4">
        <p class="text-sm text-ink-2">
          Export all 120 devotional days to your calendar app, one event per day with a 15-minute reminder,
          starting from the date below.
        </p>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold text-ink">Start date</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate((e.target as HTMLInputElement).value)}
            class="rounded-control border border-line bg-paper px-3 py-2 text-[15px] text-ink"
          />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-sm font-semibold text-ink">Daily time</span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime((e.target as HTMLInputElement).value)}
            class="rounded-control border border-line bg-paper px-3 py-2 text-[15px] text-ink"
          />
        </label>

        <Button onClick={() => void handleExport()} disabled={status === 'exporting'}>
          {status === 'exporting' ? 'Exporting…' : 'Export calendar'}
        </Button>
        {message && <p class="text-sm text-ink-3">{message}</p>}
      </div>
    </Sheet>
  );
}
