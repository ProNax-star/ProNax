/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import type { SupabaseClient } from '@supabase/supabase-js';
const supabase = _supabase as SupabaseClient<any, any, any>;
import { useAuthSession } from '@/hooks/useAuthSession';
import { toast } from 'sonner';

/**
 * Mounts a realtime subscription to the current user's profile row.
 * The moment `is_banned` flips true, the user is force-signed-out.
 * Respects `banned_until` for temporary bans with countdown.
 * Re-checks ban status on window focus to handle expired temporary bans.
 * Backed by DB triggers (`enforce_not_banned`) so server-side writes
 * are blocked even if the client bypasses this watchdog.
 */
export function BanWatchdog() {
  const { user } = useAuthSession();
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    let countdownInterval: NodeJS.Timeout | null = null;

    const evict = async (reason?: string, isTemporary?: boolean, bannedUntil?: string) => {
      if (cancelled) return;
      cancelled = true;
      
      if (isTemporary && bannedUntil) {
        // Show countdown for temporary ban
        const updateCountdown = () => {
          const now = new Date();
          const expiry = new Date(bannedUntil);
          const diff = expiry.getTime() - now.getTime();
          
          if (diff <= 0) {
            // Ban has expired, redirect to home
            setCountdown(null);
            if (countdownInterval) clearInterval(countdownInterval);
            window.location.href = '/';
            return;
          }
          
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          let timeStr = '';
          if (days > 0) timeStr += `${days}d `;
          if (hours > 0) timeStr += `${hours}h `;
          timeStr += `${minutes}m ${seconds}s`;
          
          setCountdown(timeStr);
        };
        
        updateCountdown();
        countdownInterval = setInterval(updateCountdown, 1000);
        
        toast.error(`Account temporarily suspended. Expires in: ${countdown || 'calculating...'}`);
      } else {
        // Permanent ban
        toast.error(reason || 'Your account has been suspended. You can appeal below.');
      }
      
      // Keep the session so the user can submit an appeal (RLS requires auth.uid()).
      if (!window.location.pathname.startsWith('/appeal')) {
        setTimeout(() => { window.location.href = '/appeal'; }, 500);
      }
    };

    const checkBanStatus = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_banned, ban_reason, banned_until')
        .eq('id', user.id)
        .maybeSingle();
      
      if (!data) return;
      
      if (data.is_banned) {
        if (data.banned_until) {
          const expiry = new Date(data.banned_until);
          const now = new Date();
          
          if (expiry > now) {
            // Temporary ban still active
            evict(data.ban_reason || 'Your account has been temporarily suspended.', true, data.banned_until);
          } else {
            // Temporary ban has expired, should be auto-unbanned by DB cron
            // Force redirect to home
            if (!window.location.pathname.startsWith('/appeal')) {
              window.location.href = '/';
            }
          }
        } else {
          // Permanent ban
          evict(data.ban_reason || 'Your account has been banned.');
        }
      } else {
        // Not banned, clear any existing countdown
        setCountdown(null);
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
      }
    };

    // Initial check — covers bans applied while user was offline
    checkBanStatus();

    // Re-check on window focus to handle expired temporary bans
    const handleFocus = () => {
      checkBanStatus();
    };
    
    window.addEventListener('focus', handleFocus);

    const ch = supabase
      .channel(`ban-watch:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
          const next = payload.new as { is_banned?: boolean | null; ban_reason?: string | null; banned_until?: string | null } | null;
          if (next?.is_banned) {
            if (next.banned_until) {
              evict(next.ban_reason || 'Your account has been temporarily suspended.', true, next.banned_until);
            } else {
              evict(next.ban_reason || 'Your account has been banned.');
            }
          } else {
            // User was unbanned
            setCountdown(null);
            if (countdownInterval) {
              clearInterval(countdownInterval);
              countdownInterval = null;
            }
            if (window.location.pathname.startsWith('/appeal')) {
              window.location.href = '/';
            }
          }
        },
      )
      .subscribe();

    return () => { 
      supabase.removeChannel(ch); 
      window.removeEventListener('focus', handleFocus);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [user?.id]);

  // Display countdown if active
  if (countdown) {
    return (
      <div className="fixed top-4 right-4 z-50 glass-strong rounded-xl border border-destructive/40 px-4 py-2 flex items-center gap-2 text-destructive text-sm font-semibold shadow-lg">
        <span>⚠️ Account suspended</span>
        <span className="text-muted-foreground">·</span>
        <span>{countdown}</span>
      </div>
    );
  }

  return null;
}