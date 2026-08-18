import { useEffect, useRef, useState } from 'preact/hooks';
import { Button } from '@/components/ui';
import { MicIcon, StopIcon, TrashIcon } from '@/components/icons';
import * as store from '@/store';
import type { AudioNoteRecord } from '@/types/store';
import {
  formatDuration,
  formatSize,
  getAudioDuration,
  isAudioRecordingSupported,
  MAX_DURATION_MS,
  startRecording,
  type RecordingSession,
} from '@/lib/audioRecording';

export interface AudioNoteRecorderProps {
  day: number;
}

type Phase = 'loading' | 'idle' | 'recording' | 'saving' | 'playback' | 'error';

/** Voice-note recorder/player for a single day, ported from the legacy
 * AudioNotes module. One note per day (store keyPath is 'day'), so
 * recording a new one always replaces whatever was there. */
export function AudioNoteRecorder({ day }: AudioNoteRecorderProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [note, setNote] = useState<AudioNoteRecord | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const sessionRef = useRef<RecordingSession | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    store.getAudioNote(day).then((existing) => {
      if (cancelled) return;
      setNote(existing ?? null);
      setPhase(existing ? 'playback' : 'idle');
    });
    return () => {
      cancelled = true;
      sessionRef.current?.cancel();
      sessionRef.current = null;
    };
  }, [day]);

  useEffect(() => {
    if (!note) {
      setPlaybackUrl(null);
      return;
    }
    const url = URL.createObjectURL(note.blob);
    setPlaybackUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [note]);

  async function handleRecord() {
    setErrorMessage('');
    try {
      sessionRef.current = await startRecording({
        onTick: (elapsed) => setElapsedMs(elapsed),
        onMaxDurationReached: () => setErrorMessage('Recording stopped — maximum length reached (5 minutes).'),
        onStopped: async (blob) => {
          sessionRef.current = null;
          setPhase('saving');
          const duration = await getAudioDuration(blob);
          await store.saveAudioNote({ day, blob, duration, size: blob.size });
          const saved = await store.getAudioNote(day);
          setNote(saved ?? null);
          setPhase(saved ? 'playback' : 'idle');
        },
        onCancelled: () => {
          sessionRef.current = null;
          setPhase('idle');
        },
        onError: (message) => {
          sessionRef.current = null;
          setErrorMessage(message);
          setPhase('error');
        },
      });
      setElapsedMs(0);
      setPhase('recording');
    } catch {
      setPhase('error');
    }
  }

  function handleStop() {
    sessionRef.current?.stop();
  }

  function handleCancel() {
    sessionRef.current?.cancel();
  }

  async function handleDelete() {
    if (!window.confirm('Delete this voice note? This cannot be undone.')) return;
    await store.deleteAudioNote(day);
    setNote(null);
    setPhase('idle');
  }

  async function handleReRecord() {
    if (!window.confirm('Recording a new voice note will replace the current one. Continue?')) return;
    await store.deleteAudioNote(day);
    setNote(null);
    setPhase('idle');
    void handleRecord();
  }

  if (!isAudioRecordingSupported()) {
    return <p class="text-sm text-ink-3">Voice notes aren't supported in this browser.</p>;
  }

  if (phase === 'loading' || phase === 'saving') {
    return <p class="text-sm text-ink-3">{phase === 'saving' ? 'Saving voice note…' : 'Loading…'}</p>;
  }

  if (phase === 'recording') {
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const remainingSeconds = Math.max(0, Math.floor((MAX_DURATION_MS - elapsedMs) / 1000));
    const progress = Math.min(100, (elapsedMs / MAX_DURATION_MS) * 100);
    return (
      <div class="flex flex-col gap-3 rounded-control border border-line bg-surface-2 p-4">
        <div class="flex items-center gap-2 text-sm font-semibold text-danger">
          <span class="h-2.5 w-2.5 animate-pulse rounded-full bg-danger" aria-hidden="true" />
          Recording {formatDuration(elapsedSeconds)}
        </div>
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-line">
          <div class="h-full bg-danger transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <p class="text-xs text-ink-3">{formatDuration(remainingSeconds)} remaining</p>
        <div class="flex gap-2">
          <Button variant="secondary" size="sm" onClick={handleCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleStop}>
            <StopIcon class="h-4 w-4" />
            Stop &amp; save
          </Button>
        </div>
      </div>
    );
  }

  if (phase === 'playback' && note && playbackUrl) {
    const createdDate = new Date(note.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return (
      <div class="flex flex-col gap-3 rounded-control border border-line bg-surface-2 p-4">
        <audio controls src={playbackUrl} aria-label="Voice note playback" class="w-full" />
        <p class="text-xs text-ink-3">
          {formatDuration(note.duration)} · {formatSize(note.size)} · {createdDate}
        </p>
        <div class="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => void handleReRecord()}>
            <MicIcon class="h-4 w-4" />
            Re-record
          </Button>
          <Button variant="ghost" size="sm" onClick={() => void handleDelete()} class="!text-danger">
            <TrashIcon class="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div class="flex flex-col gap-2">
      <Button variant="secondary" onClick={() => void handleRecord()}>
        <MicIcon class="h-4 w-4" />
        Record a voice note
      </Button>
      {errorMessage && <p class="text-sm text-danger-deep">{errorMessage}</p>}
    </div>
  );
}
