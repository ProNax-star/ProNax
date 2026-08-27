/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
/**
 * SECURITY FIX (Aug 27, 2026):
 * 1. Improved AbortController implementation for cleanup
 * 2. Better error handling and logging
 * 3. Role-based access control strictly enforced
 * 4. Admin verification on every critical action
 * 5. Removed hardcoded test data
 * 6. Added user profile loading
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { motion } from 'framer-motion';
import { Shield, ShieldCheck, Loader2, Home, ShieldAlert, LayoutDashboard, Activity, Eye, Video, ShieldAlert as ShieldAlertIcon, Flag, Gavel, ShieldCheck as ShieldCheckIcon, Wallet, Megaphone, Cpu, Users, TagIcon, SettingsIcon, Sliders, KeyRound, AlertTriangle, ScrollText, Gauge } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { EngineBoundary } from '@/components/EngineBoundary';
import { AdminShell, type AdminNavItem } from '@/components/admin/AdminShell';
import { moderationQueue } from '@/lib/moderationQueue';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

// Lazy load tab components
const CommandCenterTab = lazy(() => import('@/components/admin/CommandCenter').then(m => ({ default: m.CommandCenterTab })));
const ModerationSettingsTab = lazy(() => import('@/components/admin/ModerationSettingsTab').then(m => ({ default: m.ModerationSettingsTab })));
const AppControlTab = lazy(() => import('@/components/admin/tabs/AppControlTab').then(m => ({ default: m.AppControlTab })));
const CategoriesTab = lazy(() => import('@/components/admin/tabs/CategoriesTab').then(m => ({ default: m.CategoriesTab })));
const AlgorithmTab = lazy(() => import('@/components/admin/tabs/AlgorithmTab').then(m => ({ default: m.AlgorithmTab })));
const RealtimeTab = lazy(() => import('@/components/admin/tabs/RealtimeTab').then(m => ({ default: m.RealtimeTab })));
const LivePreviewTab = lazy(() => import('@/components/admin/tabs/LivePreviewTab').then(m => ({ default: m.LivePreviewTab })));
const AdSettingsTab = lazy(() => import('@/components/admin/tabs/AdSettingsTab').then(m => ({ default: m.AdSettingsTab })));
const AdManagementTab = lazy(() => import('@/components/admin/tabs/AdManagementTab').then(m => ({ default: m.AdManagementTab })));
const CopyrightCenterTab = lazy(() => import('@/components/admin/tabs/CopyrightCenterTab').then(m => ({ default: m.CopyrightCenterTab })));
const UserManagementTab = lazy(() => import('@/components/admin/tabs/UserManagementTab').then(m => ({ default: m.UserManagementTab })));
const AuditLogsTab = lazy(() => import('@/components/admin/tabs/AuditLogsTab').then(m => ({ default: m.AuditLogsTab })));
const RateLimitTab = lazy(() => import('@/components/admin/tabs/RateLimitTab').then(m => ({ default: m.RateLimitTab })));
const AdminAccessTab = lazy(() => import('@/components/admin/tabs/AdminAccessTab').then(m => ({ default: m.AdminAccessTab })));
const StrikesTab = lazy(() => import('@/components/admin/tabs/StrikesTab').then(m => ({ default: m.StrikesTab })));
const ReportsTab = lazy(() => import('@/components/admin/tabs/ReportsTab').then(m => ({ default: m.ReportsTab })));
const AppealsTab = lazy(() => import('@/components/admin/tabs/AppealsTab').then(m => ({ default: m.AppealsTab })));
const WalletsTab = lazy(() => import('@/components/admin/tabs/WalletsTab').then(m => ({ default: m.WalletsTab })));
const WithdrawalsTab = lazy(() => import('@/components/admin/tabs/WithdrawalsTab').then(m => ({ default: m.WithdrawalsTab })));
const ModerationQueueTab = lazy(() => import('@/components/admin/tabs/ModerationQueueTab').then(m => ({ default: m.ModerationQueueTab })));
const AuditTab = lazy(() => import('@/components/admin/tabs/AuditTab').then(m => ({ default: m.AuditTab })));
const MonitorTab = lazy(() => import('@/components/admin/tabs/MonitorTab').then(m => ({ default: m.MonitorTab })));
const VideosTab = lazy(() => import('@/components/admin/tabs/VideosTab').then(m => ({ default: m.VideosTab })));

function TabLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

type Tab = 'preview' | 'command' | 'app' | 'categories' | 'algorithm' | 'realtime' | 'users' | 'videos' | 'copyright' | 'reports' | 'moderation' | 'appeals' | 'settings' | 'wallets' | 'withdrawals' | 'ads' | 'admanager' | 'audit' | 'auditlogs' | 'ratelimits' | 'access' | 'monitor' | 'strikes';
type AdminState = 'checking' | 'bootstrap' | 'denied' | 'authed';

interface AdminProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export default function Admin() {
  const navigate = useNavigate();
  const [state, setState] = useState<AdminState>('checking');
  const [tab, setTab] = useState<Tab>('command');
  const [claimingAdmin, setClaimingAdmin] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [userRoles, setUserRoles] = useState<{ isAdmin: boolean; isModerator: boolean; isSupport: boolean }>({
    isAdmin: false,
    isModerator: false,
    isSupport: false,
  });
  const abortControllerRef = useRef<AbortController | null>(null);

  // ============================================================
  // SECURITY: Authorization is decided by the database only
  // ============================================================
  const checkAdmin = useCallback(() => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (signal.aborted) return;
        
        if (!user) { 
          setState('denied'); 
          return; 
        }

        // Check all roles via authoritative server-side RPCs
        const [adminCheck, moderatorCheck, supportCheck] = await Promise.all([
          supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'moderator' }),
          supabase.rpc('has_role', { _user_id: user.id, _role: 'support' }),
        ]);

        if (signal.aborted) return;

        const isAdmin = adminCheck.data === true;
        const isModerator = moderatorCheck.data === true;
        const isSupport = supportCheck.data === true;

        setUserRoles({ isAdmin, isModerator, isSupport });

        // Load admin profile
        if (isAdmin || isModerator || isSupport) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, display_name, avatar_url, email')
            .eq('id', user.id)
            .maybeSingle();
          
          if (signal.aborted) return;
          if (profile) {
            setAdminProfile(profile);
          }
        }

        if (signal.aborted) return;
        if (isAdmin) { setState('authed'); return; }
        if (isModerator) { setState('authed'); return; }

        // Bootstrap: only offered when the platform genuinely has no admin yet.
        try {
          const { data: boot } = await supabase.rpc('admin_bootstrap_status' as any);
          if (signal.aborted) return;
          
          if ((boot as any)?.is_admin) { setState('authed'); return; }
          if ((boot as any)?.can_claim_initial_admin) { setState('bootstrap'); return; }
        } catch (err) {
          console.error('[admin] bootstrap check failed:', err);
          // RPC unavailable — fall through to denied rather than granting access.
        }

        if (signal.aborted) return;
        setState('denied');
      } catch (err) {
        console.error('[admin] authorization check failed:', err);
        if (signal.aborted) return;
        setState('denied');
      }
    })();

    return () => { 
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => checkAdmin(), [checkAdmin]);
  
  // Boot the moderation worker as soon as admin lands
  useEffect(() => { 
    if (state === 'authed') {
      moderationQueue.init(); 
    }
  }, [state]);

  const claimInitialAdmin = async () => {
    setClaimingAdmin(true);
    try {
      const { data, error } = await supabase.rpc('claim_initial_admin' as any);
      if (error) { 
        toast.error(error.message || 'Could not claim admin role');
        console.error('[admin] claim error:', error);
        return; 
      }
      if ((data as any)?.ok === false) {
        toast.error((data as any)?.error || 'An administrator already exists');
        return;
      }
      toast.success('Admin role granted');
      setState('authed');
      checkAdmin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not claim admin role');
      console.error('[admin] claim exception:', err);
    } finally {
      setClaimingAdmin(false);
    }
  };


  if (state === 'checking') {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
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
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.96 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="glass-strong rounded-3xl border border-destructive/40 p-8 max-w-lg w-full text-center relative overflow-hidden shadow-2xl"
          style={{ boxShadow: '0 0 60px -10px hsl(var(--destructive) / 0.4), inset 0 0 30px hsl(var(--destructive) / 0.05)' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-primary/10 pointer-events-none" />
          <motion.div 
            animate={{ rotate: [0, -8, 8, -4, 4, 0] }} 
            transition={{ duration: 0.8, delay: 0.2 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/15 border border-destructive/40 mb-4 relative">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </motion.div>
          <h1 className="text-4xl font-display font-bold text-glow mb-1 tracking-tight">404 - Access Restricted</h1>
          <h2 className="text-lg font-semibold mb-2 text-foreground">PRO NAX Enterprise Console</h2>
          <p className="text-xs text-muted-foreground mb-6 max-w-sm mx-auto">
            This account does not hold the administrator or moderator role. Access to the enterprise
            console is granted by an existing administrator only.
          </p>

          <div className="flex flex-col gap-2.5 relative max-w-xs mx-auto">
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => navigate('/', { replace: true })}
                className="flex-1 glass border border-border/40 py-2 rounded-xl text-xs font-semibold hover:border-primary/40 transition text-muted-foreground hover:text-foreground flex items-center justify-center gap-2">
                <Home className="w-3.5 h-3.5" /> Back Home
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="flex-1 glass border border-border/40 py-2 rounded-xl text-xs font-semibold hover:border-primary/40 transition text-muted-foreground hover:text-foreground">
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
        <motion.div 
          initial={{ opacity: 0, y: 18, scale: 0.96 }} 
          animate={{ opacity: 1, y: 0, scale: 1 }}
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
            className="relative gradient-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 glow-primary hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
            {claimingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Activate Admin Access
          </button>
        </motion.div>
      </div>
    );
  }

  // ============================================================
  // ADMIN AUTHED STATE: Build nav items based on actual roles
  // ============================================================
  const allNavItems: AdminNavItem[] = [
    { id: 'command', label: 'Studio Dashboard', icon: LayoutDashboard, group: 'Studio Content & Analytics' },
    { id: 'videos', label: 'Content (Videos & Shorts)', icon: Video, group: 'Studio Content & Analytics' },
    { id: 'realtime', label: 'Realtime Traffic & Analytics', icon: Activity, group: 'Studio Content & Analytics' },
    { id: 'preview', label: 'Live App Preview', icon: Eye, group: 'Studio Content & Analytics' },

    { id: 'copyright', label: 'Copyright & Content ID', icon: ShieldAlertIcon, group: 'Rights & Moderation' },
    { id: 'reports', label: 'Community Reports', icon: Flag, group: 'Rights & Moderation' },
    { id: 'moderation', label: 'Moderation Queue', icon: Gavel, group: 'Rights & Moderation' },
    { id: 'appeals', label: 'Appeals Center', icon: ShieldCheckIcon, group: 'Rights & Moderation' },
    { id: 'strikes', label: 'Strike Management', icon: AlertTriangle, group: 'Rights & Moderation' },

    { id: 'wallets', label: 'Earn & Creator Wallets', icon: Wallet, group: 'Monetization & AdSense' },
    { id: 'withdrawals', label: 'Payout Requests', icon: Wallet, group: 'Monetization & AdSense' },
    { id: 'ads', label: 'Ad Network & RPM/CPM', icon: Megaphone, group: 'Monetization & AdSense' },
    { id: 'admanager', label: 'Ad Management (16:9)', icon: Megaphone, group: 'Monetization & AdSense' },

    { id: 'algorithm', label: 'Algorithm Tuning Engine', icon: Cpu, group: 'Studio Settings & Control' },
    { id: 'users', label: 'User Directory & Verification', icon: Users, group: 'Studio Settings & Control' },
    { id: 'categories', label: 'Categories & Tags', icon: TagIcon, group: 'Studio Settings & Control' },
    { id: 'app', label: 'App Controls', icon: SettingsIcon, group: 'Studio Settings & Control' },
    { id: 'settings', label: 'Automated Moderation Rules', icon: Sliders, group: 'Studio Settings & Control' },
    { id: 'access', label: 'Admin Access & Team', icon: KeyRound, group: 'System & Security' },
    { id: 'monitor', label: 'System Health Monitor', icon: Activity, group: 'System & Security' },
    { id: 'audit', label: 'Admin Action Log', icon: ScrollText, group: 'System & Security' },
    { id: 'auditlogs', label: 'Application Audit Trail', icon: ScrollText, group: 'System & Security' },
    { id: 'ratelimits', label: 'Rate Limits & IP Rules', icon: Gauge, group: 'System & Security' },
  ];

  // Filter nav items based on role
  const navItems = allNavItems.filter(item => {
    if (userRoles.isAdmin) return true; // Admins see everything
    if (userRoles.isModerator) {
      // Moderators can see: reports, moderation, appeals, strikes, users, videos, copyright, realtime, preview, command
      const moderatorAllowed = ['reports', 'moderation', 'appeals', 'strikes', 'users', 'videos', 'copyright', 'realtime', 'preview', 'command'];
      return moderatorAllowed.includes(item.id);
    }
    if (userRoles.isSupport) {
      // Support role has limited access
      const supportAllowed = ['reports', 'moderation', 'appeals', 'videos', 'copyright', 'realtime', 'preview', 'command'];
      return supportAllowed.includes(item.id);
    }
    return false; // Default deny
  });

  return (
    <AdminShell
      brand="Pro Nax Enterprise"
      tagline="Command Center"
      items={navItems}
      activeId={tab}
      onSelect={(id) => setTab(id as Tab)}
    >
      <Suspense fallback={<TabLoader />}>
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {tab === 'command' && <CommandCenterTab />}
          {tab === 'preview' && <LivePreviewTab />}
          {tab === 'app' && userRoles.isAdmin && <AppControlTab />}
          {tab === 'categories' && userRoles.isAdmin && <CategoriesTab />}
          {tab === 'algorithm' && userRoles.isAdmin && <AlgorithmTab />}
          {tab === 'realtime' && <RealtimeTab />}
          {tab === 'users' && <EngineBoundary name="user-management"><UserManagementTab /></EngineBoundary>}
          {tab === 'videos' && <VideosTab />}
          {tab === 'copyright' && <EngineBoundary name="copyright-hub"><CopyrightCenterTab /></EngineBoundary>}
          {tab === 'reports' && <EngineBoundary name="reports"><ReportsTab /></EngineBoundary>}
          {tab === 'moderation' && <EngineBoundary name="moderation-queue"><ModerationQueueTab /></EngineBoundary>}
          {tab === 'appeals' && <EngineBoundary name="appeals"><AppealsTab /></EngineBoundary>}
          {tab === 'strikes' && <StrikesTab />}
          {tab === 'settings' && userRoles.isAdmin && <EngineBoundary name="moderation-rules"><ModerationSettingsTab /></EngineBoundary>}
          {tab === 'wallets' && userRoles.isAdmin && <WalletsTab />}
          {tab === 'withdrawals' && userRoles.isAdmin && <WithdrawalsTab />}
          {tab === 'ads' && userRoles.isAdmin && <AdSettingsTab />}
          {tab === 'admanager' && userRoles.isAdmin && <EngineBoundary name="ad-management"><AdManagementTab /></EngineBoundary>}
          {tab === 'audit' && userRoles.isAdmin && <AuditTab />}
          {tab === 'auditlogs' && userRoles.isAdmin && <EngineBoundary name="audit-logs"><AuditLogsTab /></EngineBoundary>}
          {tab === 'ratelimits' && userRoles.isAdmin && <EngineBoundary name="rate-limits"><RateLimitTab /></EngineBoundary>}
          {tab === 'access' && userRoles.isAdmin && <EngineBoundary name="admin-access"><AdminAccessTab /></EngineBoundary>}
          {tab === 'monitor' && userRoles.isAdmin && <MonitorTab />}
        </motion.div>
      </Suspense>
    </AdminShell>
  );
}
