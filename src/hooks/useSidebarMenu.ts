import { useEffect, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import type { SupabaseClient } from '@supabase/supabase-js';
const supabase = _supabase as SupabaseClient<any, any, any>;

export type SidebarItem = {
  id: string;
  label: string;
  path: string;
  icon: string | null;
  position: number;
  section: string;
  enabled: boolean;
  external: boolean;
  requires_auth: boolean;
};

export function useSidebarMenu(section = 'sidebar') {
  const [items, setItems] = useState<SidebarItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from('sidebar_menu')
        .select('*')
        .eq('section', section)
        .eq('enabled', true)
        .order('position', { ascending: true });
      if (!alive) return;
      setItems((data ?? []) as SidebarItem[]);
      setLoaded(true);
    };
    load();
    const ch = supabase
      .channel(`sidebar_menu_${section}_${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sidebar_menu' }, load)
      .subscribe();
    return () => { alive = false; try { supabase.removeChannel(ch); } catch { /* noop */ } };
  }, [section]);

  return { items, loaded };
}
