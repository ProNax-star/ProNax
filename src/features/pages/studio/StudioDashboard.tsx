/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Link } from 'react-router-dom';
import {
  Eye, DollarSign, Users, Clock, Upload, TrendingUp,
  MousePointerClick, PlaySquare, BarChart2, MessageSquare,
  ArrowUpRight, Radio, Wallet,
} from 'lucide-react';
import { useStudio } from './StudioLayout';
import { compactFormat } from '@/components/ui/animated-counter';
import { EarningsAnalytics } from '@/components/EarningsAnalytics';
import { useEarningsSeries } from '@/hooks/useEarningsSeries';
import { useAuthSession } from '@/hooks/useAuthSession';

function StatCard({
  label,
  value,
  prefix,
  suffix,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="studio-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#606060]" />
        <span className="text-xs text-[#606060] uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-medium text-[#0f0f0f] tabular-nums">
        {prefix}{compactFormat(value)}{suffix}
      </p>
      {hint && (
        <p className="text-xs text-[#606060] mt-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-green-600" />
          {hint}
        </p>
      )}
    </div>
  );
}

function LatestVideoRow({ video }: { video: { id: string; title: string; thumb_url?: string; views_count?: number; created_at: string } }) {
  return (
    <Link
      to={`/studio/content/${video.id}`}
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#f2f2f2] transition"
    >
      <div className="w-24 h-14 rounded overflow-hidden bg-[#f2f2f2] shrink-0">
        {video.thumb_url ? (
          <img src={video.thumb_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[#e5e5e5]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#0f0f0f] line-clamp-1">{video.title}</p>
        <p className="text-xs text-[#606060]">
          {(video.views_count ?? 0).toLocaleString()} views · {new Date(video.created_at).toLocaleDateString()}
        </p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-[#606060] shrink-0" />
    </Link>
  );
}

export default function StudioDashboard() {
  const { user } = useAuthSession();
  const { loading, videos, totalViews, wallet, followersCount, analytics } = useStudio();
  const { logs: earningsSeries } = useEarningsSeries(user?.id);

  const latestVideos = videos.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-normal text-[#0f0f0f]">Channel dashboard</h1>
        <p className="text-sm text-[#606060] mt-1">
          Get a quick overview of your channel performance.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Views" value={totalViews} icon={Eye} />
        <StatCard label="Revenue" value={Number(wallet.total_earned ?? 0)} prefix="$" icon={DollarSign} />
        <StatCard
          label="Subscribers"
          value={followersCount}
          icon={Users}
          hint={analytics?.subscriber_growth_30d ? `+${analytics.subscriber_growth_30d} in 28 days` : undefined}
        />
        <StatCard label="Watch time (hrs)" value={analytics?.total_watch_hours ?? 0} icon={Clock} />
        <StatCard
          label="Click-through rate"
          value={analytics?.ctr ?? 0}
          suffix="%"
          icon={MousePointerClick}
          hint={analytics?.impressions ? `${analytics.impressions.toLocaleString()} impressions` : undefined}
        />
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="studio-card p-4 lg:col-span-2">
          <h2 className="text-base font-medium text-[#0f0f0f] mb-3">Latest videos</h2>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-[#f2f2f2] rounded-lg animate-pulse" />
              ))}
            </div>
          ) : latestVideos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-[#606060] mb-3">Upload your first video to get started</p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500 text-white text-sm font-medium"
              >
                <Upload className="w-4 h-4" /> Upload videos
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {latestVideos.map((v) => (
                <LatestVideoRow key={v.id} video={v} />
              ))}
              <Link
                to="/studio/content"
                className="block text-sm text-cyan-500 font-medium mt-3 hover:underline"
              >
                Go to channel content →
              </Link>
            </div>
          )}
        </div>

        <div className="studio-card p-4">
          <h2 className="text-base font-medium text-[#0f0f0f] mb-3">Quick actions</h2>
          <div className="space-y-1">
            {[
              { icon: Upload, label: 'Upload videos', to: '/upload' },
              { icon: PlaySquare, label: 'Manage content', to: '/studio/content' },
              { icon: BarChart2, label: 'View analytics', to: '/studio/analytics' },
              { icon: MessageSquare, label: 'Comments', to: '/studio/comments' },
              { icon: Radio, label: 'Go live', to: '/live' },
              { icon: Wallet, label: 'Wallet', to: '/wallet' },
            ].map((a) => (
              <Link
                key={a.to}
                to={a.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#f2f2f2] text-sm text-[#0f0f0f] transition"
              >
                <a.icon className="w-4 h-4 text-[#606060]" />
                {a.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-[#e5e5e5]">
            <p className="text-xs text-[#606060] mb-1">Estimated revenue</p>
            <p className="text-xl font-medium text-[#0f0f0f]">${wallet.balance.toFixed(2)}</p>
            <p className="text-xs text-[#606060]">
              Lifetime ${wallet.total_earned.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      {/* Earnings chart */}
      <div className="studio-theme">
        <div className="studio-card p-4 [&_.glass]:bg-white [&_.glass]:border-[#e5e5e5] [&_.font-display]:font-medium">
          <EarningsAnalytics logs={earningsSeries} />
        </div>
      </div>
    </div>
  );
}
