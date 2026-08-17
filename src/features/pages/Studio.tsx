import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Eye, DollarSign, Users, Clock, Upload, Play,
  Globe, Lock, Link2, Edit3, Trash2, ArrowUpRight, RefreshCw,
  Video, Wallet, Radio, Film, MousePointerClick, TrendingUp, LineChart,
  AlertTriangle, Shield, CheckCircle, XCircle, Bell, Info, AlertCircle, Heart,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/loose';
import { VideoRetentionChart } from '@/components/VideoRetentionChart';
import { useAuthSession } from '@/hooks/useAuthSession';
import { GlassCard } from '@/components/ui/glass-card';
import { OrbBackground } from '@/components/ui/orb-background';
import { AnimatedCounter, compactFormat } from '@/components/ui/animated-counter';
import { toast } from 'sonner';
import { StudioTableSkeleton } from '@/components/NeonSkeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { EarningsAnalytics } from '@/components/EarningsAnalytics';
import { MonetizationBadge, deriveMonetizationStatus } from '@/components/MonetizationBadge';
import { useEarningsSeries } from '@/hooks/useEarningsSeries';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type VideoRow = any;

type ChannelNotice = {
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

type CopyrightClaim = {
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

export default function Studio() {
  const { user, session } = useAuthSession();
  const { logs: earningsSeries } = useEarningsSeries(user?.id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [likesByVideo, setLikesByVideo] = useState<Record<string, number>>({});
  const [followersCount, setFollowersCount] = useState(0);
  const [totalViews, setTotalViews] = useState(0);
  const [wallet, setWallet] = useState({ balance: 0, total_earned: 0, total_withdrawn: 0 });
  const [notices, setNotices] = useState<ChannelNotice[]>([]);
  const [unreadNoticeCount, setUnreadNoticeCount] = useState(0);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [copyrightClaims, setCopyrightClaims] = useState<Record<string, CopyrightClaim[]>>({});
  const [analytics, setAnalytics] = useState<{
    total_watch_hours: number;
    total_watch_seconds: number;
    subscriber_growth_30d: number;
    impressions: number;
    ctr: number;
  } | null>(null);
  const [retentionFor, setRetentionFor] = useState<{ id: string; title: string } | null>(null);

  

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [vRes, fRes, wRes, nRes] = await Promise.all([
        supabase.from('videos').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
        supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('user_wallets').select('balance, total_earned, total_withdrawn').eq('user_id', user.id).maybeSingle(),
        supabase.rpc('get_channel_notices', { p_user_id: user.id, p_limit: 20 }),
      ]);
      const vids = (vRes.data ?? []) as VideoRow[];
      setVideos(vids);
      setFollowersCount(fRes.count ?? 0);
      setWallet(wRes.data ?? { balance: 0, total_earned: 0, total_withdrawn: 0 });
      const total = vids.reduce((sum: number, v: any) => sum + (v.views_count ?? 0), 0);
      setTotalViews(total);
      
      // Notices
      const noticeData = (nRes.data ?? []) as ChannelNotice[];
      setNotices(noticeData);
      setUnreadNoticeCount(noticeData.filter(n => !n.is_read).length);
      
      // Likes aggregation
      const ids = vids.map(v => String(v.id));
      if (ids.length) {
        const { data: likesRows } = await supabase.from('video_likes').select('video_id').in('video_id', ids);
        const map: Record<string, number> = {};
        (likesRows ?? []).forEach((r: any) => { map[r.video_id] = (map[r.video_id] ?? 0) + 1; });
        setLikesByVideo(map);
        
        // Fetch copyright claims for videos
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
      
      // Creator analytics (watch time, CTR, subscriber growth)
      try {
        const { data: aData, error: aErr } = await supabase.rpc('get_creator_analytics', { p_user: user.id });
        if (!aErr && aData) setAnalytics(aData as any);
      } catch (err) {
        console.warn('[studio] analytics fetch failed', err);
      }
    } catch (e: any) {
      console.error('[studio] fetch failed', e);
      toast.error('Failed to load Studio data', { description: e?.message ?? 'Network error — please retry.' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime: refresh on revenue / video changes
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('studio-' + user.id + '-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos', filter: `owner_id=eq.${user.id}` }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'revenue_logs', filter: `user_id=eq.${user.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channel_notices', filter: `user_id=eq.${user.id}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'copyright_claims' }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchAll]);


  const markNoticeRead = async (noticeId: string) => {
    await supabase.rpc('mark_notice_read', { p_notice_id: noticeId });
    setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, is_read: true } : n));
    setUnreadNoticeCount(prev => Math.max(0, prev - 1));
  };

  const kpi = useMemo(() => {
    const totalEarned = Number(wallet.total_earned ?? 0);
    const watchHours = analytics?.total_watch_hours ?? 0;
    const ctr = analytics?.ctr ?? 0;
    const growth = analytics?.subscriber_growth_30d ?? 0;
    return [
      { label: 'Total Views', value: totalViews, icon: Eye, color: 'text-cyan-400' as const },
      { label: 'Total Earnings', value: totalEarned, prefix: '$', icon: DollarSign, color: 'text-emerald-400' as const },
      { label: 'Subscribers', value: followersCount, icon: Users, color: 'text-violet-400' as const, hint: growth > 0 ? `+${growth} in 30d` : undefined, hintIcon: TrendingUp },
      { label: 'Watch Time (h)', value: watchHours, icon: Clock, color: 'text-amber-400' as const },
      { label: 'CTR', value: ctr, suffix: '%', icon: MousePointerClick, color: 'text-pink-400' as const, hint: `${(analytics?.impressions ?? 0).toLocaleString()} impressions` },
    ];
  }, [totalViews, wallet.total_earned, followersCount, analytics]);

  // Edit / Delete dialog state
  const [editing, setEditing] = useState<VideoRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editVisibility, setEditVisibility] = useState<'public' | 'unlisted' | 'private'>('public');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VideoRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openEdit = (v: VideoRow) => {
    setEditing(v);
    setEditTitle(v.title ?? '');
    setEditDesc((v as any).description ?? '');
    setEditVisibility(((v.visibility as any) ?? 'public') as 'public' | 'unlisted' | 'private');
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (editTitle.trim().length < 3) { toast.error('Title must be at least 3 characters'); return; }
    setSavingEdit(true);
    const { error } = await supabase.from('videos').update({
      title: editTitle.trim(),
      description: editDesc.trim(),
      visibility: editVisibility,
    }).eq('id', editing.id);
    setSavingEdit(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Video updated');
    // Optimistic local update + refresh
    setVideos(prev => prev.map(v => v.id === editing.id ? { ...v, title: editTitle.trim(), description: editDesc.trim(), visibility: editVisibility } as VideoRow : v));
    setEditing(null);
    fetchAll();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from('videos').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Video deleted');
    // Optimistic removal so total video count updates immediately
    setVideos(prev => prev.filter(v => v.id !== deleteTarget.id));
    setDeleteTarget(null);
    fetchAll();
  };

  if (!session) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center p-4">
        <div className="glass-strong rounded-2xl p-8 max-w-md w-full text-center border border-primary/30">
          <h2 className="text-xl font-display font-bold mb-2">Sign in to access Studio</h2>
          <p className="text-sm text-muted-foreground mb-4">Manage your videos, analytics, and revenue.</p>
          <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-primary text-primary-foreground font-semibold text-sm glow-primary">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen relative pb-24 lg:pb-6">
      <OrbBackground variant="aurora" />

      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 pt-6 lg:pt-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-glow">Creator Studio</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage videos, track earnings, grow your channel.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNoticesOpen(true)}
              className="relative p-2.5 rounded-xl glass border border-border/40 text-muted-foreground hover:text-foreground transition"
            >
              <Bell className="w-4 h-4" />
              {unreadNoticeCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {unreadNoticeCount > 9 ? '9+' : unreadNoticeCount}
                </span>
              )}
            </button>
            <button
              onClick={() => { setRefreshing(true); fetchAll().then(() => setRefreshing(false)); }}
              disabled={refreshing}
              className="p-2.5 rounded-xl glass border border-border/40 text-muted-foreground hover:text-foreground transition"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold glow-primary hover:scale-[1.02] transition"
            >
              <Upload className="w-4 h-4" /> Upload Video
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {kpi.map((k) => {
            const HintIcon = (k as any).hintIcon;
            return (
              <GlassCard key={k.label} tilt={false} glow="none" className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <k.icon className={`w-4 h-4 ${k.color}`} />
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.label}</span>
                </div>
                <div className="text-2xl lg:text-3xl font-display font-bold tabular-nums">
                  <AnimatedCounter
                    value={k.value}
                    format={(n) => `${(k as any).prefix ?? ''}${compactFormat(n)}${(k as any).suffix ?? ''}`}
                  />
                </div>
                {(k as any).hint && (
                  <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                    {HintIcon && <HintIcon className="w-3 h-3 text-emerald-400" />}
                    {(k as any).hint}
                  </p>
                )}
              </GlassCard>
            );
          })}
        </div>


        {/* Earnings Analytics — full width (real data) */}
        <div className="mb-8">
          <EarningsAnalytics logs={earningsSeries as any} />
        </div>

        {/* Quick Actions + Balance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <GlassCard className="p-5 lg:col-span-2" tilt={false}>
            <h3 className="text-sm font-display font-semibold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <QuickAction icon={Upload} label="Upload New Video" to="/upload" />
              <QuickAction icon={Wallet} label="Go to Wallet" to="/wallet" />
              <QuickAction icon={Radio} label="Live Stream" to="/live" />
              <QuickAction icon={Film} label="Create Playlist" onClick={() => toast('Coming soon')} />
            </div>
          </GlassCard>
          <GlassCard className="p-5" tilt={false}>
            <h3 className="text-sm font-display font-semibold mb-2">Current Balance</h3>
            <p className="text-2xl font-display font-bold text-glow">${wallet.balance.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground">Lifetime: ${wallet.total_earned.toFixed(2)} · Withdrawn: ${wallet.total_withdrawn.toFixed(2)}</p>
          </GlassCard>
        </div>


        {/* Video Management Table */}
        <GlassCard className="p-5" tilt={false}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-display font-semibold flex items-center gap-2">
              <Video className="w-4 h-4 text-primary" /> My Videos
            </h3>
            <span className="text-[11px] text-muted-foreground">{videos.length} total</span>
          </div>

          {loading ? (
            <StudioTableSkeleton rows={6} />
          ) : videos.length === 0 ? (
            <div className="py-12 text-center">
              <Film className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No videos yet. Upload your first video to get started.</p>
              <Link to="/upload" className="inline-flex items-center gap-2 mt-3 px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-xs font-semibold glow-primary">
                <Upload className="w-3.5 h-3.5" /> Upload Now
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visibility</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monetization</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Views</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Likes</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => {
                    const videoClaims = copyrightClaims[String(v.id)] || [];
                    const hasActiveClaim = videoClaims.some(c => c.status === 'active');
                    const claimSeverity = videoClaims.length > 0 ? videoClaims[0].severity : null;
                    
                    return (
                    <motion.tr
                      key={v.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-b border-border/20 hover:bg-muted/30 transition"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-14 rounded overflow-hidden bg-muted shrink-0">
                            {v.thumb_url ? (
                              <img src={v.thumb_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            ) : (
                              <div className="w-full h-full gradient-primary/30" />
                            )}
                          </div>
                          <span className="text-sm font-medium line-clamp-2 max-w-xs">{v.title}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {hasActiveClaim ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            claimSeverity === 'critical' ? 'bg-destructive/15 text-destructive' : 
                            claimSeverity === 'block' ? 'bg-orange-500/15 text-orange-400' : 
                            'bg-amber-500/15 text-amber-400'
                          }`}>
                            <AlertTriangle className="w-3 h-3" /> Claim
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400">
                            <CheckCircle className="w-3 h-3" /> Good
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Globe className="w-4 h-4" />
                          <span className="capitalize">{v.visibility ?? 'public'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <MonetizationBadge status={(hasActiveClaim ? 'blocked' : deriveMonetizationStatus(v as any)) as any} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          {(v.views_count ?? 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Heart className="w-4 h-4" />
                          {(likesByVideo[String(v.id)] ?? 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <DollarSign className="w-4 h-4" />
                          ${v.monetization_enabled && !hasActiveClaim ? ((v.views_count ?? 0) * 0.001).toFixed(2) : '0.00'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{new Date(v.created_at).toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/watch/${v.id}`)}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
                            title="Watch"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRetentionFor({ id: String(v.id), title: v.title })}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
                            title="Analytics"
                          >
                            <LineChart className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(v)}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(v)}
                            className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Edit Video Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Video</DialogTitle>
            <DialogDescription>Update title, description, and visibility. Changes save instantly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="edit-title" className="text-sm">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value.slice(0, 100))}
                maxLength={100}
                className="mt-1.5 bg-input/60"
              />
              <p className="text-[10px] text-muted-foreground mt-1">{editTitle.length}/100</p>
            </div>
            <div>
              <Label htmlFor="edit-desc" className="text-sm">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value.slice(0, 5000))}
                rows={5}
                className="mt-1.5 bg-input/60 resize-none"
              />
            </div>
            <div>
              <Label className="text-sm mb-2 block">Visibility</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['public', 'unlisted', 'private'] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setEditVisibility(v)}
                    className={`text-xs px-3 py-2 rounded-lg border transition capitalize ${
                      editVisibility === v
                        ? 'border-primary bg-primary/10 text-primary glow-primary'
                        : 'border-border/40 text-muted-foreground hover:border-border'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>Cancel</Button>
            <Button onClick={saveEdit} disabled={savingEdit} className="gradient-primary text-primary-foreground glow-primary">
              {savingEdit ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Delete this video?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="text-foreground font-medium">{deleteTarget?.title}</span> will be permanently removed along with its views, likes, and comments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Retention Chart Dialog */}
      <Dialog open={!!retentionFor} onOpenChange={(o) => !o && setRetentionFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <LineChart className="w-4 h-4 text-primary" /> Audience Retention
            </DialogTitle>
            <DialogDescription>
              % of viewers still watching at each 10% mark of the video. Uses real watch history.
            </DialogDescription>
          </DialogHeader>
          {retentionFor && (
            <VideoRetentionChart videoId={retentionFor.id} videoTitle={retentionFor.title} />
          )}
        </DialogContent>
      </Dialog>

      {/* Channel Notices Dialog */}
      <Dialog open={noticesOpen} onOpenChange={setNoticesOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" /> Channel Notices
            </DialogTitle>
            <DialogDescription>
              Important updates about your channel, copyright claims, and policy notifications.
            </DialogDescription>
          </DialogHeader>
          {notices.length === 0 ? (
            <div className="py-8 text-center">
              <Info className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No notices at this time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-4 rounded-xl border transition ${
                    notice.is_read 
                      ? 'bg-muted/20 border-border/30 opacity-60' 
                      : notice.severity === 'critical'
                        ? 'bg-destructive/10 border-destructive/30'
                        : notice.severity === 'warning'
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-primary/10 border-primary/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      notice.severity === 'critical' ? 'bg-destructive/20 text-destructive' :
                      notice.severity === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-primary/20 text-primary'
                    }`}>
                      {notice.severity === 'critical' ? <XCircle className="w-4 h-4" /> :
                       notice.severity === 'warning' ? <AlertCircle className="w-4 h-4" /> :
                       <Info className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-foreground">{notice.title}</p>
                        {!notice.is_read && <span className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{notice.message}</p>
                      <div className="flex items-center gap-2">
                        {notice.action_required && notice.action_label && (
                          <button
                            onClick={() => {
                              if (notice.action_url) window.open(notice.action_url, '_blank');
                              else if (notice.related_video_id) navigate(`/watch/${notice.related_video_id}`);
                            }}
                            className="text-xs px-3 py-1 rounded-lg gradient-primary text-primary-foreground font-medium"
                          >
                            {notice.action_label}
                          </button>
                        )}
                        {!notice.is_read && (
                          <button
                            onClick={() => markNoticeRead(notice.id)}
                            className="text-xs px-3 py-1 rounded-lg glass border border-border/40 text-muted-foreground hover:text-foreground"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function QuickAction({ icon: Icon, label, to, onClick }: { icon: any; label: string; to?: string; onClick?: () => void }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => to ? navigate(to) : onClick?.()}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl glass border border-border/30 hover:border-primary/40 hover:bg-primary/5 text-left transition"
    >
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-xs font-medium text-foreground flex-1">{label}</span>
      <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
    </button>
  );
}

function _StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; icon: any }> = {
    public: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', icon: Globe },
    unlisted: { bg: 'bg-amber-500/15', text: 'text-amber-400', icon: Link2 },
    private: { bg: 'bg-destructive/15', text: 'text-destructive', icon: Lock },
  };
  const s = map[status] ?? map.public;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${s.bg} ${s.text}`}>
      <Icon className="w-3 h-3" /> {status}
    </span>
  );
}
