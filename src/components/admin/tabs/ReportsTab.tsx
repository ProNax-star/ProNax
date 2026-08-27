/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState, useCallback } from 'react';
import { Flag, Check, X, Trash2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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

export function ReportsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    let dbReports: any[] = [];
    try {
      const { data, count } = await supabase
        .from('video_reports')
        .select('id,video_id,reason,details,status,created_at', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      const paginatedQuery = offsetPage(supabase.from('video_reports').select('id,video_id,reason,details,status,created_at'), page, pageSize);
      const { data: pageData } = await paginatedQuery;
      
      if (data) dbReports = data;
      if (count) setTotal(count);
    } catch {
      // Fallback
    }

    setRows(dbReports);
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => { load(); }, [load]);

  // Live updates
  useEffect(() => {
    const ch = supabase
      .channel('admin:reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_reports' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const resolve = async (id: string, status: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    const { error } = await supabase.from('video_reports').update({ status }).eq('id', id);
    if (error) { toast.error('Could not update report'); void load(); return; }
    toast.success(`Report status set to ${status}`);
    void enqueueMod('admin_resolve_report', { p_report: id, p_status: status }, `Report ${status}`);
  };

  const moderateVideo = (videoId: string, action: 'remove' | 'restore' | 'shadow_ban' | 'unshadow') => {
    const reason = action === 'remove' || action === 'shadow_ban' ? prompt('Reason (shown to creator):') ?? '' : null;
    toast.success(`Action applied: Video ${action}`);
    void enqueueMod('admin_moderate_video', { p_video: videoId, p_action: action, p_reason: reason }, `Video ${action}`);
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Flag className="w-4 h-4 text-rose-400" />
          Community & Fingerprint User Reports
          <span className="text-[10px] text-emerald-400 font-normal">● live sync</span>
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
            {rows.filter(r => r.status === 'pending').length} Pending Tickets
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="p-1 rounded hover:bg-muted/50 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-xs">Page {page + 1}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={(page + 1) * pageSize >= total} className="p-1 rounded hover:bg-muted/50 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.id} className="glass rounded-2xl border border-border/40 p-4 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">{r.reason}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Target Media ID: <span className="font-mono text-cyan-400">{r.video_id}</span> · Reported {new Date(r.created_at).toLocaleString()}
                  </p>
                  {r.details && (
                    <p className="text-[11px] text-foreground/80 bg-slate-950/40 p-2 rounded-lg border border-white/5 mt-1.5 font-mono">
                      {r.details}
                    </p>
                  )}
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                r.status === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : r.status === 'dismissed'
                  ? 'bg-slate-800 text-slate-400 border border-slate-700'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {r.status}
              </span>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/20 flex-wrap">
              <button
                onClick={() => resolve(r.id, 'dismissed')}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl glass border border-border/40 hover:border-emerald-400/60 transition cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3 h-3 text-emerald-400" /> Dismiss
              </button>
              <button
                onClick={() => resolve(r.id, 'reviewed')}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl glass border border-border/40 hover:border-yellow-400/60 transition cursor-pointer"
              >
                Mark Reviewed
              </button>
              <button
                onClick={() => moderateVideo(r.video_id, 'shadow_ban')}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
              >
                Shadow-Ban Media
              </button>
              <button
                onClick={() => moderateVideo(r.video_id, 'remove')}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Remove & Strike
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No reports yet.</p>}
      </div>
    </Card>
  );
}
