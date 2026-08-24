/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useState, useEffect } from 'react';
import { Eye, Clock, Users, MousePointerClick, TrendingUp, Globe } from 'lucide-react';
import { useStudio } from './StudioLayout';
import { EarningsAnalytics } from '@/components/EarningsAnalytics';
import { useEarningsSeries } from '@/hooks/useEarningsSeries';
import { useAuthSession } from '@/hooks/useAuthSession';
import { compactFormat } from '@/components/ui/animated-counter';
import { supabase } from '@/integrations/supabase/loose';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type Range = '7d' | '28d' | '90d' | '365d';

interface ChannelAnalyticsData {
  realTimeViews: {
    '48h': number;
    '60m': number;
    timestamps: Array<{
      time: string;
      label: string;
      views: number;
    }>;
  };
  topGeographies: Array<{
    countryCode: string;
    countryName: string;
    percentage: number;
  }>;
}

export default function StudioAnalytics() {
  const { user } = useAuthSession();
  const { loading, totalViews, followersCount, analytics, videos } = useStudio();
  const { logs: earningsSeries } = useEarningsSeries(user?.id);
  const [range, setRange] = useState<Range>('28d');
  const [channelAnalytics, setChannelAnalytics] = useState<ChannelAnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const viewsSeries = videos.slice(0, 14).reverse().map((v, i) => ({
    label: `V${i + 1}`,
    views: v.views_count ?? 0,
    name: (v.title ?? '').slice(0, 20),
  }));

  const tabs = ['Overview', 'Reach', 'Engagement', 'Audience', 'Revenue'];
  const [activeTab, setActiveTab] = useState('Overview');

  // Fetch channel analytics data
  useEffect(() => {
    const fetchChannelAnalytics = async () => {
      if (!user?.id) return;
      setAnalyticsLoading(true);
      try {
        const { data, error } = await (supabase.rpc as any)('get_channel_analytics', { p_user_id: user.id });
        if (error) {
          console.error('Error fetching channel analytics:', error);
        } else {
          setChannelAnalytics(data as unknown as ChannelAnalyticsData);
        }
      } catch (err) {
        console.error('Error fetching channel analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchChannelAnalytics();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-normal text-[#0f0f0f]">Channel analytics</h1>
          <p className="text-sm text-[#606060] mt-1">See how your content is performing</p>
        </div>
        <div className="flex gap-1 bg-white border border-[#e5e5e5] rounded-lg p-1">
          {(['7d', '28d', '90d', '365d'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                range === r ? 'bg-[#0f0f0f] text-white' : 'text-[#606060] hover:bg-[#f2f2f2]'
              }`}
            >
              {r === '7d' ? 'Last 7 days' : r === '28d' ? 'Last 28 days' : r === '90d' ? 'Last 90 days' : 'Last 365 days'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#e5e5e5]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition ${
              activeTab === tab
                ? 'border-[#0f0f0f] text-[#0f0f0f]'
                : 'border-transparent text-[#606060] hover:text-[#0f0f0f]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Views', value: totalViews, icon: Eye },
          { label: 'Watch time (hours)', value: analytics?.total_watch_hours ?? 0, icon: Clock },
          { label: 'Subscribers', value: followersCount, icon: Users, hint: analytics?.subscriber_growth_30d ? `+${analytics.subscriber_growth_30d}` : undefined },
          { label: 'Impressions CTR', value: analytics?.ctr ?? 0, suffix: '%', icon: MousePointerClick },
        ].map((k) => (
          <div key={k.label} className="studio-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <k.icon className="w-4 h-4 text-[#606060]" />
              <span className="text-xs text-[#606060]">{k.label}</span>
            </div>
            <p className="text-2xl font-medium text-[#0f0f0f] tabular-nums">
              {compactFormat(k.value)}{(k as { suffix?: string }).suffix ?? ''}
            </p>
            {(k as { hint?: string }).hint && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> {(k as { hint?: string }).hint} in 28 days
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Views by video chart */}
      {!loading && viewsSeries.length > 0 && (
        <div className="studio-card p-4">
          <h2 className="text-base font-medium text-[#0f0f0f] mb-4">Views by video</h2>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={viewsSeries}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#606060' }} />
              <YAxis tick={{ fontSize: 11, fill: '#606060' }} />
              <Tooltip
                contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 12 }}
              />
              <Area type="monotone" dataKey="views" stroke="#06b6d4" fill="url(#viewsGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Revenue */}
      <div className="studio-card p-4 [&_.glass]:bg-white [&_.glass]:border-[#e5e5e5]">
        <EarningsAnalytics logs={earningsSeries} />
      </div>

      {analytics?.impressions !== undefined && (
        <div className="studio-card p-4">
          <h2 className="text-base font-medium text-[#0f0f0f] mb-2">Reach</h2>
          <p className="text-3xl font-medium text-[#0f0f0f]">{analytics.impressions.toLocaleString()}</p>
          <p className="text-sm text-[#606060]">Impressions in selected period</p>
        </div>
      )}

      {/* Real-time Views */}
      {channelAnalytics && (
        <div className="studio-card p-4">
          <h2 className="text-base font-medium text-[#0f0f0f] mb-4">Real-time Views</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-[#606060] mb-1">Last 48 hours</p>
              <p className="text-2xl font-medium text-[#0f0f0f]">{compactFormat(channelAnalytics.realTimeViews['48h'])}</p>
            </div>
            <div>
              <p className="text-xs text-[#606060] mb-1">Last 60 minutes</p>
              <p className="text-2xl font-medium text-[#0f0f0f]">{compactFormat(channelAnalytics.realTimeViews['60m'])}</p>
            </div>
          </div>
          {channelAnalytics.realTimeViews.timestamps.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={channelAnalytics.realTimeViews.timestamps}>
                  <defs>
                    <linearGradient id="realtimeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: '#606060' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis tick={{ fontSize: 10, fill: '#606060' }} />
                  <Tooltip
                    contentStyle={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 8, fontSize: 11 }}
                    formatter={(value: number) => [value, 'Views']}
                    labelFormatter={(label) => `Time: ${label}`}
                  />
                  <Area type="monotone" dataKey="views" stroke="#06b6d4" fill="url(#realtimeGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Top Geographies */}
      {channelAnalytics && channelAnalytics.topGeographies.length > 0 && (
        <div className="studio-card p-4">
          <h2 className="text-base font-medium text-[#0f0f0f] mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Top Geographies
          </h2>
          <div className="space-y-3">
            {channelAnalytics.topGeographies.map((geo, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{geo.countryCode === '🌍' ? '🌍' : geo.countryCode}</span>
                  <span className="text-sm text-[#0f0f0f]">{geo.countryName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-[#e5e5e5] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#065fd4] rounded-full"
                      style={{ width: `${geo.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-[#0f0f0f] w-12 text-right">{geo.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
