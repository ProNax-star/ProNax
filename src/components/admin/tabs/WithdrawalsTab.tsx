/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState, useCallback } from 'react';
import { Wallet, Check, X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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

export function WithdrawalsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error, count } = await offsetPage(
      supabase.from('withdrawal_requests').select('id,user_id,amount,destination,status,payment_details,created_at,processed_at', { count: 'exact' }),
      page,
      pageSize
    );
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setTotal(count || 0);
    setLoading(false);
  }, [page, pageSize]);
  useEffect(() => { load(); }, [load]);

  // Live updates
  useEffect(() => {
    const ch = supabase
      .channel('admin:withdrawals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const decide = async (r: any, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('withdrawal_requests').update({ status }).eq('id', r.id);
    if (error) return toast.error(error.message);
    if (status === 'approved') {
      await supabase.rpc('admin_adjust_wallet' as any, { p_user_id: r.user_id, p_delta: -Number(r.amount) });
    }
    toast.success(`Withdrawal ${status}`); load();
  };

  const markProcessed = async (r: any) => {
    const note = prompt('Optional payout reference / note:') ?? undefined;
    const { error } = await supabase.rpc('admin_mark_withdrawal_processed' as any, { p_request_id: r.id, p_note: note });
    if (error) return toast.error(error.message);
    toast.success('Marked as processed'); load();
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Withdrawal requests</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-muted/50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs">Page {page + 1}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= total} className="p-1 rounded hover:bg-muted/50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="glass rounded-xl border border-border/30 p-3 flex items-center gap-3">
            <Wallet className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold">${Number(r.amount).toFixed(2)} USD · {r.method || 'N/A'} {r.country ? `(${r.country})` : ''}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {r.payment_details?.name ? `${r.payment_details.name} · ` : ''}{r.destination || '—'}
              </div>
              <div className="text-[10px] text-muted-foreground">User: {r.user_id} · <span className={
                r.status === 'processed' ? 'text-emerald-400' :
                r.status === 'approved' ? 'text-primary' :
                r.status === 'rejected' ? 'text-destructive' : 'text-yellow-400'
              }>{r.status}</span>{r.processed_at ? ` · paid ${new Date(r.processed_at).toLocaleDateString()}` : ''}</div>
            </div>
            <div className="flex gap-1.5">
              {r.status === 'pending' && (
                <>
                  <button onClick={() => decide(r, 'approved')} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-emerald-400/60"><Check className="w-3 h-3 inline" /> Approve</button>
                  <button onClick={() => decide(r, 'rejected')} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-destructive/60"><X className="w-3 h-3 inline" /> Reject</button>
                </>
              )}
              {r.status === 'approved' && (
                <button onClick={() => markProcessed(r)} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-primary/60"><Check className="w-3 h-3 inline" /> Mark Paid</button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No withdrawal requests.</p>}
      </div>
    </Card>
  );
}
