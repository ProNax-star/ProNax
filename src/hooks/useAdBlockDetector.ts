/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState, useCallback } from 'react';
import { getItem, setItem } from '@/lib/safeStorage';

const DISMISS_KEY = 'pronax_adblock_dismissed_at';
const PREMIUM_KEY = 'pronax_premium';
const DISMISS_WINDOW_MS = 1000 * 60 * 60 * 6; // re-prompt every 6h

/**
 * Multi-signal ad-block detector:
 *  1. Network test against a known ad script (blocked → throws).
 *  2. Bait DOM element with ad-related classes (blocked → 0 height).
 *  3. window.adsbygoogle availability after script attempt.
 * Any 2/3 positive signals → adBlock = true.
 */
export function useAdBlockDetector() {
  const [adBlocked, setAdBlocked] = useState(false);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const detect = useCallback(async () => {
    if (typeof window === 'undefined') return false;
    if (getItem(PREMIUM_KEY) === '1') return false;

    let positives = 0;

    // 1. Network signal
    try {
      await fetch(
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
        { method: 'HEAD', mode: 'no-cors', cache: 'no-store' }
      );
    } catch {
      positives++;
    }

    // 2. Bait element signal
    const bait = document.createElement('div');
    bait.className = 'ad-banner ads adsbox ad-placement google-ad';
    bait.style.cssText =
      'position:absolute;left:-9999px;top:-9999px;width:2px;height:2px;';
    bait.innerHTML = '&nbsp;';
    document.body.appendChild(bait);
    await new Promise((r) => setTimeout(r, 80));
    const baitHidden =
      bait.offsetParent === null ||
      bait.offsetHeight === 0 ||
      bait.clientHeight === 0;
    document.body.removeChild(bait);
    if (baitHidden) positives++;

    // 3. adsbygoogle global signal
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).adsbygoogle === 'undefined') positives++;

    const blocked = positives >= 2;
    setAdBlocked(blocked);

    if (blocked) {
      const last = Number(getItem(DISMISS_KEY) || 0);
      if (Date.now() - last > DISMISS_WINDOW_MS) setOpen(true);
    }
    return blocked;
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    // Defer detection until well after LCP so it doesn't compete with initial render.
    const kickoff = () => {
      const idle = (cb: () => void) =>
        'requestIdleCallback' in window
          ? (window as Window & { requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number }).requestIdleCallback?.(cb, { timeout: 4000 }) || setTimeout(cb, 3000)
          : setTimeout(cb, 3000);
      idle(detect);
    };
    let started = false;
    const start = () => { if (started) return; started = true; kickoff(); };
    if (document.readyState === 'complete') {
      setTimeout(start, 3000);
    } else {
      window.addEventListener('load', () => setTimeout(start, 3000), { once: true });
    }
    // Real-time monitoring — recheck every 5min & on tab focus
    const interval = setInterval(() => { if (started) detect(); }, 300000);
    const onFocus = () => { if (started) detect(); };
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [detect, mounted]);

  const dismiss = useCallback(() => {
    setItem(DISMISS_KEY, String(Date.now()));
    setOpen(false);
  }, []);

  const recheck = useCallback(async () => {
    const stillBlocked = await detect();
    if (!stillBlocked) setOpen(false);
    return stillBlocked;
  }, [detect]);

  const activatePremium = useCallback(() => {
    setItem(PREMIUM_KEY, '1');
    setOpen(false);
    setAdBlocked(false);
  }, []);

  return { adBlocked, open, dismiss, recheck, activatePremium, setOpen };
}