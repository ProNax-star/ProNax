// A/B testing framework. Deterministic variant assignment via server RPC,
// event tracking piped through analyticsBus (worker) to keep main thread free.
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { analyticsBus } from '@/lib/analyticsBus';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;
import { useEffect, useState } from 'react';

export type AlgorithmWeights = {
  algo_category_affinity: number;
  algo_freshness_boost: number;
  algo_ctr_weight: number;
  algo_retention_weight: number;
  algo_watched_penalty: number;
};

export type ABVariant = { name: string; weights?: Partial<AlgorithmWeights> };
export type ABTest = {
  id: string;
  name: string;
  description: string | null;
  status: 'running' | 'paused' | 'completed';
  target: string;
  variants: ABVariant[];
  metrics: Record<string, unknown>;
  winner: string | null;
  created_at: string;
};

const cache = new Map<string, string>();
const LS_KEY = 'pn_ab_assignments_v1';

function loadLS(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function saveLS(map: Record<string, string>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch { /* noop */ }
}

/** Get (or assign) the variant name for the current user in a test. */
export async function getVariant(testId: string): Promise<string | null> {
  if (cache.has(testId)) return cache.get(testId)!;
  const ls = loadLS();
  if (ls[testId]) { cache.set(testId, ls[testId]); return ls[testId]; }
  const { data, error } = await supabase.rpc('assign_ab_variant', { p_test: testId });
  if (error || !data) return null;
  cache.set(testId, data);
  ls[testId] = data; saveLS(ls);
  return data;
}

/** Fire an event for a variant. Non-blocking (routed through analytics worker). */
export function trackABEvent(testId: string, variant: string, event: string, value = 1) {
  try {
    analyticsBus.rpc('record_ab_event', {
      p_test: testId, p_variant: variant, p_event: event, p_value: value,
    });
  } catch { /* noop */ }
}

/** React hook wrapper. */
export function useABVariant(testId: string | null | undefined) {
  const [variant, setVariant] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!testId) return;
    getVariant(testId).then((v) => { if (!cancelled) setVariant(v); });
    return () => { cancelled = true; };
  }, [testId]);
  return variant;
}

/** Get the currently-running feed_weights test (if any) so the feed can apply variant weights. */
export async function getRunningFeedTest(): Promise<ABTest | null> {
  const { data } = await supabase.from('ab_tests').select('*')
    .eq('status', 'running').eq('target', 'feed_weights')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

export async function applyFeedTestVariant(): Promise<{ test: ABTest; variant: string; weights?: Partial<AlgorithmWeights> } | null> {
  const test = await getRunningFeedTest();
  if (!test) return null;
  const variant = await getVariant(test.id);
  if (!variant) return null;
  const v = test.variants.find((x) => x.name === variant);
  return { test, variant, weights: v?.weights };
}
