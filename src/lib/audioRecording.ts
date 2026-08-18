/** Matches legacy AudioNotes module's limits exactly (audio.js). */
export const MAX_DURATION_MS = 300_000; // 5 minutes
export const MAX_SIZE_MB = 10;

export function isAudioRecordingSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof MediaRecorder !== 'undefined'
  );
}

function pickMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4', 'audio/webm'];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? 'audio/webm';
}

/** Reads duration off a hidden <audio> element rather than trusting any
 * recorder-reported value — the only reliable way to get it from a Blob.
 * Chrome's MediaRecorder writes WebM without a duration in the header, so
 * loadedmetadata alone reports Infinity; seeking past the end forces
 * Chrome to compute the real duration from the index, a workaround for a
 * long-standing Chromium bug (crbug.com/642012) affecting any WebM blob
 * recorded this way, not just this app. */
export function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);

    function finish(duration: number) {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) ? duration : 0);
    }

    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) {
        finish(audio.duration);
        return;
      }
      audio.currentTime = Number.MAX_SAFE_INTEGER;
      audio.ontimeupdate = () => {
        audio.ontimeupdate = null;
        finish(audio.duration);
      };
    };
    audio.onerror = () => finish(0);

    audio.src = url;
  });
}

export function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface RecordingSession {
  /** Stop and save whatever was captured so far. */
  stop(): void;
  /** Stop without saving. */
  cancel(): void;
}

export interface RecordingCallbacks {
  onTick?: (elapsedMs: number) => void;
  onMaxDurationReached?: () => void;
  onStopped?: (blob: Blob, mimeType: string) => void;
  onCancelled?: () => void;
  onError?: (message: string) => void;
}

/** Requests the microphone and starts recording immediately — permission
 * prompts and start are combined into one user gesture, matching how the
 * legacy app's "record" button worked (request + start on the same click). */
export async function startRecording(callbacks: RecordingCallbacks): Promise<RecordingSession> {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  } catch (error) {
    const name = error instanceof DOMException ? error.name : '';
    if (name === 'NotAllowedError') {
      callbacks.onError?.('Microphone access denied. Please enable it in your browser settings.');
    } else if (name === 'NotFoundError') {
      callbacks.onError?.('No microphone found.');
    } else {
      callbacks.onError?.('Unable to access the microphone.');
    }
    throw error;
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];
  let cancelled = false;
  let tickTimer: ReturnType<typeof setInterval> | null = null;
  const startTime = Date.now();

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  recorder.onstop = () => {
    if (tickTimer) clearInterval(tickTimer);
    stream.getTracks().forEach((track) => track.stop());

    if (cancelled) {
      callbacks.onCancelled?.();
      return;
    }
    if (chunks.length === 0) {
      callbacks.onError?.('No audio was recorded.');
      return;
    }
    const blob = new Blob(chunks, { type: recorder.mimeType });
    const sizeMB = blob.size / (1024 * 1024);
    if (sizeMB > MAX_SIZE_MB) {
      callbacks.onError?.(`Recording too large (${sizeMB.toFixed(1)}MB). Maximum is ${MAX_SIZE_MB}MB.`);
      return;
    }
    callbacks.onStopped?.(blob, recorder.mimeType);
  };

  recorder.onerror = () => callbacks.onError?.('A recording error occurred.');

  recorder.start(1000);
  tickTimer = setInterval(() => {
    const elapsed = Date.now() - startTime;
    callbacks.onTick?.(elapsed);
    if (elapsed >= MAX_DURATION_MS && recorder.state !== 'inactive') {
      callbacks.onMaxDurationReached?.();
      recorder.stop();
    }
  }, 200);

  return {
    stop: () => {
      if (recorder.state !== 'inactive') recorder.stop();
    },
    cancel: () => {
      cancelled = true;
      if (recorder.state !== 'inactive') recorder.stop();
    },
  };
}
