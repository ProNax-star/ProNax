/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { LEDGER_LABELS, type BreakdownRow } from '@/hooks/useWalletData';

const EARNING_SOURCES = ['ad_revenue', 'tip', 'membership', 'shorts_fund'] as const;

const SOURCE_COLOR: Record<string, string> = {
  ad_revenue: 'hsl(var(--primary))',
  tip: 'hsl(var(--secondary))',
  membership: 'hsl(160 84% 45%)',
  shorts_fund: 'hsl(45 93% 58%)',
};

interface Props {
  rows: BreakdownRow[];
  currency: string;
  rangeDays: number;
  onRangeChange: (days: number) => void;
  loading?: boolean;
}

const RANGES = [7, 30, 90, 365];

export function EarningsBreakdown({ rows, currency, rangeDays, onRangeChange, loading }: Props) {
  const data = useMemo(
    () =>
      EARNING_SOURCES.map((source) => {
        const row = rows.find((r) => r.source === source);
        return { source, name: LEDGER_LABELS[source], value: Math.max(row?.total ?? 0, 0) };
      }).filter((d) => d.value > 0),
    [rows],
  );

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  return (
    <section className="glass-strong rounded-xl p-4 glow-border-primary">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Earnings by Source
        </h3>
        <div className="flex items-center gap-1">
          {RANGES.map((d) => (
            <button
              key={d}
              onClick={() => onRangeChange(d)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-semibold border transition ${
                rangeDays === d
                  ? 'gradient-primary text-primary-foreground border-primary'
                  : 'glass border-border/40 text-muted-foreground hover:border-primary/40'
              }`}
            >
              {d === 365 ? '1y' : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-56 rounded-lg bg-muted/20 animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">No earnings in this period yet.</p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">
            Ad revenue, tips, memberships and shorts fund payouts appear here as they are earned.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={3}>
                  {data.map((d) => (
                    <Cell key={d.source} fill={SOURCE_COLOR[d.source]} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatMoney(value, { currency })}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total in range</p>
            <p className="text-2xl font-display font-bold text-foreground tabular-nums">
              {formatMoney(total, { currency, precise: true })}
            </p>
            <div className="space-y-1.5 pt-2">
              {data.map((d) => (
                <div key={d.source} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLOR[d.source] }} />
                    {d.name}
                  </span>
                  <span className="tabular-nums text-foreground font-semibold">
                    {formatMoney(d.value, { currency, precise: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default EarningsBreakdown;
