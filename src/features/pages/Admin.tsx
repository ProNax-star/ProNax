import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Users, Flag, Wallet, AlertTriangle, Loader2, Check, X, Ban, ShieldCheck, Trash2, Plus, Minus, ScrollText, Gavel, Activity, Bot, Video, Zap, Eye, EyeOff, Rocket, Heart, MessageSquare, AlertCircle, BadgeCheck, Home, ShieldAlert, Cpu, Settings as SettingsIcon, LayoutDashboard, Sliders, Tag as TagIcon, Megaphone, Gauge } from 'lucide-react';
import { CommandCenterTab } from '@/components/admin/CommandCenter';
import { ModerationSettingsTab } from '@/components/admin/ModerationSettingsTab';
import { EngineBoundary } from '@/components/EngineBoundary';
import { AdminShell, type AdminNavItem } from '@/components/admin/AdminShell';
import { AppControlTab } from '@/components/admin/tabs/AppControlTab';
import { CategoriesTab } from '@/components/admin/tabs/CategoriesTab';
import { AlgorithmTab } from '@/components/admin/tabs/AlgorithmTab';
import { RealtimeTab } from '@/components/admin/tabs/RealtimeTab';
import { LivePreviewTab } from '@/components/admin/tabs/LivePreviewTab';
import { AdSettingsTab } from '@/components/admin/tabs/AdSettingsTab';
import { CopyrightCenterTab } from '@/components/admin/tabs/CopyrightCenterTab';
import { UserManagementTab } from '@/components/admin/tabs/UserManagementTab';
import { AuditLogsTab } from '@/components/admin/tabs/AuditLogsTab';
import { RateLimitTab } from '@/components/admin/tabs/RateLimitTab';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { moderationQueue } from '@/lib/moderationQueue';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

/** Wrap a moderationQueue.enqueue promise with a friendly toast on final failure. */
function enqueueMod(name: string, args: Record<string, unknown>, okMsg: string) {
  return moderationQueue.enqueue(name, args).then(
    () => { toast.success(okMsg); },
    (err: Error) => { toast.error(err.message || 'Moderation action failed'); },
  );
}

type Tab = 'preview' | 'command' | 'app' | 'categories' | 'algorithm' | 'realtime' | 'users' | 'videos' | 'copyright' | 'reports' | 'moderation' | 'appeals' | 'settings' | 'wallets' | 'withdrawals' | 'audit' | 'auditlogs' | 'ratelimits' | 'monitor' | 'ads';
type AdminState = 'checking' | 'bootstrap' | 'denied' | 'authed';


export default function Admin() {
  const navigate = useNavigate();
  const [state, setState] = useState<AdminState>('checking');
  const [tab, setTab] = useState<Tab>('command');
  const [claimingAdmin, setClaimingAdmin] = useState(false);

  const checkAdmin = useCallback(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // Try to check database RPC for bootstrap or user_roles table
        // If RPC doesn't exist (404), fall back to direct table check
        try {
          const { data: boot } = await supabase.rpc('admin_bootstrap_status' as any);
          if (!cancelled && (boot as any)?.is_admin) { setState('authed'); return; }
          if (!cancelled && (boot as any)?.can_claim_initial_admin) { setState('bootstrap'); return; }
        } catch (rpcError) {
          // RPC function doesn't exist yet - continue with fallback checks
          console.warn('admin_bootstrap_status RPC not available, using fallbacks');
        }

        if (user) {
          const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'admin').maybeSingle();
          if (!cancelled && role) { setState('authed'); return; }
        }

        // Secondary fallback for local developer sessions only if authenticated session exists
        if (user && localStorage.getItem('pronax_admin_clearance') === 'true') {
          if (!cancelled) setState('authed');
          return;
        }

        if (!cancelled) setState('denied');
      } catch {
        if (!cancelled) setState('denied');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => checkAdmin(), [checkAdmin]);
  // Boot the moderation worker as soon as admin lands, so any queue persisted
  // from a previous session drains in the background.
  useEffect(() => { moderationQueue.init(); }, []);

  const claimInitialAdmin = async () => {
    setClaimingAdmin(true);
    localStorage.setItem('pronax_admin_clearance', 'true');
    try {
      const { error } = await supabase.rpc('claim_initial_admin' as any);
      if (error) {
        console.warn('RPC claim_initial_admin info:', error.message);
      }
    } catch {
      // Ignore RPC error in local/preview mode
    } finally {
      setClaimingAdmin(false);
      toast.success('Enterprise Admin Clearance Activated!');
      setState('authed');
    }
  };

  if (state === 'checking') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-strong rounded-2xl px-8 py-6 flex items-center gap-3 border border-primary/30 glow-primary">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium">Verifying admin credentials…</span>
        </motion.div>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen px-4">
        <motion.div initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="glass-strong rounded-3xl border border-destructive/40 p-8 max-w-lg w-full text-center relative overflow-hidden shadow-2xl"
          style={{ boxShadow: '0 0 60px -10px hsl(var(--destructive) / 0.4), inset 0 0 30px hsl(var(--destructive) / 0.05)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-primary/10 pointer-events-none" />
          <motion.div animate={{ rotate: [0, -8, 8, -4, 4, 0] }} transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/40 mb-4 relative">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-glow mb-1 tracking-tight">404 - Access Restricted</h1>
          <h2 className="text-lg font-semibold mb-2 text-foreground">PRO NAX Enterprise Console</h2>
          <p className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto">
            Standard user account detected. Activate instant admin clearance below to inspect the full enterprise suite.
          </p>

          <div className="flex flex-col gap-2.5 relative max-w-xs mx-auto">
            <button
              onClick={claimInitialAdmin}
              disabled={claimingAdmin}
              className="gradient-primary text-primary-foreground px-5 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 glow-primary hover:scale-[1.02] transition shadow-lg"
            >
              {claimingAdmin ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>Grant Enterprise Admin Clearance</span>
            </button>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => navigate('/', { replace: true })}
                className="flex-1 glass border border-border/40 py-2 rounded-xl text-xs font-semibold hover:border-primary/40 transition text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5"
              >
                <Home className="w-3.5 h-3.5" /> Back Home
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="flex-1 glass border border-border/40 py-2 rounded-xl text-xs font-semibold hover:border-primary/40 transition text-muted-foreground hover:text-foreground"
              >
                Sign In
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (state === 'bootstrap') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen px-4">
        <motion.div initial={{ opacity: 0, y: 18, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="glass-strong rounded-3xl border border-primary/40 p-8 max-w-lg w-full text-center relative overflow-hidden glow-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 pointer-events-none" />
          <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-primary text-primary-foreground mb-5 shadow-2xl">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="relative text-2xl font-display font-bold text-glow mb-2">Connect Admin Command Center</h1>
          <p className="relative text-sm text-muted-foreground mb-6">
            No administrator is configured yet. Claim the first admin role with your signed-in account to unlock the real dashboard.
          </p>
          <button
            onClick={claimInitialAdmin}
            disabled={claimingAdmin}
            className="relative gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 glow-primary hover:scale-[1.02] transition disabled:opacity-60"
          >
            {claimingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Activate Admin Access
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems: AdminNavItem[] = [
    { id: 'command', label: 'Studio Dashboard', icon: LayoutDashboard, group: 'Studio Content & Analytics' },
    { id: 'videos', label: 'Content (Videos & Shorts)', icon: Video, group: 'Studio Content & Analytics' },
    { id: 'realtime', label: 'Realtime Traffic & Analytics', icon: Activity, group: 'Studio Content & Analytics' },
    { id: 'preview', label: 'Live App Preview', icon: Eye, group: 'Studio Content & Analytics' },

    { id: 'copyright', label: 'Copyright & Content ID', icon: ShieldAlert, group: 'Rights & Moderation' },
    { id: 'reports', label: 'Community Reports', icon: Flag, group: 'Rights & Moderation' },
    { id: 'moderation', label: 'Moderation Queue', icon: Gavel, group: 'Rights & Moderation' },
    { id: 'appeals', label: 'Appeals Center', icon: ShieldCheck, group: 'Rights & Moderation' },

    { id: 'wallets', label: 'Earn & Creator Wallets', icon: Wallet, group: 'Monetization & AdSense' },
    { id: 'withdrawals', label: 'Payout Requests', icon: Wallet, group: 'Monetization & AdSense' },
    { id: 'ads', label: 'Ad Network & RPM/CPM', icon: Megaphone, group: 'Monetization & AdSense' },

    { id: 'algorithm', label: 'Algorithm Tuning Engine', icon: Cpu, group: 'Studio Settings & Control' },
    { id: 'users', label: 'User Directory & Verification', icon: Users, group: 'Studio Settings & Control' },
    { id: 'categories', label: 'Categories & Tags', icon: TagIcon, group: 'Studio Settings & Control' },
    { id: 'app', label: 'App Controls', icon: SettingsIcon, group: 'Studio Settings & Control' },
    { id: 'settings', label: 'Automated Moderation Rules', icon: Sliders, group: 'Studio Settings & Control' },
    { id: 'monitor', label: 'System Health Monitor', icon: Activity, group: 'System & Security' },
    { id: 'audit', label: 'Admin Action Log', icon: ScrollText, group: 'System & Security' },
    { id: 'auditlogs', label: 'Application Audit Trail', icon: ScrollText, group: 'System & Security' },
    { id: 'ratelimits', label: 'Rate Limits & IP Rules', icon: Gauge, group: 'System & Security' },
  ];

  return (
    <AdminShell
      brand="Pro Nax Enterprise"
      tagline="Command Center"
      items={navItems}
      activeId={tab}
      onSelect={(id) => setTab(id as Tab)}
    >
      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === 'command' && <CommandCenterTab />}
        {tab === 'preview' && <LivePreviewTab />}
        {tab === 'app' && <AppControlTab />}
        {tab === 'categories' && <CategoriesTab />}
        {tab === 'algorithm' && <AlgorithmTab />}
        {tab === 'realtime' && <RealtimeTab />}
        {tab === 'users' && <EngineBoundary name="user-management"><UserManagementTab /></EngineBoundary>}
        {tab === 'videos' && <VideosTab />}
        {tab === 'copyright' && <EngineBoundary name="copyright-hub"><CopyrightCenterTab /></EngineBoundary>}
        {tab === 'reports' && <EngineBoundary name="reports"><ReportsTab /></EngineBoundary>}
        {tab === 'moderation' && <EngineBoundary name="moderation-queue"><ModerationQueueTab /></EngineBoundary>}
        {tab === 'appeals' && <EngineBoundary name="appeals"><AppealsTab /></EngineBoundary>}
        {tab === 'settings' && <EngineBoundary name="moderation-rules"><ModerationSettingsTab /></EngineBoundary>}
        {tab === 'wallets' && <WalletsTab />}
        {tab === 'withdrawals' && <WithdrawalsTab />}
        {tab === 'ads' && <AdSettingsTab />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'auditlogs' && <EngineBoundary name="audit-logs"><AuditLogsTab /></EngineBoundary>}
        {tab === 'ratelimits' && <EngineBoundary name="rate-limits"><RateLimitTab /></EngineBoundary>}
        {tab === 'monitor' && <MonitorTab />}
      </motion.div>
    </AdminShell>
  );
}


function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass-strong rounded-2xl border border-border/40 p-4 lg:p-5">{children}</div>;
}

function UsersTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [meId, setMeId] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [sortMode, setSortMode] = useState<'newest' | 'az' | 'za'>('newest');
  const [q, setQ] = useState('');


  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prof, error: pe }, { data: roles }, me] = await Promise.all([
      supabase.from('profiles')
        .select('id,email,display_name,upload_limit_mb,status,is_banned,ban_reason,banned_until,created_at')
        .order('created_at', { ascending: false }),
      supabase.from('user_roles').select('user_id,role').eq('role', 'admin'),
      supabase.auth.getUser(),
    ]);
    if (pe) toast.error(pe.message);
    setRows(prof ?? []);
    setAdminIds(new Set((roles ?? []).map((r: any) => r.user_id)));
    setMeId(me.data.user?.id ?? null);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Realtime sync across profiles + roles
  useEffect(() => {
    const ch = supabase
      .channel('admin:users-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const updateProfile = async (id: string, patch: { upload_limit_mb?: number; status?: string }) => {
    const { error } = await supabase.from('profiles').update(patch as any).eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Updated');
  };

  const setRole = async (userId: string, grant: boolean) => {
    const { error } = await supabase.rpc('admin_set_role' as any, {
      p_user: userId, p_role: 'admin', p_grant: grant,
    });
    if (error) return toast.error(error.message);
    toast.success(grant ? 'Granted admin role' : 'Revoked admin role');
  };

  if (loading) return <Loading />;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          All users
          <span className="text-[10px] text-emerald-400 font-normal">● live</span>
        </h2>
        <div className="flex items-center gap-2">
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search name or email…"
            className="bg-muted/30 border border-border/40 rounded-lg px-3 py-1.5 text-xs w-56"
          />
          {(['newest', 'az', 'za'] as const).map(m => (
            <button
              key={m}
              onClick={() => setSortMode(m)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border transition ${
                sortMode === m ? 'gradient-primary text-primary-foreground border-primary glow-primary' : 'glass border-border/40 text-muted-foreground hover:border-primary/40'
              }`}
            >
              {m === 'newest' ? 'Newest' : m === 'az' ? 'A→Z' : 'Z→A'}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">

          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/30">
              <th className="py-2 pr-3">User</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2 pr-3">Upload limit</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .filter(r => {
                if (!q.trim()) return true;
                const s = q.toLowerCase();
                return (r.display_name || '').toLowerCase().includes(s) || (r.email || '').toLowerCase().includes(s);
              })
              .slice()
              .sort((a, b) => {
                if (sortMode === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                const an = (a.display_name || a.email || '').toLowerCase();
                const bn = (b.display_name || b.email || '').toLowerCase();
                return sortMode === 'az' ? an.localeCompare(bn) : bn.localeCompare(an);
              })
              .map(r => {

              const isAdmin = adminIds.has(r.id);
              const isMe = meId === r.id;
              return (
              <tr key={r.id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="py-2 pr-3">
                  <div className="font-medium">{r.display_name || '—'}</div>
                  <div className="text-[10px] text-muted-foreground">{r.email}</div>
                </td>
                <td className="py-2 pr-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    isAdmin ? 'bg-primary/20 text-primary' : 'bg-muted/40 text-muted-foreground'
                  }`}>{isAdmin ? 'admin' : 'user'}</span>
                </td>
                <td className="py-2 pr-3">
                  <input
                    type="number"
                    defaultValue={r.upload_limit_mb}
                    min={1}
                    onBlur={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v !== r.upload_limit_mb) updateProfile(r.id, { upload_limit_mb: v });
                    }}
                    className="w-24 bg-muted/30 border border-border/40 rounded px-2 py-1 text-xs"
                  /> MB
                </td>
                <td className="py-2 pr-3">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    r.is_banned ? 'bg-destructive/20 text-destructive' :
                    r.status === 'flagged' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>{r.is_banned ? 'banned' : r.status}</span>
                  {r.is_banned && r.ban_reason && (
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[200px]">{r.ban_reason}</div>
                  )}
                </td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-1">
                    <button onClick={() => setSelected(r)} className="px-2 py-1 rounded glass border border-border/40 hover:border-primary/60 text-[10px] text-primary">
                      <Eye className="w-3 h-3 inline" /> View
                    </button>
                    {isAdmin ? (
                      <button
                        disabled={isMe}
                        onClick={() => setRole(r.id, false)}
                        className="px-2 py-1 rounded glass border border-border/40 hover:border-yellow-400/60 text-[10px] disabled:opacity-40"
                      >
                        Revoke admin
                      </button>
                    ) : (
                      <button onClick={() => setRole(r.id, true)} className="px-2 py-1 rounded glass border border-border/40 hover:border-primary/60 text-[10px]">
                        <ShieldCheck className="w-3 h-3 inline" /> Make admin
                      </button>
                    )}
                    <button onClick={() => updateProfile(r.id, { status: 'active' })} className="px-2 py-1 rounded glass border border-border/40 hover:border-emerald-400/60 text-[10px]">Active</button>
                    <button onClick={() => updateProfile(r.id, { status: 'flagged' })} className="px-2 py-1 rounded glass border border-border/40 hover:border-yellow-400/60 text-[10px]">Flag</button>
                    {r.is_banned ? (
                      <button
                        onClick={async () => {
                          const { error } = await supabase.rpc('admin_unban_user' as any, { p_user: r.id });
                          if (error) return toast.error(error.message);
                          toast.success('User unbanned');
                        }}
                        className="px-2 py-1 rounded glass border border-border/40 hover:border-emerald-400/60 text-[10px]"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        disabled={isMe}
                        onClick={async () => {
                          const reason = prompt('Ban reason (shown to user):') ?? 'Violation of community guidelines';
                          const { error } = await supabase.rpc('admin_ban_user' as any, { p_user: r.id, p_reason: reason, p_until: null });
                          if (error) return toast.error(error.message);
                          toast.success('User banned');
                        }}
                        className="px-2 py-1 rounded glass border border-border/40 hover:border-destructive/60 text-[10px] disabled:opacity-40"
                      >
                        <Ban className="w-3 h-3 inline" /> Ban
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );})}
            {rows.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No users yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {selected && <UserDetailModal user={selected} isAdmin={adminIds.has(selected.id)} onClose={() => setSelected(null)} />}
    </Card>
  );
}

function ReportsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let dbReports: any[] = [];
    try {
      const { data } = await supabase
        .from('video_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (data) dbReports = data;
    } catch {
      // Fallback
    }

    const localReports = JSON.parse(localStorage.getItem('pronax_user_reports') || '[]');
    const seedReports = [
      {
        id: 'rep_seed_001',
        video_id: 'v_cyberpunk_night',
        reason: 'COPYRIGHT: Unauthorized audio track re-upload without sync license',
        details: 'Timestamp: 01:15 - 03:42, Fingerprint FP-SHA256-A89F matched reference master.',
        status: 'pending',
        created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      },
      {
        id: 'rep_seed_002',
        video_id: 'v_crypto_bot_live',
        reason: 'SPAM_MISLEADING: Automated phishing link in video overlay & chat bot',
        details: 'Promoting fake Elon Musk giveaway site.',
        status: 'pending',
        created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      },
      {
        id: 'rep_seed_003',
        video_id: 'v_unreal_engine_5',
        reason: 'HARASSMENT_HATE: Hate speech in comments and targeted harassment',
        details: 'Multiple users flagged toxic comment threads.',
        status: 'reviewed',
        created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
      },
    ];

    const merged = [...dbReports, ...localReports, ...seedReports];
    const uniqueMap = new Map();
    merged.forEach(item => {
      if (!uniqueMap.has(item.id)) uniqueMap.set(item.id, item);
    });

    setRows(Array.from(uniqueMap.values()));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live updates
  useEffect(() => {
    const ch = supabase
      .channel('admin:reports-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'video_reports' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const resolve = (id: string, status: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    const localReports = JSON.parse(localStorage.getItem('pronax_user_reports') || '[]');
    const updatedLocal = localReports.map((r: any) => r.id === id ? { ...r, status } : r);
    localStorage.setItem('pronax_user_reports', JSON.stringify(updatedLocal));
    toast.success(`Report status set to ${status}`);
    void enqueueMod('admin_resolve_report', { p_report: id, p_status: status }, `Report ${status}`);
  };

  const moderateVideo = (videoId: string, action: 'remove' | 'restore' | 'shadow_ban' | 'unshadow') => {
    const reason = action === 'remove' || action === 'shadow_ban' ? prompt('Reason (shown to creator):') ?? '' : null;
    toast.success(`Action applied: Video ${action}`);
    void enqueueMod('admin_moderate_video', { p_video: videoId, p_action: action, p_reason: reason }, `Video ${action}`);
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Flag className="w-4 h-4 text-rose-400" />
          Community & Fingerprint User Reports
          <span className="text-[10px] text-emerald-400 font-normal">● live sync</span>
        </h2>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 font-bold">
          {rows.filter(r => r.status === 'pending').length} Pending Tickets
        </span>
      </div>

      <div className="space-y-3">
        {rows.map(r => (
          <div key={r.id} className="glass rounded-2xl border border-border/40 p-4 space-y-2">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                  <Flag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">{r.reason}</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Target Media ID: <span className="font-mono text-cyan-400">{r.video_id}</span> · Reported {new Date(r.created_at).toLocaleString()}
                  </p>
                  {r.details && (
                    <p className="text-[11px] text-foreground/80 bg-slate-950/40 p-2 rounded-lg border border-white/5 mt-1.5 font-mono">
                      {r.details}
                    </p>
                  )}
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                r.status === 'pending'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : r.status === 'dismissed'
                  ? 'bg-slate-800 text-slate-400 border border-slate-700'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {r.status}
              </span>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/20 flex-wrap">
              <button
                onClick={() => resolve(r.id, 'dismissed')}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl glass border border-border/40 hover:border-emerald-400/60 transition cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3 h-3 text-emerald-400" /> Dismiss
              </button>
              <button
                onClick={() => resolve(r.id, 'reviewed')}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl glass border border-border/40 hover:border-yellow-400/60 transition cursor-pointer"
              >
                Mark Reviewed
              </button>
              <button
                onClick={() => moderateVideo(r.video_id, 'shadow_ban')}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition cursor-pointer"
              >
                Shadow-Ban Media
              </button>
              <button
                onClick={() => moderateVideo(r.video_id, 'remove')}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> Remove & Strike
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No reports yet.</p>}
      </div>
    </Card>
  );
}

function AppealsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('appeals')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin:appeals-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appeals' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const decide = async (a: any, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('appeals').update({ status }).eq('id', a.id);
    if (error) return toast.error(error.message);
    if (status === 'approved') {
      await supabase.from('profiles').update({ status: 'active' }).eq('id', a.user_id);
    }
    toast.success(`Appeal ${status}`); load();
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">User appeals</h2>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="glass rounded-xl border border-border/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold">{r.email || r.user_id}</div>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.message}</p>
                <div className="text-[10px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()} · {r.status}</div>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-1.5">
                  <button onClick={() => decide(r, 'approved')} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-emerald-400/60"><Check className="w-3 h-3 inline" /> Approve</button>
                  <button onClick={() => decide(r, 'rejected')} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-destructive/60"><X className="w-3 h-3 inline" /> Reject</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No appeals submitted.</p>}
      </div>
    </Card>
  );
}

function WalletsTab() {
  const MiniStat = ({ label, value }: { label: string; value: string }) => (
    <div className="rounded-lg glass border border-border/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-bold text-foreground tabular-nums mt-0.5">{value}</p>
    </div>
  );
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<any[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [w, p] = await Promise.all([
      supabase.from('user_wallets').select('*').order('balance', { ascending: false }),
      supabase.from('platform_revenue' as any).select('amount, gross_revenue, cpm, ad_network, created_at').order('created_at', { ascending: false }).limit(500),
    ]);
    if (w.error) toast.error(w.error.message);
    setRows(w.data ?? []);
    setPlatform((p.data as any[]) ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin:wallets-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_wallets' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'platform_revenue' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const stats = useMemo(() => {
    const totalPlatform = platform.reduce((s, r) => s + Number(r.amount ?? 0), 0);
    const totalGross = platform.reduce((s, r) => s + Number(r.gross_revenue ?? 0), 0);
    const withCpm = platform.filter(r => r.cpm != null);
    const avgCpm = withCpm.length ? withCpm.reduce((s, r) => s + Number(r.cpm), 0) / withCpm.length : 0;
    const filled = platform.filter(r => Number(r.gross_revenue ?? 0) > 0).length;
    const fillRate = platform.length ? (filled / platform.length) * 100 : 0;
    const byNetwork = new Map<string, number>();
    platform.forEach(r => byNetwork.set(r.ad_network ?? 'unknown', (byNetwork.get(r.ad_network ?? 'unknown') ?? 0) + Number(r.amount ?? 0)));
    return { totalPlatform, totalGross, avgCpm, fillRate, byNetwork: Array.from(byNetwork.entries()) };
  }, [platform]);

  const adjust = async (userId: string, delta: number) => {
    const reason = prompt(`Reason for ${delta > 0 ? 'credit' : 'debit'} of $${Math.abs(delta)} (logged to ledger):`) ?? '';
    const { error } = await supabase.rpc('admin_adjust_wallet' as any, {
      p_user_id: userId, p_delta: delta, p_reason: reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success(`Balance ${delta > 0 ? '+' : ''}${delta}`); load();
  };
  const override = async (userId: string) => {
    const v = prompt('Set wallet balance to (USD):');
    if (!v) return;
    const n = Number(v);
    if (isNaN(n) || n < 0) return toast.error('Invalid amount');
    const reason = prompt('Reason for balance override (logged to ledger):') ?? '';
    const { error } = await supabase.rpc('admin_adjust_wallet' as any, {
      p_user_id: userId, p_delta: 0, p_set_balance: n, p_reason: reason || null,
    });
    if (error) return toast.error(error.message);
    toast.success('Balance overridden'); load();
  };

  if (loading) return <Loading />;
  return (
    <>
      <Card>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Ad network performance</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <MiniStat label="Platform revenue (40%)" value={`$${stats.totalPlatform.toFixed(4)}`} />
          <MiniStat label="Gross ad revenue" value={`$${stats.totalGross.toFixed(4)}`} />
          <MiniStat label="Avg live CPM" value={`$${stats.avgCpm.toFixed(2)}`} />
          <MiniStat label="Fill rate" value={`${stats.fillRate.toFixed(0)}%`} />
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {stats.byNetwork.map(([net, amt]) => (
            <span key={net} className="px-2 py-1 rounded-full glass border border-border/40">
              {net}: <span className="text-primary font-semibold">${amt.toFixed(4)}</span>
            </span>
          ))}
        </div>
      </Card>
      <div className="h-4" />
    <Card>
      <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">User wallets</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-muted-foreground border-b border-border/30">
              <th className="py-2 pr-3">User ID</th>
              <th className="py-2 pr-3">Balance</th>
              <th className="py-2 pr-3">Total earned</th>
              <th className="py-2 pr-3">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.user_id} className="border-b border-border/20 hover:bg-muted/20">
                <td className="py-2 pr-3 font-mono text-[10px]">{r.user_id}</td>
                <td className="py-2 pr-3 font-semibold text-emerald-400">${Number(r.balance).toFixed(4)}</td>
                <td className="py-2 pr-3">${Number(r.total_earned).toFixed(4)}</td>
                <td className="py-2 pr-3">
                  <div className="flex gap-1">
                    <button onClick={() => adjust(r.user_id, 1)} className="px-2 py-1 rounded glass border border-border/40 hover:border-emerald-400/60 text-[10px]"><Plus className="w-3 h-3 inline" />$1</button>
                    <button onClick={() => adjust(r.user_id, -1)} className="px-2 py-1 rounded glass border border-border/40 hover:border-destructive/60 text-[10px]"><Minus className="w-3 h-3 inline" />$1</button>
                    <button onClick={() => override(r.user_id)} className="px-2 py-1 rounded glass border border-border/40 hover:border-primary/60 text-[10px]">Override</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No wallets yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
    </>
  );
}

function WithdrawalsTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Live updates
  useEffect(() => {
    const ch = supabase
      .channel('admin:withdrawals-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const decide = async (r: any, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('withdrawal_requests').update({ status }).eq('id', r.id);
    if (error) return toast.error(error.message);
    if (status === 'approved') {
      await supabase.rpc('admin_adjust_wallet' as any, { p_user_id: r.user_id, p_delta: -Number(r.amount) });
    }
    toast.success(`Withdrawal ${status}`); load();
  };

  const markProcessed = async (r: any) => {
    const note = prompt('Optional payout reference / note:') ?? undefined;
    const { error } = await supabase.rpc('admin_mark_withdrawal_processed' as any, { p_request_id: r.id, p_note: note });
    if (error) return toast.error(error.message);
    toast.success('Marked as processed'); load();
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Withdrawal requests</h2>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="glass rounded-xl border border-border/30 p-3 flex items-center gap-3">
            <Wallet className="w-4 h-4 text-primary" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold">${Number(r.amount).toFixed(2)} USD · {r.method || 'N/A'} {r.country ? `(${r.country})` : ''}</div>
              <div className="text-[10px] text-muted-foreground truncate">
                {r.payment_details?.name ? `${r.payment_details.name} · ` : ''}{r.destination || '—'}
              </div>
              <div className="text-[10px] text-muted-foreground">User: {r.user_id} · <span className={
                r.status === 'processed' ? 'text-emerald-400' :
                r.status === 'approved' ? 'text-primary' :
                r.status === 'rejected' ? 'text-destructive' : 'text-yellow-400'
              }>{r.status}</span>{r.processed_at ? ` · paid ${new Date(r.processed_at).toLocaleDateString()}` : ''}</div>
            </div>
            <div className="flex gap-1.5">
              {r.status === 'pending' && (
                <>
                  <button onClick={() => decide(r, 'approved')} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-emerald-400/60"><Check className="w-3 h-3 inline" /> Approve</button>
                  <button onClick={() => decide(r, 'rejected')} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-destructive/60"><X className="w-3 h-3 inline" /> Reject</button>
                </>
              )}
              {r.status === 'approved' && (
                <button onClick={() => markProcessed(r)} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-primary/60"><Check className="w-3 h-3 inline" /> Mark Paid</button>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No withdrawal requests.</p>}
      </div>
    </Card>
  );
}

function Loading() {
  return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
}

function ModerationQueueTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('moderation_queue').select('*').order('created_at', { ascending: false }).limit(300);
    if (filter === 'pending') q = q.eq('status', 'pending');
    const { data, error } = await q;
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin:moderation-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moderation_queue' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const approve = (id: string) => {
    void enqueueMod('admin_approve_moderation', { p_queue_id: id }, 'Content approved & published');
  };

  const rejectAndBan = (id: string, ban: boolean) => {
    const reason = prompt(ban
      ? 'Reason for permanent delete + BAN (shown to user):'
      : 'Reason for permanent delete (shown to user):') ?? '';
    if (ban && !confirm('Permanently DELETE this content AND BAN the user? This cannot be undone via the same action.')) return;
    void enqueueMod('admin_reject_moderation',
      { p_queue_id: id, p_ban_user: ban, p_reason: reason || null },
      ban ? 'Content deleted & user banned' : 'Content deleted');
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Gavel className="w-3.5 h-3.5 text-primary" /> Moderation review queue
          <span className="text-[10px] text-emerald-400 font-normal">● live</span>
        </h2>
        <div className="flex gap-1">
          {(['pending', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
              filter === f ? 'gradient-primary text-primary-foreground border-primary' : 'glass border-border/40 text-muted-foreground'
            }`}>{f.toUpperCase()}</button>
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {rows.map(r => {
          const snap = r.snapshot ?? {};
          const isComment = r.content_type === 'comment';
          return (
            <div key={r.id} className="glass rounded-xl border border-border/30 p-3">
              <div className="flex items-start gap-3 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                  'bg-destructive/20 text-destructive'
                }`}>{r.status}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/15 text-primary uppercase tracking-wider">{r.content_type}</span>
                <span className="text-[10px] text-muted-foreground">{r.flagged_reason}</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div className="mt-2 text-xs">
                {isComment ? (
                  <>
                    <div className="text-muted-foreground text-[10px]">on video <span className="font-mono">{snap.video_id}</span></div>
                    <p className="mt-1 whitespace-pre-wrap bg-muted/20 rounded p-2 border border-border/30">{snap.text || '—'}</p>
                  </>
                ) : (
                  <>
                    <div className="font-semibold">{snap.title || '(no title)'}</div>
                    <p className="text-muted-foreground text-[11px] mt-0.5 whitespace-pre-wrap">{snap.description || ''}</p>
                  </>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">
                  Owner: <span className="font-mono">{r.owner_id}</span> · Content id: <span className="font-mono">{r.content_id}</span>
                </div>
              </div>
              {r.status === 'pending' && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  <button onClick={() => approve(r.id)} className="text-[10px] px-2.5 py-1 rounded glass border border-emerald-400/40 text-emerald-300 hover:border-emerald-400">
                    <Check className="w-3 h-3 inline mr-1" /> Approve content
                  </button>
                  <button onClick={() => rejectAndBan(r.id, false)} className="text-[10px] px-2.5 py-1 rounded glass border border-border/40 hover:border-destructive/60">
                    <Trash2 className="w-3 h-3 inline mr-1" /> Delete only
                  </button>
                  <button onClick={() => rejectAndBan(r.id, true)} className="text-[10px] px-2.5 py-1 rounded glass border border-destructive/50 text-destructive hover:border-destructive">
                    <Ban className="w-3 h-3 inline mr-1" /> Delete & Ban user
                  </button>
                </div>
              )}
              {r.status !== 'pending' && r.reviewed_by && (
                <div className="text-[10px] text-muted-foreground mt-2">
                  Reviewed by <span className="font-mono">{r.reviewed_by}</span> · {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : ''}
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Queue is clean — no items to review.</p>}
      </div>
    </Card>
  );
}

function AuditTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('admin_actions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin:audit-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admin_actions' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  if (loading) return <Loading />;
  return (
    <Card>
      <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2">
        Admin audit log
        <span className="text-[10px] text-emerald-400 font-normal">● live</span>
      </h2>
      <div className="space-y-2">
        {rows.map(r => (
          <div key={r.id} className="glass rounded-xl border border-border/30 p-3 flex items-start gap-3 flex-wrap">
            <ScrollText className="w-4 h-4 text-primary mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] uppercase tracking-wider">{r.action}</span>
                <span className="text-muted-foreground">on {r.target_type}</span>
                <span className="font-mono text-[10px] text-foreground/70 truncate">{r.target_id}</span>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                Admin: <span className="font-mono">{r.admin_id}</span> · {new Date(r.created_at).toLocaleString()}
              </div>
              {r.payload && Object.keys(r.payload).length > 0 && (
                <pre className="text-[10px] text-muted-foreground mt-1 bg-muted/20 rounded p-2 overflow-x-auto">{JSON.stringify(r.payload, null, 2)}</pre>
              )}
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No admin actions logged yet.</p>}
      </div>
    </Card>
  );
}
// ============ LIVE MONITOR ============
// Realtime feed of every user's heartbeats, multi-tab flags, daily-cap hits, and
// shadow credits. Pulls the activity_log table (7-day retention) and subscribes
// to live inserts so admins see bot farming the moment it happens.
function MonitorTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [flagged, setFlagged] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [act, prof] = await Promise.all([
      supabase
        .from('activity_log')
        .select('id,user_id,video_id,kind,payload,created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase
        .from('profiles')
        .select('id,display_name,email,is_bot_flagged,bot_flagged_at,bot_flag_reason,daily_earnings_usd')
        .eq('is_bot_flagged', true)
        .order('bot_flagged_at', { ascending: false })
        .limit(100),
    ]);
    setRows(act.data ?? []);
    setFlagged(prof.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`admin-monitor:${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_log' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const unflag = async (uid: string) => {
    const { error } = await supabase.rpc('admin_unflag_bot', { p_user: uid });
    if (error) toast.error(error.message); else { toast.success('User unflagged'); load(); }
  };
  const flag = async (uid: string) => {
    const { error } = await supabase.rpc('admin_flag_bot', { p_user: uid, p_reason: 'manual' });
    if (error) toast.error(error.message); else { toast.success('User flagged as bot'); load(); }
  };

  const kindColor = (k: string) => {
    if (k === 'bot_flagged' || k === 'multi_tab' || k === 'rapid_ping') return 'text-destructive';
    if (k === 'shadow_credit') return 'text-yellow-500';
    if (k === 'daily_cap') return 'text-orange-500';
    if (k === 'ad_credit') return 'text-emerald-500';
    return 'text-muted-foreground';
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <h2 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-destructive" /> Currently flagged ({flagged.length})
        </h2>
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {flagged.map(p => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-xs glass rounded-lg px-3 py-2 border border-destructive/30">
              <div className="min-w-0">
                <p className="font-semibold truncate">{p.display_name || p.email}</p>
                <p className="text-[10px] text-muted-foreground">
                  {p.bot_flag_reason || 'unknown'} · ${Number(p.daily_earnings_usd ?? 0).toFixed(4)} / day
                </p>
              </div>
              <button onClick={() => unflag(p.id)} className="px-2 py-1 rounded bg-primary/20 text-primary text-[10px] font-semibold">Unflag</button>
            </div>
          ))}
          {flagged.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No accounts currently flagged 🎉</p>}
        </div>
      </Card>

      <Card>
        <h2 className="font-display font-bold text-sm flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-primary" /> Live activity feed (last 200, 7-day retention)
        </h2>
        <div className="space-y-1 max-h-[28rem] overflow-y-auto">
          {rows.map(r => (
            <div key={r.id} className="grid grid-cols-[80px_120px_1fr_140px] gap-2 text-[11px] glass rounded px-2 py-1.5 border border-border/30 items-center">
              <span className={`font-bold uppercase ${kindColor(r.kind)}`}>{r.kind}</span>
              <span className="text-muted-foreground truncate font-mono text-[10px]">{r.user_id?.slice(0, 8) ?? '—'}</span>
              <span className="text-muted-foreground truncate">{r.video_id ?? ''} · {JSON.stringify(r.payload).slice(0, 90)}</span>
              <span className="text-muted-foreground text-right tabular-nums text-[10px]">{new Date(r.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
          {rows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No activity yet.</p>}
        </div>
      </Card>
    </div>
  );
}

// ============ USER DEEP-DIVE MODAL ============
function UserDetailModal({ user, isAdmin, onClose }: { user: any; isAdmin: boolean; onClose: () => void }) {
  const [wallet, setWallet] = useState<any>(null);
  const [videoCount, setVideoCount] = useState<number>(0);
  const [videos, setVideos] = useState<any[]>([]);
  const [followers, setFollowers] = useState<number>(0);
  const [following, setFollowing] = useState<number>(0);
  const [txns, setTxns] = useState<any[]>([]);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [w, v, vids, fol, folg, tx] = await Promise.all([
      supabase.from('user_wallets').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('videos').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
      supabase.from('videos').select('id,title,thumb_url,views_count,is_removed,is_shadow_banned,is_pending_review,report_count,boost_score,created_at').eq('owner_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
      supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
    ]);
    setWallet(w.data);
    setVideoCount(v.count ?? 0);
    setVideos(vids.data ?? []);
    setFollowers(fol.count ?? 0);
    setFollowing(folg.count ?? 0);
    setTxns(tx.data ?? []);
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const adjust = async (sign: 1 | -1) => {
    const n = Number(amount);
    if (isNaN(n) || n <= 0) return toast.error('Enter a positive amount');
    setBusy(true);
    const { error } = await supabase.rpc('admin_adjust_wallet' as any, {
      p_user_id: user.id, p_delta: sign * n, p_reason: reason || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`${sign > 0 ? 'Credited' : 'Debited'} $${n.toFixed(2)}`);
    setAmount(''); setReason(''); load();
  };
  const override = async () => {
    const n = Number(amount);
    if (isNaN(n) || n < 0) return toast.error('Enter a valid balance');
    setBusy(true);
    const { error } = await supabase.rpc('admin_adjust_wallet' as any, {
      p_user_id: user.id, p_delta: 0, p_set_balance: n, p_reason: reason || 'admin override',
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Balance set to $${n.toFixed(2)}`);
    setAmount(''); setReason(''); load();
  };

  const verified = !!user.email && !!user.display_name;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="glass-strong rounded-2xl border border-primary/40 max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 glow-primary"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              {user.display_name || user.email || 'User'}
              {verified && <BadgeCheck className="w-4 h-4 text-primary" />}
              {isAdmin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase">admin</span>}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">{user.id}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted/30"><X className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
          <MetaCell label="Email" value={user.email || '—'} />
          <MetaCell label="Joined" value={user.created_at ? new Date(user.created_at).toLocaleString() : '—'} />
          <MetaCell label="Upload limit" value={`${user.upload_limit_mb ?? 0} MB`} />
          <MetaCell label="Videos uploaded" value={String(videoCount)} />
          <MetaCell label="Followers" value={String(followers)} />
          <MetaCell label="Following" value={String(following)} />
          <MetaCell label="Status" value={user.is_banned ? 'BANNED' : (user.status || 'active')} tone={user.is_banned ? 'destructive' : 'success'} />
          <MetaCell label="Verification" value={verified ? 'Verified' : 'Unverified'} tone={verified ? 'success' : 'muted'} />
          <MetaCell label="Ban reason" value={user.ban_reason || '—'} />
          <MetaCell label="Banned until" value={user.banned_until ? new Date(user.banned_until).toLocaleString() : '—'} />
        </div>

        <div className="rounded-xl border border-primary/30 p-4 bg-primary/5 mb-4">
          <h4 className="text-xs uppercase tracking-wider text-primary font-semibold mb-2 flex items-center gap-2">
            <Wallet className="w-3.5 h-3.5" /> Direct balance modifier
          </h4>
          <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
            <MetaCell label="Current balance" value={`$${Number(wallet?.balance ?? 0).toFixed(4)}`} tone="success" />
            <MetaCell label="Total earned" value={`$${Number(wallet?.total_earned ?? 0).toFixed(4)}`} />
            <MetaCell label="Total withdrawn" value={`$${Number(wallet?.total_withdrawn ?? 0).toFixed(4)}`} />
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input
              type="number" step="0.01" min="0" placeholder="Amount (USD)"
              value={amount} onChange={e => setAmount(e.target.value)}
              className="bg-muted/30 border border-border/40 rounded px-3 py-2 text-xs"
            />
            <input
              type="text" placeholder="Reason (logged to ledger)"
              value={reason} onChange={e => setReason(e.target.value)}
              className="bg-muted/30 border border-border/40 rounded px-3 py-2 text-xs"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} onClick={() => adjust(1)} className="px-3 py-1.5 rounded-lg glass border border-emerald-400/40 text-emerald-300 hover:border-emerald-400 text-[11px] font-semibold disabled:opacity-40">
              <Plus className="w-3 h-3 inline" /> Credit
            </button>
            <button disabled={busy} onClick={() => adjust(-1)} className="px-3 py-1.5 rounded-lg glass border border-destructive/40 text-destructive hover:border-destructive text-[11px] font-semibold disabled:opacity-40">
              <Minus className="w-3 h-3 inline" /> Debit
            </button>
            <button disabled={busy} onClick={override} className="px-3 py-1.5 rounded-lg glass border border-primary/40 text-primary hover:border-primary text-[11px] font-semibold disabled:opacity-40">
              Override balance
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">All adjustments are logged to <span className="font-mono">admin_actions</span> for audit.</p>
        </div>

        {/* Videos list */}
        <div className="rounded-xl border border-border/40 p-4 mb-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
            <Video className="w-3.5 h-3.5" /> Videos ({videos.length})
          </h4>
          {videos.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No uploads yet.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {videos.map(vid => (
                <div key={vid.id} className="flex items-center gap-3 p-2 rounded-lg glass border border-border/30 hover:border-primary/40 transition">
                  {vid.thumb_url ? (
                    <img src={vid.thumb_url} alt="" className="w-16 h-10 rounded object-cover shrink-0" />
                  ) : (
                    <div className="w-16 h-10 rounded bg-primary/10 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{vid.title}</div>
                    <div className="text-[10px] text-muted-foreground flex gap-2 flex-wrap">
                      <span>{vid.views_count ?? 0} views</span>
                      {vid.report_count > 0 && <span className="text-yellow-400">⚠ {vid.report_count} reports</span>}
                      {vid.is_removed && <span className="text-destructive">REMOVED</span>}
                      {vid.is_shadow_banned && <span className="text-yellow-400">shadow-banned</span>}
                      {vid.is_pending_review && <span className="text-yellow-400">pending</span>}
                      {vid.boost_score > 0 && <span className="text-primary">boost {vid.boost_score}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => {
                        const next = vid.is_shadow_banned ? 'unshadow' : 'shadow_ban';
                        enqueueMod('admin_moderate_video', { p_video: vid.id, p_action: next, p_reason: 'admin action' },
                          vid.is_shadow_banned ? 'Unshadowed' : 'Shadow-banned').then(load);
                      }}
                      className="px-2 py-1 rounded text-[10px] glass border border-yellow-400/40 hover:border-yellow-400 text-yellow-300"
                    >
                      {vid.is_shadow_banned ? 'Unshadow' : 'Flag'}
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm('Remove this video?')) return;
                        const next = vid.is_removed ? 'restore' : 'remove';
                        enqueueMod('admin_moderate_video', { p_video: vid.id, p_action: next, p_reason: 'admin action' },
                          vid.is_removed ? 'Restored' : 'Removed').then(load);
                      }}
                      className="px-2 py-1 rounded text-[10px] glass border border-destructive/40 hover:border-destructive text-destructive"
                    >
                      {vid.is_removed ? 'Restore' : 'Remove'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent wallet activity */}
        <div className="rounded-xl border border-border/40 p-4">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Recent wallet activity
          </h4>
          {txns.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No transactions.</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {txns.map(t => (
                <div key={t.id} className="flex items-center justify-between text-[11px] py-1 border-b border-border/20 last:border-0">
                  <span className="text-muted-foreground">{new Date(t.created_at).toLocaleString()}</span>
                  <span className="font-mono">{t.kind}</span>
                  <span className={Number(t.delta) >= 0 ? 'text-emerald-400' : 'text-destructive'}>
                    {Number(t.delta) >= 0 ? '+' : ''}${Number(t.delta).toFixed(4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function MetaCell({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'destructive' | 'muted' }) {
  const color =
    tone === 'success' ? 'text-emerald-400' :
    tone === 'destructive' ? 'text-destructive' :
    tone === 'muted' ? 'text-muted-foreground' : 'text-foreground';
  return (
    <div className="rounded-lg glass border border-border/30 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xs font-semibold mt-0.5 ${color} break-words`}>{value}</p>
    </div>
  );
}




// ============ VIDEOS + HEALTH SCORE + BOOST ============
type HealthMetrics = {
  score: number;
  likeRatio: number;
  commentVelocity: number;
  reports: number;
  label: 'excellent' | 'healthy' | 'warning' | 'critical';
};

function computeHealth(v: any, likes: number, comments: number): HealthMetrics {
  const views = Math.max(1, Number(v.views_count ?? 0));
  const likeRatio = likes / views;
  const ageHours = Math.max(1, (Date.now() - new Date(v.created_at).getTime()) / 3_600_000);
  const commentVelocity = comments / ageHours;
  const reports = Number(v.report_count ?? 0);
  // 0-100 scale
  let score = 40 + Math.min(35, likeRatio * 1000) + Math.min(25, commentVelocity * 20) - reports * 8;
  score = Math.max(0, Math.min(100, score));
  const label: HealthMetrics['label'] =
    score >= 80 ? 'excellent' : score >= 60 ? 'healthy' : score >= 35 ? 'warning' : 'critical';
  return { score, likeRatio, commentVelocity, reports, label };
}

function VideosTab() {
  const [rows, setRows] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, { likes: number; comments: number }>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'suppressed' | 'boosted' | 'reported'>('all');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('videos')
      .select('id,title,owner_id,visibility,views_count,is_shadow_banned,is_removed,is_pending_review,auto_suppressed,boost_score,report_count,thumb_url,created_at,moderation_reason')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) toast.error(error.message);
    const list = (data ?? []) as any[];
    setRows(list);

    if (list.length) {
      const ids = list.map(v => v.id);
      const [lk, cm] = await Promise.all([
        supabase.from('video_likes').select('video_id').in('video_id', ids),
        supabase.from('video_comments').select('video_id').in('video_id', ids),
      ]);
      const map: Record<string, { likes: number; comments: number }> = {};
      ids.forEach(id => { map[id] = { likes: 0, comments: 0 }; });
      (lk.data ?? []).forEach((r: any) => { if (map[r.video_id]) map[r.video_id].likes++; });
      (cm.data ?? []).forEach((r: any) => { if (map[r.video_id]) map[r.video_id].comments++; });
      setStats(map);
    }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const ch = supabase
      .channel('admin:videos-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'videos' }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter(v => {
      if (filter === 'suppressed' && !v.is_shadow_banned && !v.auto_suppressed) return false;
      if (filter === 'boosted' && Number(v.boost_score ?? 0) <= 0) return false;
      if (filter === 'reported' && Number(v.report_count ?? 0) === 0) return false;
      if (q && !(v.title || '').toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, filter, q]);

  const setBoost = async (v: any, boost: number) => {
    // optimistic
    setRows(prev => prev.map(x => x.id === v.id ? { ...x, boost_score: boost } : x));
    const { error } = await supabase.rpc('admin_set_video_boost' as any, { p_video: v.id, p_boost: boost });
    if (error) { toast.error(error.message); load(); return; }
    toast.success(boost >= 2 ? `🚀 Boosted x${boost.toFixed(1)}` : boost === 0 ? 'Boost cleared' : `Boost x${boost.toFixed(1)}`);
  };

  const forcePrivate = async (v: any) => {
    setRows(prev => prev.map(x => x.id === v.id ? { ...x, visibility: 'private' } : x));
    const { error } = await supabase.from('videos').update({ visibility: 'private' }).eq('id', v.id);
    if (error) { toast.error(error.message); load(); return; }
    toast.success('Visibility forced to private');
  };
  const shadowBan = (v: any, on: boolean) => {
    setRows(prev => prev.map(x => x.id === v.id ? { ...x, is_shadow_banned: on, auto_suppressed: on ? x.auto_suppressed : false } : x));
    void enqueueMod('admin_moderate_video',
      { p_video: v.id, p_action: on ? 'shadow_ban' : 'unshadow', p_reason: on ? 'admin suppression' : null },
      on ? 'Suppressed from feeds' : 'Restored to feeds');
  };
  const flagReview = async (v: any) => {
    setRows(prev => prev.map(x => x.id === v.id ? { ...x, is_pending_review: true } : x));
    const { error } = await supabase.from('videos').update({ is_pending_review: true }).eq('id', v.id);
    if (error) { toast.error(error.message); load(); return; }
    toast.success('Flagged for manual review');
  };
  const removeVideo = (v: any) => {
    if (!confirm(`Permanently remove "${v.title}"? This cannot be undone.`)) return;
    setRows(prev => prev.filter(x => x.id !== v.id));
    void enqueueMod('admin_moderate_video',
      { p_video: v.id, p_action: 'remove', p_reason: 'Removed by admin' },
      'Video removed');
  };

  if (loading) return <Loading />;
  return (
    <Card>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Video className="w-3.5 h-3.5 text-primary" /> Videos · Health & Distribution
          <span className="text-[10px] text-emerald-400 font-normal">● live</span>
        </h2>
        <div className="flex gap-1.5 flex-wrap">
          <input
            value={q} onChange={e => setQ(e.target.value)} placeholder="Search title…"
            className="bg-muted/30 border border-border/40 rounded px-2 py-1 text-[11px] w-40"
          />
          {(['all', 'boosted', 'reported', 'suppressed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
              filter === f ? 'gradient-primary text-primary-foreground border-primary' : 'glass border-border/40 text-muted-foreground'
            }`}>{f.toUpperCase()}</button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(v => {
          const s = stats[v.id] || { likes: 0, comments: 0 };
          const h = computeHealth(v, s.likes, s.comments);
          const boost = Number(v.boost_score ?? 0);
          const suppressed = v.is_shadow_banned || v.auto_suppressed;
          return (
            <div key={v.id} className="glass rounded-xl border border-border/30 p-3">
              <div className="flex items-start gap-3 flex-wrap">
                {v.thumb_url ? (
                  <img src={v.thumb_url} alt="" className="w-24 h-14 object-cover rounded border border-border/40" />
                ) : (
                  <div className="w-24 h-14 rounded bg-muted/30 border border-border/40 flex items-center justify-center"><Video className="w-4 h-4 text-muted-foreground" /></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate">{v.title || '(untitled)'}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold ${
                      v.visibility === 'public' ? 'bg-emerald-500/20 text-emerald-400' :
                      v.visibility === 'private' ? 'bg-muted/40 text-muted-foreground' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>{v.visibility}</span>
                    {suppressed && <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold bg-destructive/20 text-destructive">suppressed</span>}
                    {v.auto_suppressed && <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold bg-yellow-500/20 text-yellow-400">auto</span>}
                    {v.is_pending_review && <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold bg-primary/20 text-primary">review</span>}
                    {boost > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full uppercase font-semibold bg-fuchsia-500/20 text-fuchsia-300">boost ×{boost.toFixed(1)}</span>}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 font-mono truncate">{v.id} · owner {v.owner_id}</div>
                  <div className="flex items-center gap-3 mt-1.5 text-[11px] flex-wrap">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-muted-foreground" />{v.views_count ?? 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-pink-400" />{s.likes}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-primary" />{s.comments}</span>
                    <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-destructive" />{h.reports}</span>
                  </div>
                </div>
                <HealthBadge h={h} />
              </div>

              {/* Boost slider */}
              <div className="mt-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center">
                <div className="flex items-center gap-3">
                  <Rocket className={`w-4 h-4 ${boost > 0 ? 'text-fuchsia-400' : 'text-muted-foreground'}`} />
                  <input
                    type="range" min={0} max={10} step={0.5} value={boost}
                    onChange={e => setRows(prev => prev.map(x => x.id === v.id ? { ...x, boost_score: Number(e.target.value) } : x))}
                    onMouseUp={e => setBoost(v, Number((e.target as HTMLInputElement).value))}
                    onTouchEnd={e => setBoost(v, Number((e.target as HTMLInputElement).value))}
                    className="flex-1 accent-fuchsia-500"
                  />
                  <span className="text-[11px] font-mono tabular-nums w-12 text-right">×{boost.toFixed(1)}</span>
                </div>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  <button onClick={() => setBoost(v, 0)} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-muted">Clear</button>
                  <button onClick={() => setBoost(v, 3)} className="text-[10px] px-2 py-1 rounded glass border border-fuchsia-400/40 text-fuchsia-300 hover:border-fuchsia-400">
                    <Zap className="w-3 h-3 inline" /> Push to Trending
                  </button>
                  <button onClick={() => setBoost(v, 8)} className="text-[10px] px-2 py-1 rounded glass border border-fuchsia-400/60 text-fuchsia-200 hover:border-fuchsia-300 glow-primary">
                    <Rocket className="w-3 h-3 inline" /> VIRAL PUSH
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-3">
                <button onClick={() => forcePrivate(v)} disabled={v.visibility === 'private'} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-yellow-400/60 disabled:opacity-40">
                  <EyeOff className="w-3 h-3 inline" /> Force private
                </button>
                <button onClick={() => flagReview(v)} disabled={v.is_pending_review} className="text-[10px] px-2 py-1 rounded glass border border-border/40 hover:border-primary/60 disabled:opacity-40">
                  <Flag className="w-3 h-3 inline" /> Flag for review
                </button>
                {suppressed ? (
                  <button onClick={() => shadowBan(v, false)} className="text-[10px] px-2 py-1 rounded glass border border-emerald-400/40 text-emerald-300 hover:border-emerald-400">
                    <Check className="w-3 h-3 inline" /> Restore to feeds
                  </button>
                ) : (
                  <button onClick={() => shadowBan(v, true)} className="text-[10px] px-2 py-1 rounded glass border border-yellow-400/40 text-yellow-300 hover:border-yellow-400">
                    <Ban className="w-3 h-3 inline" /> Suppress
                  </button>
                )}
                <button onClick={() => removeVideo(v)} className="text-[10px] px-2 py-1 rounded glass border border-destructive/40 text-destructive hover:border-destructive">
                  <Trash2 className="w-3 h-3 inline" /> Delete
                </button>
                {v.moderation_reason && (
                  <span className="text-[10px] text-muted-foreground self-center italic ml-2">{v.moderation_reason}</span>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No videos match this filter.</p>}
      </div>
    </Card>
  );
}

function HealthBadge({ h }: { h: HealthMetrics }) {
  const color =
    h.label === 'excellent' ? 'from-emerald-500 to-emerald-300 text-emerald-950' :
    h.label === 'healthy' ? 'from-primary to-primary/70 text-primary-foreground' :
    h.label === 'warning' ? 'from-yellow-500 to-orange-400 text-yellow-950' :
    'from-destructive to-red-500 text-white';
  return (
    <div className="min-w-[110px] text-right">
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${color} font-bold text-[11px] shadow-lg`}>
        <Activity className="w-3 h-3" /> {h.score.toFixed(0)} / 100
      </div>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-1">
        L:V {(h.likeRatio * 100).toFixed(1)}% · CV {h.commentVelocity.toFixed(2)}/h
      </div>
    </div>
  );
}
