/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState, useCallback } from 'react';
import { Gavel, Check, Trash2, Ban, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { moderationQueue } from '@/lib/moderationQueue';
import { offsetPage } from '@/lib/paginate';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass-strong rounded-2xl border border-border/40 p-4 lg:p-5">{children}</div>;
}

function Loading() {
  return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
}

/** Wrap a moderationQueue.enqueue promise with a friendly toast on final failure. */
function enqueueMod(name: string, args: Record<string, unknown>, okMsg: string) {
  return moderationQueue.enqueue(name, args).then(
    () => { toast.success(okMsg); },
    (err: Error) => { toast.error(err.message || 'Moderation action failed'); },
  );
}

export function ModerationQueueTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('moderation_queue').select('id,content_type,content_id,owner_id,status,flagged_reason,snapshot,created_at,reviewed_by,reviewed_at', { count: 'exact' }).order('created_at', { ascending: false });
    if (filter === 'pending') q = q.eq('status', 'pending');
    
    const { data, error, count } = await offsetPage(q, page, pageSize);
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setTotal(count || 0);
    setLoading(false);
  }, [filter, page, pageSize]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin:moderation-queue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_queue' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const approve = (id: string) => {
    void enqueueMod('admin_approve_moderation', { p_queue_id: id }, 'Content approved & published');
  };

  const rejectAndBan = (id: string, ban: boolean) => {
    const reason = prompt(ban
      ? 'Reason for permanent delete + BAN (shown to user):'
      : 'Reason for permanent delete (shown to user):') ?? '';
    if (ban && !confirm('Permanently DELETE this content AND BAN the user? This cannot be undone via the same action.')) return;
    void enqueueMod('admin_reject_moderation',
      { p_queue_id: id, p_ban_user: ban, p_reason: reason || null },
      ban ? 'Content deleted & user banned' : 'Content deleted');
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Gavel className="w-3.5 h-3.5 text-primary" /> Moderation review queue
          <span className="text-[10px] text-emerald-400 font-normal">● live</span>
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['pending', 'all'] as const).map(f => (
              <button key={f} onClick={() => { setFilter(f); setPage(0); }} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                filter === f ? 'gradient-primary text-primary-foreground border-primary' : 'glass border-border/40 text-muted-foreground'
              }`}>{f.toUpperCase()}</button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-muted/50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= total} className="p-1 rounded hover:bg-muted/50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map(r => {
          const snap = r.snapshot ?? {};
          const isComment = r.content_type === 'comment';
          return (
            <div key={r.id} className="glass rounded-xl border border-border/30 p-3">
              <div className="flex items-start gap-3 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-destructive/20 text-destructive'
                }`}>{r.status}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary uppercase tracking-wider">{r.content_type}</span>
                <span className="text-[10px] text-muted-foreground">{r.flagged_reason}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-2 text-xs">
                {isComment ? (
                  <>
                    <div className="text-muted-foreground text-[10px]">on video <span className="font-mono">{snap.video_id}</span></div>
                    <p className="mt-1 whitespace-pre-wrap bg-muted/20 rounded p-2 border border-border/30">{snap.text || '—'}</p>
                  </>
                ) : (
                  <>
                    <div className="font-semibold">{snap.title || '(no title)'}</div>
                    <p className="text-muted-foreground text-[11px] mt-0.5 whitespace-pre-wrap">{snap.description || ''}</p>
                  </>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">
                  Owner: <span className="font-mono">{r.owner_id}</span> · Content id: <span className="font-mono">{r.content_id}</span>
                </div>
              </div>
              {r.status === 'pending' && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button onClick={() => approve(r.id)} className="text-[10px] px-2.5 py-1 rounded glass border border-emerald-400/40 text-emerald-300 hover:border-emerald-400">
                    <Check className="w-3 h-3 inline mr-1" /> Approve content
                  </button>
                  <button onClick={() => rejectAndBan(r.id, false)} className="text-[10px] px-2.5 py-1 rounded glass border border-border/40 hover:border-destructive/60">
                    <Trash2 className="w-3 h-3 inline mr-1" /> Delete only
                  </button>
                  <button onClick={() => rejectAndBan(r.id, true)} className="text-[10px] px-2.5 py-1 rounded glass border border-destructive/50 text-destructive hover:border-destructive">
                    <Ban className="w-3 h-3 inline mr-1" /> Delete & Ban user
                  </button>
                </div>
              )}
              {r.status !== 'pending' && r.reviewed_by && (
                <div className="text-[10px] text-muted-foreground mt-2">
                  Reviewed by <span className="font-mono">{r.reviewed_by}</span> · {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : ''}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Queue is clean — no items to review.</p>}
      </div>
    </Card>
  );
}
