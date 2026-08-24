/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Moderation Web Worker — async queue for admin moderation & report actions.
 *
 * Keeps the admin UI thread completely free while RPCs run in the background,
 * with automatic retries, exponential backoff, and persistent queueing (via a
 * snapshot the main thread mirrors to localStorage).
 *
 * Protocol (main → worker):
 *   { type: 'init', url, anonKey, jwt? }
 *   { type: 'auth', jwt }
 *   { type: 'enqueue', id, name, args }
 *   { type: 'restore', jobs: Job[] }        // rehydrate persisted queue on boot
 *
 * Protocol (worker → main):
 *   { type: 'ack', id, ok: true, result }
 *   { type: 'ack', id, ok: false, error }
 *   { type: 'progress', id, attempt }
 *   { type: 'snapshot', jobs }              // pending queue for persistence
 */

type Job = { id: string; name: string; args: Record<string, unknown>; attempt: number };

type InitMsg = { type: 'init'; url: string; anonKey: string; jwt?: string | null };
type AuthMsg = { type: 'auth'; jwt: string | null };
type EnqueueMsg = { type: 'enqueue'; id: string; name: string; args: Record<string, unknown> };
type RestoreMsg = { type: 'restore'; jobs: Job[] };
type InMsg = InitMsg | AuthMsg | EnqueueMsg | RestoreMsg;

let url = '';
let anonKey = '';
let jwt: string | null = null;

const queue: Job[] = [];
let running = false;

const MAX_ATTEMPTS = 5;

function headers(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${jwt || anonKey}`,
  };
}

function snapshot() {
  (self as unknown as Worker).postMessage({ type: 'snapshot', jobs: queue.slice() });
}

async function callRpc(name: string, args: Record<string, unknown>): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(args),
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body };
}

function backoffMs(attempt: number) {
  // 500ms, 1s, 2s, 4s, 8s (+ up to 250ms jitter)
  return Math.min(8000, 500 * 2 ** (attempt - 1)) + Math.random() * 250;
}

async function drain() {
  if (running) return;
  running = true;
  try {
    while (queue.length) {
      if (!url || !anonKey) {
        // wait for init
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }
      const job = queue[0];
      job.attempt += 1;
      (self as unknown as Worker).postMessage({ type: 'progress', id: job.id, attempt: job.attempt });
      try {
        const { ok, status, body } = await callRpc(job.name, job.args);
        if (ok) {
          queue.shift();
          (self as unknown as Worker).postMessage({ type: 'ack', id: job.id, ok: true, result: body });
          snapshot();
          continue;
        }
        // 4xx (except 408/429) is permanent — do not retry.
        const permanent = status >= 400 && status < 500 && status !== 408 && status !== 429;
        if (permanent || job.attempt >= MAX_ATTEMPTS) {
          queue.shift();
          (self as unknown as Worker).postMessage({ type: 'ack', id: job.id, ok: false, error: `[${status}] ${body}` });
          snapshot();
          continue;
        }
      } catch (e) {
        if (job.attempt >= MAX_ATTEMPTS) {
          queue.shift();
          (self as unknown as Worker).postMessage({ type: 'ack', id: job.id, ok: false, error: (e as Error).message || 'network error' });
          snapshot();
          continue;
        }
      }
      await new Promise((r) => setTimeout(r, backoffMs(job.attempt)));
    }
  } finally {
    running = false;
  }
}

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init':
      url = msg.url;
      anonKey = msg.anonKey;
      jwt = msg.jwt ?? null;
      void drain();
      break;
    case 'auth':
      jwt = msg.jwt;
      break;
    case 'enqueue':
      queue.push({ id: msg.id, name: msg.name, args: msg.args, attempt: 0 });
      snapshot();
      void drain();
      break;
    case 'restore':
      for (const j of msg.jobs) queue.push({ ...j, attempt: 0 });
      snapshot();
      void drain();
      break;
  }
};

export {};
