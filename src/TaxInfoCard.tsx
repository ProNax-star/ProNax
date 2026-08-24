/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useState } from 'react';
import { FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabase = _supabase as unknown as SupabaseClient<any, any, any>;

interface TaxRow {
  form_type: 'w9' | 'w8ben';
  legal_name: string;
  country: string;
  tax_id_last4: string | null;
  status: string;
  submitted_at: string;
}

export function TaxInfoCard({ userId }: { userId: string }) {
  const [row, setRow] = useState<TaxRow | null>(null);
  const [formType, setFormType] = useState<'w9' | 'w8ben'>('w9');
  const [legalName, setLegalName] = useState('');
  const [country, setCountry] = useState('');
  const [taxId, setTaxId] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('user_tax_info')
      .select('form_type, legal_name, country, tax_id_last4, status, submitted_at')
      .eq('user_id', userId)
      .maybeSingle();
    const r = (data as TaxRow | null) ?? null;
    setRow(r);
    if (r) {
      setFormType(r.form_type);
      setLegalName(r.legal_name);
      setCountry(r.country);
    }
  }, [userId]);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!legalName.trim() || country.trim().length < 2) {
      toast.error('Legal name and country are required');
      return;
    }
    setSaving(true);
    const digits = taxId.replace(/\D/g, '');
    const { error } = await supabase.from('user_tax_info').upsert(
      {
        user_id: userId,
        form_type: formType,
        legal_name: legalName.trim(),
        country: country.trim().toUpperCase(),
        tax_id_last4: digits ? digits.slice(-4) : null,
        status: 'submitted',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setTaxId('');
    setEditing(false);
    toast.success('Tax information submitted');
    void load();
  };

  return (
    <section className="glass-strong rounded-xl p-4 glow-border-primary space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground">Tax Information</h3>
            <p className="text-[10px] text-muted-foreground">
              Required before payouts can be released. W-9 for US persons, W-8BEN otherwise.
            </p>
          </div>
        </div>
        {row && !editing && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-emerald-500/30 text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> {row.status}
          </span>
        )}
      </div>

      {row && !editing ? (
        <div className="text-xs text-muted-foreground space-y-1">
          <p><span className="text-foreground font-semibold">{row.legal_name}</span> · {row.country}</p>
          <p>{row.form_type === 'w9' ? 'W-9' : 'W-8BEN'}{row.tax_id_last4 ? ` · TIN ending ${row.tax_id_last4}` : ''}</p>
          <button onClick={() => setEditing(true)} className="text-primary text-[11px] underline underline-offset-2">Update details</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Form type</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as 'w9' | 'w8ben')}
                className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs"
              >
                <option value="w9">W-9 (US person)</option>
                <option value="w8ben">W-8BEN (non-US person)</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Country (ISO code)</label>
              <input
                value={country} onChange={(e) => setCountry(e.target.value)} maxLength={2}
                placeholder="US"
                className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Legal name</label>
              <input
                value={legalName} onChange={(e) => setLegalName(e.target.value)} maxLength={120}
                placeholder="Name as it appears on your tax form"
                className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tax ID (only last 4 stored)</label>
              <input
                value={taxId} onChange={(e) => setTaxId(e.target.value)} maxLength={20} inputMode="numeric"
                placeholder="•••• •••• 1234"
                className="w-full bg-muted/30 border border-border/40 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {row && (
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg glass border border-border/40 text-xs text-muted-foreground">
                Cancel
              </button>
            )}
            <button
              onClick={submit}
              disabled={saving}
              className="px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold glow-primary disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Submit tax info'}
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default TaxInfoCard;
