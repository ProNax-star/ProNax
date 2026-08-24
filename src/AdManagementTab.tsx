/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Save, RefreshCw, Eye, EyeOff, LayoutGrid, MonitorPlay, PanelRight } from 'lucide-react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { invalidateAdSlot, type AdSlotRow } from '@/hooks/useAdSlot';
import { detectAdFormat } from '@/components/DynamicAdContainer';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

const PLACEMENTS = [
  {
    slot: 'home_feed',
    label: 'Home Feed Card',
    icon: LayoutGrid,
    help: '16:9 ad card injected inside the home video grid after every N videos.',
    hasFrequency: true,
  },
  {
    slot: 'in_stream',
    label: 'In-Stream (Watch Page)',
    icon: MonitorPlay,
    help: '16:9 ad card rendered directly above the main video player.',
    hasFrequency: false,
  },
  {
    slot: 'watch_sidebar',
    label: 'Watch Sidebar (Up Next)',
    icon: PanelRight,
    help: '16:9 ad card placed inside the recommended Up Next list.',
    hasFrequency: false,
  },
] as const;

type Metrics = { impressions: number; revenue: number; ecpm: number };

export function AdManagementTab() {
  const [rows, setRows] = useState<AdSlotRow[]>([]);
  const [draft, setDraft] = useState<Record<string, Partial<AdSlotRow>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [preview, setPreview] = useState<Record<string, boolean>>({});
  const [metrics, setMetrics] = useState<Metrics>({ impressions: 0, revenue: 0, ecpm: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const slots = PLACEMENTS.map((p) => p.slot);
    const { data, error } = await supabase.from('ad_settings').select('*').in('slot', slots);
    if (error) toast.error(`Could not load ad placements: ${error.message}`);
    setRows((data ?? []) as AdSlotRow[]);

    const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: logs } = await supabase
      .from('revenue_logs')
      .select('gross_revenue, amount_earned, views_count')
      .gte('created_at', since)
      .limit(10_000);

    const impressions = ((data ?? []) as AdSlotRow[]).reduce((s, r) => s + Number(r.impressions_count ?? 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const revenue = ((logs ?? []) as any[]).reduce((s, l) => s + Number(l.gross_revenue ?? l.amount_earned ?? 0), 0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const views = ((logs ?? []) as any[]).reduce((s, l) => s + Number(l.views_count ?? 0), 0);
    setMetrics({
      impressions,
      revenue: +revenue.toFixed(4),
      ecpm: views > 0 ? +((revenue / views) * 1000).toFixed(4) : 0,
    });
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const merged = (slot: string): Partial<AdSlotRow> => ({
    ...(rows.find((r) => r.slot === slot) ?? {}),
    ...(draft[slot] ?? {}),
  });

  const patch = (slot: string, next: Partial<AdSlotRow>) =>
    setDraft((d) => ({ ...d, [slot]: { ...d[slot], ...next } }));

  const save = async (slot: string) => {
    const next = merged(slot);
    setSaving(slot);
    const { error } = await supabase
      .from('ad_settings')
      .update({
        enabled: !!next.enabled,
        html_snippet: (next.html_snippet ?? '').trim() || null,
        frequency: Number(next.frequency) || 0,
        network: next.network || 'custom',
      })
      .eq('slot', slot);
    setSaving(null);
    if (error) { toast.error(`Save failed: ${error.message}`); return; }
    invalidateAdSlot(slot);
    setDraft((d) => { const { [slot]: _drop, ...rest } = d; return rest; });
    toast.success(`Saved "${slot}" placement`);
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading ad placements…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Impressions served" value={metrics.impressions.toLocaleString()} />
        <Stat label="eCPM (30d, measured)" value={`$${metrics.ecpm.toFixed(2)}`} />
        <Stat label="Estimated revenue (30d)" value={`$${metrics.revenue.toFixed(2)}`} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">Ad Placements — 16:9</h2>
        <button
          type="button"
          onClick={load}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs hover:bg-muted/30"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {PLACEMENTS.map(({ slot, label, icon: Icon, help, hasFrequency }) => {
        const row = merged(slot);
        const code = (row.html_snippet ?? '') as string;
        const format = detectAdFormat(code);
        const missing = !rows.some((r) => r.slot === slot);
        return (
          <div key={slot} className="rounded-2xl border border-border/40 bg-card/40 p-4 space-y-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{help}</p>
                </div>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!!row.enabled}
                  onChange={(e) => patch(slot, { enabled: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Active
              </label>
            </div>

            {missing ? (
              <p className="text-[11px] text-destructive">
                Placement row "{slot}" is missing in the database.
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-md border border-border/50 px-2 py-1">
                Format: <b>{format === 'api_url' ? 'API / media URL' : 'HTML / JS script'}</b>
              </span>
              <span className="rounded-md border border-border/50 px-2 py-1">Aspect ratio: <b>16:9</b></span>
              {hasFrequency ? (
                <label className="flex items-center gap-1.5 rounded-md border border-border/50 px-2 py-1">
                  Show after every
                  <input
                    type="number"
                    min={1}
                    value={Number(row.frequency ?? 6)}
                    onChange={(e) => patch(slot, { frequency: Number(e.target.value) })}
                    className="w-14 rounded bg-background px-1.5 py-0.5"
                  />
                  videos
                </label>
              ) : null}
            </div>

            <textarea
              value={code}
              onChange={(e) => patch(slot, { html_snippet: e.target.value })}
              rows={5}
              spellCheck={false}
              placeholder="Paste HTML / JS ad code, or a direct banner image / video URL"
              className="w-full rounded-xl border border-border/50 bg-background/60 p-3 font-mono text-[11px]"
            />

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => save(slot)}
                disabled={saving === slot}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
              >
                {saving === slot ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save
              </button>
              <button
                type="button"
                onClick={() => setPreview((p) => ({ ...p, [slot]: !p[slot] }))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 px-3 py-1.5 text-xs"
              >
                {preview[slot] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {preview[slot] ? 'Hide' : 'Preview'}
              </button>
              <span className="text-[11px] text-muted-foreground">
                Impressions: {Number(row.impressions_count ?? 0).toLocaleString()}
              </span>
            </div>

            {preview[slot] && code ? (
              <div className="max-w-md">
                <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/40 bg-muted/20">
                  {detectAdFormat(code) === 'api_url' ? (
                    <img src={code} alt="Ad preview" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <iframe
                      title={`preview-${slot}`}
                      srcDoc={`<!doctype html><html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100%">${code}</body></html>`}
                      sandbox="allow-scripts allow-popups allow-forms"
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  )}
                  <span className="absolute left-2 top-2 rounded bg-black/70 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white/90">
                    Sponsored
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/40 p-4">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}
