/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Wallet data access.
 *
 * All money numbers come from server-side aggregates (`wallet_summary`,
 * `wallet_earnings_breakdown`) so the client cannot tamper with them — the
 * client only formats and displays.
 *
 * Updates arrive via Supabase realtime; there is NO polling. Subscriptions are
 * torn down while the tab is hidden and re-established (with one refresh) when
 * it becomes visible again.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabase = _supabase as unknown as SupabaseClient<any, any, any>;
import { DEFAULT_CURRENCY, toNumber } from '@/lib/money';

export type LedgerType =
  | 'ad_revenue' | 'tip' | 'membership' | 'shorts_fund'
  | 'withdrawal' | 'adjustment' | 'refund';

export interface LedgerEntry {
  id: string;
  type: LedgerType;
  amount: number;
  currency: string;
  balance_after: number;
  reference_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type WithdrawalStatus = 'requested' | 'processing' | 'paid' | 'failed' | 'cancelled';

export interface WithdrawalRequest {
  id: string;
  amount: number;
  currency: string;
  status: WithdrawalStatus;
  method: string | null;
  destination: string | null;
  created_at: string;
  processing_at: string | null;
  paid_at: string | null;
  failed_at: string | null;
  failure_reason: string | null;
}

export interface WalletSummary {
  available: number;
  pending: number;
  lifetimeEarned: number;
  lifetimeWithdrawn: number;
  currency: string;
  minPayout: number;
  cooldownDays: number;
  nextPayoutAt: string | null;
  canRequest: boolean;
  blockReason: string | null;
}

export interface BreakdownRow {
  source: LedgerType;
  total: number;
  entries: number;
  currency: string;
}

const EMPTY_SUMMARY: WalletSummary = {
  available: 0,
  pending: 0,
  lifetimeEarned: 0,
  lifetimeWithdrawn: 0,
  currency: DEFAULT_CURRENCY,
  minPayout: 0,
  cooldownDays: 0,
  nextPayoutAt: null,
  canRequest: false,
  blockReason: 'no_verified_method',
};

export const LEDGER_TYPES: LedgerType[] = [
  'ad_revenue', 'tip', 'membership', 'shorts_fund', 'withdrawal', 'adjustment', 'refund',
];

export const LEDGER_LABELS: Record<LedgerType, string> = {
  ad_revenue: 'Ad revenue',
  tip: 'Tips',
  membership: 'Memberships',
  shorts_fund: 'Shorts fund',
  withdrawal: 'Withdrawal',
  adjustment: 'Adjustment',
  refund: 'Refund',
};

export interface DateRange { from: Date; to: Date }

export function rangeForDays(days: number): DateRange {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from, to };
}

export function useWalletData(userId: string | undefined, range: DateRange) {
  const [summary, setSummary] = useState<WalletSummary>(EMPTY_SUMMARY);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [breakdown, setBreakdown] = useState<BreakdownRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);
  const rangeRef = useRef(range);
  rangeRef.current = range;

  const refresh = useCallback(async () => {
    if (!userId) {
      setSummary(EMPTY_SUMMARY);
      setLedger([]); setWithdrawals([]); setBreakdown([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { from, to } = rangeRef.current;

    const [summaryRes, ledgerRes, wrRes, breakdownRes] = await Promise.all([
      supabase.rpc('wallet_summary'),
      supabase
        .from('wallet_ledger')
        .select('id, type, amount, currency, balance_after, reference_id, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('withdrawal_requests')
        .select('id, amount, currency, status, method, destination, created_at, processing_at, paid_at, failed_at, failure_reason')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.rpc('wallet_earnings_breakdown', { p_from: from.toISOString(), p_to: to.toISOString() }),
    ]);

    // The ledger schema ships with the wallet migration; surface a clear state
    // instead of fake numbers when it has not been applied yet.
    const missing = Boolean(summaryRes.error) && Boolean(ledgerRes.error);
    setSchemaReady(!missing);

    const s = Array.isArray(summaryRes.data) ? summaryRes.data[0] : summaryRes.data;
    setSummary(
      s
        ? {
            available: toNumber((s as Record<string, unknown>).available),
            pending: toNumber((s as Record<string, unknown>).pending),
            lifetimeEarned: toNumber((s as Record<string, unknown>).lifetime_earned),
            lifetimeWithdrawn: toNumber((s as Record<string, unknown>).lifetime_withdrawn),
            currency: String((s as Record<string, unknown>).currency ?? DEFAULT_CURRENCY),
            minPayout: toNumber((s as Record<string, unknown>).min_payout),
            cooldownDays: toNumber((s as Record<string, unknown>).cooldown_days),
            nextPayoutAt: ((s as Record<string, unknown>).next_payout_at as string) ?? null,
            canRequest: Boolean((s as Record<string, unknown>).can_request),
            blockReason: ((s as Record<string, unknown>).block_reason as string) ?? null,
          }
        : EMPTY_SUMMARY,
    );

    setLedger(
      ((ledgerRes.data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        type: (r.type as LedgerType) ?? 'adjustment',
        amount: toNumber(r.amount),
        currency: String(r.currency ?? DEFAULT_CURRENCY),
        balance_after: toNumber(r.balance_after),
        reference_id: (r.reference_id as string) ?? null,
        metadata: (r.metadata as Record<string, unknown>) ?? {},
        created_at: String(r.created_at),
      })),
    );

    setWithdrawals(
      ((wrRes.data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
        id: String(r.id),
        amount: toNumber(r.amount),
        currency: String(r.currency ?? DEFAULT_CURRENCY),
        status: (String(r.status ?? 'requested') as WithdrawalStatus),
        method: (r.method as string) ?? null,
        destination: (r.destination as string) ?? null,
        created_at: String(r.created_at),
        processing_at: (r.processing_at as string) ?? null,
        paid_at: (r.paid_at as string) ?? null,
        failed_at: (r.failed_at as string) ?? null,
        failure_reason: (r.failure_reason as string) ?? null,
      })),
    );

    setBreakdown(
      ((breakdownRes.data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => ({
        source: (r.source as LedgerType) ?? 'adjustment',
        total: toNumber(r.total),
        entries: toNumber(r.entries),
        currency: String(r.currency ?? DEFAULT_CURRENCY),
      })),
    );

    setLoading(false);
  }, [userId]);

  useEffect(() => { void refresh(); }, [refresh, range.from.getTime(), range.to.getTime()]);

  // Realtime, paused while the tab is hidden. No polling anywhere.
  useEffect(() => {
    if (!userId) return;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = () => {
      if (channel) return;
      channel = supabase
        .channel(`wallet:${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_ledger', filter: `user_id=eq.${userId}` }, () => void refresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests', filter: `user_id=eq.${userId}` }, () => void refresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_wallets', filter: `user_id=eq.${userId}` }, () => void refresh())
        .subscribe();
    };

    const unsubscribe = () => {
      if (channel) { supabase.removeChannel(channel); channel = null; }
    };

    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) { unsubscribe(); }
      else { subscribe(); void refresh(); }
    };

    if (typeof document === 'undefined' || !document.hidden) subscribe();
    document?.addEventListener('visibilitychange', onVisibility);
    return () => {
      document?.removeEventListener('visibilitychange', onVisibility);
      unsubscribe();
    };
  }, [userId, refresh]);

  const currency = summary.currency || DEFAULT_CURRENCY;

  return useMemo(
    () => ({ summary, ledger, withdrawals, breakdown, currency, loading, schemaReady, refresh }),
    [summary, ledger, withdrawals, breakdown, currency, loading, schemaReady, refresh],
  );
}
