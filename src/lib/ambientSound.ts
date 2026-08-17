/** Procedurally generated ambient soundscapes via the Web Audio API — no
 * audio assets to fetch or bundle. Trimmed to three well-executed presets
 * (rain, ocean, white noise) rather than the legacy app's ten thinner ones;
 * silence is just "nothing playing". */

export type AmbientPreset = 'silence' | 'rain' | 'ocean' | 'whitenoise';

export const AMBIENT_PRESETS: Array<{ value: AmbientPreset; label: string }> = [
  { value: 'silence', label: 'Silence' },
  { value: 'rain', label: 'Gentle rain' },
  { value: 'ocean', label: 'Ocean waves' },
  { value: 'whitenoise', label: 'White noise' },
];

let audioContext: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let gainNode: GainNode | null = null;
let currentPreset: AmbientPreset = 'silence';

function getContext(): AudioContext {
  audioContext ??= new AudioContext();
  return audioContext;
}

/** A few seconds of white noise, looped — long enough that the loop point
 * isn't audible as a click/repeat. */
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const seconds = 4;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

export function stopAmbientSound(): void {
  sourceNode?.stop();
  sourceNode?.disconnect();
  sourceNode = null;
  gainNode?.disconnect();
  gainNode = null;
  currentPreset = 'silence';
}

export function playAmbientSound(preset: AmbientPreset, volume = 0.35): void {
  stopAmbientSound();
  if (preset === 'silence') return;

  const ctx = getContext();
  if (ctx.state === 'suspended') void ctx.resume();

  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx);
  noise.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = volume;

  if (preset === 'rain') {
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1200;
    noise.connect(filter).connect(gain).connect(ctx.destination);
  } else if (preset === 'ocean') {
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    // Slow swell: an LFO modulating gain to feel like waves rising and falling.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.15;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = volume * 0.5;
    lfo.connect(lfoGain).connect(gain.gain);
    lfo.start();
    gain.gain.value = volume * 0.5;
    noise.connect(filter).connect(gain).connect(ctx.destination);
  } else {
    noise.connect(gain).connect(ctx.destination);
  }

  noise.start();
  sourceNode = noise;
  gainNode = gain;
  currentPreset = preset;
}

export function getCurrentPreset(): AmbientPreset {
  return currentPreset;
}
