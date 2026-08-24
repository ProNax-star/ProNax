import { useEffect, useRef, useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface AnimatedCounterProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  duration?: number;
  format?: (n: number) => string;
  className?: string;
  prefix?: string;
  suffix?: string;
  glow?: boolean;
  currency?: string;
  percentage?: boolean;
  abbreviate?: boolean;
  decimals?: number;
}

export const compactFormat = (n: number): string => {
  if (isNaN(n)) return '0';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return sign + Math.round(abs).toString();
};

export const currencyFormat = (n: number, symbol = '$', decimals = 2): string => {
  return `${symbol}${n.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const percentageFormat = (n: number, decimals = 1): string => {
  return `${n.toFixed(decimals)}%`;
};

/**
 * Advanced 3D Physics-Interpolated Count-Up Component
 * Features tabular-num alignment, zero layout jitter, and subtle 3D glowing depth.
 */
export const AnimatedCounter = forwardRef<HTMLSpanElement, AnimatedCounterProps>(
  (
    {
      value,
      duration = 1200,
      format,
      className = '',
      prefix = '',
      suffix = '',
      glow = false,
      currency,
      percentage = false,
      abbreviate = false,
      decimals,
      ...props
    },
    ref
  ) => {
    const [display, setDisplay] = useState(value);
    const prevRef = useRef(value);

    useEffect(() => {
      const from = prevRef.current;
      const to = value;
      if (from === to) return;

      const start = performance.now();
      let rafId: number;

      // Advanced Easing: Smooth Out Quint (3D feel gliding deceleration)
      const easeOutQuint = (x: number): number => {
        return 1 - Math.pow(1 - x, 5);
      };

      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(1, elapsed / duration);
        const easedProgress = easeOutQuint(progress);

        const currentValue = from + (to - from) * easedProgress;
        setDisplay(currentValue);

        if (progress < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          prevRef.current = to;
        }
      };

      rafId = requestAnimationFrame(tick);

      return () => {
        if (rafId) cancelAnimationFrame(rafId);
      };
    }, [value, duration]);

    const renderFormatted = (val: number): string => {
      if (format) return format(val);
      if (currency) return currencyFormat(val, currency, decimals ?? 2);
      if (percentage) return percentageFormat(val, decimals ?? 1);
      if (abbreviate) return compactFormat(val);
      if (typeof decimals === 'number') return val.toFixed(decimals);
      return Math.round(val).toLocaleString();
    };

    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-mono font-extrabold tracking-tight tabular-nums select-none transition-all duration-300",
          glow &&
            "drop-shadow-[0_0_12px_rgba(239,68,68,0.5)] text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-100 to-red-400",
          className
        )}
        {...props}
      >
        {prefix && <span className="mr-0.5 text-zinc-400 font-sans">{prefix}</span>}
        <span>{renderFormatted(display)}</span>
        {suffix && <span className="ml-0.5 text-zinc-400 font-sans">{suffix}</span>}
      </span>
    );
  }
);

AnimatedCounter.displayName = 'AnimatedCounter';