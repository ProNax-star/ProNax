/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import type { SupabaseClient } from '@supabase/supabase-js';
const supabase = _supabase as SupabaseClient<any, any, any>;
import { useAuthSession } from '@/hooks/useAuthSession';
import { toast } from 'sonner';

/**
 * Mounts a realtime subscription to the current user's profile row.
 * The moment `is_banned` flips true, the user is force-signed-out.
 * Backed by DB triggers (`enforce_not_banned`) so server-side writes
 * are blocked even if the client bypasses this watchdog.
 */
export function BanWatchdog() {
  const { user } = useAuthSession();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const evict = async (reason?: string) => {
      if (cancelled) return;
      cancelled = true;
      toast.error(reason || 'Your account has been suspended. You can appeal below.');
      // Keep the session so the user can submit an appeal (RLS requires auth.uid()).
      if (!window.location.pathname.startsWith('/appeal')) {
        setTimeout(() => { window.location.href = '/appeal'; }, 500);
      }
    };

    // Initial check — covers bans applied while user was offline
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason')
        .eq('id', user.id)
        .maybeSingle();
      if (data?.is_banned) evict(data.ban_reason || 'Your account has been banned.');
    })();

    const ch = supabase
      .channel(`ban-watch:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as { is_banned?: boolean | null; ban_reason?: string | null } | null;
          if (next?.is_banned) evict(next.ban_reason || 'Your account has been banned.');
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  return null;
}