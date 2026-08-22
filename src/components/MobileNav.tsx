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
    <nav className="fixed bottom-0 left-0 right-0 h-16 md:hidden flex justify-around items-center bg-black/95 backdrop-blur-lg border-t border-zinc-800/80 z-50 px-2 max-w-full box-border" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {navItems.map(({ icon: Icon, label, to }) => {
        const isActive = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center justify-center gap-1.5 py-2 min-w-0 flex-1 max-w-[80px] transition-colors ${
              isActive ? 'text-cyan-400 font-bold' : 'text-zinc-300 hover:text-white font-semibold'
            }`}
          >
            <Icon className="w-6 h-6 flex-shrink-0" />
            <span className="text-[11px] leading-none font-semibold truncate w-full text-center">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}