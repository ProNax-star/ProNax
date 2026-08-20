import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Share2, Music2, Play, Volume2, VolumeX, Plus, Check, Video as VideoIcon, Send, Sparkles, Bookmark, Flame, Zap, CheckCircle2 } from 'lucide-react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
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
  const [videoError, setVideoError] = useState(false);

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
      setVideoError(false);
      v.currentTime = 0;
      v.play().then(() => setPaused(false)).catch((err) => {
        console.error('Video autoplay error:', err);
        setVideoError(true);
        setPaused(true);
      });
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
    const onError = () => {
      console.error('Video element error:', v.error);
      setVideoError(true);
      setIsBuffering(false);
    };

    v.addEventListener('timeupdate', onTU);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onEnded);
    v.addEventListener('waiting', onWaiting);
    v.addEventListener('stalled', onStalled);
    v.addEventListener('canplay', onCanPlay);
    v.addEventListener('error', onError);
    return () => {
      v.removeEventListener('timeupdate', onTU);
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onEnded);
      v.removeEventListener('waiting', onWaiting);
      v.removeEventListener('stalled', onStalled);
      v.removeEventListener('canplay', onCanPlay);
      v.removeEventListener('error', onError);
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
    if (v.paused) {
      v.play().then(() => setPaused(false)).catch((err) => {
        console.error('Video play error:', err);
        setVideoError(true);
        setPaused(true);
      });
    } else {
      v.pause();
      setPaused(true);
    }
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
      className="relative w-full h-full snap-start snap-always bg-black select-none"
      style={{ scrollSnapStop: 'always', height: '100dvh' }}
    >
      {/* Centered vertical video container with mobile proportions */}
      <div
        className="relative w-full h-full"
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: '#000',
          height: '100dvh'
        }}
      >
      <div
        onClick={handleVideoTap}
        className="relative w-full h-full overflow-hidden cursor-pointer"
      >
        <video
          ref={videoRef}
          src={short.src}
          loop
          playsInline
          preload="auto"
          muted={muted}
          className="w-full h-full object-cover"
          style={{ 
            width: '100%', 
            height: '100%',
            objectFit: 'cover',
            filter: 'contrast(1.02) saturate(1.05)'
          }}
          onError={() => {
            console.error('Video source error for:', short.src);
            setVideoError(true);
          }}
        />

        {/* Clean Loading Indicator */}
        {isBuffering && active && !videoError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none z-30">
            <div className="w-8 h-8 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          </div>
        )}

        {/* Video Error State */}
        {videoError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm pointer-events-none z-30">
            <VideoIcon className="w-10 h-10 text-zinc-500 mb-2" />
            <span className="text-sm font-medium text-zinc-400">Video unavailable</span>
          </div>
        )}

        {/* Double-Tap Heart Particles */}
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
              <Heart className="w-14 h-14 fill-[#FE2C55] text-[#FE2C55]" />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Live Watching Badge */}
        <div className="absolute top-4 left-4 z-30">
          <LiveWatcherBadge
            videoId={short.id}
            baseViewsCount={(short as any).views_count || Math.round(short.likes * 12)}
            variant="inline"
          />
        </div>

        {/* Clean Gradient Overlays */}
        <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/60 via-transparent to-black/80" />

        {/* Play/Pause Indicator */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: paused ? 1 : 0 }}
          exit={{ scale: 0.6, opacity: 0 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
          <Play className="w-16 h-16 text-white/90 fill-white/90 drop-shadow-lg" />
        </motion.div>

        {/* Clean Right Action Rail */}
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="absolute right-3 bottom-12 z-40 flex flex-col items-center gap-3"
          >
          {/* Profile with Follow Button */}
          <div className="relative">
            <Link
              to="/channel/$handle"
              params={{ handle: short.channel.replace(/^@/, '') }}
              onClick={(e) => e.stopPropagation()}
              className="block w-12 h-12 rounded-full overflow-hidden transition-transform hover:scale-105"
              style={{
                padding: '2px',
                background: 'linear-gradient(45deg, #FE2C55, #25F4EE)',
                boxShadow: '0 0 20px rgba(254,44,85,0.3), 0 0 40px rgba(37,244,238,0.2)'
              }}
            >
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                {short.avatar ? (
                  <img src={short.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] font-bold" style={{ color: '#FE2C55' }}>HisTora</span>
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
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full bg-[#FE2C55] flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-transform"
                style={{ border: '2px solid white', boxShadow: '0 0 15px rgba(254,44,85,0.5)' }}
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
            className="flex flex-col items-center gap-1 group transition-transform active:scale-90"
          >
            <div className="relative bg-black/20 backdrop-blur-sm rounded-full p-1.5">
              <Heart
                className={`w-8 h-8 transition-all duration-300 ${
                  liked ? 'text-[#FE2C55] fill-[#FE2C55] scale-110' : 'text-white'
                }`}
                style={{
                  filter: liked ? 'drop-shadow(0 0 20px rgba(254,44,85,0.6))' : 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))'
                }}
              />
              {liked && (
                <div className="absolute inset-0 w-8 h-8 rounded-full bg-[#FE2C55]/20 animate-ping" />
              )}
            </div>
            <span className="text-[11px] font-semibold text-white">{formatCount(totalLikes)}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments();
            }}
            className="flex flex-col items-center gap-1 group transition-transform active:scale-90"
          >
            <div className="relative bg-black/20 backdrop-blur-sm rounded-full p-1.5">
              <MessageCircle 
                className="w-8 h-8 text-white transition-all duration-300"
                style={{
                  filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))'
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-white">{formatCount(totalComments)}</span>
          </button>

          {/* Save Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleBookmark();
            }}
            className="flex flex-col items-center gap-1 group transition-transform active:scale-90"
          >
            <div className="relative bg-black/20 backdrop-blur-sm rounded-full p-1.5">
              <Bookmark
                className={`w-8 h-8 transition-all duration-300 ${
                  bookmarked ? 'text-[#25F4EE] fill-[#25F4EE] scale-110' : 'text-white'
                }`}
                style={{
                  filter: bookmarked ? 'drop-shadow(0 0 20px rgba(37,244,238,0.6))' : 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))'
                }}
              />
              {bookmarked && (
                <div className="absolute inset-0 w-8 h-8 rounded-full bg-[#25F4EE]/20 animate-ping" />
              )}
            </div>
            <span className="text-[11px] font-semibold text-white">{formatCount(bookmarkCount)}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleShare();
            }}
            className="flex flex-col items-center gap-1 group transition-transform active:scale-90"
          >
            <div className="relative bg-black/20 backdrop-blur-sm rounded-full p-1.5">
              <Share2 
                className="w-8 h-8 text-white transition-all duration-300"
                style={{
                  filter: 'drop-shadow(0 2px 10px rgba(0,0,0,0.5))'
                }}
              />
            </div>
            <span className="text-[11px] font-semibold text-white">{formatCount(short.shares)}</span>
          </button>

          {/* Spinning Disc */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSound();
            }}
            className="w-10 h-10 rounded-full p-[2px] animate-spin-slow transition-transform"
            style={{
              padding: '2px',
              background: 'linear-gradient(45deg, #FE2C55, #25F4EE)',
              boxShadow: '0 0 20px rgba(254,44,85,0.3), 0 0 40px rgba(37,244,238,0.2)'
            }}
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
              {short.avatar ? (
                <img src={short.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[9px] font-bold" style={{ color: '#FE2C55' }}>HisTora</span>
              )}
            </div>
          </motion.button>
          </motion.div>
        </AnimatePresence>

        {/* Bottom Left Creator Info & Audio Marquee */}
        <AnimatePresence>
          {true && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
              className="absolute text-white pointer-events-auto"
              style={{
                position: 'absolute',
                left: '12px',
                bottom: '16px',
                right: '64px',
                zIndex: 30,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}
            >
              <div className="flex items-center gap-2" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Link
                  to="/channel/$handle"
                  params={{ handle: short.channel.replace(/^@/, '') }}
                  onClick={(e) => e.stopPropagation()}
                  className="font-bold text-base hover:underline flex items-center gap-1"
                  style={{
                    textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(37,244,238,0.3)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  <span>{short.channel}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/20" style={{ filter: 'drop-shadow(0 0 6px rgba(37,244,238,0.6))' }} />
                </Link>
                {creatorId && currentUserId !== creatorId && !followed ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!creatorId) return;
                      toggleFollow();
                    }}
                    className="px-3 py-0.5 rounded-full bg-[#FE2C55] text-white text-[11px] font-bold hover:bg-[#e02447] transition-colors"
                    style={{
                      boxShadow: '0 2px 8px rgba(254,44,85,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                  >
                    Follow
                  </button>
                ) : followed ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white border border-white/30" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
                    Following
                  </span>
                ) : null}
              </div>

              {short.title && (
                <p className="text-sm font-semibold leading-snug line-clamp-2" style={{ 
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {short.title}
                </p>
              )}

              {/* Description with Hashtags highlighted in Cyan */}
              <p className="text-xs text-zinc-200 line-clamp-2 leading-relaxed" style={{ 
                textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {short.description.split(' ').map((word, i) =>
                  word.startsWith('#') ? (
                    <span key={i} className="text-[#25F4EE] font-bold mr-1 hover:underline cursor-pointer" style={{ textShadow: '0 0 10px rgba(37,244,238,0.5)' }}>
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
                className="flex items-center gap-2 text-xs font-semibold text-white/90 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 hover:border-cyan-400/50 transition-colors"
                style={{
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
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
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'following' | 'fyp'>('fyp');
  const [commentsFor, setCommentsFor] = useState<Short | null>(null);
  const [liveShorts, setLiveShorts] = useState<Short[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        let rows: any[] | null = null;

        const { data: ranked, error: rankedErr } = await supabase.rpc('get_shorts_feed', {
          p_limit: 30,
          p_offset: 0,
        });
        if (!rankedErr && ranked?.length) {
          rows = ranked;
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

        const mapped: Short[] = rows
          .filter((v: any) => v.video_url && typeof v.video_url === 'string' && v.video_url.startsWith('http'))
          .map((v: any) => {
            const prof = profileMap.get(v.owner_id) || {};
            const channelHandle = prof.handle || prof.display_name || 'creator';
            
            // Fix URL encoding for special characters in filenames
            const videoUrl = v.video_url;
            const encodedVideoUrl = videoUrl.split('/').map((part, index) => {
              // Only encode the filename part (last segment) if it contains special characters
              if (index === videoUrl.split('/').length - 1) {
                return part.replace(/#/g, '%23');
              }
              return part;
            }).join('/');
            
            return {
              id: v.id,
              src: encodedVideoUrl,
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
  }, []);

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
    <div className="fixed inset-0 lg:static lg:inset-auto lg:flex-1 bg-black font-sans">
      {/* Top Fixed Feed Header Navigation (Following | For You) */}
      <div className="fixed top-0 left-0 right-0 h-14 z-50 flex items-center justify-center gap-6 text-white/80 font-bold text-sm tracking-wide bg-black/60 backdrop-blur-md border-b border-white/10">
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
        className="fixed top-4 right-4 z-[60] w-10 h-10 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/20 hover:scale-105 transition-all shadow-xl"
        aria-label="Toggle sound"
      >
        {muted ? <VolumeX className="w-5 h-5 text-zinc-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
      </button>

      <div
        ref={containerRef}
        className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-contain relative bg-black"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {/* Clean Loading Spinner */}
        {isLoading && (
          <div className="h-[100dvh] lg:h-[calc(100vh-3rem)] w-full flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-[#FE2C55] animate-spin" />
              <p className="text-xs font-medium text-zinc-300 tracking-wider">Loading...</p>
            </div>
          </div>
        )}
        {!isLoading && allShorts.length === 0 && (
          <div className="h-[100dvh] lg:h-[calc(100vh-3rem)] w-full flex items-center justify-center px-6 text-center bg-black">
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
              className="h-[100dvh] lg:h-[calc(100vh-3rem)] w-full snap-start snap-always relative overflow-hidden"
              style={{ scrollSnapStop: 'always' }}
            >
              {item.kind === 'short' ? (
                <ShortItem
                  short={item.short}
                  active={i === activeIdx}
                  muted={muted}
                  onOpenSound={() => navigate({ to: '/sound/$id', params: { id: item.short.id } })}
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

      <CommentsSheet short={commentsFor} onClose={() => setCommentsFor(null)} />
    </div>
  );
}
                                                                  