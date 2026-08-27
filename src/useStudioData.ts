/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/loose';
import { toast } from 'sonner';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type StudioVideo = any;

export type ChannelNotice = {
  id: string;
  notice_type: string;
  severity: string;
  title: string;
  message: string;
  action_required: boolean;
  action_url?: string;
  action_label?: string;
  related_video_id?: string;
  related_claim_id?: string;
  is_read: boolean;
  created_at: string;
};

export type CopyrightClaim = {
  id: string;
  claim_type: string;
  severity: string;
  status: string;
  detected_at: string;
  action_taken: string;
  match_percentage?: number;
  matched_content_title?: string;
  matched_content_owner?: string;
};

export type StudioAnalytics = {
  total_watch_hours: number;
  total_watch_seconds: number;
  subscriber_growth_30d: number;
  impressions: number;
  ctr: number;
};

export type StudioProfile = {
  display_name: string;
  username: string;
  avatar_url: string | null;
};

export function useStudioData(userId: string | undefined) {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<StudioVideo[]>([]);
  const [likesByVideo, setLikesByVideo] = useState<Record<string, number>>({});
  const [followersCount, setFollowersCount] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [wallet, setWallet] = useState({ balance: 0, total_earned: 0, total_withdrawn: 0 });
  const [notices, setNotices] = useState<ChannelNotice[]>([]);
  const [copyrightClaims, setCopyrightClaims] = useState<Record<string, CopyrightClaim[]>>({});
  const [analytics, setAnalytics] = useState<StudioAnalytics | null>(null);
  const [profile, setProfile] = useState<StudioProfile | null>(null);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [vRes, fRes, wRes, nRes, pRes] = await Promise.all([
        supabase.from('videos').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
        supabase.from('user_wallets').select('balance, total_earned, total_withdrawn').eq('user_id', userId).maybeSingle(),
        supabase.rpc('get_channel_notices', { p_user_id: userId, p_limit: 20 }),
        supabase.from('profiles').select('display_name, username, avatar_url').eq('id', userId).maybeSingle(),
      ]);

      const vids = (vRes.data ?? []) as StudioVideo[];
      setVideos(vids);
      setFollowersCount(fRes.count ?? 0);
      setWallet(wRes.data ?? { balance: 0, total_earned: 0, total_withdrawn: 0 });

      const total = vids.reduce((sum: number, v: StudioVideo) => sum + (v.views_count ?? 0), 0);
      setTotalViews(total);

      const noticeData = (nRes.data ?? []) as ChannelNotice[];
      setNotices(noticeData);

      if (pRes.data) {
        const p = pRes.data as { display_name?: string; username?: string; avatar_url?: string };
        setProfile({
          display_name: p.display_name || 'Your Channel',
          username: p.username || 'channel',
          avatar_url: p.avatar_url ?? null,
        });
      }

      const ids = vids.map((v) => String(v.id));
      if (ids.length) {
        const { data: likesRows } = await supabase.from('video_likes').select('video_id').in('video_id', ids);
        const map: Record<string, number> = {};
        (likesRows ?? []).forEach((r: { video_id: string }) => {
          map[r.video_id] = (map[r.video_id] ?? 0) + 1;
        });
        setLikesByVideo(map);

        const claimsMap: Record<string, CopyrightClaim[]> = {};
        for (const vid of vids) {
          const { data: claims } = await supabase.rpc('get_video_copyright_claims', { p_video_id: vid.id });
          if (claims && claims.length > 0) {
            claimsMap[String(vid.id)] = claims as CopyrightClaim[];
          }
        }
        setCopyrightClaims(claimsMap);
      } else {
        setLikesByVideo({});
        setCopyrightClaims({});
      }

      try {
        const { data: aData, error: aErr } = await supabase.rpc('get_creator_analytics', { p_user: userId });
        if (!aErr && aData) setAnalytics(aData as StudioAnalytics);
      } catch (err) {
        console.warn('[studio] analytics fetch failed', err);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Network error';
      console.error('[studio] fetch failed', e);
      toast.error('Failed to load Studio data', { description: msg });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`studio:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos', filter: `owner_id=eq.${userId}` }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'revenue_logs', filter: `user_id=eq.${userId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_notices', filter: `user_id=eq.${userId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'copyright_claims', filter: `owner_id=eq.${userId}` }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, fetchAll]);

  const unreadNoticeCount = notices.filter((n) => !n.is_read).length;

  const videosWithMeta = videos.map((v) => {
    const claims = copyrightClaims[String(v.id)] || [];
    const hasActiveClaim = claims.some((c) => c.status === 'active');
    let copyright_status: 'none' | 'warning' | 'blocked' | 'partial' = 'none';
    if (hasActiveClaim) {
      const sev = claims[0]?.severity;
      copyright_status = sev === 'critical' || sev === 'block' ? 'blocked' : sev === 'warning' ? 'warning' : 'partial';
    }
    return {
      ...v,
      copyright_status,
      copyright_claims: claims,
      likes_count: likesByVideo[String(v.id)] ?? 0,
    };
  });

  return {
    loading,
    videos: videosWithMeta,
    likesByVideo,
    followersCount,
    totalViews,
    wallet,
    notices,
    unreadNoticeCount,
    copyrightClaims,
    analytics,
    profile,
    fetchAll,
    setVideos,
  };
}
