/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Reusable hook for Supabase realtime channel management
 * Guarantees proper subscription and cleanup to prevent websocket leaks
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/loose';

// Dev-only channel counter for leak detection
let openChannelCount = 0;
if (import.meta.env.DEV) {
  // Expose to window for debugging
  (window as any).__pronax_channel_count = () => openChannelCount;
}

/**
 * Setup function type for channel configuration
 */
export type ChannelSetup = (channel: ReturnType<typeof supabase.channel>) => ReturnType<typeof supabase.channel>;

/**
 * Hook for managing realtime channels with guaranteed cleanup
 * 
 * @param name - Deterministic channel name (no random values, scoped by id)
 * @param setup - Function to configure the channel with .on() calls
 * @param deps - Dependency array (should only contain primitive IDs)
 * @param enabled - Whether to subscribe (default true)
 * 
 * @example
 * useRealtimeChannel(
 *   `video:${videoId}`,
 *   (ch) => ch.on('postgres_changes', { event: '*', schema: 'public', table: 'videos', filter: `id=eq.${videoId}` }, callback),
 *   [videoId]
 * );
 */
export function useRealtimeChannel(
  name: string,
  setup: ChannelSetup,
  deps: React.DependencyList,
  enabled: boolean = true
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = setup(supabase.channel(name));
    channelRef.current = channel;
    
    channel.subscribe((status) => {
      if (import.meta.env.DEV && status === 'SUBSCRIBED') {
        openChannelCount++;
        console.log(`[Realtime] Channel "${name}" subscribed. Total open: ${openChannelCount}`);
      }
      if (import.meta.env.DEV && status === 'CLOSED') {
        openChannelCount = Math.max(0, openChannelCount - 1);
        console.log(`[Realtime] Channel "${name}" closed. Total open: ${openChannelCount}`);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        if (import.meta.env.DEV) {
          openChannelCount = Math.max(0, openChannelCount - 1);
          console.log(`[Realtime] Channel "${name}" removed on cleanup. Total open: ${openChannelCount}`);
        }
      }
    };
  }, [name, enabled, ...deps]);
}

/**
 * Hook for presence channels (e.g., live viewers)
 * Uses a random presence key per component instance (acceptable for presence)
 * 
 * @param name - Deterministic channel name
 * @param deps - Dependency array
 * @param enabled - Whether to subscribe
 */
export function usePresenceChannel(
  name: string,
  deps: React.DependencyList,
  enabled: boolean = true
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Generate unique presence key for this component instance
    const presenceKey = `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const channel = supabase.channel(name, {
      config: { presence: { key: presenceKey } },
    });
    channelRef.current = channel;
    
    channel.subscribe((status) => {
      if (import.meta.env.DEV && status === 'SUBSCRIBED') {
        openChannelCount++;
        console.log(`[Presence] Channel "${name}" subscribed. Total open: ${openChannelCount}`);
      }
      if (import.meta.env.DEV && status === 'CLOSED') {
        openChannelCount = Math.max(0, openChannelCount - 1);
        console.log(`[Presence] Channel "${name}" closed. Total open: ${openChannelCount}`);
      }
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        if (import.meta.env.DEV) {
          openChannelCount = Math.max(0, openChannelCount - 1);
          console.log(`[Presence] Channel "${name}" removed on cleanup. Total open: ${openChannelCount}`);
        }
      }
    };
  }, [name, enabled, ...deps]);

  return channelRef;
}
