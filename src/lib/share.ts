/** Uses the Web Share API where available (mobile browsers, most modern
 * desktop browsers); falls back to copying the text to the clipboard
 * everywhere else. Returns which path was taken so the caller can show
 * appropriate feedback ("Shared" vs "Copied"). */
export async function shareText(
  title: string,
  text: string
): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return 'shared';
    } catch (error) {
      // AbortError means the user cancelled the share sheet — not a failure.
      if (error instanceof Error && error.name === 'AbortError') return 'shared';
      // Fall through to clipboard on any other failure.
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'failed';
  }
}
