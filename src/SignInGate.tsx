/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * SignInGate — the single sign-in prompt used everywhere in ProNax.
 *
 * Every "you must sign in" surface (studio, wallet, library pages, settings…)
 * renders this component so the look, copy style and CTA are identical, and it
 * always points at the one real auth screen (`/auth`).
 *
 * Styling matches the 3D auth card: perspective tilt + glass surface, using
 * only semantic design tokens from src/styles.css.
 */
import { Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import { LogIn, type LucideIcon } from 'lucide-react';

interface SignInGateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Renders inline inside a page section instead of filling the viewport. */
  inline?: boolean;
}

export function SignInGate({
  title = 'Sign in to ProNax',
  description = 'Create your account or sign in to continue — it takes a few seconds.',
  icon: Icon = LogIn,
  inline = false,
}: SignInGateProps) {
  return (
    <div
      className={`perspective-container flex items-center justify-center px-4 ${
        inline ? 'py-14' : 'flex-1 min-h-[70vh] py-10 pb-24 lg:pb-10'
      }`}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        whileHover={{ rotateX: -4, rotateY: 4, scale: 1.015 }}
        className="tilt-3d w-full max-w-md text-center glass-strong rounded-2xl border border-primary/30 glow-border-primary p-7 lg:p-9"
      >
        <div className="relative mx-auto mb-5 w-16 h-16">
          <div className="absolute inset-0 rounded-2xl blur-2xl bg-primary/40 opacity-70" />
          <div className="relative w-16 h-16 rounded-2xl gradient-primary glow-primary flex items-center justify-center">
            <Icon className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h2 className="text-xl lg:text-2xl font-display font-bold text-glow mb-2">{title}</h2>
        <p className="text-xs lg:text-sm text-muted-foreground mb-6">{description}</p>
        <Link
          to="/auth"
          className="inline-flex w-full items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-primary-foreground gradient-primary glow-primary hover:scale-[1.02] transition"
        >
          <LogIn className="w-4 h-4" /> Sign in
        </Link>
        <p className="text-[11px] text-muted-foreground mt-4">
          New here?{' '}
          <Link to="/auth" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

export default SignInGate;
