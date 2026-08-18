import { Home, Compass, PlaySquare, Upload, User } from 'lucide-react';
import { NavLink } from '@/components/NavLink';

const navItems = [
  { icon: Home, label: 'Home', to: '/' },
  { icon: Compass, label: 'Explore', to: '/explore' },
  { icon: Upload, label: 'Upload', to: '/upload' },
  { icon: PlaySquare, label: 'Shorts', to: '/shorts' },
  { icon: User, label: 'Profile', to: '/profile' },
];

export function MobileNav() {
  return (
    <nav aria-label="Primary" className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border/30 backdrop-blur-xl">
      <div className="flex items-center justify-around h-16 pb-1">
        {navItems.map(({ icon: Icon, label, to }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            aria-label={label}
            className="flex flex-col items-center justify-center gap-1.5 text-muted-foreground transition-all duration-200 min-w-[44px] min-h-[44px] px-2 py-2 hover:text-foreground active:scale-95"
            activeClassName="text-primary"
          >
            <Icon className="w-5 h-5 transition-transform duration-200" />
            <span className="text-[10px] font-medium tracking-wide">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
