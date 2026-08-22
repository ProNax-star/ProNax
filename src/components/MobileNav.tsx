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
    <nav className="fixed bottom-0 left-0 right-0 h-14 md:hidden flex justify-around items-center bg-black/95 backdrop-blur-lg border-t border-zinc-800/80 z-50 px-2 pb-safe">
      {navItems.map(({ icon: Icon, label, to }) => {
        const isActive = location.pathname === to;
        return (
          <Link
            key={to}
            to={to}
            className={`flex flex-col items-center justify-center gap-1 py-1 min-w-[50px] transition-colors ${
              isActive ? 'text-cyan-400 font-medium' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] leading-none">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}