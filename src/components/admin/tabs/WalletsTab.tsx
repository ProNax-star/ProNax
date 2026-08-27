/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus, Minus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { offsetPage } from '@/lib/paginate';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass-strong rounded-2xl border border-border/40 p-4 lg:p-5">{children}</div>;
}

function Loading() {
  return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
}

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg glass border border-border/40 p-3">
    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{value}</p>
  </div>
);

export function WalletsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, p] = await Promise.all([
      offsetPage(supabase.from('user_wallets').select('user_id,balance,total_earned,total_withdrawn', { count: 'exact' }), page, pageSize),
      supabase.from('platform_revenue' as any).select('amount, gross_revenue, cpm, ad_network, created_at').order('created_at', { ascending: false }).limit(100),
    ]);
    if (w.error) toast.error(w.error.message);
    setRows(w.data ?? []);
    setTotal(w.count || 0);
    setPlatform((p.data as any[]) ?? []);
    setLoading(false);
  }, [page, pageSize]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin:wallets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_wallets' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_revenue' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const stats = useMemo(() => {
    const totalPlatform = platform.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const totalGross = platform.reduce((s, r) => s + Number(r.gross_revenue ?? 0), 0);
    const withCpm = platform.filter(r => r.cpm != null);
    const avgCpm = withCpm.length ? withCpm.reduce((s, r) => s + Number(r.cpm), 0) / withCpm.length : 0;
    const filled = platform.filter(r => Number(r.gross_revenue ?? 0) > 0).length;
    const fillRate = platform.length ? (filled / platform.length) * 100 : 0;
    const byNetwork = new Map<string, number>();
    platform.forEach(r => byNetwork.set(r.ad_network ?? 'unknown', (byNetwork.get(r.ad_network ?? 'unknown') ?? 0) + Number(r.amount ?? 0)));
    return { totalPlatform, totalGross, avgCpm, fillRate, byNetwork: Array.from(byNetwork.entries()) };
  }, [platform]);

  const adjust = async (userId: string, delta: number) => {
    const reason = prompt(`Reason for ${delta > 0 ? 'credit' : 'debit'} of $${Math.abs(delta)} (logged to ledger):`) ?? '';
    const { error } = await supabase.rpc('admin_adjust_wallet' as any, {
      p_user_id: userId, p_delta: delta, p_reason: reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success(`Balance ${delta > 0 ? '+' : ''}${delta}`); load();
  };
  const override = async (userId: string) => {
    const v = prompt('Set wallet balance to (USD):');
    if (!v) return;
    const n = Number(v);
    if (isNaN(n) || n < 0) return toast.error('Invalid amount');
    const reason = prompt('Reason for balance override (logged to ledger):') ?? '';
    const { error } = await supabase.rpc('admin_adjust_wallet' as any, {
      p_user_id: userId, p_delta: 0, p_set_balance: n, p_reason: reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Balance overridden'); load();
  };

  if (loading) return <Loading />;
  return (
    <>
      <Card>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Ad network performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <MiniStat label="Platform revenue (40%)" value={`$${stats.totalPlatform.toFixed(4)}`} />
          <MiniStat label="Gross ad revenue" value={`$${stats.totalGross.toFixed(4)}`} />
          <MiniStat label="Avg live CPM" value={`$${stats.avgCpm.toFixed(2)}`} />
          <MiniStat label="Fill rate" value={`${stats.fillRate.toFixed(0)}%`} />
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {stats.byNetwork.map(([net, amt]) => (
            <span key={net} className="px-2 py-1 rounded-full glass border border-border/40">
              {net}: <span className="text-primary font-semibold">${amt.toFixed(4)}</span>
            </span>
          ))}
        </div>
      </Card>
      <div className="h-4" />
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">User wallets</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-muted/50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs">Page {page + 1} of {Math.ceil(total / pageSize) || 1}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= total} className="p-1 rounded hover:bg-muted/50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/30">
              <th className="py-2 pr-3">User ID</th>
              <th className="py-2 pr-3">Balance</th>
              <th className="py-2 pr-3">Total earned</th>
              <th className="py-2 pr-3">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.user_id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="py-2 pr-3 font-mono text-[10px]">{r.user_id}</td>
                <td className="py-2 pr-3 font-semibold text-emerald-400">${Number(r.balance).toFixed(4)}</td>
                <td className="py-2 pr-3">${Number(r.total_earned).toFixed(4)}</td>
                <td className="py-2 pr-3">
                  <div className="flex gap-1">
                    <button onClick={() => adjust(r.user_id, 1)} className="px-2 py-1 rounded glass border border-border/40 hover:border-emerald-400/60 text-[10px]"><Plus className="w-3 h-3 inline" />$1</button>
                    <button onClick={() => adjust(r.user_id, -1)} className="px-2 py-1 rounded glass border border-border/40 hover:border-destructive/60 text-[10px]"><Minus className="w-3 h-3 inline" />$1</button>
                    <button onClick={() => override(r.user_id)} className="px-2 py-1 rounded glass border border-border/40 hover:border-primary/60 text-[10px]">Override</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No wallets yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
    </>
  );
}
