/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, PlaySquare } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ChannelVideoCard } from '@/components/channel/ChannelVideoCard';
import { fetchChannelVideos, type ChannelVideo, type VideoSort } from '@/lib/channelData';

const SORTS: { id: VideoSort; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'popular', label: 'Popular' },
  { id: 'oldest', label: 'Oldest' },
];

interface Props {
  channelId: string;
  isShort?: boolean;
  isOwner: boolean;
}

export default function VideosTab({ channelId, isShort = false, isOwner }: Props) {
  const [sort, setSort] = useState<VideoSort>('latest');
  const [items, setItems] = useState<ChannelVideo[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      replace ? setLoading(true) : setLoadingMore(true);
      try {
        const res = await fetchChannelVideos(channelId, { isShort, sort, page: nextPage });
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setHasMore(res.hasMore);
        setPage(nextPage);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [channelId, isShort, sort],
  );

  useEffect(() => { void load(0, true); }, [load]);

  const label = isShort ? 'shorts' : 'videos';

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-4">
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSort(s.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
              sort === s.id
                ? 'bg-primary/20 text-primary border border-primary/40'
                : 'bg-muted/40 text-muted-foreground border border-border/40 hover:text-foreground'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading {label}…
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={PlaySquare}
          title={`No ${label} yet`}
          description={
            isOwner
              ? `Upload your first ${isShort ? 'short' : 'video'} — it will appear here right away.`
              : `This channel hasn't published any ${label} yet.`
          }
          {...(isOwner ? { ctaLabel: 'Upload', ctaTo: '/upload' } : {})}
          compact
        />
      ) : (
        <>
          <div
            className={`grid gap-4 ${
              isShort
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
                : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            }`}
          >
            {items.map((v) => (
              <ChannelVideoCard key={v.id} video={v} />
            ))}
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
      )}
    </div>
  );
}
