import { useEffect, useRef } from 'react';
import { analyticsBus } from '@/lib/analyticsBus';

/**
 * Logs one impression per (video, session) once the element becomes visible
 * for a moment. All I/O is dispatched to the analytics Web Worker via
 * `analyticsBus` so the main/scroll thread is never blocked.
 */
const impressedThisSession = new Set<string>();

export function useVideoImpression(videoId: string | undefined, surface: string = 'home') {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!videoId) return;
    const key = `${surface}:${videoId}`;
    if (impressedThisSession.has(key)) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    let timer: ReturnType<typeof setTimeout> | null = null;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          if (timer) continue;
          timer = setTimeout(() => {
            if (impressedThisSession.has(key)) return;
            impressedThisSession.add(key);
            // Off-main-thread — worker batches and flushes.
            analyticsBus.impression(videoId, surface);
            observer.disconnect();
          }, 600);
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      }
    }, { threshold: [0, 0.5, 1] });

    observer.observe(el);
    return () => {
      if (timer) clearTimeout(timer);
      observer.disconnect();
    };
  }, [videoId, surface]);

  return ref;
}

