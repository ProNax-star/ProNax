/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential.
   Unauthorized copying or redistribution is strictly prohibited. */

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAdSlot, bumpAdImpression } from '@/hooks/useAdSlot';

interface InVideoAdOverlayProps {
  /** Admin-configured slot key. Defaults to `in_video_banner`. */
  slot?: string;
  /** Delay (seconds) before the banner appears over the player. */
  delaySeconds?: number;
  /** Hide the overlay while a pre-roll ad is playing. */
  paused?: boolean;
}

/**
 * Bottom-center banner overlay rendered on top of the main video player.
 * Pulls its creative from the admin `ad_settings` table so any network
 * (AdSense / Monetag / custom HTML) can be dropped in without a redeploy.
 */
export function InVideoAdOverlay({
  slot = 'in_video_banner',
  delaySeconds = 5,
  paused = false,
}: InVideoAdOverlayProps) {
  const { row, loading } = useAdSlot(slot);
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (loading || !row?.enabled || !row.html_snippet) return;
    const t = setTimeout(() => setVisible(true), Math.max(0, delaySeconds) * 1000);
    return () => clearTimeout(t);
  }, [loading, row, delaySeconds]);

  useEffect(() => {
    if (visible) bumpAdImpression(slot);
  }, [visible, slot]);

  if (loading || closed || !visible || paused || !row?.enabled || !row.html_snippet) return null;

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body>${row.html_snippet}</body></html>`;

  return (
    <div
      className="absolute bottom-14 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-[468px] rounded-lg overflow-hidden border border-white/15 bg-black/70 backdrop-blur-sm shadow-2xl"
      data-ad-slot={slot}
      aria-label="Advertisement"
    >
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="Close ad"
        className="absolute -top-2.5 -right-2.5 z-10 h-6 w-6 rounded-full bg-black/90 border border-white/25 text-white flex items-center justify-center hover:bg-black"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <iframe
        title={`in-video-ad-${slot}`}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ width: '100%', height: 60, border: 0, display: 'block' }}
      />
    </div>
  );
}
