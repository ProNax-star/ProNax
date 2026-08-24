/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, type RefObject } from 'react';
import { useLocation } from '@tanstack/react-router';

const STORE_KEY = 'pronax:scroll';

function readStore(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORE_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

function writeStore(map: Record<string, number>) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(map));
  } catch {
    /* storage full — non fatal */
  }
}

/**
 * Saves + restores the scroll offset of the app's main scroll container per
 * route, so going "back" to the feed lands exactly where the user left off.
 */
export function useScrollRestoration(ref: RefObject<HTMLElement | null>) {
  const { pathname, search } = useLocation();
  const key = `${pathname}${typeof search === 'string' ? search : ''}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const saved = readStore()[key] ?? 0;
    let frames = 0;
    // Content streams in async — keep re-applying briefly until it sticks.
    const raf = () => {
      if (!ref.current) return;
      if (saved > 0 && ref.current.scrollHeight > saved) ref.current.scrollTop = saved;
      else if (saved === 0) ref.current.scrollTop = 0;
      if (frames++ < 30 && saved > 0 && Math.abs(ref.current.scrollTop - saved) > 4) {
        requestAnimationFrame(raf);
      }
    };
    requestAnimationFrame(raf);

    const onScroll = () => {
      const map = readStore();
      map[key] = el.scrollTop;
      writeStore(map);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      onScroll();
      el.removeEventListener('scroll', onScroll);
    };
  }, [key, ref]);
}
