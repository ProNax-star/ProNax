/**
 * analyticsBus — thin main-thread proxy over the analytics Web Worker.
 * Keeps ALL impression / telemetry I/O off the UI thread. Falls back to
 * a no-op if Workers are unavailable (SSR, ancient browser).
 */
import { supabase } from '@/integrations/supabase/client';

type Msg =
  | { type: 'init'; url: string; anonKey: string; jwt: string | null }
  | { type: 'auth'; jwt: string | null }
  | { type: 'impression'; video: string; surface: string }
  | { type: 'rpc'; name: string; args: Record<string, unknown> };

let worker: Worker | null = null;
let ready = false;

function boot() {
  if (worker || typeof window === 'undefined' || typeof Worker === 'undefined') return;
  try {
    worker = new Worker(new URL('../workers/analytics.worker.ts', import.meta.url));
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    void supabase.auth.getSession().then(({ data }) => {
      const jwt = data.session?.access_token ?? null;
      worker?.postMessage({ type: 'init', url, anonKey, jwt } satisfies Msg);
      ready = true;
    });
    supabase.auth.onAuthStateChange((_evt, session) => {
      worker?.postMessage({ type: 'auth', jwt: session?.access_token ?? null } satisfies Msg);
    });
  } catch {
    worker = null;
  }
}

function send(msg: Msg) {
  if (!worker) boot();
  if (!worker) return;
  // If worker booted but init hasn't posted yet, queue via microtask.
  if (!ready) {
    queueMicrotask(() => worker?.postMessage(msg));
    return;
  }
  worker.postMessage(msg);
}

export const analyticsBus = {
  impression(video: string, surface: string) {
    send({ type: 'impression', video, surface });
  },
  rpc(name: string, args: Record<string, unknown> = {}) {
    send({ type: 'rpc', name, args });
  },
  /** Explicit boot — call once at app start. */
  init() {
    boot();
  },
};
