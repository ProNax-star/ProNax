/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaTo?: string;
}

export function EmptyState({ icon: Icon, title, description, ctaLabel, ctaTo }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center text-center py-20 px-6"
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full blur-3xl bg-primary/40 opacity-60 animate-pulse" />
        <div className="relative w-24 h-24 rounded-full glass-strong border border-primary/40 flex items-center justify-center glow-primary">
          <Icon className="w-11 h-11 text-primary" />
        </div>
      </div>
      <h2 className="text-xl lg:text-2xl font-display font-bold text-glow mb-2">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6 leading-relaxed">{description}</p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold glow-primary hover:scale-[1.03] transition"
        >
          {ctaLabel}
        </Link>
      )}
    </motion.div>
  );
}