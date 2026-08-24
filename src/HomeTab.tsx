/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { Loader2, PlaySquare } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { ChannelVideoCard } from '@/components/channel/ChannelVideoCard';
import { fetchChannelVideos, type ChannelVideo } from '@/lib/channelData';

interface Props {
  channelId: string;
  isOwner: boolean;
  onSeeAll: (tab: 'videos' | 'shorts') => void;
}

export default function HomeTab({ channelId, isOwner, onSeeAll }: Props) {
  const [latest, setLatest] = useState<ChannelVideo[]>([]);
  const [popular, setPopular] = useState<ChannelVideo[]>([]);
  const [shorts, setShorts] = useState<ChannelVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const [l, p, s] = await Promise.all([
        fetchChannelVideos(channelId, { isShort: false, sort: 'latest', page: 0, pageSize: 8 }),
        fetchChannelVideos(channelId, { isShort: false, sort: 'popular', page: 0, pageSize: 4 }),
        fetchChannelVideos(channelId, { isShort: true, sort: 'latest', page: 0, pageSize: 5 }),
      ]);
      if (cancelled) return;
      setLatest(l.items);
      setPopular(p.items);
      setShorts(s.items);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [channelId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading channel…
      </div>
    );
  }

  if (latest.length === 0 && shorts.length === 0) {
    return (
      <EmptyState
        icon={PlaySquare}
        title="Nothing here yet"
        description={isOwner ? 'Publish your first video to bring this channel to life.' : 'This channel has no content yet.'}
        {...(isOwner ? { ctaLabel: 'Upload', ctaTo: '/upload' } : {})}
        compact
      />
    );
  }

  return (
    <div className="space-y-8">
      {latest.length > 0 && (
        <Section title="Latest uploads" onSeeAll={() => onSeeAll('videos')}>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {latest.map((v) => <ChannelVideoCard key={v.id} video={v} />)}
          </div>
        </Section>
      )}

      {shorts.length > 0 && (
        <Section title="Shorts" onSeeAll={() => onSeeAll('shorts')}>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {shorts.map((v) => <ChannelVideoCard key={v.id} video={v} />)}
          </div>
        </Section>
      )}

      {popular.length > 0 && (
        <Section title="Popular on this channel" onSeeAll={() => onSeeAll('videos')}>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {popular.map((v) => <ChannelVideoCard key={v.id} video={v} />)}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <button type="button" onClick={onSeeAll} className="text-xs text-primary hover:underline">
          See all
        </button>
      </div>
      {children}
    </section>
  );
}
