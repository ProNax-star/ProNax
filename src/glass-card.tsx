import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { useRef, MouseEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
  glow?: 'primary' | 'secondary' | 'accent' | 'none';
  onClick?: () => void;
}

/**
 * Premium 3D glass card. Hover applies perspective tilt + neon edge glow.
 * Wraps any content; safe to nest. Used across Home / Profile / Shorts / Watch.
 */
export function GlassCard({ children, className, tilt = true, glow = 'primary', onClick }: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const sx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sy = useSpring(ry, { stiffness: 200, damping: 18 });
  const rotateX = useTransform(sy, [-0.5, 0.5], [8, -8]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-8, 8]);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!tilt) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    rx.set((e.clientX - r.left) / r.width - 0.5);
    ry.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => { rx.set(0); ry.set(0); };

  const glowClass = glow === 'none' ? '' : `glow-border-${glow}`;

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={tilt ? { rotateX, rotateY, transformPerspective: 1000, transformStyle: 'preserve-3d' } : undefined}
      className={cn(
        'relative rounded-2xl glass-strong border border-border/40 overflow-hidden transition-shadow',
        'hover:shadow-[0_30px_80px_-20px_hsla(var(--primary)/0.35)]',
        glowClass,
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
