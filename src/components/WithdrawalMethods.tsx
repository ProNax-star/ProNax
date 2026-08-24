/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Banknote, Plus, Trash2, CheckCircle2, Smartphone, Mail, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { toast } from 'sonner';

export type WithdrawalMethodType = 'easypaisa' | 'payoneer' | 'binance';

export interface WithdrawalMethodRow {
  id: string;
  user_id: string;
  method_type: WithdrawalMethodType;
  account_identifier: string;
  account_holder_name: string | null;
  is_default: boolean;
  updated_at: string;
}

const METHOD_META: Record<WithdrawalMethodType, {
  label: string;
  icon: typeof Smartphone;
  identifierLabel: string;
  identifierPlaceholder: string;
  showHolder: boolean;
  validate: (id: string) => string | null;
}> = {
  easypaisa: {
    label: 'Easypaisa',
    icon: Smartphone,
    identifierLabel: 'Easypaisa Mobile Number',
    identifierPlaceholder: '03XX-XXXXXXX',
    showHolder: true,
    validate: (v) => (/^03\d{2}-?\d{7}$/.test(v.replace(/\s+/g, '')) ? null : 'Enter a valid Pakistani mobile (03XX-XXXXXXX)'),
  },
  payoneer: {
    label: 'Payoneer',
    icon: Mail,
    identifierLabel: 'Payoneer Email Address',
    identifierPlaceholder: 'you@example.com',
    showHolder: false,
    validate: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : 'Enter a valid email address'),
  },
  binance: {
    label: 'Binance (USDT)',
    icon: Coins,
    identifierLabel: 'Binance Pay ID / USDT TRC20 Address',
    identifierPlaceholder: 'TXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    showHolder: false,
    validate: (v) => (v.trim().length >= 6 ? null : 'Enter a valid Binance Pay ID or TRC20 address'),
  },
};

interface Props {
  userId: string;
  onChange?: (methods: WithdrawalMethodRow[]) => void;
}

export default function WithdrawalMethods({ userId, onChange }: Props) {
  const [methods, setMethods] = useState<WithdrawalMethodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [methodType, setMethodType] = useState<WithdrawalMethodType>('easypaisa');
  const [identifier, setIdentifier] = useState('');
  const [holder, setHolder] = useState('');

  const meta = METHOD_META[methodType];

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_withdrawal_methods' as any)
      .select('id, user_id, method_type, account_identifier, account_holder_name, is_default, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    const rows = (data ?? []) as unknown as WithdrawalMethodRow[];
    setMethods(rows);
    onChange?.(rows);
  }, [userId, onChange]);

  useEffect(() => { load(); }, [load]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel(`uwm:${userId}:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_withdrawal_methods', filter: `user_id=eq.${userId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, load]);

  const existing = useMemo(
    () => methods.find((m) => m.method_type === methodType) ?? null,
    [methods, methodType]
  );

  // Prefill when switching to a method that's already linked
  useEffect(() => {
    if (existing) {
      setIdentifier(existing.account_identifier ?? '');
      setHolder(existing.account_holder_name ?? '');
    } else {
      setIdentifier('');
      setHolder('');
    }
  }, [existing?.id, methodType]); // eslint-disable-line

  const save = async () => {
    const ident = identifier.trim();
    const validationError = meta.validate(ident);
    if (validationError) { toast.error(validationError); return; }
    if (meta.showHolder && !holder.trim()) { toast.error('Account holder name is required'); return; }

    setSaving(true);
    const payload = {
      user_id: userId,
      method_type: methodType,
      account_identifier: ident,
      account_holder_name: meta.showHolder ? holder.trim() : null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('user_withdrawal_methods' as any)
      .upsert(payload, { onConflict: 'user_id,method_type' });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${meta.label} account ${existing ? 'updated' : 'linked'}`);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('user_withdrawal_methods' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Payout account removed');
    load();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      className="glass-strong rounded-xl p-4 glow-border-primary space-y-4"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Banknote className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground">Link Withdrawal Account</h3>
            <p className="text-[10px] text-muted-foreground">Linked accounts are attached to every payout request automatically.</p>
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground">{methods.length} linked</span>
      </div>

      {/* Picker */}
      <div>
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Payout Method</label>
        <select
          value={methodType}
          onChange={(e) => setMethodType(e.target.value as WithdrawalMethodType)}
          className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs"
        >
          {(Object.keys(METHOD_META) as WithdrawalMethodType[]).map((k) => (
            <option key={k} value={k}>
              {METHOD_META[k].label}{methods.some(m => m.method_type === k) ? ' · linked' : ''}
            </option>
          ))}
        </select>
      </div>

      <div className={`grid gap-3 ${meta.showHolder ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{meta.identifierLabel}</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={meta.identifierPlaceholder}
            maxLength={120}
            className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs font-mono"
          />
        </div>
        {meta.showHolder && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Account Holder Name</label>
            <input
              type="text"
              value={holder}
              onChange={(e) => setHolder(e.target.value)}
              placeholder="Full name as registered"
              maxLength={120}
              className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs"
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold glow-primary disabled:opacity-60"
        >
          <Plus className="w-3.5 h-3.5" />
          {saving ? 'Saving…' : existing ? 'Update Account' : 'Save Account'}
        </button>
      </div>

      {/* List of linked methods */}
      <div className="border-t border-border/30 pt-3">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Linked Accounts</p>
        {loading ? (
          <p className="text-xs text-muted-foreground py-3 text-center">Loading…</p>
        ) : methods.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No payout accounts linked yet. Link at least one to enable withdrawals.</p>
        ) : (
          <div className="space-y-2">
            {methods.map((m) => {
              const mm = METHOD_META[m.method_type];
              const Icon = mm.icon;
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/20 border border-border/30">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg gradient-primary glow-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary-foreground" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        {mm.label}
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate">{m.account_identifier}</p>
                      {m.account_holder_name && (
                        <p className="text-[10px] text-muted-foreground truncate">Holder: {m.account_holder_name}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(m.id)}
                    className="shrink-0 p-2 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                    title="Remove account"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}