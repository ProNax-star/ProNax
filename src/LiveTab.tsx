/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Loader2, Radio } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { compactFormat } from '@/components/ui/animated-counter';
import { fetchChannelStreams, type ChannelStream } from '@/lib/channelData';

export default function LiveTab({ channelId, isOwner }: { channelId: string; isOwner: boolean }) {
  const [items, setItems] = useState<ChannelStream[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      replace ? setLoading(true) : setLoadingMore(true);
      try {
        const res = await fetchChannelStreams(channelId, { page: nextPage });
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setHasMore(res.hasMore);
        setPage(nextPage);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [channelId],
  );

  useEffect(() => { void load(0, true); }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading streams…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Radio}
        title="No live streams yet"
        description={isOwner ? 'Start your first broadcast — past streams will be listed here.' : 'This channel has not streamed yet.'}
        {...(isOwner ? { ctaLabel: 'Go live', ctaTo: '/live' } : {})}
        compact
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((s) => {
          const linkProps = s.mux_playback_id
            ? ({ to: '/live/$playbackId', params: { playbackId: s.mux_playback_id } } as const)
            : ({ to: '/live' } as const);
          return (
            <Link key={s.id} {...linkProps} className="group block">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted/40 border border-border/40">
                {s.thumbnail_url ? (
                  <img src={s.thumbnail_url} alt={s.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Radio className="w-6 h-6" />
                  </div>
                )}
                {s.is_live ? (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold tracking-wide">
                    LIVE
                  </span>
                ) : (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-white text-[10px] capitalize">
                    {s.status}
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">{s.title}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {s.is_live
                  ? `${compactFormat(s.viewer_count ?? 0)} watching now`
                  : s.started_at
                    ? new Date(s.started_at).toLocaleDateString()
                    : s.scheduled_at
                      ? `Scheduled ${new Date(s.scheduled_at).toLocaleString()}`
                      : ''}
              </p>
            </Link>
          );
        })}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => load(page + 1, false)}
            disabled={loadingMore}
            className="px-5 py-2 rounded-full text-sm border border-primary/40 text-primary hover:bg-primary/10 disabled:opacity-60 inline-flex items-center gap-2"
          >
            {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />} Load more
          </button>
        </div>
      )}
    </>
  );
}
