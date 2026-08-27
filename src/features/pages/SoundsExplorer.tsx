/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { Link } from '@/lib/router-compat';
import { Music2, TrendingUp, Play, Search, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/loose';

interface TrendingSound {
  id: string;
  title: string | null;
  artist: string | null;
  cover_url: string | null;
  audio_track_id: string;
  usage_count: number;
  trend_score: number;
  category: string | null;
}

export default function SoundsExplorer() {
  const [sounds, setSounds] = useState<TrendingSound[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'trending' | 'usage'>('trending');

  const categories = ['all', 'pop', 'hip-hop', 'electronic', 'rock', 'r&b', 'latin', 'country'];

  useEffect(() => {
    loadSounds();
  }, [selectedCategory, sortBy]);

  const loadSounds = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('trending_sounds')
        .select('*')
        .eq('is_trending', true);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (sortBy === 'trending') {
        query = query.order('trend_score', { ascending: false });
      } else {
        query = query.order('usage_count', { ascending: false });
      }

      const { data } = await query.limit(100);
      setSounds((data ?? []) as TrendingSound[]);
    } catch (error) {
      console.error('Failed to load sounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSounds = sounds.filter(sound =>
    (sound.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     sound.artist?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-[100dvh] bg-black text-white">
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 h-14 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <h1 className="text-sm font-bold">Sounds</h1>
      </div>

      {/* Search & Filters */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
          <Input
            placeholder="Search sounds..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-white/80 hover:bg-white/20'
              }`}
            >
              {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={sortBy === 'trending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('trending')}
            className="flex-1"
          >
            <TrendingUp className="w-3 h-3 mr-1" />
            Trending
          </Button>
          <Button
            variant={sortBy === 'usage' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSortBy('usage')}
            className="flex-1"
          >
            <Play className="w-3 h-3 mr-1" />
            Most Used
          </Button>
        </div>
      </div>

      {/* Sounds Grid */}
      <div className="px-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-white/50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : filteredSounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/50">
            <Music2 className="w-12 h-12 mb-3" />
            <p>No sounds found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredSounds.map((sound) => (
              <Link
                key={sound.id}
                to={`/sound/${sound.audio_track_id}`}
                className="group"
              >
                <div className="relative aspect-square rounded-xl overflow-hidden bg-gradient-to-br from-[#FE2C55]/20 to-[#25F4EE]/20 border border-white/10">
                  {sound.cover_url ? (
                    <img
                      src={sound.cover_url}
                      alt={sound.title || 'Sound'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-8 h-8 text-white/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="text-xs font-semibold text-white line-clamp-2">
                      {sound.title || 'Original Sound'}
                    </p>
                    <p className="text-[10px] text-white/80 mt-0.5">
                      {sound.artist || 'Unknown Artist'}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <TrendingUp className="w-3 h-3 text-[#25F4EE]" />
                      <span className="text-[10px] text-white/70">
                        {sound.usage_count.toLocaleString()} uses
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
