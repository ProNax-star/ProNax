import { useEffect, useState } from 'react';
import { useAdSlot } from '@/hooks/useAdSlot';

/**
 * Parse a VAST XML payload and return the first playable progressive
 * media file URL (mp4/webm). Returns null if the XML has no linear
 * MediaFile the browser can play directly.
 */
function extractMediaFile(xmlText: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const nodes = Array.from(doc.getElementsByTagName('MediaFile'));
    const candidates = nodes
      .map((n) => ({
        url: (n.textContent || '').trim(),
        type: (n.getAttribute('type') || '').toLowerCase(),
        delivery: (n.getAttribute('delivery') || '').toLowerCase(),
        bitrate: Number(n.getAttribute('bitrate') || '0'),
      }))
      .filter((c) => c.url && c.delivery !== 'streaming')
      .filter((c) => /mp4|webm/.test(c.type) || /\.mp4|\.webm/i.test(c.url));
    if (!candidates.length) return null;
    candidates.sort((a, b) => a.bitrate - b.bitrate);
    return candidates[Math.floor(candidates.length / 2)].url;
  } catch {
    return null;
  }
}

/**
 * Resolves the configured pre-roll VAST tag into a direct media URL the
 * existing <VideoPlayer> can play through its `adVideoSrc` prop.
 *
 * Networks that block cross-origin fetch (no CORS) will return null; in
 * that case the app falls back to its internal ad system. Admins should
 * use CORS-enabled VAST endpoints (Google IMA-compatible tags typically
 * are) for direct browser playback.
 */
export function useVastPreRoll(): { adVideoSrc: string | null; enabled: boolean } {
  const { row } = useAdSlot('player_preroll');
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);
    if (!row?.enabled || !row.vast_tag_url) return;
    (async () => {
      try {
        const res = await fetch(row.vast_tag_url as string, {
          method: 'GET',
          credentials: 'omit',
          mode: 'cors',
        });
        if (!res.ok) return;
        const text = await res.text();
        const url = extractMediaFile(text);
        if (!cancelled && url) setSrc(url);
      } catch {
        /* CORS-blocked or unreachable — silently skip */
      }
    })();
    return () => { cancelled = true; };
  }, [row?.enabled, row?.vast_tag_url]);

  return { adVideoSrc: src, enabled: !!row?.enabled };
}
