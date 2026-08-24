/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { DynamicWidget } from '@/hooks/useDynamicWidgets';
import { useDynamicWidgets } from '@/hooks/useDynamicWidgets';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

function HtmlWidget({ w }: { w: DynamicWidget }) {
  const html = typeof w.config?.html === 'string' ? w.config.html : '';
  const ref = useRef<HTMLIFrameElement>(null);
  const height = typeof w.config?.height === 'number' ? w.config.height : 180;
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const doc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;padding:0;background:transparent;color:#fff;font-family:system-ui,sans-serif}</style></head><body>${html}</body></html>`;
    el.srcdoc = doc;
  }, [html]);
  return (
    <iframe
      ref={ref}
      title={w.title ?? 'Widget'}
      sandbox="allow-scripts allow-popups allow-forms allow-same-origin"
      className="w-full rounded-xl border border-white/10 bg-black/20"
      style={{ height }}
    />
  );
}

function BannerWidget({ w }: { w: DynamicWidget }) {
  const { image, headline, subline, cta_label, cta_url } = w.config as Record<string, string>;
  const inner = (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/15 via-secondary/10 to-transparent p-5 flex items-center gap-4 min-h-[112px]">
      {image && <img src={image} alt="" className="w-20 h-20 rounded-xl object-cover shrink-0" loading="lazy" decoding="async" />}
      <div className="flex-1 min-w-0">
        {headline && <div className="text-base font-bold text-white truncate">{headline}</div>}
        {subline && <div className="text-xs text-slate-300 line-clamp-2">{subline}</div>}
      </div>
      {cta_label && (
        <span className="shrink-0 text-xs px-3 py-2 rounded-lg bg-primary/25 border border-primary/40 text-primary font-semibold">
          {cta_label}
        </span>
      )}
    </div>
  );
  if (!cta_url) return inner;
  const external = /^https?:/i.test(cta_url);
  return external
    ? <a href={cta_url} target="_blank" rel="noopener noreferrer" className="block">{inner}</a>
    : <Link to={cta_url} className="block">{inner}</Link>;
}

function IframeWidget({ w }: { w: DynamicWidget }) {
  const src = w.config?.src as string | undefined;
  const height = typeof w.config?.height === 'number' ? w.config.height : 320;
  if (!src) return null;
  return (
    <iframe
      src={src}
      title={w.title ?? 'Embed'}
      loading="lazy"
      sandbox="allow-scripts allow-popups allow-forms allow-same-origin allow-presentation"
      className="w-full rounded-xl border border-white/10 bg-black/20"
      style={{ height }}
    />
  );
}

type VideoRow = { id: string; title: string; thumb_url: string | null; views_count: number | null };

function VideoRailWidget({ w }: { w: DynamicWidget }) {
  const [rows, setRows] = useState<VideoRow[]>([]);
  const category = w.config?.category as string | undefined;
  const limit = typeof w.config?.limit === 'number' ? w.config.limit : 10;
  useEffect(() => {
    let alive = true;
    (async () => {
      let q = supabase.from('videos').select('id,title,thumb_url,views_count').eq('is_removed', false).order('created_at', { ascending: false }).limit(limit);
      if (category) q = q.eq('category', category);
      const { data } = await q;
      if (alive) setRows((data ?? []) as VideoRow[]);
    })();
    return () => { alive = false; };
  }, [category, limit]);
  return (
    <div>
      {w.title && <div className="text-sm font-bold text-white mb-2">{w.title}</div>}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
        {rows.map((v) => (
          <Link key={v.id} to={`/watch/${v.id}`} className="shrink-0 w-40 snap-start">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted/40 border border-white/10">
              {v.thumb_url && <img src={v.thumb_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />}
            </div>
            <div className="mt-1 text-xs text-white line-clamp-2">{v.title}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function DynamicWidgetItem({ w }: { w: DynamicWidget }) {
  try {
    if (w.kind === 'html') return <HtmlWidget w={w} />;
    if (w.kind === 'banner') return <BannerWidget w={w} />;
    if (w.kind === 'iframe') return <IframeWidget w={w} />;
    if (w.kind === 'video_rail') return <VideoRailWidget w={w} />;
    return null;
  } catch {
    return null;
  }
}

export function DynamicWidgetSlot({ slot, className = '' }: { slot: string; className?: string }) {
  const { widgets } = useDynamicWidgets(slot);
  if (!widgets.length) return null;
  return (
    <div className={`space-y-4 ${className}`}>
      {widgets.map((w) => <DynamicWidgetItem key={w.id} w={w} />)}
    </div>
  );
}
