import { useEffect, useRef, useState } from 'react';

/**
 * ProNax hover-scrub preview built from a horizontal sprite sheet.
 * The sheet is one row of N equally-wide frames; we cycle through them on
 * hover (desktop) or long-press (touch) using background-position.
 */
export function HoverSprite({ url, frames }: { url: string; frames: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!active || frames < 2) return;
    const id = window.setInterval(() => {
      setI((prev) => (prev + 1) % frames);
    }, 350);
    return () => window.clearInterval(id);
  }, [active, frames]);

  const start = () => { setI(0); setActive(true); };
  const stop = () => setActive(false);

  return (
    <div
      ref={ref}
      onMouseEnter={start}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
      className={`absolute inset-0 transition-opacity duration-200 ${active ? 'opacity-100' : 'opacity-0'}`}
      style={{
        backgroundImage: `url(${url})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: `${frames * 100}% 100%`,
        backgroundPosition: `${(i / Math.max(1, frames - 1)) * 100}% 0`,
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}
