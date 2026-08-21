import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MessageCircle, Music2, Play, Volume2, VolumeX, Plus, Check, Video as VideoIcon, Send, Sparkles, Bookmark, Flame, Zap, CheckCircle2, Home, Compass, User } from 'lucide-react';
import { Link, useParams, useNavigate } from '@tanstack/react-router';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/loose';
import { useLike, useComments, useFollow, useSave, recordView, recordShare } from '@/hooks/useInteractions';
import { useWatchHeartbeat } from '@/hooks/useWatchHeartbeat';
import { analyticsBus } from '@/lib/analyticsBus';
import { ShortsAdSlide } from '@/components/ShortsAdSlide';
import { rankShortsByProNaxFYP, recordProNaxViewerSignal, calculateProNaxFYPScore, FYPRankingResult } from '@/lib/pronaxShortsAlgorithm';
import { LiveWatcherBadge } from '@/components/LiveWatcherBadge';
import ShareButton from '@/components/ShareButton';

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
  views_count?: number;
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
  hasInteracted,
  onToggleMute,
}: {
  short: Short;
  active: boolean;
  muted: boolean;
  onOpenSound: () => void;
  onOpenComments: () => void;
  hasInteracted: boolean;
  onToggleMute: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([]);
  const [progressPct, setProgressPct] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [watchingCount, setWatchingCount] = useState(0);

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
  const { saved: bookmarked, count: bookmarkCount, toggle: toggleBookmark } = useSave(short.id);

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

  // Dynamic watching count logic
  useEffect(() => {
    if (active && !paused) {
      // Start with at least 1 when playing, then simulate based on views
      const baseViewers = Math.max(1, Math.floor((short as any).views_count / 10) || 1);
      setWatchingCount(baseViewers);
      
      // Simulate live fluctuations
      const interval = setInterval(() => {
        setWatchingCount(prev => {
          const variation = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
          return Math.max(1, prev + variation);
        });
      }, 3000);
      
      return () => clearInterval(interval);
    } else {
      setWatchingCount(0);
    }
  }, [active, paused, (short as any).views_count]);

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
    
    // Clean up any existing play promises to avoid race conditions
    let playPromise: Promise<void> | undefined = undefined;
    
    if (active) {
      setVideoError(false);
      // Only reset time if significantly different to avoid jarring resets
      if (Math.abs(v.currentTime - 0) > 0.5) {
        v.currentTime = 0;
      }
      
      // Small delay to ensure clean state
      const timeoutId = setTimeout(() => {
        // Ensure video is paused before playing to avoid conflicts
        if (!v.paused) {
          try {
            v.pause();
          } catch (e) {
            // Ignore pause errors
          }
        }
        
        // Try autoplay, but handleNotAllowedError gracefully
        try {
          const result = v.play();
          if (result instanceof Promise) {
            playPromise = result;
            playPromise.then(() => setPaused(false)).catch((err) => {
              // Silently handle autoplay restriction and abort errors
              if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                setPaused(true);
                // Don't set videoError for these expected errors
              } else {
                console.error('Video playback error:', err);
                setVideoError(true);
                setPaused(true);
              }
            });
          } else {
            setPaused(false);
          }
        } catch (e) {
          console.error('Play error:', e);
          setPaused(true);
        }
      }, 50);
      
      return () => {
        clearTimeout(timeoutId);
        if (playPromise) {
          playPromise.catch(() => {});
        }
      };
    } else {
      // Pause when inactive
      try {
        v.pause();
      } catch (e) {
        // Ignore pause errors
      }
    }
  }, [active, hasInteracted]);

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
  const lastTapRef = useRef(0);
  const handleVideoTap = (e: React.MouseEvent) => {
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
        setFloatingHearts((prev) => prev.filter((h: FloatingHeart) => h.id !== heartId));
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
      try {
        const result = v.play();
        if (result instanceof Promise) {
          result.then(() => setPaused(false)).catch((err) => {
            // Only log serious errors, not autoplay restrictions or abort errors
            if (err.name !== 'NotAllowedError' && err.name !== 'AbortError') {
              console.error('Video play error:', err);
              setVideoError(true);
            }
            setPaused(true);
          });
        } else {
          setPaused(false);
        }
      } catch (e) {
        console.error('Play error:', e);
        setPaused(true);
      }
    } else {
      try {
        v.pause();
      } catch (e) {
        // Ignore pause errors
      }
      setPaused(true);
    }
  };

  const handleBookmarkToggle = () => {
    toggleBookmark();
  };

  const totalLikes = likeCount;
  const totalComments = comments.length;

  return (
    <section
      className="relative w-full h-full snap-start snap-always bg-black select-none touch-pan-y"
      style={{ 
        scrollSnapStop: 'always', 
        height: '100dvh',
        minHeight: '100dvh',
        maxHeight: '100dvh',
        touchAction: 'pan-y',
        aspectRatio: '9/16',
        paddingBottom: 'env(safe-area-inset-bottom, 20px)'
      }}
    >
      <div className="relative h-full w-full overflow-hidden bg-black md:rounded-2xl" style={{ aspectRatio: '9/16' }}>
        <div className="absolute inset-0 flex items-center justify-center bg-black" onClick={handleVideoTap} style={{ aspectRatio: '9/16' }}>
          <video
            ref={videoRef}
            src={short.src}
            loop
            playsInline
            preload="auto"
            muted={muted}
            className="h-full w-full object-cover"
            style={{ 
              objectFit: 'cover',
              aspectRatio: '9/16',
              width: '100%',
              height: '100%',
              opacity: isBuffering ? 0.5 : 1,
              transition: 'opacity 0.3s ease'
            }}
            onError={(e) => {
              console.error('Video source error for:', short.src, e);
              setVideoError(true);
              setIsBuffering(false);
            }}
            onLoadStart={() => {
              setIsBuffering(true);
            }}
            onCanPlay={() => {
              setIsBuffering(false);
            }}
            onLoadedData={() => {
              setIsBuffering(false);
            }}
            onWaiting={() => {
              setIsBuffering(true);
            }}
            onPlaying={() => {
              setIsBuffering(false);
            }}
          />
        </div>

        {/* Clean Loading Indicator */}
        {isBuffering && active && !videoError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="relative">
              <span className="size-12 animate-spin rounded-full border-3 border-white/30 border-t-[#FE2C55]" />
              <div className="absolute inset-0 bg-black/20 blur-xl rounded-full" />
            </div>
          </div>
        )}

        {/* Video Error State */}
        {videoError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center gap-2 text-center">
            <div>
              <VideoIcon className="mx-auto size-8 text-zinc-500" />
              <p className="mt-2 text-sm text-zinc-400">Video unavailable</p>
            </div>
          </div>
        )}

        {/* Double-Tap Heart Particles */}
        {floatingHearts.map((h: FloatingHeart) => (
          <Heart
            key={h.id}
            style={{ left: h.x, top: h.y }}
            className="pointer-events-none absolute size-20 fill-[#FE2C55] text-[#FE2C55] drop-shadow-xl animate-heart-pop"
          />
        ))}

        {/* Live Watching Badge */}
        {active && watchingCount > 0 && (
          <div className="absolute top-4 left-3 z-30 flex items-center gap-1.5 rounded-full bg-black/30 backdrop-blur-md px-2.5 py-1 text-xs font-semibold">
            <span className="size-1.5 animate-pulse rounded-full bg-[#FE2C55]" />
            {formatCount(watchingCount)} watching
          </div>
        )}

        {/* Clean Gradient Overlays */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/50 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/70 to-transparent" />

        {/* Play/Pause Indicator */}
        {paused && !videoError && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="w-14 h-14 rounded-full bg-black/30 backdrop-blur-md border border-white/20 shadow-[0_8px_20px_rgba(0,0,0,0.4)] flex items-center justify-center transition-all active:scale-90">
              <Play className="text-white text-xl ml-0.5 drop-shadow-md" />
            </div>
          </div>
        )}

        {/* Clean Right Action Rail */}
        <div className="absolute right-2.5 bottom-20 z-30 flex flex-col items-center gap-2">
          {/* Profile with Follow Button */}
          <div className="relative">
            <Link
              to="/channel/$handle"
              params={{ handle: short.channel.replace(/^@/, '') }}
              onClick={(e) => e.stopPropagation()}
              className="block w-7 h-7 rounded-full border-2 border-white/30 overflow-hidden flex-shrink-0 transition-transform hover:scale-105 bg-transparent drop-shadow-lg"
            >
              {short.avatar ? (
                <img src={short.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="grid w-full h-full place-items-center text-white text-xs font-bold">
                  {short.channel[0]?.toUpperCase()}
                </span>
              )}
            </Link>
            {creatorId && currentUserId !== creatorId && !followed && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!creatorId) return;
                  toggleFollow();
                }}
                className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-gradient-to-r from-[#FE2C55] to-[#25F4EE] flex items-center justify-center text-white shadow-lg hover:scale-110 active:scale-95 transition-transform"
              >
                <Plus className="size-2.5" />
              </button>
            )}
          </div>

          {/* Like Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleLike();
            }}
            className="flex flex-col items-center gap-1.5 group transition-transform active:scale-90 relative bg-transparent"
          >
            <div className="relative drop-shadow-lg">
              <Heart className={`size-6 ${liked ? "fill-[#FE2C55] text-[#FE2C55]" : "fill-white text-white"}`} />
              {liked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -inset-2 rounded-full bg-[#FE2C55]/20"
                />
              )}
            </div>
            <span className="text-[10px] font-semibold text-white/90 drop-shadow-md">{formatCount(totalLikes)}</span>
          </button>

          {/* Comment Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenComments();
            }}
            className="flex flex-col items-center gap-1.5 group transition-transform active:scale-90 relative bg-transparent"
          >
            <MessageCircle className="size-6 fill-white text-white drop-shadow-lg" />
            <span className="text-[10px] font-semibold text-white/90 drop-shadow-md">{formatCount(totalComments)}</span>
          </button>

          {/* Save Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleBookmarkToggle();
            }}
            className="flex flex-col items-center gap-1.5 group transition-transform active:scale-90 relative bg-transparent"
          >
            <div className="relative drop-shadow-lg">
              <Bookmark className={`size-6 ${bookmarked ? "fill-[#25F4EE] text-[#25F4EE]" : "fill-white text-white"}`} />
              {bookmarked && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -inset-2 rounded-full bg-[#25F4EE]/20"
                />
              )}
            </div>
            <span className="text-[10px] font-semibold text-white/90 drop-shadow-md">{formatCount(bookmarkCount)}</span>
          </button>

          {/* Share Button - TikTok Style */}
          <ShareButton
            title={short.title}
            text={short.description}
            url={`${window.location.origin}/shorts#${short.id}`}
            variant="tiktok"
            shareCount={short.shares}
            onShareClick={() => recordShare(short.id, 'link').catch(() => {})}
            formatCount={formatCount}
          />

          {/* Spinning Audio Disc - Last Item in Right Action Bar */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            className="w-7 h-7 rounded-full border-2 border-white/30 overflow-hidden bg-transparent drop-shadow-lg transition-transform animate-spin-slow cursor-pointer relative mb-0"
          >
            {short.avatar ? (
              <img src={short.avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="grid w-full h-full place-items-center text-white text-xs font-bold">
                {short.channel[0]?.toUpperCase()}
              </span>
            )}
            {/* Mute indicator overlay */}
            {muted && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <VolumeX className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Left Creator Info */}
        <div className="absolute bottom-28 left-3 max-w-[calc(100%-5.5rem)] z-20">
          <div className="flex flex-col gap-1">
            {/* Creator Info */}
            <div className="flex items-center gap-2">
              <Link
                to="/channel/$handle"
                params={{ handle: short.channel.replace(/^@/, '') }}
                onClick={(e) => e.stopPropagation()}
                className="shrink-0"
              >
                <div className="w-7 h-7 rounded-full border-2 border-white/30 overflow-hidden bg-transparent drop-shadow-lg">
                  {short.avatar ? (
                    <img src={short.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="grid w-full h-full place-items-center text-white text-xs font-bold">
                      {short.channel[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
              </Link>
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-shadow-feed text-xs font-bold text-white">@{short.channel.replace(/^@/, '')}</span>
                  <CheckCircle2 className="size-3 shrink-0 fill-white text-white" />
                </div>
                {creatorId && currentUserId !== creatorId && !followed ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!creatorId) return;
                      toggleFollow();
                    }}
                    className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-black transition active:scale-95"
                  >
                    Follow
                  </button>
                ) : followed ? (
                  <span className="shrink-0 text-[11px] font-bold text-zinc-400">Following</span>
                ) : null}
              </div>
            </div>

            {short.title && (
              <p className="text-shadow-feed line-clamp-1 text-xs text-white">{short.title}</p>
            )}

            {/* Description with Hashtags highlighted in Cyan */}
            {short.description && (
              <p className="text-shadow-feed line-clamp-1 text-xs text-white">
                {short.description.split(' ').map((word, i) =>
                  word.startsWith('#') ? (
                    <span key={i} className="text-[#25F4EE] font-semibold">{word}{' '}</span>
                  ) : (
                    word + ' '
                  )
                )}
              </p>
            )}
          </div>
        </div>

        {/* Scrolling Sound Ticker Marquee */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onOpenSound();
          }}
          className="absolute bottom-20 left-3 flex items-center gap-2 text-[11px] font-semibold text-white/90 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 transition-colors max-w-[calc(100%-5.5rem)] z-20"
          style={{
            boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          <Music2 className="size-3 shrink-0 text-white flex-shrink-0" />
          <div className="min-w-0 overflow-hidden flex-1">
            <div className="flex w-max gap-8 text-[11px] font-semibold whitespace-nowrap text-white animate-marquee">
              <span>🎵 {short.music} — ProNax Original Audio Track</span>
              <span>🎵 {short.music} — ProNax Original Audio Track</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute inset-x-0 bottom-16 h-1 bg-white/15 z-20">
          <div className="h-full bg-gradient-to-r from-[#FE2C55] to-[#25F4EE] transition-[width]" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
    </section>
  );
}

function CommentsSheet({ short, onClose }: { short: Short | null; onClose: () => void }) {
  const [text, setText] = useState('');
  const { comments, post } = useComments(short?.id ?? 'none', null);
  if (!short) return null;
  return (
    <Sheet open={!!short} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl border-zinc-800 bg-zinc-950">
        <SheetHeader className="border-b border-zinc-800 pb-4">
          <SheetTitle className="text-white">{comments.length} Comments</SheetTitle>
          <SheetDescription className="text-zinc-400">{short.title}</SheetDescription>
        </SheetHeader>
        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto py-4">
          {comments.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <MessageCircle className="mb-3 size-8 text-zinc-500" />
              <p className="text-sm text-zinc-400">No comments yet. Be the first to start the conversation!</p>
            </div>
          )}
          {comments.map((c) => (
            <article key={c.id} className="flex gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-full p-[2px]" style={{ background: 'linear-gradient(45deg, #FE2C55, #25F4EE)' }}>
                <span className="grid size-full place-items-center rounded-full bg-zinc-900 text-xs font-bold text-cyan-400">
                  {(c.author?.display_name || c.author?.email || '?')[0]?.toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-zinc-400">
                  {c.author?.display_name || c.author?.email || 'user'} · {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="mt-0.5 text-sm break-words text-white">{c.text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="flex items-center gap-2 border-t border-zinc-800 p-3">
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
          <button
            onClick={() => {
              post(text);
              setText('');
            }}
            className="rounded-full bg-[#FE2C55] hover:bg-[#e02447] text-white font-bold px-4"
          >
            <Send className="size-4" />
          </button>
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
  const [hasInteracted, setHasInteracted] = useState(false);

  // Track user interaction to enable autoplay
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
    };

    const events = ['click', 'touchstart', 'keydown', 'scroll'];
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction);
      });
    };
  }, []);

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
              views_count: v.views_count || 0,
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
      {/* Clean Floating Tabs */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 flex items-center gap-5 z-30 text-white font-semibold text-sm">
        <button
          onClick={() => setActiveTab('following')}
          className={`relative py-1 transition-colors ${
            activeTab === 'following' ? 'text-white font-bold' : 'text-white/70 hover:text-white'
          }`}
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
        >
          Following
          {activeTab === 'following' && (
            <motion.div
              layoutId="shortsTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FE2C55] rounded-full shadow-[0_0_8px_#FE2C55]"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('fyp')}
          className={`relative py-1 transition-colors ${
            activeTab === 'fyp' ? 'text-white font-bold' : 'text-white/70 hover:text-white'
          }`}
          style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
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

      <div
        ref={containerRef}
        className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar overscroll-contain relative bg-black touch-pan-y"
        style={{ 
          scrollSnapType: 'y mandatory', 
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}
      >
        {/* Clean Loading Spinner */}
        {isLoading && (
          <div className="h-[100dvh] w-full flex items-center justify-center bg-black">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-3 border-white/20 border-t-[#FE2C55] animate-spin" />
              <p className="text-xs font-medium text-zinc-300 tracking-wider">Loading...</p>
            </div>
          </div>
        )}
        {!isLoading && allShorts.length === 0 && (
          <div className="h-[100dvh] w-full flex items-center justify-center px-6 text-center bg-black">
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
            className="h-[100dvh] w-full snap-start snap-always relative overflow-hidden touch-pan-y"
            style={{ 
              scrollSnapStop: 'always',
              minHeight: '100dvh',
              maxHeight: '100dvh',
              touchAction: 'pan-y',
              aspectRatio: '9/16'
            }}
          >
            {item.kind === 'short' ? (
              <ShortItem
                short={item.short}
                active={i === activeIdx}
                muted={muted}
                hasInteracted={hasInteracted}
                onOpenSound={() => navigate({ to: '/sound/$id', params: { id: item.short.id } })}
                onOpenComments={() => setCommentsFor(item.short)}
                onToggleMute={() => setMuted((m) => !m)}
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