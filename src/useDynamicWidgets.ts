/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

export type WidgetKind = 'html' | 'banner' | 'video_rail' | 'iframe';

export type DynamicWidget = {
  id: string;
  slot: string;
  kind: WidgetKind;
  title: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: Record<string, any>;
  position: number;
  enabled: boolean;
};

export function useDynamicWidgets(slot: string) {
  const [widgets, setWidgets] = useState<DynamicWidget[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from('dynamic_widgets')
        .select('*')
        .eq('slot', slot)
        .eq('enabled', true)
        .order('position', { ascending: true });
      if (!alive) return;
      setWidgets((data ?? []) as DynamicWidget[]);
      setLoaded(true);
    };
    load();
    const ch = supabase
      .channel(`widgets:${slot}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dynamic_widgets' }, load)
      .subscribe();
    return () => { alive = false; try { supabase.removeChannel(ch); } catch { /* noop */ } };
  }, [slot]);

  return { widgets, loaded };
}
