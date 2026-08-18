import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Sheet } from '@/components/ui';
import type { SeasonId } from '@/types/book';
import { downloadVerseImage, generateVerseImage, isImageShareSupported, shareVerseImage } from '@/lib/verseImage';

export interface VerseImageSheetProps {
  open: boolean;
  onClose: () => void;
  scriptureText: string;
  scriptureRef: string;
  seasonId: SeasonId;
}

export function VerseImageSheet({ open, onClose, scriptureText, scriptureRef, seasonId }: VerseImageSheetProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const generatedRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<'idle' | 'busy'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setReady(false);
    setMessage(null);
    let cancelled = false;
    generateVerseImage(scriptureText, scriptureRef, seasonId).then((canvas) => {
      if (cancelled) return;
      generatedRef.current = canvas;
      const preview = canvasRef.current;
      if (preview) {
        preview.width = canvas.width;
        preview.height = canvas.height;
        preview.getContext('2d')?.drawImage(canvas, 0, 0);
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [open, scriptureText, scriptureRef, seasonId]);

  async function handleDownload() {
    if (!generatedRef.current) return;
    setStatus('busy');
    await downloadVerseImage(generatedRef.current, scriptureRef.replace(/[^a-z0-9]/gi, '-').toLowerCase());
    setStatus('idle');
    setMessage('Image downloaded.');
  }

  async function handleShare() {
    if (!generatedRef.current) return;
    setStatus('busy');
    try {
      const shared = await shareVerseImage(generatedRef.current, scriptureRef, scriptureText);
      setMessage(shared ? null : "Couldn't share — try downloading instead.");
    } catch {
      setMessage('Share failed — try downloading instead.');
    }
    setStatus('idle');
  }

  return (
    <Sheet open={open} onClose={onClose} title="Share as image">
      <div class="flex flex-col items-center gap-4">
        <div class="w-full overflow-hidden rounded-control bg-surface-2">
          <canvas ref={canvasRef} class="w-full" aria-label={`Verse image preview for ${scriptureRef}`} />
        </div>
        <div class="flex w-full gap-2">
          <Button class="flex-1" onClick={() => void handleDownload()} disabled={!ready || status === 'busy'}>
            Download
          </Button>
          {isImageShareSupported() && (
            <Button
              class="flex-1"
              variant="secondary"
              onClick={() => void handleShare()}
              disabled={!ready || status === 'busy'}
            >
              Share
            </Button>
          )}
        </div>
        {message && <p class="text-sm text-ink-3">{message}</p>}
      </div>
    </Sheet>
  );
}
