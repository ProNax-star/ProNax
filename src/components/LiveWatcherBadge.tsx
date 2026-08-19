import React from 'react';
import { motion } from 'framer-motion';
import { Eye, Users } from 'lucide-react';
import { useLiveWatchers } from '@/hooks/useLiveWatchers';

interface LiveWatcherBadgeProps {
  videoId?: string | null;
  baseViewsCount?: number;
  variant?: '3d-overlay' | 'inline' | 'compact';
  className?: string;
  showText?: boolean;
}

export const LiveWatcherBadge: React.FC<LiveWatcherBadgeProps> = ({
  videoId,
  baseViewsCount = 0,
  variant = '3d-overlay',
  className = '',
  showText = true,
}) => {
  const { liveCount, formattedCount } = useLiveWatchers(videoId, baseViewsCount);

  // Don't show badge if count is 0 (no real viewers yet)
  if (liveCount === 0) return null;

  if (variant === '3d-overlay') {
    return (
      <div
        className={`relative inline-flex items-center gap-2 py-1 px-2.5 rounded-full select-none
          bg-gradient-to-b from-zinc-900/90 via-black/80 to-zinc-950/95
          backdrop-blur-md border border-red-500/40
          shadow-[0_6px_20px_rgba(254,44,85,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)]
          transform hover:scale-105 transition-all duration-300 ${className}`}
        style={{
          boxShadow: '0 8px 24px -2px rgba(239, 68, 68, 0.35), inset 0 1px 2px rgba(255, 255, 255, 0.25), inset 0 -2px 4px rgba(0,0,0,0.8)',
        }}
      >
        {/* Glowing 3D Live Red Radar Beacon */}
        <span className="relative flex h-2.5 w-2.5 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-80" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-gradient-to-r from-red-500 to-rose-600 shadow-[0_0_10px_#ef4444]" />
        </span>

        {/* Live Badge Label */}
        <span className="text-[10px] font-black uppercase tracking-wider text-red-400 font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          LIVE
        </span>

        {/* Eye / User Icon */}
        <Eye className="w-3.5 h-3.5 text-zinc-200 drop-shadow shrink-0 ml-0.5" />

        {/* Live Counter with Smooth Motion Digit Swap */}
        <motion.span
          key={liveCount}
          initial={{ y: -4, opacity: 0.5, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.18 }}
          className="text-xs font-bold text-white tracking-tight drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
        >
          {formattedCount}
        </motion.span>


        {showText && (
          <span className="text-[10px] font-medium text-zinc-300 drop-shadow hidden sm:inline">
            watching
          </span>
        )}
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full
          bg-gradient-to-r from-red-950/40 via-red-900/20 to-zinc-900/60
          border border-red-500/30 text-red-300 text-xs font-medium
          shadow-[0_2px_10px_rgba(239,68,68,0.15)] ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
        </span>
        <span className="font-bold font-mono text-[11px] text-white">
          {formattedCount}
        </span>
        <span className="text-[10px] text-red-300/90 font-medium">watching live</span>
      </div>
    );
  }

  // Compact variant
  return (
    <div className={`inline-flex items-center gap-1 text-xs font-medium text-red-400 ${className}`}>
      <Users className="w-3.5 h-3.5 text-red-500 animate-pulse" />
      <span className="font-bold text-white">{formattedCount}</span>
    </div>
  );
};
