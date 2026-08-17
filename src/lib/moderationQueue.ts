/**
 * moderationQueue — main-thread facade over the moderation Web Worker.
 *
 * Admin UI calls `moderationQueue.enqueue(name, args)` and immediately gets a
 * promise. The RPC runs off the main thread with retries and exponential
 * backoff. Pending jobs are persisted — AES-GCM encrypted, see
 * `lib/security/secureStore` — so a page refresh or accidental close never
 * loses a moderation action, while the queued payloads (user ids, reasons)
 * are never readable as plaintext in browser storage.
 */
import { supabase } from "@/integrations/supabase/client";
import { secureGet, secureSet } from "@/lib/security/secureStore";
import { createLogger } from "@/lib/logger";

const log = createLogger("moderation-queue");

type Job = { id: string; name: string; args: Record<string, unknown>; attempt: number };

type OutMsg =
  | { type: "ack"; id: string; ok: true; result: string }
  | { type: "ack"; id: string; ok: false; error: string }
  | { type: "progress"; id: string; attempt: number }
  | { type: "snapshot"; jobs: Job[] };

const STORAGE_KEY = "pn_moderation_queue_v2";
const LEGACY_STORAGE_KEY = "pn_moderation_queue_v1";

let worker: Worker | null = null;
let ready = false;
let pendingSnapshot: Job[] = [];
const pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
const listeners = new Set<(pending: number) => void>();

function persist(jobs: Job[]) {
  pendingSnapshot = jobs;
  for (const l of listeners) l(jobs.length);
  void secureSet(STORAGE_KEY, jobs);
}

async function loadPersisted(): Promise<Job[]> {
  // Drop any pre-encryption plaintext queue rather than trusting it.
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* noop */
  }
  const jobs = await secureGet<Job[]>(STORAGE_KEY, []);
  return Array.isArray(jobs) ? jobs : [];
}

function boot() {
  if (worker || typeof window === "undefined" || typeof Worker === "undefined") return;
  try {
    worker = new Worker(new URL("../workers/moderation.worker.ts", import.meta.url));
    worker.onmessage = (e: MessageEvent<OutMsg>) => {
      const msg = e.data;
      if (msg.type === "ack") {
        const p = pending.get(msg.id);
        if (p) {
          pending.delete(msg.id);
          if (msg.ok) p.resolve(msg.result);
          else p.reject(new Error((msg as { error: string }).error));
        }
      } else if (msg.type === "snapshot") {
        persist(msg.jobs);
      }
    };
    const url = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    void supabase.auth.getSession().then(async ({ data }) => {
      const jwt = data.session?.access_token ?? null;
      worker?.postMessage({ type: "init", url, anonKey, jwt });
      ready = true;
      // Rehydrate any queue leftover from a previous session.
      const jobs = await loadPersisted();
      pendingSnapshot = jobs;
      for (const l of listeners) l(jobs.length);
      if (jobs.length) worker?.postMessage({ type: "restore", jobs });
    });
    supabase.auth.onAuthStateChange((_evt, session) => {
      worker?.postMessage({ type: "auth", jwt: session?.access_token ?? null });
    });
  } catch (err) {
    log.warn("worker unavailable", err);
    worker = null;
  }
}

export const moderationQueue = {
  init() {
    boot();
  },
  /**
   * Enqueue an RPC. Returns a promise that resolves with the server response
   * body (string) on success, or rejects after retries are exhausted / on a
   * permanent 4xx failure.
   */
  enqueue(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (!worker) boot();
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      const send = () => worker?.postMessage({ type: "enqueue", id, name, args });
      if (ready) send();
      else queueMicrotask(send);
    });
  },
  onPendingChange(cb: (n: number) => void) {
    listeners.add(cb);
    cb(pendingSnapshot.length);
    void loadPersisted().then((jobs) => {
      pendingSnapshot = jobs;
      cb(jobs.length);
    });
    return () => listeners.delete(cb);
  },
  pendingCount() {
    return pendingSnapshot.length;
  },
};
