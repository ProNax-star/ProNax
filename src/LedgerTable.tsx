/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useMemo, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import { formatMoney } from '@/lib/money';
import { LEDGER_LABELS, LEDGER_TYPES, type LedgerEntry, type LedgerType } from '@/hooks/useWalletData';

const TYPE_TONE: Record<LedgerType, string> = {
  ad_revenue: 'text-emerald-300 border-emerald-500/30',
  tip: 'text-sky-300 border-sky-500/30',
  membership: 'text-violet-300 border-violet-500/30',
  shorts_fund: 'text-amber-300 border-amber-500/30',
  withdrawal: 'text-primary border-primary/30',
  adjustment: 'text-muted-foreground border-border/40',
  refund: 'text-orange-300 border-orange-500/30',
};

function toCsv(rows: LedgerEntry[]): string {
  const header = ['id', 'created_at', 'type', 'amount', 'currency', 'balance_after', 'reference_id'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.id, r.created_at, r.type, r.amount.toFixed(4), r.currency, r.balance_after.toFixed(4), r.reference_id].map(escape).join(','),
  );
  return [header.join(','), ...lines].join('\n');
}

interface Props {
  entries: LedgerEntry[];
  currency: string;
  loading?: boolean;
}

export function LedgerTable({ entries, currency, loading }: Props) {
  const [typeFilter, setTypeFilter] = useState<LedgerType | 'all'>('all');
  const [direction, setDirection] = useState<'all' | 'credit' | 'debit'>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== 'all' && e.type !== typeFilter) return false;
      if (direction === 'credit' && e.amount <= 0) return false;
      if (direction === 'debit' && e.amount >= 0) return false;
      if (q && !(e.reference_id ?? '').toLowerCase().includes(q) && !LEDGER_LABELS[e.type].toLowerCase().includes(q)) return false;
      return true;
    });
  }, [entries, typeFilter, direction, query]);

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pronax-wallet-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="glass-strong rounded-xl p-4 glow-border-primary">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div>
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" /> Wallet Ledger
          </h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Append-only record — every credit and debit is stored permanently with the running balance.
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-border/50 text-xs text-foreground hover:border-primary/40 disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as LedgerType | 'all')}
          className="bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs"
          aria-label="Filter by entry type"
        >
          <option value="all">All types</option>
          {LEDGER_TYPES.map((t) => (
            <option key={t} value={t}>{LEDGER_LABELS[t]}</option>
          ))}
        </select>
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as 'all' | 'credit' | 'debit')}
          className="bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs"
          aria-label="Filter by direction"
        >
          <option value="all">Credits & debits</option>
          <option value="credit">Credits only</option>
          <option value="debit">Debits only</option>
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reference…"
          className="bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs"
          aria-label="Search ledger"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => <div key={i} className="h-10 rounded-md bg-muted/20 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground py-8 text-center">
          {entries.length === 0 ? 'No ledger entries yet.' : 'No entries match these filters.'}
        </p>
      ) : (
        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-background/80 backdrop-blur">
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Type</th>
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Reference</th>
                <th className="py-2 pr-3 font-medium text-right">Amount</th>
                <th className="py-2 font-medium text-right">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className="border-t border-border/20">
                  <td className="py-2 pr-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${TYPE_TONE[e.type]}`}>
                      {LEDGER_LABELS[e.type]}
                    </span>
                  </td>
                  <td className="py-2 pr-3 text-[11px] text-muted-foreground whitespace-nowrap">
                    {new Date(e.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-[11px] text-muted-foreground font-mono truncate max-w-[160px]">
                    {e.reference_id ?? '—'}
                  </td>
                  <td className={`py-2 pr-3 text-xs font-bold tabular-nums text-right ${e.amount >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>
                    {formatMoney(e.amount, { currency: e.currency || currency, precise: true, signed: true })}
                  </td>
                  <td className="py-2 text-[11px] text-muted-foreground tabular-nums text-right">
                    {formatMoney(e.balance_after, { currency: e.currency || currency, precise: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default LedgerTable;
