/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet as WalletIcon, TrendingUp, Clock, RefreshCw, Lock, AlertTriangle, CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useAuthSession } from '@/hooks/useAuthSession';
import { SignInGate } from '@/components/auth/SignInGate';
import WithdrawalMethods, { WithdrawalMethodRow } from '@/components/WithdrawalMethods';
import { EarningsBreakdown } from '@/components/wallet/EarningsBreakdown';
import { LedgerTable } from '@/components/wallet/LedgerTable';
import { PayoutTimeline } from '@/components/wallet/PayoutTimeline';
import { TaxInfoCard } from '@/components/wallet/TaxInfoCard';
import { useWalletData, rangeForDays } from '@/hooks/useWalletData';
import { formatMoney, toNumber } from '@/lib/money';

const supabase = _supabase as unknown as SupabaseClient<any, any, any>;

const BLOCK_MESSAGES: Record<string, string> = {
  no_verified_method: 'Add and verify a payout account to request a withdrawal.',
  below_minimum: 'Your available balance is below the minimum payout threshold.',
  pending_request: 'You already have a payout in progress. Only one request at a time.',
  cooldown: 'You are in the payout cooldown period. Try again after the next payout date.',
  tax_info_missing: 'Submit your tax information before requesting a payout.',
};

export default function WalletPage() {
  const { user, loading: authLoading } = useAuthSession();
  const [rangeDays, setRangeDays] = useState(30);
  const range = useMemo(() => rangeForDays(rangeDays), [rangeDays]);
  const { summary, ledger, withdrawals, breakdown, currency, loading, schemaReady, refresh } = useWalletData(user?.id, range);

  const [methods, setMethods] = useState<WithdrawalMethodRow[]>([]);
  const [amount, setAmount] = useState('');
  const [methodId, setMethodId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const verifiedMethods = useMemo(() => methods.filter((m) => m.verification_status === 'verified'), [methods]);

  if (!authLoading && !user) {
    return <SignInGate title="Sign in to view your wallet" description="Track earnings, ledger history and payouts." />;
  }

  const requestWithdrawal = async () => {
    const value = toNumber(amount, NaN);
    if (!Number.isFinite(value) || value <= 0) { toast.error('Enter a valid amount'); return; }
    if (!methodId) { toast.error('Choose a verified payout account'); return; }
    setSubmitting(true);
    const { error } = await supabase.rpc('request_withdrawal_v2', { p_amount: value, p_method_id: methodId });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setAmount('');
    toast.success('Payout requested', { description: 'Track its status in the payout timeline below.' });
    void refresh();
  };

  const blockMessage = summary.blockReason ? BLOCK_MESSAGES[summary.blockReason] ?? null : null;

  const stats = [
    { label: 'Available balance', value: summary.available, icon: WalletIcon, tone: 'text-primary' },
    { label: 'Pending payouts', value: summary.pending, icon: Clock, tone: 'text-amber-300' },
    { label: 'Lifetime earned', value: summary.lifetimeEarned, icon: TrendingUp, tone: 'text-emerald-300' },
    { label: 'Lifetime withdrawn', value: summary.lifetimeWithdrawn, icon: RefreshCw, tone: 'text-muted-foreground' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <header className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Wallet</h1>
          <p className="text-xs text-muted-foreground">
            Balances are computed server-side from an append-only ledger and update in realtime.
          </p>
        </div>
        {summary.nextPayoutAt && (
          <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg glass border border-border/40 text-muted-foreground">
            <CalendarClock className="w-3.5 h-3.5 text-primary" />
            Next payout eligible {new Date(summary.nextPayoutAt).toLocaleDateString()}
          </span>
        )}
      </header>

      {!schemaReady && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-200">
            The wallet ledger schema hasn’t been applied to your database yet, so no balances can be shown.
            Run the wallet migration to activate earnings and payouts.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass-strong rounded-xl p-4 glow-border-primary"
          >
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.tone}`} />
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
            </div>
            {loading ? (
              <div className="h-7 w-24 rounded bg-muted/25 animate-pulse" />
            ) : (
              <p className="text-xl font-display font-bold text-foreground tabular-nums">
                {formatMoney(s.value, { currency })}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <EarningsBreakdown
          rows={breakdown}
          currency={currency}
          rangeDays={rangeDays}
          onRangeChange={setRangeDays}
          loading={loading}
        />

        <section className="glass-strong rounded-xl p-4 glow-border-primary space-y-3">
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <WalletIcon className="w-4 h-4 text-primary" /> Request a payout
          </h3>
          <p className="text-[10px] text-muted-foreground">
            Minimum payout {formatMoney(summary.minPayout, { currency })}
            {summary.cooldownDays > 0 ? ` · ${summary.cooldownDays}-day cooldown between payouts` : ''}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Amount</label>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
                inputMode="decimal"
                placeholder="0.00"
                className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Payout account</label>
              <select
                value={methodId}
                onChange={(e) => setMethodId(e.target.value)}
                className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select verified account…</option>
                {verifiedMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.method_type.toUpperCase()} · {m.account_identifier}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {blockMessage && (
            <p className="flex items-start gap-1.5 text-[11px] text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-1.5">
              <Lock className="w-3 h-3 mt-0.5 shrink-0" /> {blockMessage}
            </p>
          )}

          <button
            onClick={requestWithdrawal}
            disabled={submitting || !summary.canRequest || verifiedMethods.length === 0}
            className="w-full py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-semibold glow-primary disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Request payout'}
          </button>
          <p className="text-[10px] text-muted-foreground">
            Every request is validated server-side — threshold, cooldown, duplicate requests and balance locks are enforced in the database.
          </p>
        </section>
      </div>

      <PayoutTimeline requests={withdrawals} />

      <LedgerTable entries={ledger} currency={currency} loading={loading} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WithdrawalMethods userId={user?.id ?? ''} onChange={setMethods} />
        {user?.id && <TaxInfoCard userId={user.id} />}
      </div>
    </div>
  );
}
