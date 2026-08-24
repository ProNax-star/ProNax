/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BadgeCheck, Ban, Flag, Loader2, MoreVertical, Search, Settings,
  Share2, UserCheck, UserPlus, UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { OrbBackground } from '@/components/ui/orb-background';
import { compactFormat } from '@/components/ui/animated-counter';
import { EmptyState } from '@/components/EmptyState';
import { ReportModal } from '@/components/ReportModal';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/loose';
import {
  fetchChannelStats, isBlocked, isFollowing, reportChannel, resolveChannel,
  setBlocked, setFollow, type ChannelProfile,
} from '@/lib/channelData';

const HomeTab = lazy(() => import('@/components/channel/tabs/HomeTab'));
const VideosTab = lazy(() => import('@/components/channel/tabs/VideosTab'));
const LiveTab = lazy(() => import('@/components/channel/tabs/LiveTab'));
const PlaylistsTab = lazy(() => import('@/components/channel/tabs/PlaylistsTab'));
const AboutTab = lazy(() => import('@/components/channel/tabs/AboutTab'));

type TabId = 'home' | 'videos' | 'shorts' | 'live' | 'playlists' | 'about';

const TABS: { id: TabId; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'videos', label: 'Videos' },
  { id: 'shorts', label: 'Shorts' },
  { id: 'live', label: 'Live' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'about', label: 'About' },
];

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
}

export default function Channel() {
  const navigate = useNavigate();
  const { handle: handleParam } = useParams<{ handle: string }>();

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [channel, setChannel] = useState<ChannelProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabId>('home');

  const [followers, setFollowers] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [blocked, setBlockedState] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null));
  }, []);

  // Resolve the handle (following historical handles) and load header stats.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    void (async () => {
      const raw = handleParam ?? '';
      const resolved = await resolveChannel(raw);
      if (cancelled) return;
      if (!resolved) {
        setChannel(null);
        setNotFound(true);
        setLoading(false);
        return;
      }
      // Old handle → send the visitor to the canonical URL.
      if (resolved.redirected && resolved.canonicalHandle) {
        navigate(`/channel/${resolved.canonicalHandle}`, { replace: true });
        return;
      }
      setChannel(resolved.profile);
      setFollowers(resolved.profile.follower_count);
      setTotalViews(resolved.profile.total_views);
      setLoading(false);

      const stats = await fetchChannelStats(resolved.profile.id);
      if (cancelled) return;
      setFollowers(stats.followers);
      setTotalViews(stats.totalViews);
      setVideoCount(stats.videoCount);
    })();
    return () => { cancelled = true; };
  }, [handleParam, navigate]);

  // Viewer-specific relationship state.
  useEffect(() => {
    if (!viewerId || !channel || viewerId === channel.id) return;
    let cancelled = false;
    void (async () => {
      const [f, b] = await Promise.all([
        isFollowing(viewerId, channel.id),
        isBlocked(viewerId, channel.id),
      ]);
      if (cancelled) return;
      setFollowing(f);
      setBlockedState(b);
    })();
    return () => { cancelled = true; };
  }, [viewerId, channel]);

  const isOwner = Boolean(viewerId && channel && viewerId === channel.id);

  const handleFollow = useCallback(async () => {
    if (!channel) return;
    if (!viewerId) {
      toast.error('Sign in to follow this channel.');
      navigate('/auth');
      return;
    }
    if (followBusy) return;

    // Optimistic update — the count never flickers back unless the write fails.
    const next = !following;
    setFollowing(next);
    setFollowers((c) => Math.max(0, c + (next ? 1 : -1)));
    setFollowBusy(true);
    try {
      await setFollow(viewerId, channel.id, next);
    } catch {
      setFollowing(!next);
      setFollowers((c) => Math.max(0, c + (next ? -1 : 1)));
      toast.error('Could not update your follow. Please try again.');
    } finally {
      setFollowBusy(false);
    }
  }, [channel, viewerId, following, followBusy, navigate]);

  const handleBlock = useCallback(async () => {
    if (!channel || !viewerId) {
      toast.error('Sign in to manage blocked channels.');
      return;
    }
    const next = !blocked;
    setBlockedState(next);
    try {
      await setBlocked(viewerId, channel.id, next);
      if (next) {
        setFollowing(false);
        toast.success(`Blocked ${channel.display_name ?? 'channel'}`);
      } else {
        toast.success('Channel unblocked');
      }
    } catch {
      setBlockedState(!next);
      toast.error('Could not update block status.');
    }
  }, [channel, viewerId, blocked]);

  const shareUrl = useMemo(
    () => (typeof window === 'undefined' ? '' : `${window.location.origin}/channel/${channel?.handle ?? handleParam ?? ''}`),
    [channel, handleParam],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading channel…
      </div>
    );
  }

  if (notFound || !channel) {
    return (
      <div className="relative min-h-[70vh]">
        <OrbBackground />
        <EmptyState
          icon={Search}
          title="Channel not found"
          description={`We couldn't find a channel for @${(handleParam ?? '').replace(/^@/, '')}. It may have been renamed or removed.`}
          ctaLabel="Explore channels"
          ctaTo="/explore"
        />
      </div>
    );
  }

  const displayName = channel.display_name ?? channel.handle ?? 'Channel';

  return (
    <div className="relative min-h-screen pb-20">
      <OrbBackground />

      {/* Banner (16:9 crop, rendered as a wide strip) */}
      <div className="relative w-full aspect-[6/1] min-h-[110px] max-h-[280px] overflow-hidden rounded-b-2xl bg-muted/30">
        {channel.banner_url ? (
          <img src={channel.banner_url} alt={`${displayName} banner`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full gradient-primary opacity-40" />
        )}
      </div>

      <div className="max-w-6xl mx-auto px-4">
        {/* Identity row */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 sm:-mt-12"
        >
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-background bg-muted shrink-0">
            {channel.avatar_url ? (
              <img src={channel.avatar_url} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-3xl font-display font-bold flex items-center gap-2">
              <span className="truncate">{displayName}</span>
              {channel.verified && <BadgeCheck className="w-5 h-5 text-primary shrink-0" />}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {channel.handle ? `@${channel.handle} · ` : ''}
              {compactFormat(followers)} followers · {compactFormat(videoCount || channel.video_count)} videos
            </p>
            {channel.bio && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-1 max-w-xl">{channel.bio}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isOwner ? (
              <Link
                to="/profile"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm border border-border/60 hover:border-primary/50 transition"
              >
                <Settings className="w-4 h-4" /> Customise channel
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleFollow}
                disabled={followBusy || blocked}
                aria-pressed={following}
                className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition disabled:opacity-60 ${
                  following
                    ? 'bg-muted/60 text-foreground border border-border/60'
                    : 'gradient-primary text-primary-foreground glow-primary'
                }`}
              >
                {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {following ? 'Following' : 'Follow'}
              </button>
            )}

            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  toast.success('Channel link copied');
                } catch {
                  toast.error('Could not copy the link');
                }
              }}
              className="p-2 rounded-full border border-border/60 hover:border-primary/50 transition"
              aria-label="Share channel"
            >
              <Share2 className="w-4 h-4" />
            </button>

            {!isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="p-2 rounded-full border border-border/60 hover:border-primary/50 transition"
                    aria-label="More channel actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setReportOpen(true)}>
                    <Flag className="w-4 h-4 mr-2" /> Report channel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleBlock}>
                    {blocked ? <UserX className="w-4 h-4 mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                    {blocked ? 'Unblock channel' : 'Block channel'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </motion.header>

        {blocked && (
          <p className="mt-4 text-xs text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-lg px-3 py-2">
            You blocked this channel. Its content stays hidden across ProNax until you unblock it.
          </p>
        )}

        {/* Tabs */}
        <nav className="mt-6 border-b border-border/40 overflow-x-auto no-scrollbar" aria-label="Channel sections">
          <ul className="flex items-center gap-1 min-w-max">
            {TABS.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => setTab(t.id)}
                  aria-current={tab === t.id ? 'page' : undefined}
                  className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
                    tab === t.id
                      ? 'border-primary text-foreground'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="mt-6">
          <Suspense fallback={<TabFallback />}>
            {tab === 'home' && (
              <HomeTab channelId={channel.id} isOwner={isOwner} onSeeAll={(next) => setTab(next)} />
            )}
            {tab === 'videos' && <VideosTab channelId={channel.id} isOwner={isOwner} />}
            {tab === 'shorts' && <VideosTab channelId={channel.id} isShort isOwner={isOwner} />}
            {tab === 'live' && <LiveTab channelId={channel.id} isOwner={isOwner} />}
            {tab === 'playlists' && (
              <PlaylistsTab channelId={channel.id} isOwner={isOwner} hidden={channel.hide_playlists} />
            )}
            {tab === 'about' && (
              <AboutTab channel={channel} totalViews={totalViews} viewerId={viewerId} />
            )}
          </Suspense>
        </div>
      </div>

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="channel"
        targetId={channel.id}
        targetTitle={displayName}
        targetChannelName={displayName}
        onSubmit={async (category, details) => {
          if (!viewerId) throw new Error('Sign in to report this channel.');
          await reportChannel(viewerId, channel.id, category, details);
        }}
      />
    </div>
  );
}
