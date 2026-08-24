/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Link, useLocation } from '@tanstack/react-router';
import { Home, Compass, PlusSquare, PlaySquare, User } from 'lucide-react';

export function MobileNav() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', to: '/' },
    { icon: Compass, label: 'Explore', to: '/explore' },
    { icon: PlusSquare, label: 'Upload', to: '/upload' },
    { icon: PlaySquare, label: 'Shorts', to: '/shorts' },
    { icon: User, label: 'Profile', to: '/profile' },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border/70 bg-background/95 px-1 backdrop-blur-xl md:hidden"
      style={{
        perspective: '600px',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        minHeight: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {navItems.map(({ icon: Icon, label, to }) => {
        const isActive = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            aria-current={isActive ? 'page' : undefined}
            className={`group flex min-w-[52px] flex-col items-center justify-center gap-0.5 py-1.5 transition-all duration-200 active:scale-95 ${
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span
              className={`grid place-items-center rounded-xl px-2.5 py-1 transition-transform duration-200 group-active:translate-y-[1px] ${
                isActive
                  ? '-translate-y-0.5 bg-primary/10 shadow-[0_4px_10px_-4px_hsl(var(--glow-primary)/0.8),inset_0_1px_0_hsl(var(--foreground)/0.12)]'
                  : 'shadow-[0_2px_4px_-3px_hsl(var(--background)/0.9)]'
              }`}
              style={{ transform: isActive ? 'rotateX(12deg)' : undefined }}
            >
              <Icon className="h-[22px] w-[22px]" />
            </span>
            <span className="text-[10px] font-semibold leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
