/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
export type QueueItem = { id: string; title: string; thumbUrl?: string | null; channel?: string };

const KEY = 'pronax:watch-queue';

export function getQueue(): QueueItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

function save(items: QueueItem[]) {
  window.localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent('pronax:queue-changed', { detail: items.length }));
}

/** Adds a video to the queue. Returns the new queue length, or null if already queued. */
export function addToQueue(item: QueueItem): number | null {
  const items = getQueue();
  if (items.some((i) => i.id === item.id)) return null;
  const next = [...items, item];
  save(next);
  return next.length;
}

export function removeFromQueue(id: string) {
  save(getQueue().filter((i) => i.id !== id));
}

export function clearQueue() {
  save([]);
}
