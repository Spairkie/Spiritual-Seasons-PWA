/** A single soft bell tone (two detuned sine waves, slow decay) — used to
 * mark the end of a meditation timer without needing an audio asset. */
export function playChime(): void {
  const ctx = new AudioContext();
  const now = ctx.currentTime;

  for (const [freq, delay] of [
    [528, 0],
    [792, 0.05],
  ] as const) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(0.25, now + delay + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 2.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + delay);
    osc.stop(now + delay + 2.6);
  }

  setTimeout(() => void ctx.close(), 3000);
}
