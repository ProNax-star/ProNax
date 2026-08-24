/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Link } from '@tanstack/react-router';
import { Play } from 'lucide-react';
import { compactFormat } from '@/components/ui/animated-counter';
import type { ChannelVideo } from '@/lib/channelData';

export function fmtDuration(s: number | null) {
  if (!s || s <= 0) return '';
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function ChannelVideoCard({ video }: { video: ChannelVideo }) {
  return (
    <Link
      to={video.is_short ? '/shorts/$id' : '/watch/$id'}
      params={{ id: video.id }}
      className="group block"
    >
      <div
        className={`relative overflow-hidden rounded-xl bg-muted/40 border border-border/40 ${
          video.is_short ? 'aspect-[9/16]' : 'aspect-video'
        }`}
      >
        {video.thumb_url ? (
          <img
            src={video.thumb_url}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Play className="w-6 h-6" />
          </div>
        )}
        {fmtDuration(video.duration_seconds) && (
          <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/75 text-[10px] text-white">
            {fmtDuration(video.duration_seconds)}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
        {video.title}
      </h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {compactFormat(video.views_count ?? 0)} views · {timeAgo(video.created_at)}
      </p>
    </Link>
  );
}
