import { motion } from 'framer-motion';

/**
 * Ambient floating gradient orbs for premium page backgrounds.
 * Render once near top of a page; absolutely positioned, pointer-events none.
 */
export function OrbBackground({ variant = 'aurora' }: { variant?: 'aurora' | 'sunset' | 'cyber' }) {
  const palettes = {
    aurora: ['hsla(190,100%,50%,0.18)', 'hsla(270,80%,60%,0.16)', 'hsla(330,80%,55%,0.14)'],
    sunset: ['hsla(20,100%,60%,0.18)', 'hsla(330,80%,55%,0.16)', 'hsla(45,100%,60%,0.14)'],
    cyber:  ['hsla(150,100%,50%,0.18)', 'hsla(190,100%,50%,0.16)', 'hsla(270,80%,60%,0.14)'],
  } as const;
  const [a, b, c] = palettes[variant];
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full blur-[120px]"
        style={{ background: a, top: '-10%', left: '-10%' }}
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 40, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[120px]"
        style={{ background: b, bottom: '-10%', right: '-10%' }}
        animate={{ x: [0, -60, 40, 0], y: [0, 50, -40, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[100px]"
        style={{ background: c, top: '40%', left: '40%' }}
        animate={{ x: [0, 50, -50, 0], y: [0, -40, 30, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}
