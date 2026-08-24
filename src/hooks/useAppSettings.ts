/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState, useCallback } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

export type AppSettings = {
  id: number;
  app_name: string;
  app_tagline: string | null;
  logo_url: string | null;
  accent_hex: string;
  feature_uploads: boolean;
  feature_live: boolean;
  feature_shorts: boolean;
  feature_comments: boolean;
  feature_ads: boolean;
  feature_wallet: boolean;
  feature_downloads: boolean;
  homepage_sections: string[];
  algo_category_affinity: number;
  algo_freshness_boost: number;
  algo_ctr_weight: number;
  algo_retention_weight: number;
  algo_watched_penalty: number;
  updated_at?: string;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 1,
  app_name: 'Pro Nax',
  app_tagline: 'Watch, create, earn',
  logo_url: null,
  accent_hex: '#3b82f6',
  feature_uploads: true,
  feature_live: true,
  feature_shorts: true,
  feature_comments: true,
  feature_ads: true,
  feature_wallet: true,
  feature_downloads: true,
  homepage_sections: ['trending', 'live', 'shorts', 'foryou', 'new'],
  algo_category_affinity: 8,
  algo_freshness_boost: 25,
  algo_ctr_weight: 50,
  algo_retention_weight: 140,
  algo_watched_penalty: 60,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('*').eq('id', 1).maybeSingle();
    setSettings(data ?? DEFAULT_APP_SETTINGS);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`app_settings_live_${Math.random().toString(36).slice(2, 10)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings' },
        () => load()
      )
      .subscribe();
    return () => {
      try { supabase.removeChannel(ch); } catch { /* noop */ }
    };
  }, [load]);

  return { settings, loading, reload: load };
}
