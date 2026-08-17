import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/loose';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Loader2, TrendingDown } from 'lucide-react';

interface Bucket {
  pct: number;
  threshold_seconds: number;
  viewers_reached: number;
  retention_pct: number;
}

interface RetentionData {
  duration_seconds: number;
  total_viewers: number;
  buckets: Bucket[];
}

/**
 * Retention chart: for each 10% of the video, shows the % of viewers who
 * reached that point. Sourced from watch_history via get_video_retention RPC.
 */
export function VideoRetentionChart({ videoId, videoTitle }: { videoId: string; videoTitle?: string }) {
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    supabase.rpc('get_video_retention', { p_video: videoId }).then(({ data, error }) => {
      if (!alive) return;
      if (error) { setError(error.message); setLoading(false); return; }
      setData(data as unknown as RetentionData);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [videoId]);

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }
  if (error) {
    return <p className="text-xs text-destructive">Retention unavailable: {error}</p>;
  }
  if (!data || !data.buckets?.length) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center">
        <TrendingDown className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Not enough viewers yet to chart retention.</p>
        <p className="text-[11px] text-muted-foreground/70">Retention builds as people watch this video.</p>
      </div>
    );
  }

  const rows = data.buckets.map((b) => ({
    pct: `${b.pct}%`,
    retention: b.retention_pct,
    viewers: b.viewers_reached,
    seconds: b.threshold_seconds,
  }));

  // Biggest drop-off between consecutive buckets
  let biggestDropAt = 0;
  let biggestDrop = 0;
  for (let i = 1; i < data.buckets.length; i++) {
    const drop = data.buckets[i - 1].retention_pct - data.buckets[i].retention_pct;
    if (drop > biggestDrop) { biggestDrop = drop; biggestDropAt = data.buckets[i].pct; }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Audience Retention</p>
          <p className="text-sm font-display font-semibold truncate max-w-[260px]">{videoTitle}</p>
        </div>
        <div className="flex gap-4 text-[11px] text-muted-foreground">
          <span><b className="text-foreground">{data.total_viewers}</b> viewers</span>
          <span><b className="text-foreground">{Math.floor(data.duration_seconds / 60)}m {data.duration_seconds % 60}s</b> length</span>
          {biggestDrop > 0 && (
            <span className="text-amber-400">
              biggest drop-off at <b>{biggestDropAt}%</b> (−{biggestDrop.toFixed(1)}pp)
            </span>
          )}
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
            <defs>
              <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.4)" vertical={false} />
            <XAxis dataKey="pct" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
            <YAxis
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
              formatter={(value: number, _name: string, entry: { payload?: { viewers?: number; seconds?: number } }) => [
                `${value}% (${entry.payload?.viewers ?? 0} viewers, ~${entry.payload?.seconds ?? 0}s)`,
                'Reached',
              ]}
            />
            <Bar dataKey="retention" fill="url(#retentionFill)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
