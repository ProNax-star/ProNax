import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Music2, Play, Volume2, VolumeX, Plus, Check, Video as VideoIcon, Send, Sparkles, Bookmark, Flame, Zap, CheckCircle2 } from 'lucide-react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/loose';
import { useLike, useComments, useFollow, recordView, recordShare } from '@/hooks/useInteractions';
import { useWatchHeartbeat } from '@/hooks/useWatchHeartbeat';
import { analyticsBus } from '@/lib/analyticsBus';
import { ShortsAdSlide } from '@/components/ShortsAdSlide';
import { rankShortsByProNaxFYP, recordProNaxViewerSignal, calculateProNaxFYPScore, FYPRankingResult } from '@/lib/pronaxShortsAlgorithm';
import { LiveWatcherBadge } from '@/components/LiveWatcherBadge';

const AD_EVERY_N_SHORTS = 4;
type FeedItem = { kind: 'short'; short: Short } | { kind: 'ad'; attributeShortId: string | null; key: string };

interface Short {
  id: string;
  src: string;
  title: string;
  channel: string;
  avatar?: string;
  description: string;
  likes: number;
  comments: number;
  shares: number;
  music: string;
  owner_id?: string;
  tags?: string[];
  fypInfo?: FYPRankingResult;
}

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

interface FloatingHeart {
  id: number;
  x: number;
  y: number;
}

function ShortItem({
  short,
  active,
  muted,
  onOpenSound,
  onOpenComments,
}: {
  short: Short;
  active: boolean;
  muted: boolean;
  onOpenSound: () => void;
  onOpenComments: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkCount, setBookmarkCount] = useState(Math.round(short.likes * 0.15) || 12);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [progressPct, setProgressPct] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);

  // Get current user ID
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  // Auto-hide controls when playing
  useEffect(() => {
    if (!paused && active) {
      const timer = setTimeout(() => setShowControls(false), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowControls(true);
    }
  }, [paused, active]);

  // Real backend hooks for this short
  const [creatorId, setCreatorId] = useState<string | null>(null);
  useEffect(() => {
    setCreatorId(short.owner_id ?? null);
  }, [short.owner_id]);

  const { liked, count: likeCount, toggle: toggleLike } = useLike(short.id, creatorId);
  const { following: followed, toggle: toggleFollow } = useFollow(creatorId);
  const { comments } = useComments(short.id, creatorId);

  // Track cumulative watched seconds
  const watchedRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const flushWatch = () => {
    const s = Math.round(watchedRef.current);
    if (s > 0) {
      analyticsBus.rpc('record_watch_history', { p_video: short.id, p_watch_seconds: s });
      recordProNaxViewerSignal({
        videoId: short.id,
        watchTimeSeconds: s,
        durationSeconds: videoRef.current?.duration || 15,
        tags: short.tags,
        audioId: short.music,
        liked,
        saved: bookmarked,
      });
    }
    watchedRef.current = 0;
    lastTickRef.current = null;
  };

  useEffect(() => {
    if (active) {
      recordView(short.id, 0).catch(() => {});
    } else {
      flushWatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, short.id]);

  useEffect(() => () => { flushWatch(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useWatchHeartbeat({ videoId: active ? short.id : null, isPlaying: active && !paused });

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.play().then(() => setPaused(false)).catch(() => {});
    } else {
      v.pause();
    }
  }, [active]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTU = () => {
      if (v.paused) return;
      setIsBuffering(false);
      const now = performance.now();
      if (lastTickRef.current != null) {
        watchedRef.current += (now - lastTickRef.current) / 1000;
      }
      lastTickRef.current = now;
      if (v.duration) {
        setProgressPct((v.currentTime / v.duration) * 100);
      }
    };
    const onPlay = () => { lastTickRef.current = performance.now(); setIsBuffering(false); };
    const onPause = () => { lastTickRef.current = null; setIsBuffering(false); };
    const onEnded = () => { flushWatch(); setIsBuffering(false); };
    const onWaiting = () => { setIsBuffering(true); };
    const onStalled = () => { setIsBuffering(true); };
    const onCanPlay = () => { setIsBuffering(false); };

    v.addEventListener('timeupdate', onTU);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('stalled', onStalled);
    v.addEventListener('canplay', onCanPlay);
    return () => {
      v.removeEventListener('timeupdate', onTU);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('stalled', onStalled);
      v.removeEventListener('canplay', onCanPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [short.id]);

  // Double tap to like feature
  const lastTapRef = useRef<number>(0);
  const handleVideoTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Trigger double tap heart burst
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const heartId = Date.now();
      setFloatingHearts((prev) => [...prev.slice(-5), { id: heartId, x, y }]);
      setTimeout(() => {
        setFloatingHearts((prev) => prev.filter((h) => h.id !== heartId));
      }, 900);

      if (!liked) {
        toggleLike();
      }
    } else {
      togglePlay();
    }
    lastTapRef.current = now;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    setShowControls(true);
    if (v.paused) { v.play(); setPaused(false); } else { v.pause(); setPaused(true); }
  };

  const handleShare = async () => {
    await recordShare(short.id, 'link').catch(() => {});
    try {
      await navigator.clipboard?.writeText(`${window.location.origin}/shorts#${short.id}`);
      toast.success('Short Video Link Copied!');
    } catch {}
  };

  const toggleBookmark = () => {
    setBookmarked((b) => {
      const next = !b;
      setBookmarkCount((c) => (next ? c + 1 : Math.max(0, c - 1)));
      toast.success(next ? 'Added to Saved Favorites' : 'Removed from Favorites');
      return next;
    });
  };

  const totalLikes = likeCount;
  const totalComments = comments.length;

  return (
    <section
      className="relative w-full h-full snap-start snap-always flex items-center justify-center bg-black select-none overflow-hidden"
      style={{ scrollSnapStop: 'always' }}
    >
      {/* 9:16 aspect ratio short video frame */}
      <div
        onClick={handleVideoTap}
        className="relative h-full aspect-[9/16] max-h-full overflow-hidden cursor-pointer"
      >
        <video
          ref={videoRef}
          src={short.src}
          loop
          playsInline
          preload="auto"
          muted={muted}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Slow connection video buffering indicator */}
        {isBuffering && active && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none z-30 transition-opacity">
            <div className="w-9 h-9 rounded-full border-3 border-white/20 border-t-[#FE2C55] animate-spin mb-2" />
            <span className="text-xs font-medium text-white/90 drop-shadow">Loading...</span>
          </div>
        )}

        {/* Floating Double-Tap Heart Particles */}
        <AnimatePresence>
          {floatingHearts.map((h) => (
            <motion.div
              key={h.id}
              initial={{ scale: 0.2, opacity: 1, x: h.x - 32, y: h.y - 32, rotate: -15 }}
              animate={{ scale: 1.6, opacity: 0, y: h.y - 120, rotate: 15 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute z-50 pointer-events-none drop-shadow-[0_0_15px_#FE2C55]"
            >
              <Heart className="w-16 h-16 fill-[#FE2C55] text-[#FE2C55]" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Live watching pill — subtle, top-left inside the frame */}
        <div className="absolute top-3 left-3 z-30 pointer-events-none scale-90 origin-top-left">
          <LiveWatcherBadge
            videoId={short.id}
            baseViewsCount={(short as any).views_count || Math.round(short.likes * 12)}
            variant="inline"
          />
        </div>



        {/* Top Gradient & Bottom Gradient Shadow Overlays */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent z-10" />

        {/* Play Pause Indicator */}
        {paused && showControls && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <Play className="w-20 h-20 text-white/90 fill-white/90 drop-shadow-[0_4px_25px_rgba(0,0,0,0.8)]" />
          </motion.div>
        )}

        {/* Action Rail (Right side stack) — always visible, pronax style */}
        <AnimatePresence>
          {true && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute right-2.5 bottom-24 flex flex-col items-center gap-5 z-20 text-white [&_svg]:drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]"
            >
              {/* Creator Avatar & Plus Follow Badge */}
              <div className="relative group">
                <Link
                  to={`/channel/${encodeURIComponent(short.channel.replace(/^@/, ''))}`}
                  onClick={(e) => e.stopPropagation()}
                  className="block w-12 h-12 rounded-full border-2 border-white p-[2px] bg-black/40 hover:scale-105 transition-transform shadow-xl"
                >
                  <div className="w-full h-full rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                    {short.avatar ? (
                      <img src={short.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      short.channel.slice(1, 3).toUpperCase()
                    )}
                  </div>
                </Link>
                {creatorId && currentUserId !== creatorId && !followed && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!creatorId) return;
                      toggleFollow();
                    }}
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-transform z-30"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                  </button>
                )}
              </div>

              {/* Like Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike();
                }}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center">
                  <Heart
                    className={`w-8 h-8 transition-colors ${
                      liked ? 'text-[#FE2C55] fill-[#FE2C55]' : 'text-white'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-bold drop-shadow">{formatCount(totalLikes)}</span>
              </button>

              {/* Comment Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComments();
                }}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-8 h-8 text-white fill-white/20" />
                </div>
                <span className="text-[11px] font-bold drop-shadow">{formatCount(totalComments)}</span>
              </button>

              {/* Bookmark / Favorites Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark();
                }}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center">
                  <Bookmark
                    className={`w-8 h-8 transition-colors ${
                      bookmarked ? 'text-amber-400 fill-amber-400' : 'text-white'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-bold drop-shadow">{formatCount(bookmarkCount)}</span>
              </button>

              {/* Share Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleShare();
                }}
                className="flex flex-col items-center gap-1 group active:scale-90 transition-transform"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center">
                  <Share2 className="w-8 h-8 text-white fill-white/20" />
                </div>
                <span className="text-[11px] font-bold drop-shadow">{formatCount(short.shares)}</span>
              </button>

              {/* Spinning Audio Vinyl Disc with Music Note Animations */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSound();
                }}
                className="relative mt-2 w-11 h-11 rounded-full p-[3px] bg-gradient-to-tr from-zinc-800 via-zinc-900 to-zinc-700 animate-spin-slow hover:scale-105 transition-transform shadow-[0_0_15px_rgba(0,0,0,0.8)] border border-white/40"
              >
                <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden border border-zinc-700">
                  {short.avatar ? (
                    <img src={short.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music2 className="w-5 h-5 text-cyan-400 animate-pulse" />
                  )}
                </div>
                {/* Floating music note icon */}
                <div className="absolute -top-1 -left-2 animate-bounce">
                  <Music2 className="w-3.5 h-3.5 text-cyan-300 drop-shadow-[0_0_5px_#25F4EE]" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Left Creator Info & Audio Marquee */}
        <AnimatePresence>
          {true && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute left-3 right-20 bottom-6 z-20 text-white space-y-2 pointer-events-auto"
            >
              <div className="flex items-center gap-2">
                <Link
                  to={`/channel/${encodeURIComponent(short.channel.replace(/^@/, ''))}`}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-base hover:underline flex items-center gap-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                >
                  <span>{short.channel}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" />
                </Link>
                {creatorId && currentUserId !== creatorId && !followed ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!creatorId) return;
                      toggleFollow();
                    }}
                    className="px-3 py-0.5 rounded-full bg-[#FE2C55] text-white text-[11px] font-bold hover:bg-[#e02447] transition-colors shadow-md"
                  >
                    Follow
                  </button>
                ) : followed ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white border border-white/30">
                    Following
                  </span>
                ) : null}
              </div>

              {short.title && (
                <p className="text-sm font-semibold leading-snug line-clamp-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  {short.title}
                </p>
              )}

              {/* Description with Hashtags highlighted in Cyan */}
              <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {short.description.split(' ').map((word, i) =>
                  word.startsWith('#') ? (
                    <span key={i} className="text-[#25F4EE] font-bold mr-1 hover:underline cursor-pointer">
                      {word}{' '}
                    </span>
                  ) : (
                    word + ' '
                  )
                )}
              </p>

              {/* Scrolling Sound Ticker Marquee */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenSound();
                }}
                className="flex items-center gap-2 text-xs font-semibold text-white/90 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 max-w-[85%] hover:border-cyan-400/50 transition-colors"
              >
                <Music2 className="w-3.5 h-3.5 text-cyan-400 animate-spin-slow shrink-0" />
                <div className="overflow-hidden whitespace-nowrap w-full">
                  <div className="inline-block animate-marquee">
                    🎵 {short.music} — ProNax Original Audio Track
                  </div>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Video Seeking Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-30">
          <div
            className="h-full bg-[#FE2C55] transition-all duration-100 shadow-[0_0_8px_#FE2C55]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function CommentsSheet({ short, onClose }: { short: Short | null; onClose: () => void }) {
  const [text, setText] = useState('');
  const { comments, post } = useComments(short?.id ?? '__none__', null);
  if (!short) return null;
  return (
    <Sheet open={!!short} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[75dvh] glass-strong border-border/40 flex flex-col bg-zinc-950 text-white">
        <SheetHeader className="text-left border-b border-zinc-800 pb-3">
          <SheetTitle className="text-white text-base font-bold">{comments.length} Comments</SheetTitle>
          <SheetDescription className="truncate text-zinc-400 text-xs">{short.title}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto mt-3 space-y-4">
          {comments.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-xs space-y-1">
              <MessageCircle className="w-8 h-8 mx-auto text-zinc-600" />
              <p>No comments yet. Be the first to start the conversation!</p>
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-bold shrink-0 text-cyan-400">
                {(c.author?.display_name || c.author?.email || '?')[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-zinc-400 font-semibold">
                  {c.author?.display_name || c.author?.email || 'user'} · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <p className="text-xs text-zinc-100 mt-0.5 break-words">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) {
                post(text);
                setText('');
              }
            }}
            placeholder="Add comment..."
            maxLength={1000}
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#FE2C55]"
          />
          <Button
            size="sm"
            disabled={!text.trim()}
            onClick={() => {
              post(text);
              setText('');
            }}
            className="rounded-full bg-[#FE2C55] hover:bg-[#e02447] text-white font-bold px-4"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Shorts() {
  const { id: shortIdFromUrl } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [activeTab, setActiveTab] = useState<'following' | 'fyp'>('fyp');
  const [commentsFor, setCommentsFor] = useState<Short | null>(null);
  const [liveShorts, setLiveShorts] = useState<Short[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        let rows: any[] | null = null;

        if (shortIdFromUrl) {
          const { data: specificShort } = await supabase
            .from('videos')
            .select('id,title,description,video_url,thumb_url,owner_id,tags')
            .eq('id', shortIdFromUrl)
            .eq('is_short', true)
            .eq('is_removed', false)
            .eq('is_shadow_banned', false)
            .eq('visibility', 'public')
            .single();
          if (specificShort) {
            rows = [specificShort];
          }
        }

        if (!rows) {
          const { data: ranked, error: rankedErr } = await supabase.rpc('get_shorts_feed', {
            p_limit: 30,
            p_offset: 0,
          });
          if (!rankedErr && ranked?.length) rows = ranked;
        }

        if (!rows) {
          const { data } = await supabase
            .from('videos')
            .select('id,title,description,video_url,thumb_url,owner_id,tags')
            .eq('is_short', true)
            .eq('is_removed', false)
            .eq('is_shadow_banned', false)
            .eq('visibility', 'public')
            .order('created_at', { ascending: false })
            .limit(20);
          rows = data ?? [];
        }

        if (!rows.length) {
          setIsLoading(false);
          return;
        }

        const ownerIds = Array.from(new Set(rows.map((v: any) => v.owner_id).filter(Boolean)));
        const videoIds = rows.map((v: any) => v.id);
        const profileMap = new Map<string, { display_name?: string; avatar_url?: string; handle?: string }>();
        const likesMap = new Map<string, number>();

        if (ownerIds.length) {
          const { data: profs } = await supabase
            .from('profiles')
            .select('id,display_name,avatar_url,handle')
            .in('id', ownerIds);
          (profs ?? []).forEach((p: any) => profileMap.set(p.id, p));
        }

        if (videoIds.length) {
          const { data: likes } = await supabase
            .from('video_likes')
            .select('video_id')
            .in('video_id', videoIds);
          (likes ?? []).forEach((r: any) => {
            likesMap.set(r.video_id, (likesMap.get(r.video_id) ?? 0) + 1);
          });
        }

        const mapped: Short[] = rows.map((v: any) => {
          const prof = profileMap.get(v.owner_id) || {};
          const channelHandle = prof.handle || prof.display_name || 'creator';
          return {
            id: v.id,
            src: v.video_url,
            title: v.title,
            channel: '@' + channelHandle,
            avatar: prof.avatar_url,
            description: v.description || '',
            likes: likesMap.get(v.id) ?? 0,
            comments: 0,
            shares: 0,
            music: 'Original Sound — ' + (prof.display_name || 'creator'),
            tags: Array.isArray(v.tags) ? v.tags : [],
          };
        });

        const rankedProNaxShorts = rankShortsByProNaxFYP(mapped);
        setLiveShorts(rankedProNaxShorts);
      } catch {
        /* silent */
      }
      setIsLoading(false);
    })();
  }, [shortIdFromUrl]);

  const allShorts: Short[] = useMemo(() => liveShorts, [liveShorts]);

  const feedItems: FeedItem[] = useMemo(() => {
    const out: FeedItem[] = [];
    allShorts.forEach((s, i) => {
      out.push({ kind: 'short', short: s });
      if ((i + 1) % AD_EVERY_N_SHORTS === 0) {
        out.push({ kind: 'ad', attributeShortId: s.id, key: `ad-${i}-${s.id}` });
      }
    });
    return out;
  }, [allShorts]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const items = Array.from(el.querySelectorAll<HTMLElement>('[data-short-item]'));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.7) {
            const idx = Number(entry.target.getAttribute('data-idx'));
            setActiveIdx(idx);
          }
        });
      },
      { root: el, threshold: [0.7] }
    );
    items.forEach((it) => observer.observe(it));
    return () => observer.disconnect();
  }, [feedItems.length]);


  return (
    <div className="fixed inset-0 lg:static lg:inset-auto lg:flex-1 bg-black flex items-center justify-center font-sans">
      {/* Top Fixed Feed Header Navigation (Following | For You) */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-6 text-white/80 font-bold text-sm tracking-wide drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        <button
          onClick={() => setActiveTab('following')}
          className={`relative py-1 transition-colors ${
            activeTab === 'following' ? 'text-white font-extrabold' : 'text-white/60 hover:text-white'
          }`}
        >
          Following
          {activeTab === 'following' && (
            <motion.div
              layoutId="shortsTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FE2C55] rounded-full shadow-[0_0_8px_#FE2C55]"
            />
          )}
        </button>
        <span className="text-white/30">|</span>
        <button
          onClick={() => setActiveTab('fyp')}
          className={`relative py-1 transition-colors ${
            activeTab === 'fyp' ? 'text-white font-extrabold' : 'text-white/60 hover:text-white'
          }`}
        >
          For You
          {activeTab === 'fyp' && (
            <motion.div
              layoutId="shortsTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#25F4EE] rounded-full shadow-[0_0_8px_#25F4EE]"
            />
          )}
        </button>
      </div>

      {/* Fixed Audio Mute / Unmute Button */}
      <button
        onClick={() => setMuted((m) => !m)}
        className="fixed top-3 right-4 z-[100] w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:scale-105 transition-all shadow-xl"
        aria-label="Toggle sound"
      >
        {muted ? <VolumeX className="w-5 h-5 text-zinc-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
      </button>

      <div
        ref={containerRef}
        className="h-[100dvh] lg:h-[calc(100vh-3rem)] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-contain relative"
      >
        <div className="mx-auto h-full flex items-center justify-center lg:max-w-[440px]">
          {/* Clean Loading Spinner */}
          {isLoading && (
            <div className="h-[100dvh] lg:h-[calc(100vh-3rem)] w-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-[#FE2C55] animate-spin" />
                <p className="text-xs font-medium text-zinc-300 tracking-wider">Loading...</p>
              </div>
            </div>
          )}
          {!isLoading && allShorts.length === 0 && (
            <div className="h-[100dvh] lg:h-[calc(100vh-3rem)] w-full flex items-center justify-center px-6 text-center">
              <div className="space-y-3">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                  <VideoIcon className="w-8 h-8 text-cyan-400" />
                </div>
                <h2 className="text-white font-bold text-lg">No Shorts on FYP</h2>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Upload a vertical short video to start the ProNax Viral Cohort.
                </p>
                <Button asChild size="sm" className="rounded-full bg-[#FE2C55] text-white font-bold">
                  <Link to="/upload">Upload First Short</Link>
                </Button>
              </div>
            </div>
          )}
          {feedItems.map((item, i) => (
            <div
              key={item.kind === 'short' ? item.short.id : item.key}
              data-short-item
              data-idx={i}
              className="h-[100dvh] lg:h-[calc(100vh-3rem)] w-full flex items-center justify-center snap-start snap-always"
              style={{ scrollSnapStop: 'always' }}
            >
              {item.kind === 'short' ? (
                <ShortItem
                  short={item.short}
                  active={i === activeIdx}
                  muted={muted}
                  onOpenSound={() => navigate(`/sound/${item.short.id}`)}
                  onOpenComments={() => setCommentsFor(item.short)}
                />
              ) : (
                <ShortsAdSlide
                  active={i === activeIdx}
                  attributeToVideoId={item.attributeShortId}
                  onAdFinished={() => {
                    const el = containerRef.current;
                    if (!el) return;
                    const next = el.querySelector<HTMLElement>(`[data-idx="${i + 1}"]`);
                    next?.scrollIntoView({ behavior: 'smooth' });
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>


      <CommentsSheet short={commentsFor} onClose={() => setCommentsFor(null)} />
    </div>
  );
}
