/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass-strong rounded-2xl border border-border/40 p-4 lg:p-5">{children}</div>;
}

function Loading() {
  return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
}

export function AppealsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedAppealStrikes, setSelectedAppealStrikes] = useState<any[]>([]);
  const [loadingStrikes, setLoadingStrikes] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('appeals')
      .select(`
        id,
        user_id,
        message,
        status,
        admin_response,
        reviewed_at,
        created_at,
        profiles!user_id (
          display_name,
          email,
          avatar_url,
          is_banned,
          ban_reason,
          banned_until
        )
      `)
      .order('created_at', { ascending: false })
      .limit(500);
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    
    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, [statusFilter]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin:appeals')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appeals' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const loadUserStrikes = async (userId: string) => {
    setLoadingStrikes(true);
    try {
      const { data, error } = await supabase
        .from('user_strikes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSelectedAppealStrikes(data || []);
    } catch (error: any) {
      toast.error(error.message);
      setSelectedAppealStrikes([]);
    } finally {
      setLoadingStrikes(false);
    }
  };

  const decide = async (a: any, status: 'approved' | 'rejected', response?: string) => {
    const { error } = await supabase.rpc('admin_resolve_appeal', {
      p_appeal_id: a.id,
      p_decision: status,
      p_note: response || null
    });
    
    if (error) return toast.error(error.message);
    
    toast.success(`Appeal ${status}`); 
    setSelectedAppeal(null);
    setAdminResponse('');
    setSelectedAppealStrikes([]);
    load();
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">User appeals</h2>
        <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-border/40">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold capitalize transition ${
                statusFilter === s ? 'gradient-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="glass rounded-xl border border-border/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-semibold">{r.profiles?.display_name || r.email || r.user_id}</div>
                  {r.profiles?.is_banned && (
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-400">Banned</span>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded ${
                    r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                    r.status === 'rejected' ? 'bg-destructive/20 text-destructive' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.message}</p>
                {r.profiles?.ban_reason && (
                  <p className="text-[10px] text-orange-400 mt-1">Reason: {r.profiles.ban_reason}</p>
                )}
                {r.profiles?.banned_until && (
                  <p className="text-[10px] text-muted-foreground mt-1">Until: {new Date(r.profiles.banned_until).toLocaleString()}</p>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
                {r.admin_response && (
                  <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                    <div className="font-semibold text-muted-foreground">Admin Response:</div>
                    <div>{r.admin_response}</div>
                  </div>
                )}
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => { 
                      setSelectedAppeal(r); 
                      setAdminResponse(''); 
                      loadUserStrikes(r.user_id);
                    }}
                    className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-primary/60"
                  >
                    Review
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Appeal Review Modal */}
      {selectedAppeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <div className="glass-strong rounded-2xl border border-border/40 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border/30">
              <h3 className="text-lg font-bold">Review Appeal</h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <div className="text-sm font-semibold">User: {selectedAppeal.profiles?.display_name || selectedAppeal.email}</div>
                <div className="text-xs text-muted-foreground">{selectedAppeal.user_id}</div>
              </div>
              
              <div>
                <div className="text-sm font-semibold">Appeal Message:</div>
                <div className="text-sm bg-muted/50 p-3 rounded mt-1">{selectedAppeal.message}</div>
              </div>
              
              {selectedAppeal.profiles?.ban_reason && (
                <div>
                  <div className="text-sm font-semibold">Original Ban Reason:</div>
                  <div className="text-sm bg-red-500/10 text-red-400 p-3 rounded mt-1">{selectedAppeal.profiles.ban_reason}</div>
                </div>
              )}
              
              {selectedAppeal.profiles?.banned_until && (
                <div>
                  <div className="text-sm font-semibold">Ban Expiry:</div>
                  <div className="text-sm bg-orange-500/10 text-orange-400 p-3 rounded mt-1">{new Date(selectedAppeal.profiles.banned_until).toLocaleString()}</div>
                </div>
              )}
              
              {/* Strike History */}
              <div>
                <div className="text-sm font-semibold mb-2">User Strike History</div>
                {loadingStrikes ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : selectedAppealStrikes.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-xs bg-muted/30 rounded">
                    No strikes on record
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedAppealStrikes.map((strike) => (
                      <div key={strike.id} className={`glass rounded-lg border p-3 ${strike.revoked_at ? 'opacity-60' : ''}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                                strike.severity === 3 ? 'bg-destructive/20 text-destructive' :
                                strike.severity === 2 ? 'bg-orange-500/20 text-orange-400' :
                                'bg-yellow-500/20 text-yellow-400'
                              }`}>
                                Level {strike.severity}
                              </span>
                              <span className="text-[10px] text-muted-foreground capitalize">{strike.category}</span>
                              {strike.revoked_at && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Revoked</span>
                              )}
                            </div>
                            <p className="text-xs text-foreground">{strike.reason}</p>
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {new Date(strike.created_at).toLocaleString()}
                              {strike.expires_at && !strike.revoked_at && (
                                <span> · Expires: {new Date(strike.expires_at).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-sm font-semibold">Your Response:</div>
                <textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Provide your response to the user..."
                  className="w-full bg-muted/50 border border-border/40 rounded p-3 text-sm mt-1"
                  rows={4}
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-border/30 flex gap-2 justify-end">
              <button
                onClick={() => { 
                  setSelectedAppeal(null); 
                  setAdminResponse(''); 
                  setSelectedAppealStrikes([]);
                }}
                className="px-4 py-2 rounded-lg glass border border-border/40 hover:border-border/60"
              >
                Cancel
              </button>
              <button
                onClick={() => decide(selectedAppeal, 'rejected', adminResponse)}
                className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
              >
                Reject Appeal
              </button>
              <button
                onClick={() => decide(selectedAppeal, 'approved', adminResponse)}
                className="px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
              >
                Approve & Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
