/**
 * Pick the best playable source for a video row given the network connection.
 *
 * Rows may have a primary `video_url` plus a `variants` array like:
 *   [{ quality: '720p', url, bitrate, width, height, mime_type }]
 *
 * On slow connections (`slow-2g`/`2g`/`3g` or a low `downlink`), we prefer the
 * smallest available variant to save bandwidth. On fast connections we use the
 * original upload for maximum quality.
 */
export interface VideoVariant {
  quality?: string;
  url?: string;
  bitrate?: number;
  width?: number;
  height?: number;
  mime_type?: string;
}

function readEffectiveType(): string | null {
  if (typeof navigator === 'undefined') return null;
  const c = (navigator as unknown as { connection?: { effectiveType?: string; downlink?: number; saveData?: boolean } }).connection;
  if (!c) return null;
  if (c.saveData) return 'save-data';
  return c.effectiveType ?? null;
}

export function pickBestVideoSource(
  primaryUrl: string | null | undefined,
  variants: VideoVariant[] | null | undefined,
): string | undefined {
  const list = Array.isArray(variants) ? variants.filter((v) => v?.url) : [];
  const primary = primaryUrl || undefined;

  const eff = readEffectiveType();
  const wantsSmall = eff === 'slow-2g' || eff === '2g' || eff === '3g' || eff === 'save-data';

  if (wantsSmall && list.length) {
    // Choose the smallest variant by bitrate (fallback to height).
    const sorted = [...list].sort((a, b) => {
      const ab = a.bitrate ?? (a.height ?? 9999) * 1000;
      const bb = b.bitrate ?? (b.height ?? 9999) * 1000;
      return ab - bb;
    });
    return sorted[0].url ?? primary;
  }
  return primary;
}
