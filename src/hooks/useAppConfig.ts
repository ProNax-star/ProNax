import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import type { SupabaseClient } from '@supabase/supabase-js';
const supabase = _supabase as SupabaseClient<any, any, any>;

export type FeatureFlag = {
  key: string;
  enabled: boolean;
  description: string | null;
  replacement: Record<string, unknown> | null;
};

export type SystemConfig = {
  overrides: Record<string, unknown>;
  maintenance_mode: boolean;
  maintenance_message: string | null;
};

export type AppConfig = {
  flags: Record<string, FeatureFlag>;
  system: SystemConfig;
  loaded: boolean;
  isEnabled: (key: string, fallback?: boolean) => boolean;
  replacementOf: (key: string) => Record<string, unknown> | null;
};

const FALLBACK_SYSTEM: SystemConfig = { overrides: {}, maintenance_mode: false, maintenance_message: null };

const Ctx = createContext<AppConfig>({
  flags: {},
  system: FALLBACK_SYSTEM,
  loaded: false,
  isEnabled: (_k, fb = true) => fb,
  replacementOf: () => null,
});

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({});
  const [system, setSystem] = useState<SystemConfig>(FALLBACK_SYSTEM);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [{ data: ff }, { data: sc }] = await Promise.all([
        supabase.from('feature_flags').select('*'),
        supabase.from('system_config').select('*').eq('id', 1).maybeSingle(),
      ]) as [{ data: FeatureFlag[] | null }, { data: SystemConfig | null }];
      if (!alive) return;
      const map: Record<string, FeatureFlag> = {};
      (ff ?? []).forEach((r: FeatureFlag) => { map[r.key] = r; });
      setFlags(map);
      if (sc) setSystem({ overrides: sc.overrides ?? {}, maintenance_mode: !!sc.maintenance_mode, maintenance_message: sc.maintenance_message ?? null });
      setLoaded(true);
    };
    load();

    const ch = supabase
      .channel(`app_config_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feature_flags' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_config' }, load)
      .subscribe();

    return () => { alive = false; try { supabase.removeChannel(ch); } catch { /* noop */ } };
  }, []);

  const value: AppConfig = {
    flags, system, loaded,
    isEnabled: (k, fb = true) => (flags[k] ? flags[k].enabled : fb),
    replacementOf: (k) => flags[k]?.replacement ?? null,
  };

  return createElement(Ctx.Provider, { value }, children);
}

export function useAppConfig() { return useContext(Ctx); }
export function useFeatureFlag(key: string, fallback = true) {
  const { isEnabled } = useAppConfig();
  return isEnabled(key, fallback);
}
