/** Thin wrapper over the Web Speech API — no audio assets needed, the
 * browser's built-in voices read the scripture text aloud. */

export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, rate: number, onEnd?: () => void): void {
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel(); // never overlap a previous utterance
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (!isTtsSupported()) return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  if (!isTtsSupported()) return false;
  return window.speechSynthesis.speaking;
}
