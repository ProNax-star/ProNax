import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/loose';
import { toast } from 'sonner';

export function useCommentLikes(commentIds: string[]) {
  const [likes, setLikes] = useState<Record<string, { count: number; liked: boolean }>>({});

  const refresh = useCallback(async () => {
    if (commentIds.length === 0) { setLikes({}); return; }
    try {
      const { data: allLikes, error } = await (supabase as any)
        .from('comment_likes')
        .select('comment_id, user_id')
        .in('comment_id', commentIds);
      if (error) throw error;
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id;
      const map: Record<string, { count: number; liked: boolean }> = {};
      commentIds.forEach((id) => { map[id] = { count: 0, liked: false }; });
      (allLikes ?? []).forEach((row: any) => {
        const entry = map[row.comment_id] ?? { count: 0, liked: false };
        entry.count += 1;
        if (uid && row.user_id === uid) entry.liked = true;
        map[row.comment_id] = entry;
      });
      setLikes(map);
    } catch (e: any) {
      // silent — table may not have likes yet
    }
  }, [commentIds.join(',')]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async (commentId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Sign in to like comments'); return; }
    const cur = likes[commentId] ?? { count: 0, liked: false };
    // optimistic
    setLikes((m) => ({ ...m, [commentId]: { count: cur.count + (cur.liked ? -1 : 1), liked: !cur.liked } }));
    try {
      if (cur.liked) {
        const { error } = await (supabase as any)
          .from('comment_likes').delete()
          .eq('comment_id', commentId).eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('comment_likes').insert({ comment_id: commentId, user_id: user.id });
        if (error) throw error;
      }
    } catch (e: any) {
      // revert
      setLikes((m) => ({ ...m, [commentId]: cur }));
      toast.error(e.message ?? 'Could not update like');
    }
  }, [likes]);

  return { likes, toggle, refresh };
}
