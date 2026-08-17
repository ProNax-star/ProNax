import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/loose';

export type AdSlotRow = {
  id: string;
  slot: string;
  kind: 'banner' | 'video';
  network: string;
  enabled: boolean;
  html_snippet: string | null;
  vast_tag_url: string | null;
  ad_unit_id: string | null;
  publisher_id: string | null;
  frequency: number;
  notes: string | null;
  impressions_count: number;
};

const cache = new Map<string, Promise<AdSlotRow | null>>();

async function fetchSlot(slot: string): Promise<AdSlotRow | null> {
  const { data } = await (supabase as any)
    .from('ad_settings')
    .select('*')
    .eq('slot', slot)
    .maybeSingle();
  return (data as AdSlotRow | null) ?? null;
}

export function useAdSlot(slot: string) {
  const [row, setRow] = useState<AdSlotRow | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (!cache.has(slot)) cache.set(slot, fetchSlot(slot));
    cache.get(slot)!.then((r) => {
      if (cancelled) return;
      setRow(r);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [slot]);
  return { row, loading };
}

export function invalidateAdSlot(slot?: string) {
  if (slot) cache.delete(slot); else cache.clear();
}

export async function bumpAdImpression(slot: string) {
  try {
    await (supabase as any).rpc('bump_ad_slot_impression', { p_slot: slot });
  } catch { /* non-critical */ }
}
