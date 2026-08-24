/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { supabase } from '@/integrations/supabase/loose';

export const WATCH_LATER_TITLE = 'Watch later';

/** Returns the signed-in user's "Watch later" playlist id, creating it when missing. */
export async function getOrCreateWatchLater(): Promise<{ id: string | null; uid: string | null }> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id ?? null;
  if (!uid) return { id: null, uid: null };

  const { data: existing } = await supabase
    .from('playlists')
    .select('id')
    .eq('user_id', uid)
    .eq('title', WATCH_LATER_TITLE)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return { id: (existing as any).id as string, uid };

  const { data: created } = await supabase
    .from('playlists')
    .insert({ user_id: uid, title: WATCH_LATER_TITLE, visibility: 'private' })
    .select('id')
    .single();
  return { id: (created as any)?.id ?? null, uid };
}

export type WatchLaterResult =
  | { status: 'signed-out' }
  | { status: 'error'; message: string }
  | { status: 'saved'; playlistId: string }
  | { status: 'already'; playlistId: string };

export async function saveToWatchLater(videoId: string): Promise<WatchLaterResult> {
  const { id } = await getOrCreateWatchLater();
  if (!id) return { status: 'signed-out' };

  const { data: found } = await supabase
    .from('playlist_items')
    .select('id')
    .eq('playlist_id', id)
    .eq('video_id', videoId)
    .limit(1)
    .maybeSingle();
  if (found) return { status: 'already', playlistId: id };

  const { error } = await supabase.from('playlist_items').insert({ playlist_id: id, video_id: videoId });
  if (error) return { status: 'error', message: error.message };
  return { status: 'saved', playlistId: id };
}
