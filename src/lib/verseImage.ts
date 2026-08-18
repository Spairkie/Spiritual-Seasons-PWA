import type { SeasonId } from '@/types/book';

/** Light-mode --color-accent / --color-accent-deep pairs from
 * src/styles/main.css — this app's own season identity, not a separate
 * palette invented for this one feature. */
const SEASON_GRADIENT: Record<SeasonId, [string, string]> = {
  winter: ['#4C7688', '#2B4E5C'],
  spring: ['#59743F', '#43602F'],
  summer: ['#8D6521', '#835A16'],
  autumn: ['#A9503A', '#7A3524'],
};

const SIZE = 1080;
const PADDING = 110;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = words[0] ?? '';
  for (let i = 1; i < words.length; i++) {
    const word = words[i]!;
    const candidate = `${current} ${word}`;
    if (ctx.measureText(candidate).width < maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fontSizeFor(textLength: number): number {
  if (textLength < 60) return 56;
  if (textLength > 220) return 34;
  return Math.round(56 - (textLength - 60) * (22 / 160));
}

export async function generateVerseImage(
  scriptureText: string,
  scriptureRef: string,
  seasonId: SeasonId
): Promise<HTMLCanvasElement> {
  // Cormorant Garamond is self-hosted by this app (src/styles/fonts.css) —
  // wait for it so the canvas doesn't silently fall back to a system font
  // on the very first paint.
  await document.fonts.ready;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  const [from, to] = SEASON_GRADIENT[seasonId];
  const gradient = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  gradient.addColorStop(0, from);
  gradient.addColorStop(1, to);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const maxWidth = SIZE - PADDING * 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';

  const size = fontSizeFor(scriptureText.length);
  ctx.font = `italic 500 ${size}px "Cormorant Garamond", Georgia, serif`;
  const lines = wrapText(ctx, `"${scriptureText}"`, maxWidth);
  const lineHeight = size * 1.4;
  const totalHeight = lines.length * lineHeight;
  const startY = SIZE / 2 - totalHeight / 2;

  lines.forEach((line, i) => ctx.fillText(line, SIZE / 2, startY + i * lineHeight));

  ctx.font = `600 30px "Libre Franklin", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.fillText(scriptureRef, SIZE / 2, startY + totalHeight + 56);

  ctx.font = `500 22px "Libre Franklin", sans-serif`;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText('Spiritual Seasons', SIZE / 2, SIZE - 56);

  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Failed to generate image'))), 'image/png');
  });
}

export async function downloadVerseImage(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export function isImageShareSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;
}

export async function shareVerseImage(canvas: HTMLCanvasElement, title: string, text: string): Promise<boolean> {
  if (!isImageShareSupported()) return false;
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], 'verse.png', { type: 'image/png' });
  if (!navigator.canShare({ files: [file] })) return false;
  try {
    await navigator.share({ title, text, files: [file] });
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return false;
    throw error;
  }
}
