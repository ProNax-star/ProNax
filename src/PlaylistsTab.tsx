/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { EyeOff, ListVideo, Loader2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { fetchChannelPlaylists, type ChannelPlaylist } from '@/lib/channelData';

interface Props {
  channelId: string;
  isOwner: boolean;
  hidden: boolean;
}

export default function PlaylistsTab({ channelId, isOwner, hidden }: Props) {
  const [items, setItems] = useState<ChannelPlaylist[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      replace ? setLoading(true) : setLoadingMore(true);
      try {
        const res = await fetchChannelPlaylists(channelId, { page: nextPage, includePrivate: isOwner });
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setHasMore(res.hasMore);
        setPage(nextPage);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [channelId, isOwner],
  );

  useEffect(() => {
    if (hidden && !isOwner) { setLoading(false); return; }
    void load(0, true);
  }, [load, hidden, isOwner]);

  if (hidden && !isOwner) {
    return (
      <EmptyState
        icon={EyeOff}
        title="Playlists are private"
        description="This creator has chosen to keep their playlists hidden."
        compact
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading playlists…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ListVideo}
        title="No playlists yet"
        description={isOwner ? 'Group your videos into playlists to help viewers binge.' : 'This channel has no public playlists.'}
        {...(isOwner ? { ctaLabel: 'Create a playlist', ctaTo: '/playlists' } : {})}
        compact
      />
    );
  }

  return (
    <>
      {hidden && isOwner && (
        <p className="mb-3 text-[11px] text-amber-400">
          Playlists are hidden from visitors — only you can see this list.
        </p>
      )}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((pl) => (
          <Link
            key={pl.id}
            to="/playlist/$id"
            params={{ id: pl.id }}
            className="group block rounded-xl border border-border/40 bg-muted/20 p-4 hover:border-primary/40 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold line-clamp-2 group-hover:text-primary transition-colors">{pl.title}</h3>
              <ListVideo className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
            {pl.description && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{pl.description}</p>}
            <p className="mt-3 text-[11px] text-muted-foreground">
              {pl.itemCount} {pl.itemCount === 1 ? 'video' : 'videos'}
              {pl.visibility !== 'public' && ` · ${pl.visibility}`}
            </p>
          </Link>
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
  );
}
