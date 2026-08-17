import { useMemo, useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, DollarSign, Activity, Eye, Percent } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';

export interface RevenueLogLike {
  created_at: string;
  amount_earned?: number | null;
  gross_revenue?: number | null;
  cpm?: number | null;
  views_count?: number | null;
  ad_network?: string | null;
}

type Range = '7d' | '30d' | '90d';

function buildBuckets(range: Range) {
  const now = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const start = new Date(now.getTime() - (days - 1) * 86_400_000);
  const buckets: { key: string; label: string; revenue: number; gross: number; impressions: number; }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    buckets.push({ key, label: key.slice(5), revenue: 0, gross: 0, impressions: 0 });
  }
  return buckets;
}

export function EarningsAnalytics({ logs }: { logs: RevenueLogLike[] }) {
  const [range, setRange] = useState<Range>('30d');

  const { series, kpi } = useMemo(() => {
    const buckets = buildBuckets(range);
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    let totalRevenue = 0, totalGross = 0, totalImpr = 0;
    for (const l of logs) {
      const key = (l.created_at || '').slice(0, 10);
      const i = index.get(key);
      const rev = Number(l.amount_earned ?? 0);
      const gross = Number(l.gross_revenue ?? rev);
      const impr = Number(l.views_count ?? 1);
      totalRevenue += rev; totalGross += gross; totalImpr += impr;
      if (i !== undefined) {
        buckets[i].revenue += rev;
        buckets[i].gross += gross;
        buckets[i].impressions += impr;
      }
    }
    const series = buckets.map((b) => ({
      label: b.label,
      revenue: +b.revenue.toFixed(4),
      ecpm: b.impressions > 0 ? +((b.gross / b.impressions) * 1000).toFixed(3) : 0,
      impressions: b.impressions,
    }));
    const avgEcpm = totalImpr > 0 ? (totalGross / totalImpr) * 1000 : 0;
    const fill = logs.length > 0
      ? logs.filter((l) => Number(l.amount_earned ?? 0) > 0).length / logs.length
      : 0;
    return {
      series,
      kpi: {
        revenue: totalRevenue,
        ecpm: avgEcpm,
        impressions: totalImpr,
        fill,
      },
    };
  }, [logs, range]);

  return (
    <GlassCard className="p-5" tilt={false}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div>
          <h3 className="text-sm font-display font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" /> Earnings Analytics
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Estimated ad revenue and eCPM trend across your channel.
          </p>
        </div>
        <div className="flex items-center gap-1 p-0.5 rounded-lg glass border border-border/40">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`text-[11px] px-2.5 py-1 rounded-md font-semibold uppercase tracking-wider transition ${
                range === r
                  ? 'bg-primary/20 text-primary glow-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Kpi icon={DollarSign} label="Est. Revenue" value={`$${kpi.revenue.toFixed(2)}`} tint="text-emerald-400" />
        <Kpi icon={Activity} label="Avg eCPM" value={`$${kpi.ecpm.toFixed(2)}`} tint="text-cyan-400" />
        <Kpi icon={Eye} label="Impressions" value={kpi.impressions.toLocaleString()} tint="text-violet-400" />
        <Kpi icon={Percent} label="Fill Rate" value={`${(kpi.fill * 100).toFixed(0)}%`} tint="text-amber-400" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Estimated Ad Revenue ($)
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="analytics-revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                <Tooltip
                  contentStyle={{ background: 'hsla(var(--card)/0.95)', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, backdropFilter: 'blur(12px)' }}
                  formatter={(v: number) => [`$${v.toFixed(4)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#analytics-revenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            eCPM Trend ($ per 1k)
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={series} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                <Tooltip
                  contentStyle={{ background: 'hsla(var(--card)/0.95)', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, backdropFilter: 'blur(12px)' }}
                  formatter={(v: number) => [`$${v.toFixed(3)}`, 'eCPM']}
                />
                <Line
                  type="monotone"
                  dataKey="ecpm"
                  stroke="hsl(var(--secondary))"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: 'hsl(var(--secondary))' }}
                  activeDot={{ r: 5, stroke: 'hsl(var(--secondary))', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

function Kpi({ icon: Icon, label, value, tint }: { icon: any; label: string; value: string; tint: string }) {
  return (
    <div className="glass-crystal rounded-xl p-3 border border-border/30">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${tint}`} />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-display font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
