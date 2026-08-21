import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/loose';

/**
 * Real-time "live watching" counter.
 *
 * All components that render the same videoId share ONE counter instance
 * (module-level store), so the badge on the player and the inline badge in the
 * meta row always show the exact same number.
 */

type Store = {
  count: number;
  presence: number;
  baseline: number;
  listeners: Set<(n: number) => void>;
  channel?: ReturnType<typeof supabase.channel>;
  refs: number;
};

const stores = new Map<string, Store>();

function emit(store: Store, n: number) {
  if (n === store.count) return;
  store.count = n;
  store.listeners.forEach((l) => l(n));
}

function getStore(videoId: string, baseViewsCount: number): Store {
  let store = stores.get(videoId);
  if (!store) {
    const baseline = 0; // No fake baseline - show only real users
    store = { count: baseline, presence: 0, baseline, listeners: new Set(), refs: 0 };
    stores.set(videoId, store);
  }
  return store;
}

function connect(videoId: string, store: Store) {
  const channelName = `presence_video_${videoId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`);
  if (existing) supabase.removeChannel(existing);

  // Browser-compatible unique ID generation
  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const channel = supabase.channel(channelName, {
    config: { presence: { key: generateId() } },
  });
  store.channel = channel;

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    store.presence = Object.keys(state).length;
    emit(store, store.presence); // Show only real presence count
  });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      channel.track({ online_at: new Date().toISOString() }).catch(() => {});
    }
  });
}

function disconnect(store: Store) {
  if (store.channel) supabase.removeChannel(store.channel);
  store.channel = undefined;
}

export function useLiveWatchers(videoId?: string | null, baseViewsCount: number = 0) {
  const [liveCount, setLiveCount] = useState<number>(() =>
    videoId ? getStore(videoId, baseViewsCount).count : 0,
  );

  useEffect(() => {
    if (!videoId) return;
    const store = getStore(videoId, baseViewsCount);
    setLiveCount(store.count);

    const listener = (n: number) => setLiveCount(n);
    store.listeners.add(listener);
    store.refs += 1;
    if (store.refs === 1) connect(videoId, store);

    return () => {
      store.listeners.delete(listener);
      store.refs -= 1;
      if (store.refs <= 0) {
        store.refs = 0;
        disconnect(store);
      }
    };
  }, [videoId, baseViewsCount]);

  return { liveCount, formattedCount: formatWatcherCount(liveCount) };
}

/** Stable hash so the same video always starts at the same baseline. */
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function calculateBaseWatchers(seed: string, views: number): number {
  const r = (hash(seed) % 1000) / 1000; // deterministic 0..1
  if (!views || views <= 0) return Math.floor(r * 4) + 1;
  if (views < 100) return Math.floor(r * 6) + 2;
  if (views < 1000) return Math.floor(r * 18) + 8;
  if (views < 10000) return Math.floor(r * 80) + 35;
  if (views < 100000) return Math.floor(r * 320) + 140;
  if (views < 1000000) return Math.floor(r * 1200) + 650;
  return Math.floor(r * 4500) + 2200;
}

function formatWatcherCount(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toLocaleString();
}
