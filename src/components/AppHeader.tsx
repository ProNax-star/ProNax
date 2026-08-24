/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useState, useEffect } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Menu, Search, Upload, Bell, User, X, Mic, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/loose';

export function AppHeader({ onSidebarToggle }: { onSidebarToggle: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [user, setUser] = useState<{ email?: string; display_name?: string; avatar_url?: string } | null>(null);

  const location = useLocation();
  const isShortsPage = location.pathname.includes('/shorts');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email,
          display_name: data.user.user_metadata?.display_name,
          avatar_url: data.user.user_metadata?.avatar_url,
        });
      }
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/explore?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:block sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onSidebarToggle} className="lg:flex">
              <Menu className="h-5 w-5" />
            </Button>
            <Link to="/" className="flex items-center gap-1">
              <div className="text-xl font-black bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(34,211,238,0.4)]">
                ProNax
              </div>
            </Link>
          </div>

          <div className="flex-1 max-w-2xl mx-6">
            <form onSubmit={handleSearch} className="flex w-full">
              <div className="flex flex-1">
                <Input
                  type="search"
                  placeholder="Search ProNax..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-l-full border-r-0 bg-white/5 border-white/10 focus-visible:ring-1 focus-visible:ring-cyan-500 text-sm h-9"
                />
                <Button type="submit" variant="secondary" className="rounded-r-full border-l-0 px-5 h-9 bg-white/10 hover:bg-white/20">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" asChild className="h-9 w-9">
              <Link to="/upload"><Upload className="h-4 w-4" /></Link>
            </Button>
            <Button variant="ghost" size="icon" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee]" />
            </Button>
            <Avatar className="h-8 w-8 ring-1 ring-cyan-500/50">
              <AvatarImage src={user?.avatar_url} />
              <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className={`md:hidden z-50 ${isShortsPage ? 'fixed top-2 left-0 right-0 px-3 bg-transparent' : 'sticky top-0 bg-black/90 backdrop-blur-md border-b border-white/10'}`}>
        {showMobileSearch ? (
          <form onSubmit={handleSearch} className="flex items-center w-full gap-2 bg-black/90 backdrop-blur-md p-1.5 rounded-full border border-cyan-500/30 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <Button type="button" variant="ghost" size="icon" onClick={() => setShowMobileSearch(false)} className="h-7 w-7 p-0 text-white">
              <X className="h-4 w-4" />
            </Button>
            <Input
              type="search"
              placeholder="Search ProNax"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 rounded-full bg-white/10 h-7 text-xs text-white border-0 focus-visible:ring-0"
              autoFocus
            />
            <Button type="submit" variant="ghost" size="icon" className="h-7 w-7 p-0 text-white">
              <Search className="h-4 w-4" />
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-between h-12 px-4">
            {!isShortsPage && (
              <Link to="/" className="flex items-center gap-1">
                <div className="text-xl font-black bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">
                  ProNax
                </div>
              </Link>
            )}

            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSearch(true)}
                className={`h-10 w-10 rounded-full ${isShortsPage ? 'bg-black/50 text-white backdrop-blur-md border border-white/20' : 'text-zinc-200'}`}
              >
                <Search className="h-5 w-5" />
              </Button>

              {!isShortsPage && (
                <Button variant="ghost" size="icon" className="relative h-10 w-10 text-zinc-200">
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2 h-2 w-2 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee]" />
                </Button>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
