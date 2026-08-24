/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
// Animated neon-themed skeleton primitives for loading states.
export function NeonSkeletonBlock({ className = '' }: { className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-md bg-primary/5 border border-primary/10 ${className}`}
      style={{ boxShadow: '0 0 12px hsla(var(--primary)/0.08) inset' }}
    >
      <div
        className="absolute inset-0 animate-[neon-shimmer_1.6s_ease-in-out_infinite]"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, hsla(var(--primary)/0.18) 45%, hsla(var(--secondary)/0.22) 55%, transparent 100%)',
        }}
      />
      <style>{`@keyframes neon-shimmer { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }`}</style>
    </div>
  );
}

/**
 * Mirrors the exact shape of <FeedVideoCard />: edge-to-edge 16:9 thumbnail on
 * mobile, avatar + 2-line title + meta row underneath. Keeps CLS at zero when
 * real cards swap in.
 */
export function VideoCardSkeleton() {
  return (
    <div className="w-full min-w-0 px-3 sm:px-0">
      <NeonSkeletonBlock className="aspect-video w-full rounded-2xl sm:rounded-lg" />
      <div className="grid grid-cols-[minmax(0,1fr)_28px] items-start gap-2 pt-2 sm:grid-cols-[36px_minmax(0,1fr)_28px]">
        <NeonSkeletonBlock className="hidden h-9 w-9 shrink-0 rounded-full sm:block" />
        <div className="min-w-0 space-y-2">
          <NeonSkeletonBlock className="h-[15px] w-11/12 rounded" />
          <NeonSkeletonBlock className="h-3 w-3/5 rounded" />
          <NeonSkeletonBlock className="h-3 w-2/5 rounded" />
        </div>
        <NeonSkeletonBlock className="h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

/** Card-shaped skeleton grid that matches the shared `.video-grid` rhythm. */
export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Skeleton for playlist / collection tiles. */
export function PlaylistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 p-4">
          <NeonSkeletonBlock className="mb-3 aspect-video w-full rounded-lg" />
          <NeonSkeletonBlock className="h-4 w-3/4 rounded" />
          <NeonSkeletonBlock className="mt-2 h-3 w-1/3 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton rows for search suggestion lists. */
export function SearchResultSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <NeonSkeletonBlock className="h-12 w-20 shrink-0 rounded-md" />
          <div className="min-w-0 flex-1 space-y-2">
            <NeonSkeletonBlock className="h-3.5 w-3/4 rounded" />
            <NeonSkeletonBlock className="h-2.5 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StudioTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-none">
          <NeonSkeletonBlock className="w-24 h-14 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <NeonSkeletonBlock className="h-3 w-3/4" />
            <NeonSkeletonBlock className="h-2.5 w-1/3" />
          </div>
          <NeonSkeletonBlock className="hidden sm:block h-3 w-14" />
          <NeonSkeletonBlock className="hidden sm:block h-3 w-14" />
          <NeonSkeletonBlock className="hidden sm:block h-3 w-16" />
        </div>
      ))}
    </div>
  );
}
