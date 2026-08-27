/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from '@/lib/router-compat';
import { ListVideo, Loader2, Plus, Lock, Globe, EyeOff, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { toast } from '@/hooks/use-toast';

interface Playlist {
  id: string;
  title: string;
  description: string | null;
  visibility: 'public' | 'unlisted' | 'private';
  created_at: string;
  count?: number;
}

const VisIcon = ({ v }: { v: string }) =>
  v === 'public' ? <Globe className="w-3.5 h-3.5" /> : v === 'unlisted' ? <EyeOff className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />;

export default function Playlists() {
  const [items, setItems] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'unlisted' | 'private'>('private');
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    setSignedIn(!!uid);
    if (!uid) { setLoading(false); return; }
    const { data: pls } = await supabase.from('playlists')
      .select('id, title, description, visibility, created_at')
      .eq('user_id', uid).order('created_at', { ascending: false });
    const ids = (pls ?? []).map((p: any) => p.id);
    const counts = new Map<string, number>();
    if (ids.length) {
      const { data: pi } = await supabase.from('playlist_items').select('playlist_id').in('playlist_id', ids);
      (pi ?? []).forEach((r: any) => counts.set(r.playlist_id, (counts.get(r.playlist_id) ?? 0) + 1));
    }
    setItems((pls ?? []).map((p: any) => ({ ...p, count: counts.get(p.id) ?? 0 })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!title.trim()) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return;
    const { data, error } = await supabase.from('playlists').insert({ user_id: uid, title: title.trim(), visibility }).select().maybeSingle();
    if (error || !data) { toast({ title: 'Could not create', description: error?.message || 'Unknown error', variant: 'destructive' as any }); return; }
    toast({ title: 'Playlist created' });
    setTitle(''); setCreating(false);
    navigate(`/playlist/${data.id}`);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this playlist?')) return;
    await supabase.from('playlists').delete().eq('id', id);
    setItems(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="flex-1 min-h-screen px-3 lg:px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListVideo className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-display font-bold text-foreground">Playlists</h1>
        </div>
        {signedIn && (
          <button onClick={() => setCreating(v => !v)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs gradient-primary text-primary-foreground glow-primary">
            <Plus className="w-3.5 h-3.5" /> New playlist
          </button>
        )}
      </div>

      {creating && (
        <div className="glass border border-border/40 rounded-xl p-4 mb-4 space-y-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Playlist title"
            className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/50 text-sm focus:outline-none focus:border-primary/50" />
          <div className="flex items-center gap-2">
            {(['private', 'unlisted', 'public'] as const).map(v => (
              <button key={v} onClick={() => setVisibility(v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs capitalize transition-all ${visibility === v ? 'bg-foreground text-background' : 'bg-muted/40 text-muted-foreground'}`}>
                <VisIcon v={v} /> {v}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => setCreating(false)} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground">Cancel</button>
            <button onClick={create} className="px-3 py-1.5 rounded-lg text-xs gradient-primary text-primary-foreground">Create</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…</div>
      ) : signedIn === false ? (
        <div className="text-center py-20 text-muted-foreground text-sm">Sign in to create and manage playlists.</div>
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground text-sm">No playlists yet. Create one to organize your videos.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(p => (
            <div key={p.id} className="group relative glass border border-border/40 rounded-xl overflow-hidden hover:border-primary/50 transition-all">
              <Link to={`/playlist/${p.id}`} className="block p-4">
                <div className="aspect-video rounded-lg bg-gradient-to-br from-primary/20 via-secondary/15 to-accent/20 mb-3 flex items-center justify-center">
                  <ListVideo className="w-10 h-10 text-primary/60" />
                </div>
                <h3 className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><VisIcon v={p.visibility} /> {p.visibility}</span>
                  <span>•</span>
                  <span>{p.count} video{p.count === 1 ? '' : 's'}</span>
                </div>
              </Link>
              <button onClick={() => remove(p.id)} className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/60 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/20 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
