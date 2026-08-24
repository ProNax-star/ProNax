/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * Channel page data access — handle resolution, per-tab paginated queries,
 * follow state, blocking, reporting and privacy flags.
 */
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { normalizeHandle } from '@/lib/handles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

export const PAGE_SIZE = 24;

export interface ChannelLink {
  label: string;
  url: string;
}

export interface ChannelProfile {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  verified: boolean;
  created_at: string;
  total_views: number;
  follower_count: number;
  video_count: number;
  country: string | null;
  business_email: string | null;
  external_links: ChannelLink[];
  hide_subscriptions: boolean;
  hide_liked_videos: boolean;
  hide_playlists: boolean;
  handle_changed_at: string | null;
}

export interface ChannelVideo {
  id: string;
  title: string;
  thumb_url: string | null;
  duration_seconds: number | null;
  created_at: string;
  views_count: number;
  likes_count: number | null;
  is_short: boolean;
  monetization_enabled?: boolean | null;
}

export interface ChannelStream {
  id: string;
  title: string;
  thumbnail_url: string | null;
  is_live: boolean;
  status: string;
  viewer_count: number;
  started_at: string | null;
  scheduled_at: string | null;
  mux_playback_id: string | null;
}

export interface ChannelPlaylist {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  created_at: string;
  itemCount: number;
}

export type VideoSort = 'latest' | 'popular' | 'oldest';

export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

function parseLinks(raw: unknown): ChannelLink[] {
  if (!raw) return [];
  const value = typeof raw === 'string' ? safeJson(raw) : raw;
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (typeof entry === 'string') return { label: entry, url: entry };
      const e = entry as { label?: string; url?: string; title?: string; href?: string };
      const url = e.url ?? e.href ?? '';
      return { label: e.label ?? e.title ?? url, url };
    })
    .filter((l) => isSafeExternalUrl(l.url))
    .slice(0, 12);
}

function safeJson(raw: string): unknown {
  try { return JSON.parse(raw); } catch { return null; }
}

/** Only http(s) links are rendered — blocks javascript:/data: URLs. */
export function isSafeExternalUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function toAbsoluteUrl(url: string): string {
  return url.startsWith('http') ? url : `https://${url}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(p: any): ChannelProfile {
  return {
    id: p.id,
    handle: p.handle ?? null,
    display_name: p.display_name ?? null,
    bio: p.bio ?? null,
    avatar_url: p.avatar_url ?? null,
    banner_url: p.banner_url ?? null,
    verified: Boolean(p.verified),
    created_at: p.created_at,
    total_views: Number(p.total_views ?? 0),
    follower_count: Number(p.follower_count ?? 0),
    video_count: Number(p.video_count ?? 0),
    country: p.country ?? null,
    business_email: p.business_email ?? null,
    external_links: parseLinks(p.external_links),
    hide_subscriptions: Boolean(p.hide_subscriptions),
    hide_liked_videos: Boolean(p.hide_liked_videos),
    hide_playlists: Boolean(p.hide_playlists),
    handle_changed_at: p.handle_changed_at ?? null,
  };
}

export interface ResolvedChannel {
  profile: ChannelProfile;
  /** True when the requested handle is a historical one and should redirect. */
  redirected: boolean;
  canonicalHandle: string | null;
}

/**
 * Resolves a handle to a channel, following historical handles so that old
 * channel URLs keep working. Returns null when the handle does not exist.
 */
export async function resolveChannel(rawHandle: string): Promise<ResolvedChannel | null> {
  const handle = normalizeHandle(rawHandle.replace(/^@/, ''));
  if (!handle) return null;

  const { data: rpcData, error: rpcError } = await supabase.rpc('resolve_channel_handle', { _handle: handle });
  if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
    const row = rpcData[0] as { user_id: string; canonical_handle: string | null; redirected: boolean };
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', row.user_id).maybeSingle();
    if (profile) {
      return {
        profile: mapProfile(profile),
        redirected: Boolean(row.redirected),
        canonicalHandle: row.canonical_handle ?? null,
      };
    }
  }

  const { data: direct } = await supabase
    .from('profiles')
    .select('*')
    .ilike('handle', handle)
    .maybeSingle();
  if (direct) {
    return { profile: mapProfile(direct), redirected: false, canonicalHandle: direct.handle ?? null };
  }

  const { data: byName } = await supabase
    .from('profiles')
    .select('*')
    .ilike('display_name', handle)
    .maybeSingle();
  if (byName) {
    return { profile: mapProfile(byName), redirected: Boolean(byName.handle), canonicalHandle: byName.handle ?? null };
  }

  return null;
}

export async function fetchChannelById(userId: string): Promise<ChannelProfile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data ? mapProfile(data) : null;
}

const VIDEO_COLUMNS =
  'id,title,thumb_url,duration_seconds,created_at,views_count,likes_count,is_short,monetization_enabled';

export async function fetchChannelVideos(
  userId: string,
  opts: { isShort: boolean; sort: VideoSort; page: number; pageSize?: number },
): Promise<Page<ChannelVideo>> {
  const pageSize = opts.pageSize ?? PAGE_SIZE;
  const from = opts.page * pageSize;

  let query = supabase
    .from('videos')
    .select(VIDEO_COLUMNS)
    .eq('owner_id', userId)
    .eq('is_removed', false)
    .eq('is_short', opts.isShort)
    .eq('visibility', 'public');

  if (opts.sort === 'popular') query = query.order('views_count', { ascending: false });
  else if (opts.sort === 'oldest') query = query.order('created_at', { ascending: true });
  else query = query.order('created_at', { ascending: false });

  const { data } = await query.range(from, from + pageSize);
  const rows = (data ?? []) as ChannelVideo[];
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function fetchChannelStreams(
  userId: string,
  opts: { page: number; pageSize?: number },
): Promise<Page<ChannelStream>> {
  const pageSize = opts.pageSize ?? 12;
  const from = opts.page * pageSize;
  const { data } = await supabase
    .from('streams')
    .select('id,title,thumbnail_url,is_live,status,viewer_count,started_at,scheduled_at,mux_playback_id')
    .eq('user_id', userId)
    .order('is_live', { ascending: false })
    .order('started_at', { ascending: false, nullsFirst: false })
    .range(from, from + pageSize);
  const rows = (data ?? []) as ChannelStream[];
  return { items: rows.slice(0, pageSize), hasMore: rows.length > pageSize };
}

export async function fetchChannelPlaylists(
  userId: string,
  opts: { page: number; pageSize?: number; includePrivate?: boolean },
): Promise<Page<ChannelPlaylist>> {
  const pageSize = opts.pageSize ?? 12;
  const from = opts.page * pageSize;
  let query = supabase
    .from('playlists')
    .select('id,title,description,visibility,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (!opts.includePrivate) query = query.eq('visibility', 'public');

  const { data } = await query.range(from, from + pageSize);
  const rows = (data ?? []) as Omit<ChannelPlaylist, 'itemCount'>[];
  const page = rows.slice(0, pageSize);

  const counts = await Promise.all(
    page.map(async (pl) => {
      const { count } = await supabase
        .from('playlist_items')
        .select('id', { count: 'exact', head: true })
        .eq('playlist_id', pl.id);
      return count ?? 0;
    }),
  );

  return {
    items: page.map((pl, i) => ({ ...pl, itemCount: counts[i] ?? 0 })),
    hasMore: rows.length > pageSize,
  };
}

export interface ChannelStats {
  followers: number;
  totalViews: number;
  videoCount: number;
}

export async function fetchChannelStats(userId: string): Promise<ChannelStats> {
  const [followers, videos] = await Promise.all([
    supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('videos').select('views_count').eq('owner_id', userId).eq('is_removed', false),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (videos.data ?? []) as any[];
  return {
    followers: followers.count ?? 0,
    totalViews: rows.reduce((sum, v) => sum + Number(v.views_count ?? 0), 0),
    videoCount: rows.length,
  };
}

/* ------------------------------ Follow state ----------------------------- */

export async function isFollowing(viewerId: string, channelId: string): Promise<boolean> {
  const { data } = await supabase
    .from('follows')
    .select('id')
    .eq('follower_id', viewerId)
    .eq('following_id', channelId)
    .maybeSingle();
  return Boolean(data);
}

export async function setFollow(viewerId: string, channelId: string, follow: boolean): Promise<void> {
  if (follow) {
    const { error } = await supabase
      .from('follows')
      .upsert({ follower_id: viewerId, following_id: channelId }, { onConflict: 'follower_id,following_id' });
    if (error && error.code !== '23505') throw error;
  } else {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', viewerId)
      .eq('following_id', channelId);
    if (error) throw error;
  }
}

/* --------------------------------- Blocks -------------------------------- */

export async function isBlocked(viewerId: string, channelId: string): Promise<boolean> {
  const { data } = await supabase
    .from('blocked_users')
    .select('id')
    .eq('blocker_id', viewerId)
    .eq('blocked_id', channelId)
    .maybeSingle();
  return Boolean(data);
}

export async function setBlocked(viewerId: string, channelId: string, blocked: boolean): Promise<void> {
  if (blocked) {
    const { error } = await supabase
      .from('blocked_users')
      .upsert({ blocker_id: viewerId, blocked_id: channelId }, { onConflict: 'blocker_id,blocked_id' });
    if (error && error.code !== '23505') throw error;
    // Blocking also removes the follow relationship in both directions.
    await supabase.from('follows').delete().eq('follower_id', viewerId).eq('following_id', channelId);
  } else {
    const { error } = await supabase
      .from('blocked_users')
      .delete()
      .eq('blocker_id', viewerId)
      .eq('blocked_id', channelId);
    if (error) throw error;
  }
}

export interface BlockedEntry {
  id: string;
  blocked_id: string;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  created_at: string;
}

export async function listBlocked(viewerId: string): Promise<BlockedEntry[]> {
  const { data } = await supabase
    .from('blocked_users')
    .select('id,blocked_id,created_at')
    .eq('blocker_id', viewerId)
    .order('created_at', { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  if (rows.length === 0) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id,display_name,handle,avatar_url')
    .in('id', rows.map((r) => r.blocked_id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byId = new Map(((profiles ?? []) as any[]).map((p) => [p.id, p]));

  return rows.map((r) => {
    const p = byId.get(r.blocked_id);
    return {
      id: r.id,
      blocked_id: r.blocked_id,
      display_name: p?.display_name ?? null,
      handle: p?.handle ?? null,
      avatar_url: p?.avatar_url ?? null,
      created_at: r.created_at,
    };
  });
}

/* -------------------------------- Reports -------------------------------- */

export async function reportChannel(
  reporterId: string,
  channelId: string,
  reason: string,
  details?: string,
): Promise<void> {
  const { error } = await supabase
    .from('channel_reports')
    .insert({ reporter_id: reporterId, channel_id: channelId, reason, details: details ?? null });
  if (error) throw error;
}

/* -------------------------------- Privacy -------------------------------- */

export interface PrivacyFlags {
  hide_subscriptions: boolean;
  hide_liked_videos: boolean;
  hide_playlists: boolean;
}

export async function updatePrivacyFlags(userId: string, flags: Partial<PrivacyFlags>): Promise<void> {
  const { error } = await supabase.from('profiles').update(flags).eq('id', userId);
  if (error) throw error;
}

/* -------------------------------- About ---------------------------------- */

export async function updateChannelAbout(
  userId: string,
  fields: { bio?: string; country?: string | null; business_email?: string | null; external_links?: ChannelLink[] },
): Promise<void> {
  const { error } = await supabase.from('profiles').update(fields).eq('id', userId);
  if (error) throw error;
}
