/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useRef } from 'react';
import { useAdSlot, bumpAdImpression } from '@/hooks/useAdSlot';

interface AdSlotProps {
  slot: string;
  /** Optional visible height fallback while the ad code loads. */
  minHeight?: number;
  className?: string;
}

/**
 * Universal banner ad slot. Renders any HTML/JS ad code from the admin
 * `ad_settings` table inside a sandboxed iframe so Monetag, PropellerAds,
 * Ezoic, Mediavine, AdSense, or a custom snippet can all be dropped in
 * without redeploying.
 *
 * Slots stay dormant until an admin enables them + pastes a snippet.
 */
export function AdSlot({ slot, minHeight = 90, className }: AdSlotProps) {
  const { row, loading } = useAdSlot(slot);
  const bumpedRef = useRef(false);

  useEffect(() => {
    if (!row?.enabled || !row.html_snippet || bumpedRef.current) return;
    bumpedRef.current = true;
    bumpAdImpression(slot);
  }, [row, slot]);

  if (loading || !row?.enabled || !row.html_snippet) return null;

  // Sandbox the third-party script so it cannot read our DOM/cookies/localStorage.
  // `allow-scripts` + `allow-same-origin` is NOT combined: keeping them separate
  // guarantees the ad frame is treated as a distinct origin.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;background:transparent;color:#e2e8f0;font-family:system-ui,sans-serif;overflow:hidden}a{color:inherit}</style></head><body>${row.html_snippet}</body></html>`;

  return (
    <div
      className={className ?? 'w-full my-4 rounded-xl overflow-hidden border border-border/30 bg-muted/10'}
      data-ad-slot={slot}
      aria-label="Advertisement"
    >
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground/70 px-2 pt-1.5">
        Ad {row.network && row.network !== 'custom' ? `· ${row.network}` : ''}
      </div>
      <iframe
        title={`ad-${slot}`}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        style={{ width: '100%', minHeight, border: 0, display: 'block' }}
      />
    </div>
  );
}
