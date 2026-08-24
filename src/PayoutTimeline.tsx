/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Banknote, Check, CircleDashed, Loader2, XCircle } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import type { WithdrawalRequest, WithdrawalStatus } from '@/hooks/useWalletData';

const STEPS: Array<{ key: WithdrawalStatus; label: string }> = [
  { key: 'requested', label: 'Requested' },
  { key: 'processing', label: 'Processing' },
  { key: 'paid', label: 'Paid' },
];

function stepState(request: WithdrawalRequest, index: number): 'done' | 'current' | 'todo' | 'failed' {
  if (request.status === 'failed' || request.status === 'cancelled') {
    return index === 0 ? 'done' : index === 1 ? 'failed' : 'todo';
  }
  const order: WithdrawalStatus[] = ['requested', 'processing', 'paid'];
  const current = order.indexOf(request.status);
  if (index < current) return 'done';
  if (index === current) return request.status === 'paid' ? 'done' : 'current';
  return 'todo';
}

function stampFor(request: WithdrawalRequest, key: WithdrawalStatus): string | null {
  if (key === 'requested') return request.created_at;
  if (key === 'processing') return request.processing_at;
  if (key === 'paid') return request.paid_at;
  return null;
}

export function PayoutTimeline({ requests }: { requests: WithdrawalRequest[] }) {
  return (
    <section className="glass-strong rounded-xl p-4 glow-border-primary">
      <h3 className="text-sm font-display font-semibold text-foreground mb-3 flex items-center gap-2">
        <Banknote className="w-4 h-4 text-primary" /> Payout Status
      </h3>

      {requests.length === 0 ? (
        <div className="py-8 text-center">
          <Banknote className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">No payout requests yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r) => {
            const failed = r.status === 'failed' || r.status === 'cancelled';
            return (
              <div key={r.id} className="rounded-lg border border-border/30 bg-muted/10 p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {formatMoney(r.amount, { currency: r.currency })}
                    <span className="text-muted-foreground font-normal text-xs"> via {(r.method ?? '—').toUpperCase()}</span>
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${
                      r.status === 'paid'
                        ? 'text-emerald-300 border-emerald-500/30'
                        : failed
                          ? 'text-destructive border-destructive/30'
                          : 'text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <ol className="mt-3 flex items-center gap-2">
                  {STEPS.map((step, i) => {
                    const state = stepState(r, i);
                    const stamp = stampFor(r, step.key);
                    const Icon =
                      state === 'done' ? Check : state === 'failed' ? XCircle : state === 'current' ? Loader2 : CircleDashed;
                    return (
                      <li key={step.key} className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 ${
                              state === 'done'
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                : state === 'failed'
                                  ? 'bg-destructive/20 border-destructive/40 text-destructive'
                                  : state === 'current'
                                    ? 'bg-primary/20 border-primary/40 text-primary'
                                    : 'bg-muted/20 border-border/40 text-muted-foreground'
                            }`}
                          >
                            <Icon className={`w-3 h-3 ${state === 'current' ? 'animate-spin' : ''}`} />
                          </span>
                          {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border/40" />}
                        </div>
                        <p className="text-[10px] text-foreground mt-1">
                          {state === 'failed' ? (r.status === 'cancelled' ? 'Cancelled' : 'Failed') : step.label}
                        </p>
                        <p className="text-[9px] text-muted-foreground truncate">
                          {stamp ? new Date(stamp).toLocaleString() : state === 'failed' && r.failed_at ? new Date(r.failed_at).toLocaleString() : '—'}
                        </p>
                      </li>
                    );
                  })}
                </ol>

                {failed && r.failure_reason && (
                  <p className="mt-2 text-[11px] text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-2 py-1.5">
                    {r.failure_reason}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export default PayoutTimeline;
