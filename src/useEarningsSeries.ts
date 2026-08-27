/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;
import type { RevenueLogLike } from '@/components/EarningsAnalytics';

/**
 * Aggregates real earnings entries from:
 *  - revenue_logs         (per-view CPM records)
 *  - creator_earnings     (Hot-SQL ledger, if migration applied)
 *  - analytics_events     (impression counts, if migration applied)
 *
 * Missing tables are ignored gracefully so the dashboard works both
 * before and after the Hot-SQL migration is applied.
 */
export function useEarningsSeries(userId: string | undefined) {
  const [logs, setLogs] = useState<RevenueLogLike[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) { setLogs([]); setLoading(false); return; }
    setLoading(true);
    const sinceIso = new Date(Date.now() - 120 * 86_400_000).toISOString();

    const safe = async (q: Promise<any>) => {
      try { const r = await q; return r?.error ? [] : (r?.data ?? []); }
      catch { return []; }
    };

    const [rev, earn, evt] = await Promise.all([
      safe(supabase.from('revenue_logs')
        .select('created_at,amount_earned,gross_revenue,cpm,views_count,ad_network')
        .eq('user_id', userId).gte('created_at', sinceIso)),
      safe(supabase.from('creator_earnings')
        .select('created_at,total_earned,gross_amount,cpm,impressions,source')
        .or(`user_id.eq.${userId},creator_id.eq.${userId}`)
        .gte('created_at', sinceIso)),
      safe(supabase.from('analytics_events')
        .select('created_at,event_type,revenue,gross_revenue,cpm')
        .eq('user_id', userId).gte('created_at', sinceIso)),
    ]);

    const merged: RevenueLogLike[] = [
      ...rev.map((r: any) => ({
        created_at: r.created_at,
        amount_earned: r.amount_earned,
        gross_revenue: r.gross_revenue,
        cpm: r.cpm,
        views_count: r.views_count,
        ad_network: r.ad_network,
      })),
      ...earn.map((r: any) => ({
        created_at: r.created_at,
        amount_earned: r.total_earned,
        gross_revenue: r.gross_amount ?? r.total_earned,
        cpm: r.cpm,
        views_count: r.impressions ?? 1,
        ad_network: r.source ?? 'ledger',
      })),
      ...evt
        .filter((r: any) => r.event_type === 'ad_impression' || r.event_type === 'view')
        .map((r: any) => ({
          created_at: r.created_at,
          amount_earned: Number(r.revenue ?? 0),
          gross_revenue: Number(r.gross_revenue ?? r.revenue ?? 0),
          cpm: r.cpm,
          views_count: 1,
          ad_network: r.event_type,
        })),
    ];

    setLogs(merged);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`earnings:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'revenue_logs', filter: `user_id=eq.${userId}` }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'creator_earnings', filter: `user_id=eq.${userId}` }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'creator_earnings', filter: `creator_id=eq.${userId}` }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'analytics_events', filter: `user_id=eq.${userId}` }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, fetchAll]);

  return { logs, loading, refresh: fetchAll };
}
