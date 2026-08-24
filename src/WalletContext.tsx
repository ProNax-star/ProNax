import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import type { SupabaseClient } from '@supabase/supabase-js';
const supabase = _supabase as SupabaseClient<any, any, any>;
import { useAuthSession } from '@/hooks/useAuthSession';

export interface WalletTransaction {
  id: string;
  type: 'earning' | 'withdrawal' | 'bonus' | 'admin' | 'other';
  amount: number;
  description: string;
  timestamp: number;
}

export interface WalletState {
  totalViews: number;       // lifetime views across owner's videos
  adRevenue: number;        // gross lifetime ad revenue (USD) — derived
  balance: number;          // available creator balance (USD)
  platformFee: number;      // accumulated platform fee (USD) — derived
  creatorEarning: number;   // lifetime creator earnings (=total_earned)
  transactions: WalletTransaction[];
  loading: boolean;
}

interface WalletContextValue extends WalletState {
  refresh: () => Promise<void>;
  requestWithdraw: (amount: number, method: string) => Promise<{ ok: boolean; error?: string }>;
}

const EMPTY_STATE: WalletState = {
  totalViews: 0,
  adRevenue: 0,
  balance: 0,
  platformFee: 0,
  creatorEarning: 0,
  transactions: [],
  loading: true,
};

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

function txnTypeFromKind(kind: string | null): WalletTransaction['type'] {
  switch (kind) {
    case 'ad_revenue':
    case 'ad_revenue_backfill':
      return 'earning';
    case 'withdrawal':
    case 'withdrawal_hold':
      return 'withdrawal';
    case 'admin_credit':
    case 'admin_debit':
      return 'admin';
    case 'bonus':
      return 'bonus';
    default:
      return 'other';
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthSession();
  const [state, setState] = useState<WalletState>(EMPTY_STATE);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setState({ ...EMPTY_STATE, loading: false });
      return;
    }
    setState(prev => ({ ...prev, loading: true }));

    const [walletRes, txnRes, viewsRes, grossRes] = await Promise.all([
      supabase.from('user_wallets').select('balance,total_earned,total_withdrawn').eq('user_id', user.id).maybeSingle(),
      supabase.from('wallet_transactions').select('id,delta,kind,reason,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('video_views').select('id', { count: 'exact', head: true }).in('video_id',
        (await supabase.from('videos').select('id').eq('owner_id', user.id)).data?.map(v => String(v.id)) || ['__none__']
      ),
      supabase.from('revenue_logs').select('gross_revenue').eq('user_id', user.id),
    ]);

    const wallet = walletRes.data;
    const balance = Number(wallet?.balance ?? 0);
    const totalEarned = Number(wallet?.total_earned ?? 0);
    const grossAll = (grossRes.data ?? []).reduce((s: number, r: { gross_revenue?: number | null }) => s + Number(r.gross_revenue ?? 0), 0);
    const platformFee = Math.max(0, grossAll - totalEarned);

    const transactions: WalletTransaction[] = (txnRes.data ?? []).map((t: { id: string | number; kind?: string | null; delta?: number | null; reason?: string | null; created_at: string }) => ({
      id: String(t.id),
      type: txnTypeFromKind(t.kind ?? null),
      amount: Math.abs(Number(t.delta ?? 0)),
      description: t.reason || t.kind || 'Transaction',
      timestamp: new Date(t.created_at).getTime(),
    }));

    setState({
      totalViews: viewsRes.count ?? 0,
      adRevenue: grossAll,
      balance,
      platformFee,
      creatorEarning: totalEarned,
      transactions,
      loading: false,
    });
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: refresh on wallet or txn changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`wallet-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_wallets', filter: `user_id=eq.${user.id}` }, () => fetchAll())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchAll]);

  const requestWithdraw = useCallback(async (amount: number, method: string) => {
    if (!user) return { ok: false, error: 'Not signed in' };
    const { error } = await supabase.rpc('request_withdrawal', { p_amount: amount, p_method: method, p_details: {} });
    if (error) return { ok: false, error: error.message };
    await fetchAll();
    return { ok: true };
  }, [user, fetchAll]);

  const value = useMemo<WalletContextValue>(() => ({
    ...state, refresh: fetchAll, requestWithdraw,
  }), [state, fetchAll, requestWithdraw]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
