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

export function VideoCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="aspect-video w-full rounded-none sm:rounded-lg bg-gray-800 animate-pulse" />
      <div className="flex items-start gap-3 px-3">
        <div className="w-9 h-9 rounded-full bg-gray-700 shrink-0 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-11/12 bg-gray-700 rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function VideoGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <VideoCardSkeleton key={i} />
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
