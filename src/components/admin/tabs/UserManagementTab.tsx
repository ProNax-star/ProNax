/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, ShieldCheck, Ban, Eye, CheckCircle2, XCircle, Filter,
  ShieldAlert, Mail, HardDrive, Calendar, Key, AlertTriangle, UserCheck,
  Zap, Award, Video, Wallet, Sparkles, RefreshCw, X, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { UserProfileCard3D } from '@/components/UserProfileCard3D';
import { offsetPage, debounce, buildSearchFilter } from '@/lib/paginate';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase: any = _supabase;

export type UserItem = {
  id: string; // Unique UUID
  email: string;
  display_name: string;
  handle: string;
  avatar_url?: string;
  role: 'admin' | 'creator' | 'user';
  upload_limit_mb: number;
  status: 'active' | 'suspended' | 'flagged';
  is_banned: boolean;
  is_verified?: boolean;
  ban_reason?: string;
  subscribers_count: number;
  videos_count: number;
  created_at: string;
  wallet_balance?: number;
  active_strikes?: number;
};

export function UserManagementTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'creator' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'flagged'>('all');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [banModalUser, setBanModalUser] = useState<UserItem | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [strikeDrawerUser, setStrikeDrawerUser] = useState<UserItem | null>(null);
  const [userStrikes, setUserStrikes] = useState<any[]>([]);
  const [loadingStrikes, setLoadingStrikes] = useState(false);
  const [issueStrikeForm, setIssueStrikeForm] = useState({
    reason: '',
    category: 'other' as 'copyright' | 'spam' | 'harassment' | 'harmful' | 'other',
    severity: 1 as 1 | 2 | 3,
    video_id: ''
  });

  // Load real user profiles from Supabase with server-side pagination
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Build server-side search filter
      let query = supabase
        .from('profiles')
        .select('id,email,display_name,handle,upload_limit_mb,status,is_banned,is_verified,ban_reason,subscribers_count,videos_count,created_at,balance,is_creator', { count: 'exact' });
      
      // Apply server-side search
      if (q.trim()) {
        const searchFilter = buildSearchFilter(q, ['display_name', 'handle', 'email', 'id']);
        if (searchFilter) {
          query = query.or(searchFilter);
        }
      }
      
      // Apply server-side filters
      if (roleFilter !== 'all') {
        if (roleFilter === 'admin') {
          // Admin filter handled separately via user_roles join
        } else if (roleFilter === 'creator') {
          query = query.eq('is_creator', true);
        }
      }
      
      if (statusFilter !== 'all') {
        if (statusFilter === 'suspended') {
          query = query.eq('is_banned', true);
        } else {
          query = query.eq('status', statusFilter).eq('is_banned', false);
        }
      }
      
      // Apply pagination
      query = offsetPage(query, page, pageSize);
      
      const [{ data: profs, count: totalCount }, { data: roles }] = await Promise.all([
        query,
        supabase.from('user_roles').select('user_id,role').eq('role', 'admin'),
      ]);

      const adminSet = new Set((roles ?? []).map((r: any) => r.user_id));
      setTotal(totalCount || 0);

      if (profs) {
        const mapped: UserItem[] = profs
          .filter((p: any) => {
            // Client-side filter for admin role (since it's in a different table)
            if (roleFilter === 'admin' && !adminSet.has(p.id)) return false;
            if (roleFilter === 'user' && (adminSet.has(p.id) || p.is_creator)) return false;
            return true;
          })
          .map((p: any) => ({
            id: p.id,
            email: p.email || 'no-email@pronax.tv',
            display_name: p.display_name || p.username || 'Anonymous User',
            handle: p.handle || `@${(p.display_name || 'user').toLowerCase().replace(/\s+/g, '')}`,
            role: adminSet.has(p.id) ? 'admin' : (p.is_creator ? 'creator' : 'user'),
            upload_limit_mb: p.upload_limit_mb || 2048,
            status: p.is_banned ? 'suspended' : (p.status || 'active'),
            is_banned: Boolean(p.is_banned),
            is_verified: Boolean(p.is_verified),
            ban_reason: p.ban_reason,
            subscribers_count: p.subscribers_count || 0,
            videos_count: p.videos_count || 0,
            created_at: p.created_at || new Date().toISOString(),
            wallet_balance: p.balance || 0,
            active_strikes: 0, // Will be fetched separately
          }));
        
        // Fetch active strike counts for all users
        const userIds = mapped.map(u => u.id);
        if (userIds.length > 0) {
          const { data: strikeCounts } = await supabase.rpc('active_strike_count', { _user_id: userIds[0] });
          // Since the RPC only takes one user_id, we need to call it for each user
          // For performance, we'll do this in batches
          const strikePromises = mapped.map(async (user) => {
            const { data: count } = await supabase.rpc('active_strike_count', { _user_id: user.id });
            return { userId: user.id, count: count || 0 };
          });
          const strikeResults = await Promise.all(strikePromises);
          const strikeMap = new Map(strikeResults.map(r => [r.userId, r.count]));
          
          mapped.forEach(user => {
            user.active_strikes = strikeMap.get(user.id) || 0;
          });
        }
        
        setUsers(mapped);
      }
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, roleFilter, statusFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Actions
  const handleToggleAdmin = async (user: UserItem) => {
    const grant = user.role !== 'admin';
    const newRole = grant ? 'admin' : 'user';

    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    if (selectedUser?.id === user.id) {
      setSelectedUser(prev => prev ? { ...prev, role: newRole } : null);
    }

    try {
      const { error } = await supabase.rpc('admin_set_role', {
        p_user: user.id,
        p_role: 'admin',
        p_grant: grant,
      });
      if (error) throw error;
    } catch {
      toast.error('Role change failed');
      void loadUsers();
      return;
    }

    toast.success(grant ? `🛡️ Admin privileges granted to ${user.handle}` : `Revoked admin role from ${user.handle}`);
  };

  const handleBanUser = async () => {
    if (!banModalUser) return;
    const reason = banReasonInput.trim() || 'Violation of community terms & safety standards';

    setUsers(prev => prev.map(u => u.id === banModalUser.id ? {
      ...u,
      is_banned: true,
      status: 'suspended',
      ban_reason: reason,
    } : u));

    try {
      const { error } = await supabase.rpc('admin_ban_user', {
        p_user: banModalUser.id,
        p_reason: reason,
        p_until: null,
      });
      if (error) throw error;
    } catch {
      toast.error('Ban failed');
      void loadUsers();
      setBanModalUser(null);
      return;
    }

    toast.error(`🚫 User ${banModalUser.handle} has been suspended.`);
    setBanModalUser(null);
    setBanReasonInput('');
  };

  const handleUnbanUser = async (user: UserItem) => {
    setUsers(prev => prev.map(u => u.id === user.id ? {
      ...u,
      is_banned: false,
      status: 'active',
      ban_reason: undefined,
    } : u));

    try {
      const { error } = await supabase.rpc('admin_unban_user', { p_user: user.id });
      if (error) throw error;
    } catch {
      toast.error('Unban failed');
      void loadUsers();
      return;
    }

    toast.success(`✅ User ${user.handle} restored & unsuspended.`);
  };

  const handleUpdateStorage = async (userId: string, newMb: number) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, upload_limit_mb: newMb } : u));
    try {
      await supabase.from('profiles').update({ upload_limit_mb: newMb }).eq('id', userId);
    } catch {
      // Graceful
    }
    toast.success(`Updated upload limit to ${newMb} MB`);
  };

  const handleToggleVerification = async (user: UserItem) => {
    const nextVer = !user.is_verified;
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_verified: nextVer } : u));
    if (selectedUser?.id === user.id) {
      setSelectedUser(prev => prev ? { ...prev, is_verified: nextVer } : null);
    }
    try {
      await supabase.from('profiles').update({ is_verified: nextVer }).eq('id', user.id);
    } catch {
      // Graceful
    }
    toast.success(nextVer ? `Verified badge granted to ${user.handle}` : `Verification removed from ${user.handle}`);
  };

  // Load user strikes
  const loadUserStrikes = async (userId: string) => {
    setLoadingStrikes(true);
    try {
      const { data, error } = await supabase
        .from('user_strikes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUserStrikes(data || []);
    } catch (error: any) {
      toast.error(error.message);
      setUserStrikes([]);
    } finally {
      setLoadingStrikes(false);
    }
  };

  // Issue a strike
  const handleIssueStrike = async () => {
    if (!strikeDrawerUser) return;
    
    const { error } = await supabase.rpc('admin_issue_strike', {
      p_user: strikeDrawerUser.id,
      p_reason: issueStrikeForm.reason,
      p_category: issueStrikeForm.category,
      p_severity: issueStrikeForm.severity,
      p_video_id: issueStrikeForm.video_id || null,
      p_source: 'manual'
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Strike issued successfully');
    setIssueStrikeForm({ reason: '', category: 'other', severity: 1, video_id: '' });
    loadUserStrikes(strikeDrawerUser.id);
    loadUsers(); // Refresh to update strike counts and ban status
  };

  // Revoke a strike
  const handleRevokeStrike = async (strikeId: string) => {
    const reason = prompt('Reason for revoking this strike:');
    if (!reason) return;

    const { error } = await supabase.rpc('admin_revoke_strike', {
      p_strike_id: strikeId,
      p_reason: reason
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Strike revoked successfully');
    if (strikeDrawerUser) {
      loadUserStrikes(strikeDrawerUser.id);
    }
    loadUsers(); // Refresh to update strike counts and ban status
  };

  // Debounced search handler
  const debouncedSearch = useMemo(
    () => debounce((value: string) => {
      setQ(value);
      setPage(0); // Reset to first page on search
    }, 300),
    []
  );
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Search */}
      <div className="glass-strong rounded-2xl border border-primary/30 p-6 relative overflow-hidden bg-gradient-to-r from-background via-primary/5 to-accent/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> User Directory & RBAC Security Hub
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Manage accounts, enforce suspensions, inspect unique UUIDs, and configure creator upload limits.
            </p>
          </div>
          <button
            onClick={loadUsers}
            className="glass border border-border/40 hover:border-primary/50 text-foreground px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh List
          </button>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-border/30">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              defaultValue={q}
              onChange={handleSearchChange}
              placeholder="Search name, @handle, email, UUID..."
              className="w-full bg-background/50 border border-border/40 rounded-xl pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border/40">
            {(['all', 'admin', 'creator', 'user'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  roleFilter === r ? 'gradient-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border/40">
            {(['all', 'active', 'suspended', 'flagged'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(0); }}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  statusFilter === s ? 'gradient-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-border/40">
            {[25, 50, 100].map(size => (
              <button
                key={size}
                onClick={() => { setPageSize(size); setPage(0); }}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold transition ${
                  pageSize === size ? 'gradient-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-strong rounded-2xl border border-border/40 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-muted/30">
          <span className="text-xs text-muted-foreground">
            Showing {Math.min(page * pageSize + 1, total)}-{Math.min((page + 1) * pageSize, total)} of {total} users
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium">Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={(page + 1) * pageSize >= total}
              className="p-1 rounded hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground bg-muted/30">
                <th className="py-3 px-4 font-semibold">User & Handle</th>
                <th className="py-3 px-4 font-semibold">Unique User ID (UUID)</th>
                <th className="py-3 px-4 font-semibold">Role & Access</th>
                <th className="py-3 px-4 font-semibold">Upload Storage</th>
                <th className="py-3 px-4 font-semibold">Strikes</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center font-bold text-primary-foreground text-xs shrink-0 shadow relative">
                        {user.display_name[0]?.toUpperCase()}
                        {user.is_verified && (
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-sky-500 rounded-full flex items-center justify-center border border-background" title="Verified Creator Channel">
                            <CheckCircle2 className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <span>{user.display_name}</span>
                          {user.is_verified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          )}
                          <span className="text-primary font-medium">{user.handle}</span>
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                    <span className="bg-muted/40 px-2 py-1 rounded border border-border/30 select-all">
                      {user.id}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        user.role === 'admin'
                          ? 'bg-primary/20 text-primary border border-primary/30'
                          : user.role === 'creator'
                          ? 'bg-accent/20 text-accent border border-accent/30'
                          : 'bg-muted/50 text-muted-foreground'
                      }`}
                    >
                      {user.role === 'admin' && <ShieldCheck className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        defaultValue={user.upload_limit_mb}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v) && v !== user.upload_limit_mb) handleUpdateStorage(user.id, v);
                        }}
                        className="w-16 bg-background/60 border border-border/40 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary/50"
                      />
                      <span className="text-muted-foreground text-[10px]">MB</span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <button
                      onClick={() => {
                        setStrikeDrawerUser(user);
                        loadUserStrikes(user.id);
                      }}
                      className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                        (user.active_strikes || 0) === 0
                          ? 'glass border-border/40 text-muted-foreground hover:text-foreground'
                          : (user.active_strikes || 0) >= 3
                          ? 'bg-destructive/20 border-destructive/40 text-destructive hover:bg-destructive/30'
                          : (user.active_strikes || 0) === 2
                          ? 'bg-orange-500/20 border-orange-500/40 text-orange-400 hover:bg-orange-500/30'
                          : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                      {user.active_strikes || 0} Strike{(user.active_strikes || 0) !== 1 ? 's' : ''}
                    </button>
                  </td>

                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        user.is_banned
                          ? 'bg-destructive/20 text-destructive border border-destructive/30'
                          : user.status === 'flagged'
                          ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {user.is_banned ? 'Suspended' : user.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleToggleVerification(user)}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition flex items-center gap-1 ${
                          user.is_verified
                            ? 'bg-sky-500/20 border-sky-500/40 text-sky-400 hover:bg-sky-500/30'
                            : 'glass border-border/40 text-muted-foreground hover:text-foreground'
                        }`}
                        title="Toggle Official Channel Verification Badge"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{user.is_verified ? 'Verified' : 'Verify'}</span>
                      </button>

                      <button
                        onClick={() => handleToggleAdmin(user)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${
                          user.role === 'admin'
                            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                            : 'glass border-border/40 text-foreground hover:border-primary/50'
                        }`}
                      >
                        {user.role === 'admin' ? 'Revoke Admin' : 'Make Admin'}
                      </button>

                      {user.is_banned ? (
                        <button
                          onClick={() => handleUnbanUser(user)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30 transition text-[11px] font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => setBanModalUser(user)}
                          className="px-2.5 py-1 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive hover:bg-destructive/30 transition text-[11px] font-semibold flex items-center gap-1"
                        >
                          <Ban className="w-3 h-3" /> Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-medium">No users found.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Inspection Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-md w-full relative"
            >
              <div className="absolute top-2 right-2 z-30">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 rounded-full bg-slate-900/80 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <UserProfileCard3D
                user={selectedUser}
                onActionClick={(action) => {
                  if (action === 'ban' || action === 'unban') {
                    setBanModalUser(selectedUser);
                  } else if (action === 'verify') {
                    handleToggleVerification(selectedUser);
                  }
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Suspend Confirmation Modal */}
      <AnimatePresence>
        {banModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-3xl border border-destructive/40 max-w-md w-full p-6 space-y-4 shadow-2xl relative"
            >
              <div className="flex items-center gap-3 text-destructive">
                <div className="w-10 h-10 rounded-xl bg-destructive/20 border border-destructive/40 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Suspend Account Access</h3>
                  <p className="text-xs text-muted-foreground">{banModalUser.display_name} ({banModalUser.handle})</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Suspending this user will revoke their login access, hide their videos from the public home feed, and block further content uploads.
              </p>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Reason for Suspension (Shown to User)</label>
                <textarea
                  value={banReasonInput}
                  onChange={e => setBanReasonInput(e.target.value)}
                  placeholder="e.g. Copyright infringement, spam comments, policy violation..."
                  className="w-full bg-background/60 border border-border/40 rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-destructive/50 h-24 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setBanModalUser(null)}
                  className="px-4 py-2 rounded-xl glass text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBanUser}
                  className="px-4 py-2 rounded-xl bg-destructive text-white font-semibold text-xs shadow-lg hover:bg-destructive/90 transition"
                >
                  Confirm Suspension
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Strike History Drawer */}
      <AnimatePresence>
        {strikeDrawerUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong rounded-3xl border border-border/40 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl relative"
            >
              <div className="p-6 border-b border-border/30 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">Strike History</h3>
                  <p className="text-xs text-muted-foreground">{strikeDrawerUser.display_name} ({strikeDrawerUser.handle})</p>
                </div>
                <button
                  onClick={() => setStrikeDrawerUser(null)}
                  className="w-8 h-8 rounded-full bg-slate-900/80 border border-white/20 flex items-center justify-center text-slate-300 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {/* Issue Strike Form */}
                <div className="glass rounded-xl border border-border/40 p-4 space-y-3">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-400" />
                    Issue New Strike
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground">Category</label>
                      <select
                        value={issueStrikeForm.category}
                        onChange={(e) => setIssueStrikeForm({ ...issueStrikeForm, category: e.target.value as any })}
                        className="w-full bg-background/60 border border-border/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                      >
                        <option value="copyright">Copyright</option>
                        <option value="spam">Spam</option>
                        <option value="harassment">Harassment</option>
                        <option value="harmful">Harmful Content</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="text-[11px] font-semibold text-muted-foreground">Severity</label>
                      <select
                        value={issueStrikeForm.severity}
                        onChange={(e) => setIssueStrikeForm({ ...issueStrikeForm, severity: parseInt(e.target.value) as any })}
                        className="w-full bg-background/60 border border-border/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                      >
                        <option value={1}>Level 1 (Warning)</option>
                        <option value={2}>Level 2 (Severe)</option>
                        <option value={3}>Level 3 (Critical)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Reason</label>
                    <textarea
                      value={issueStrikeForm.reason}
                      onChange={(e) => setIssueStrikeForm({ ...issueStrikeForm, reason: e.target.value })}
                      placeholder="Describe the violation..."
                      className="w-full bg-background/60 border border-border/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/50 h-20 resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Video ID (Optional)</label>
                    <input
                      type="text"
                      value={issueStrikeForm.video_id}
                      onChange={(e) => setIssueStrikeForm({ ...issueStrikeForm, video_id: e.target.value })}
                      placeholder="Related video UUID..."
                      className="w-full bg-background/60 border border-border/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary/50"
                    />
                  </div>

                  <button
                    onClick={handleIssueStrike}
                    disabled={!issueStrikeForm.reason.trim()}
                    className="w-full bg-orange-500/20 text-orange-400 border border-orange-500/30 hover:bg-orange-500/30 px-4 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Issue Strike
                  </button>
                </div>

                {/* Strike History */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Previous Strikes</h4>
                  {loadingStrikes ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : userStrikes.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground text-xs">
                      No strikes on record
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {userStrikes.map((strike) => (
                        <div key={strike.id} className={`glass rounded-lg border p-3 ${strike.revoked_at ? 'opacity-60' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                                  strike.severity === 3 ? 'bg-destructive/20 text-destructive' :
                                  strike.severity === 2 ? 'bg-orange-500/20 text-orange-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  Level {strike.severity}
                                </span>
                                <span className="text-[10px] text-muted-foreground capitalize">{strike.category}</span>
                                {strike.revoked_at && (
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">Revoked</span>
                                )}
                              </div>
                              <p className="text-xs text-foreground">{strike.reason}</p>
                              <div className="text-[10px] text-muted-foreground mt-1">
                                {new Date(strike.created_at).toLocaleString()}
                                {strike.expires_at && !strike.revoked_at && (
                                  <span> · Expires: {new Date(strike.expires_at).toLocaleDateString()}</span>
                                )}
                              </div>
                              {strike.revoked_reason && (
                                <p className="text-[10px] text-emerald-400 mt-1">Revoked: {strike.revoked_reason}</p>
                              )}
                            </div>
                            {!strike.revoked_at && (
                              <button
                                onClick={() => handleRevokeStrike(strike.id)}
                                className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
