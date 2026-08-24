/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useRef } from 'react';
import { useAdSlot, bumpAdImpression } from '@/hooks/useAdSlot';

export type AdFormat = 'html_script' | 'api_url';

/** Detects whether the stored ad code is a raw HTML/JS snippet or a plain media/API URL. */
export function detectAdFormat(code: string | null | undefined): AdFormat {
  const c = (code ?? '').trim();
  if (!c) return 'html_script';
  return /^https?:\/\/\S+$/i.test(c) && !c.includes('<') ? 'api_url' : 'html_script';
}

interface DynamicAdContainerProps {
  /** Placement key stored in `ad_settings.slot` (home_feed, in_stream, watch_sidebar…). */
  placement: string;
  className?: string;
  /** Optional click-through URL used for image creatives served from an API URL. */
  clickUrl?: string;
}

/**
 * Reusable ad surface locked to a 16:9 box so it drops into the video grid
 * without shifting any neighbouring card. HTML/JS creatives run inside a
 * sandboxed iframe (isolated origin, no access to app DOM/storage); plain
 * URLs render as an image or video creative.
 */
export function DynamicAdContainer({ placement, className, clickUrl }: DynamicAdContainerProps) {
  const { row, loading } = useAdSlot(placement);
  const bumped = useRef(false);
  const code = row?.html_snippet?.trim() || '';

  useEffect(() => {
    if (!row?.enabled || !code || bumped.current) return;
    bumped.current = true;
    bumpAdImpression(placement);
  }, [row, code, placement]);

  if (loading || !row?.enabled || !code) return null;

  const format = detectAdFormat(code);
  const isVideo = format === 'api_url' && /\.(mp4|webm|m3u8)(\?|$)/i.test(code);

  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;padding:0;height:100%;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center}img,iframe,video{max-width:100%;max-height:100%}</style></head><body>${code}</body></html>`;

  const creative =
    format === 'api_url' ? (
      isVideo ? (
        <video
          src={code}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
        />
      ) : (
        <img src={code} alt="Sponsored" loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
      )
    ) : (
      <iframe
        title={`ad-${placement}`}
        srcDoc={srcDoc}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="absolute inset-0 h-full w-full border-0"
      />
    );

  const body = (
    <div className="v3d-thumb relative aspect-video w-full overflow-hidden rounded-xl border border-white/5 bg-muted/20">
      {creative}
      <span className="pointer-events-none absolute left-2 top-2 z-10 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/90">
        Sponsored
      </span>
    </div>
  );

  return (
    <div
      className={className ?? 'v3d-stage group relative w-full px-3 sm:px-0 pb-1 pt-2'}
      data-ad-placement={placement}
      aria-label="Advertisement"
    >
      {format === 'api_url' && clickUrl ? (
        <a href={clickUrl} target="_blank" rel="noopener noreferrer sponsored" className="block w-full">
          {body}
        </a>
      ) : (
        body
      )}
    </div>
  );
}
