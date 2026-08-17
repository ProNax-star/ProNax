/**
 * Analytics Web Worker — isolated engine for video impressions and
 * non-critical telemetry. Runs entirely off the main thread so scroll
 * and paint work never stalls on network I/O.
 *
 * Protocol (posted from main thread):
 *   { type: 'init', url, anonKey, jwt? }
 *   { type: 'auth', jwt }
 *   { type: 'impression', video: string, surface: string }
 *   { type: 'rpc', name: string, args: Record<string, unknown> }
 *
 * Impressions are batched (max 20 or 2s window) and flushed via
 * fire-and-forget fetch. Failures are swallowed — analytics MUST never
 * surface errors to the user or block anything.
 */

type ImpressionMsg = { type: 'impression'; video: string; surface: string };
type RpcMsg = { type: 'rpc'; name: string; args: Record<string, unknown> };
type InitMsg = { type: 'init'; url: string; anonKey: string; jwt?: string | null };
type AuthMsg = { type: 'auth'; jwt: string | null };
type InMsg = ImpressionMsg | RpcMsg | InitMsg | AuthMsg;

let url = '';
let anonKey = '';
let jwt: string | null = null;

const impressionQueue: { video: string; surface: string }[] = [];
const seen = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: anonKey,
    Authorization: `Bearer ${jwt || anonKey}`,
  };
  return h;
}

async function rpc(name: string, args: Record<string, unknown>) {
  if (!url || !anonKey) return;
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(args),
      keepalive: true,
      redirect: 'follow',
    });
    
    // Only parse JSON if there's content
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    
    console.log('[analytics worker] RPC call:', name, args, 'Response:', res.status, data);
  } catch (err) {
    console.error('[analytics worker] RPC error:', name, args, err);
    /* swallow — analytics is non-critical */
  }
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(flush, 2000);
}

async function flush() {
  flushTimer = null;
  if (!impressionQueue.length) return;
  const batch = impressionQueue.splice(0, impressionQueue.length);
  // Send one RPC per row — cheap and lets the DB de-dupe naturally.
  // Fire in parallel, don't await individually.
  await Promise.all(
    batch.map((b) => rpc('log_video_impression', { p_video: b.video, p_surface: b.surface }))
  );
}

self.onmessage = (e: MessageEvent<InMsg>) => {
  const msg = e.data;
  switch (msg.type) {
    case 'init':
      url = msg.url;
      anonKey = msg.anonKey;
      jwt = msg.jwt ?? null;
      break;
    case 'auth':
      jwt = msg.jwt;
      break;
    case 'impression': {
      const key = `${msg.surface}:${msg.video}`;
      if (seen.has(key)) return;
      seen.add(key);
      impressionQueue.push({ video: msg.video, surface: msg.surface });
      if (impressionQueue.length >= 20) {
        if (flushTimer) {
          clearTimeout(flushTimer);
          flushTimer = null;
        }
        void flush();
      } else {
        scheduleFlush();
      }
      break;
    }
    case 'rpc':
      void rpc(msg.name, msg.args);
      break;
  }
};
