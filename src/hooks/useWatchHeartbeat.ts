import { useEffect, useRef } from 'react';
import { analyticsBus } from '@/lib/analyticsBus';

/**
 * Periodic engagement ping. All I/O is dispatched to the analytics Web Worker
 * via `analyticsBus.rpc` so shorts scrolling never blocks on network work.
 *
 * Server uses these to:
 *  - gate ad-revenue credits (require ≥3 heartbeats in last 5 min)
 *  - detect multi-tab farming (distinct session_ids per user in 30s)
 *  - detect rapid-pulse bots (>4 pings from one session in 10s)
 *
 * The client never learns it was flagged — responses are always {ok:true}.
 */
const TAB_SESSION_KEY = 'pn_tab_session';

function getTabSession(): string {
  let id = sessionStorage.getItem(TAB_SESSION_KEY);
  if (!id) {
    // Browser-compatible unique ID generation
    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback for older browsers
      return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };
    id = generateId();
    sessionStorage.setItem(TAB_SESSION_KEY, id);
  }
  return id;
}

export function useWatchHeartbeat(opts: {
  videoId?: string | null;
  isPlaying: boolean;
  intervalMs?: number;
}) {
  const { videoId, isPlaying, intervalMs = 10_000 } = opts;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchSecondsRef = useRef(0);

  useEffect(() => {
    if (!videoId || !isPlaying) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    const sessionId = getTabSession();
    const seconds = Math.round(intervalMs / 1000);
    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      watchSecondsRef.current += seconds;
      // Off-main-thread: worker fires the RPC via keepalive fetch.
      analyticsBus.rpc('record_heartbeat', {
        p_video: videoId,
        p_seconds: seconds,
      });
      // Also persist cumulative progress off-thread.
      analyticsBus.rpc('record_watch_progress', {
        p_video: videoId,
        p_seconds: watchSecondsRef.current,
      });
    };
    tick();
    timerRef.current = setInterval(tick, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  }, [videoId, isPlaying, intervalMs]);
}
