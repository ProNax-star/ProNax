import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from 'recharts';
import {
  Activity, Users, DollarSign, HardDrive, Sliders, ShieldCheck, Ban,
  BadgeCheck, Flag, Loader2, Zap, TrendingUp, Radio, Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { moderationQueue } from '@/lib/moderationQueue';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

/* ---------- design primitives ---------- */
function NeonPanel({
  children, tone = 'primary', className = '',
}: { children: React.ReactNode; tone?: 'primary' | 'accent' | 'success' | 'destructive'; className?: string }) {
  const toneMap: Record<string, string> = {
    primary: 'border-primary/30 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.5)]',
    accent: 'border-accent/30 shadow-[0_0_40px_-10px_hsl(var(--accent)/0.5)]',
    success: 'border-emerald-500/30 shadow-[0_0_40px_-10px_rgba(16,185,129,0.55)]',
    destructive: 'border-destructive/30 shadow-[0_0_40px_-10px_hsl(var(--destructive)/0.5)]',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className={`relative rounded-2xl backdrop-blur-2xl bg-background/40 border ${toneMap[tone]} ${className} overflow-hidden`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

function StatCard({
  icon: Icon, label, value, sub, tone = 'primary',
}: { icon: any; label: string; value: string; sub?: string; tone?: 'primary'|'accent'|'success'|'destructive' }) {
  const dot: Record<string, string> = {
    primary: 'text-primary', accent: 'text-accent', success: 'text-emerald-400', destructive: 'text-destructive',
  };
  return (
    <NeonPanel tone={tone} className="p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-display">{label}</span>
        <Icon className={`w-4 h-4 ${dot[tone]}`} />
      </div>
      <div className={`text-2xl font-display font-bold ${dot[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </NeonPanel>
  );
}

/* ---------- live metrics ---------- */
type Metrics = {
  users24h: number; dau: number; views24h: number; watchSec24h: number;
  revenue24h: number; creatorShare: number; platformShare: number;
  storageBytes: number; bandwidthBytes: number;
  viewSeries: { t: string; views: number; watch: number }[];
  bwSeries: { t: string; bw: number }[];
  revSplit: { name: string; value: number }[];
  duaSeries: { d: string; dau: number }[];
};

const EMPTY: Metrics = {
  users24h: 0, dau: 0, views24h: 0, watchSec24h: 0,
  revenue24h: 0, creatorShare: 0, platformShare: 0,
  storageBytes: 0, bandwidthBytes: 0,
  viewSeries: [], bwSeries: [], revSplit: [], duaSeries: [],
};

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  const units = ['KB', 'MB', 'GB', 'TB']; let n = b / 1024; let i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${units[i]}`;
}

async function loadMetrics(): Promise<Metrics> {
  const since24 = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [views, revenue, platform, videos, profiles] = await Promise.all([
    supabase.from('video_views').select('created_at,watch_seconds').gte('created_at', since7),
    supabase.from('revenue_logs').select('created_at,amount_earned,gross_revenue').gte('created_at', since7),
    supabase.from('platform_revenue').select('created_at,amount').gte('created_at', since7),
    supabase.from('videos').select('size_bytes,created_at'),
    supabase.from('profiles').select('id,created_at'),
  ]);

  const vRows = (views.data ?? []) as any[];
  const rRows = (revenue.data ?? []) as any[];
  const pRows = (platform.data ?? []) as any[];
  const vids = (videos.data ?? []) as any[];
  const profs = (profiles.data ?? []) as any[];

  const cutoff24 = Date.now() - 24 * 60 * 60 * 1000;
  const views24 = vRows.filter((r) => new Date(r.created_at).getTime() >= cutoff24);
  const watch24 = views24.reduce((s, r) => s + (r.watch_seconds ?? 0), 0);
  const rev24 = rRows.filter((r) => new Date(r.created_at).getTime() >= cutoff24);
  const plat24 = pRows.filter((r) => new Date(r.created_at).getTime() >= cutoff24);
  const creatorShare = rev24.reduce((s, r) => s + Number(r.amount_earned ?? 0), 0);
  const platformShare = plat24.reduce((s, r) => s + Number(r.amount ?? 0), 0);

  // 12-hour bucket series for last 24h
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const end = Date.now() - (11 - i) * 2 * 60 * 60 * 1000;
    return { end, views: 0, watch: 0, bw: 0 };
  });
  views24.forEach((r) => {
    const t = new Date(r.created_at).getTime();
    const idx = Math.min(11, Math.max(0, Math.floor((t - (Date.now() - 24 * 60 * 60 * 1000)) / (2 * 60 * 60 * 1000))));
    if (buckets[idx]) { buckets[idx].views += 1; buckets[idx].watch += (r.watch_seconds ?? 0); buckets[idx].bw += (r.watch_seconds ?? 0) * 500_000; }
  });

  // DAU last 7 days
  const dayMap = new Map<string, Set<string>>();
  vRows.forEach((r) => {
    const d = new Date(r.created_at).toISOString().slice(0, 10);
    if (!dayMap.has(d)) dayMap.set(d, new Set());
    dayMap.get(d)!.add((r as any).viewer_id ?? Math.random().toString());
  });
  const duaSeries = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { d: d.slice(5), dau: dayMap.get(d)?.size ?? 0 };
  });

  const storageBytes = vids.reduce((s, v) => s + Number(v.size_bytes ?? 0), 0);
  const users24h = profs.filter((p) => new Date(p.created_at).getTime() >= cutoff24).length;

  return {
    users24h,
    dau: duaSeries[duaSeries.length - 1]?.dau ?? 0,
    views24h: views24.length,
    watchSec24h: watch24,
    revenue24h: creatorShare + platformShare,
    creatorShare, platformShare,
    storageBytes,
    bandwidthBytes: buckets.reduce((s, b) => s + b.bw, 0),
    viewSeries: buckets.map((b) => ({
      t: new Date(b.end).getHours().toString().padStart(2, '0') + ':00',
      views: b.views, watch: Math.round(b.watch / 60),
    })),
    bwSeries: buckets.map((b) => ({ t: new Date(b.end).getHours().toString().padStart(2, '0') + 'h', bw: Math.round(b.bw / 1_048_576) })),
    revSplit: [
      { name: 'Creators (55%)', value: Math.max(creatorShare, 0.001) },
      { name: 'Platform (45%)', value: Math.max(platformShare, 0.001) },
    ],
    duaSeries,
  };
}

/* ---------- algorithm weights ---------- */
type Weights = {
  retention: number; category: number; engagement: number; freshness: number; watchedPenalty: number; boost: number;
};
const DEFAULT_WEIGHTS: Weights = { retention: 140, category: 8, engagement: 50, freshness: 25, watchedPenalty: 60, boost: 35 };
const WEIGHTS_KEY = 'admin:algoWeights:v1';

function useWeights() {
  const [w, setW] = useState<Weights>(() => {
    if (typeof window === 'undefined') return DEFAULT_WEIGHTS;
    try { return { ...DEFAULT_WEIGHTS, ...(JSON.parse(localStorage.getItem(WEIGHTS_KEY) || '{}')) }; }
    catch { return DEFAULT_WEIGHTS; }
  });
  useEffect(() => { try { localStorage.setItem(WEIGHTS_KEY, JSON.stringify(w)); } catch {} }, [w]);
  return [w, setW, () => setW(DEFAULT_WEIGHTS)] as const;
}

function WeightSlider({
  label, value, onChange, min, max, step = 1, hint, tone = 'primary',
}: { label: string; value: number; onChange: (n: number) => void; min: number; max: number; step?: number; hint?: string; tone?: 'primary'|'accent'|'success'|'destructive' }) {
  const dot: Record<string, string> = { primary: 'text-primary', accent: 'text-accent', success: 'text-emerald-400', destructive: 'text-destructive' };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-display uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`text-sm font-mono font-bold ${dot[tone]}`}>{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-primary/10 accent-primary cursor-pointer"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------- moderation quick table ---------- */
function ModerationQuickTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [reports, profs] = await Promise.all([
      supabase.from('video_reports').select('id,video_id,reason,created_at,status').eq('status', 'pending').order('created_at', { ascending: false }).limit(6),
      supabase.from('profiles').select('id,display_name,email,is_banned,status,created_at').order('created_at', { ascending: false }).limit(8),
    ]);
    setRows(reports.data ?? []);
    setUsers(profs.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resolve = (id: string, status: string) => {
    void moderationQueue.enqueue('admin_resolve_report', { p_report: id, p_status: status }).then(
      () => { toast.success(`Report ${status}`); load(); },
      (err: Error) => toast.error(err.message || 'Moderation action failed'),
    );
  };

  const toggleBan = async (u: any) => {
    if (u.is_banned) {
      const { error } = await supabase.rpc('admin_unban_user', { p_user: u.id });
      if (error) return toast.error(error.message);
      toast.success('User unbanned');
    } else {
      const { error } = await supabase.rpc('admin_ban_user', { p_user: u.id, p_reason: 'Admin action', p_until: null });
      if (error) return toast.error(error.message);
      toast.success('User banned');
    }
    load();
  };

  const toggleVerify = async (u: any) => {
    const next = u.status === 'verified' ? 'active' : 'verified';
    const { error } = await supabase.from('profiles').update({ status: next }).eq('id', u.id);
    if (error) return toast.error(error.message);
    toast.success(next === 'verified' ? 'Badge granted' : 'Badge revoked');
    load();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <NeonPanel tone="destructive" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-display uppercase tracking-wider text-foreground">Pending reports</h3>
          </div>
          <span className="text-[10px] text-muted-foreground">{rows.length} open</span>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">No pending reports 🎉</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-auto">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/30 border border-border/20">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-foreground truncate">{r.video_id}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{r.reason}</div>
                </div>
                <button onClick={() => resolve(r.id, 'resolved')} className="px-2 py-1 rounded text-[10px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition">Resolve</button>
                <button onClick={() => resolve(r.id, 'dismissed')} className="px-2 py-1 rounded text-[10px] bg-background/50 border border-border/40 hover:border-primary/40 transition">Dismiss</button>
              </div>
            ))}
          </div>
        )}
      </NeonPanel>

      <NeonPanel tone="accent" className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-display uppercase tracking-wider text-foreground">Recent users</h3>
          </div>
          <span className="text-[10px] text-muted-foreground">Instant sync</span>
        </div>
        {loading ? (
          <div className="py-8 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-auto">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg bg-background/30 border border-border/20">
                <div className="w-7 h-7 rounded-full gradient-primary flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0">
                  {(u.display_name || u.email || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-foreground truncate flex items-center gap-1">
                    {u.display_name || u.email || '—'}
                    {u.status === 'verified' && <BadgeCheck className="w-3 h-3 text-primary" />}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                </div>
                <button onClick={() => toggleVerify(u)} title="Toggle verification"
                  className={`p-1.5 rounded transition border ${u.status === 'verified' ? 'bg-primary/20 border-primary/50 text-primary' : 'bg-background/50 border-border/40 text-muted-foreground hover:border-primary/40'}`}>
                  <BadgeCheck className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => toggleBan(u)} title={u.is_banned ? 'Unban' : 'Ban'}
                  className={`p-1.5 rounded transition border ${u.is_banned ? 'bg-destructive/20 border-destructive/50 text-destructive' : 'bg-background/50 border-border/40 text-muted-foreground hover:border-destructive/40'}`}>
                  <Ban className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </NeonPanel>
    </div>
  );
}

/* ---------- main tab ---------- */
export function CommandCenterTab() {
  const [m, setM] = useState<Metrics>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [weights, setWeights, resetWeights] = useWeights();

  const refresh = useCallback(async () => {
    try { setM(await loadMetrics()); } catch (e: any) { toast.error(e?.message ?? 'Metrics failed'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 15_000);
    return () => clearInterval(t);
  }, [refresh]);

  const previewScore = useMemo(() => {
    // Sample: retention 0.7, category affinity 3, engagement 0.05, boost 1, freshness on
    return (0.7 * weights.retention)
      + (3 * weights.category)
      + (0.05 * weights.engagement)
      + weights.freshness
      + (1 * weights.boost)
      - (weights.watchedPenalty * 0);
  }, [weights]);

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))'];

  return (
    <div className="space-y-6">
      {/* Deep tactical background overlay */}
      <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.12),transparent_45%),radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.10),transparent_50%),radial-gradient(circle_at_50%_100%,hsl(var(--secondary)/0.08),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Header strip */}
      <NeonPanel tone="primary" className="p-4 lg:p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl blur-lg bg-primary/40 animate-pulse" />
              <div className="relative w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                <Cpu className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-primary font-display">command center</div>
              <div className="text-lg font-display font-bold text-glow">Live Ops Dashboard</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-emerald-400 font-mono">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> LIVE · auto-refresh 15s
            {loading && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
          </div>
        </div>
      </NeonPanel>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="DAU (24h)" value={m.dau.toLocaleString()} sub={`+${m.users24h} new signups`} tone="primary" />
        <StatCard icon={Activity} label="Watch time" value={`${Math.round(m.watchSec24h / 60).toLocaleString()}m`} sub={`${m.views24h.toLocaleString()} views`} tone="accent" />
        <StatCard icon={DollarSign} label="Revenue 24h" value={`$${m.revenue24h.toFixed(4)}`} sub={`70/30 split active`} tone="success" />
        <StatCard icon={HardDrive} label="R2 storage" value={fmtBytes(m.storageBytes)} sub={`${fmtBytes(m.bandwidthBytes)} bw 24h`} tone="destructive" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <NeonPanel tone="primary" className="p-4 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display uppercase tracking-wider">Live watch time · views (24h)</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={m.viewSeries}>
                <defs>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gWatch" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis dataKey="t" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background) / 0.9)', border: '1px solid hsl(var(--primary)/0.4)', borderRadius: 12, backdropFilter: 'blur(8px)' }} />
                <Area type="monotone" dataKey="views" stroke="hsl(var(--primary))" fill="url(#gViews)" strokeWidth={2} />
                <Area type="monotone" dataKey="watch" stroke="hsl(var(--accent))" fill="url(#gWatch)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </NeonPanel>

        <NeonPanel tone="success" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-display uppercase tracking-wider">Revenue split</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={m.revSplit} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={4}>
                  {m.revSplit.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--background) / 0.9)', border: '1px solid hsl(var(--primary)/0.4)', borderRadius: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center mt-1">
            <div className="rounded-lg bg-primary/10 border border-primary/30 p-2">
              <div className="text-[10px] text-muted-foreground">Creators</div>
              <div className="text-sm font-mono font-bold text-primary">${m.creatorShare.toFixed(4)}</div>
            </div>
            <div className="rounded-lg bg-accent/10 border border-accent/30 p-2">
              <div className="text-[10px] text-muted-foreground">Platform</div>
              <div className="text-sm font-mono font-bold text-accent">${m.platformShare.toFixed(4)}</div>
            </div>
          </div>
        </NeonPanel>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NeonPanel tone="destructive" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-display uppercase tracking-wider">R2 bandwidth (MB · 24h)</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={m.bwSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis dataKey="t" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background) / 0.9)', border: '1px solid hsl(var(--destructive)/0.4)', borderRadius: 12 }} />
                <Bar dataKey="bw" fill="hsl(var(--destructive))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </NeonPanel>

        <NeonPanel tone="accent" className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-display uppercase tracking-wider">Daily active users (7d)</h3>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.duaSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.3)" />
                <XAxis dataKey="d" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--background) / 0.9)', border: '1px solid hsl(var(--accent)/0.4)', borderRadius: 12 }} />
                <Line type="monotone" dataKey="dau" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--accent))' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </NeonPanel>
      </div>

      {/* Algorithm weights */}
      <NeonPanel tone="primary" className="p-4 lg:p-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display uppercase tracking-wider">Algorithm weights · recommendation engine</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Preview score:</span>
            <span className="text-sm font-mono font-bold text-primary glow-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/30">{previewScore.toFixed(1)}</span>
            <button onClick={resetWeights} className="text-[10px] px-2 py-1 rounded border border-border/40 hover:border-primary/40 transition">Reset</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          <WeightSlider label="Retention multiplier" value={weights.retention} min={0} max={300} step={5} onChange={(n) => setWeights({ ...weights, retention: n })} hint="Rewards videos with high watch-duration ratio" tone="primary" />
          <WeightSlider label="Category affinity" value={weights.category} min={0} max={30} onChange={(n) => setWeights({ ...weights, category: n })} hint="Personalization from watch history" tone="accent" />
          <WeightSlider label="Engagement (CTR)" value={weights.engagement} min={0} max={150} step={5} onChange={(n) => setWeights({ ...weights, engagement: n })} hint="Likes · comments · shares per view" tone="success" />
          <WeightSlider label="Freshness boost" value={weights.freshness} min={0} max={80} onChange={(n) => setWeights({ ...weights, freshness: n })} hint="Videos < 48h old" tone="primary" />
          <WeightSlider label="Already-watched penalty" value={weights.watchedPenalty} min={0} max={200} step={5} onChange={(n) => setWeights({ ...weights, watchedPenalty: n })} hint="Deduplicates seen videos" tone="destructive" />
          <WeightSlider label="Editorial boost" value={weights.boost} min={0} max={100} onChange={(n) => setWeights({ ...weights, boost: n })} hint="Manual per-video boost weight" tone="accent" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-4 flex items-center gap-1"><Zap className="w-3 h-3" /> Simulator — tune weights locally, deploy from Studio → Ranking (server RPC).</p>
      </NeonPanel>

      {/* Moderation quick actions */}
      <ModerationQuickTable />
    </div>
  );
}

export default CommandCenterTab;
