/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bookmark, Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/loose';
import { WATCH_LATER_TITLE } from '@/lib/watchLater';
import { showSavedToast } from '@/components/SavedToast';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  videoId: string;
  videoThumbUrl?: string | null;
};

type Playlist = { id: string; title: string; visibility: string; saved: boolean; thumb?: string | null };

export function SaveToPlaylistDialog({ open, onOpenChange, videoId, videoThumbUrl }: Props) {
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState<string | null>(null);
  const [lists, setLists] = useState<Playlist[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setCreating(false);
      setNewTitle('');
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;
      if (cancelled) return;
      setUid(userId);
      if (!userId) { setLoading(false); return; }

      const { data: pls } = await supabase
        .from('playlists').select('id,title,visibility').eq('user_id', userId).order('created_at', { ascending: false });
      const ids = ((pls ?? []) as any[]).map((p) => p.id);

      let savedIds = new Set<string>();
      const thumbs = new Map<string, string | null>();
      if (ids.length) {
        const [{ data: mine }, { data: allItems }] = await Promise.all([
          supabase.from('playlist_items').select('playlist_id').eq('video_id', videoId).in('playlist_id', ids),
          supabase.from('playlist_items').select('playlist_id, video_id, added_at').in('playlist_id', ids).order('added_at'),
        ]);
        savedIds = new Set(((mine ?? []) as any[]).map((i) => i.playlist_id));
        const firstVideo = new Map<string, string>();
        ((allItems ?? []) as any[]).forEach((i) => {
          if (!firstVideo.has(i.playlist_id)) firstVideo.set(i.playlist_id, i.video_id);
        });
        const vidIds = [...new Set([...firstVideo.values()])];
        if (vidIds.length) {
          const { data: vids } = await supabase.from('videos').select('id,thumb_url').in('id', vidIds);
          const byId = new Map(((vids ?? []) as any[]).map((v) => [v.id, v.thumb_url]));
          firstVideo.forEach((vid, pid) => thumbs.set(pid, byId.get(vid) ?? null));
        }
      }
      if (cancelled) return;
      const mapped = ((pls ?? []) as any[]).map((p) => ({
        id: p.id, title: p.title, visibility: p.visibility ?? 'private',
        saved: savedIds.has(p.id), thumb: thumbs.get(p.id) ?? null,
      }));
      // Watch later always first
      mapped.sort((a, b) => (a.title === WATCH_LATER_TITLE ? -1 : b.title === WATCH_LATER_TITLE ? 1 : 0));
      setLists(mapped);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, videoId]);

  const toggle = async (pl: Playlist) => {
    setBusy(true);
    if (pl.saved) {
      await supabase.from('playlist_items').delete().eq('playlist_id', pl.id).eq('video_id', videoId);
      toast(`Removed from ${pl.title}`);
    } else {
      const { error } = await supabase.from('playlist_items').insert({ playlist_id: pl.id, video_id: videoId });
      if (error) { toast.error(error.message); setBusy(false); return; }
      showSavedToast({ label: `Saved to ${pl.title}`, thumbUrl: videoThumbUrl, playlistId: pl.id });
    }
    setLists((prev) => prev.map((p) => (p.id === pl.id ? { ...p, saved: !p.saved } : p)));
    setBusy(false);
    onOpenChange(false);
  };

  const create = async () => {
    if (!newTitle.trim() || !uid) return;
    setBusy(true);
    const title = newTitle.trim();
    const { data, error } = await supabase
      .from('playlists').insert({ user_id: uid, title, visibility: 'private' }).select().maybeSingle();
    if (error || !data) { toast.error(error?.message ?? 'Could not create playlist'); setBusy(false); return; }
    const pid = (data as any).id as string;
    await supabase.from('playlist_items').insert({ playlist_id: pid, video_id: videoId });
    setLists((prev) => [{ id: pid, title, visibility: 'private', saved: true, thumb: videoThumbUrl ?? null }, ...prev]);
    setNewTitle('');
    setCreating(false);
    setBusy(false);
    showSavedToast({ label: `Saved to ${title}`, thumbUrl: videoThumbUrl, playlistId: pid });
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="border-border/40 bg-card">
        <div className="mx-auto w-full max-w-lg pb-6">
          <DrawerHeader className="px-5 pb-2 pt-3 text-left">
            <DrawerTitle className="text-2xl font-bold">Save to...</DrawerTitle>
          </DrawerHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : !uid ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">Sign in to save videos to playlists.</p>
          ) : (
            <div className="max-h-[46vh] space-y-1 overflow-y-auto px-3">
              {lists.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">No playlists yet — create one below.</p>
              )}
              {lists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => toggle(p)}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/60 disabled:opacity-60"
                >
                  <div className="h-12 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {p.thumb ? <img src={p.thumb} alt="" className="h-full w-full object-cover" /> : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-foreground">{p.title}</p>
                    <p className="text-xs capitalize text-muted-foreground">{p.visibility}</p>
                  </div>
                  <Bookmark className={`h-6 w-6 shrink-0 ${p.saved ? 'fill-foreground text-foreground' : 'text-muted-foreground'}`} />
                </button>
              ))}
            </div>
          )}

          {uid ? (
            <div className="px-4 pt-3">
              {creating ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
                    placeholder="Playlist name"
                    className="h-11 rounded-full"
                  />
                  <Button size="icon" variant="ghost" className="h-11 w-11 rounded-full" onClick={() => setCreating(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button className="h-11 rounded-full" onClick={create} disabled={busy || !newTitle.trim()}>
                    Create
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-muted/60 py-3 text-base font-semibold text-foreground hover:bg-muted"
                >
                  <Plus className="h-5 w-5" /> New playlist
                </button>
              )}
            </div>
          ) : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
