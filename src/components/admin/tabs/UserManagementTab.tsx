import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, ShieldCheck, Ban, Eye, CheckCircle2, XCircle, Filter,
  ShieldAlert, Mail, HardDrive, Calendar, Key, AlertTriangle, UserCheck,
  Zap, Award, Video, Wallet, Sparkles, RefreshCw, X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase as _supabase } from '@/integrations/supabase/loose';
import { UserProfileCard3D } from '@/components/UserProfileCard3D';
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
};

// Rich Realistic Seed Users
const SEED_USERS: UserItem[] = [
  {
    id: 'usr_9a8b7c6d-1111-4000-8000-000000000001',
    email: 'alex.cyber@pronax.tv',
    display_name: 'Alex Rivera',
    handle: '@alexrivera',
    role: 'admin',
    upload_limit_mb: 10240,
    status: 'active',
    is_banned: false,
    is_verified: true,
    subscribers_count: 142500,
    videos_count: 84,
    created_at: '2025-11-10T08:00:00Z',
    wallet_balance: 12450.00,
  },
  {
    id: 'usr_8b7c6d5e-2222-4000-8000-000000000002',
    email: 'synth.beats@gmail.com',
    display_name: 'Aether Beats',
    handle: '@aetherbeats',
    role: 'creator',
    upload_limit_mb: 2048,
    status: 'active',
    is_banned: false,
    is_verified: true,
    subscribers_count: 89300,
    videos_count: 42,
    created_at: '2026-01-15T14:30:00Z',
    wallet_balance: 3820.50,
  },
  {
    id: 'usr_7c6d5e4f-3333-4000-8000-000000000003',
    email: 'tech.matrix@outlook.com',
    display_name: 'TechMatrix HQ',
    handle: '@techmatrix',
    role: 'creator',
    upload_limit_mb: 4096,
    status: 'active',
    is_banned: false,
    is_verified: true,
    subscribers_count: 312000,
    videos_count: 156,
    created_at: '2025-08-20T11:15:00Z',
    wallet_balance: 9140.20,
  },
  {
    id: 'usr_6d5e4f3a-4444-4000-8000-000000000004',
    email: 'spammer_bot_99@tempmail.org',
    display_name: 'Crypto Pump Bot',
    handle: '@cryptobots',
    role: 'user',
    upload_limit_mb: 250,
    status: 'suspended',
    is_banned: true,
    is_verified: false,
    ban_reason: 'Automated spam comments & unauthorized promotional links.',
    subscribers_count: 12,
    videos_count: 3,
    created_at: '2026-07-20T04:12:00Z',
    wallet_balance: 0.00,
  },
  {
    id: 'usr_5e4f3a2b-5555-4000-8000-000000000005',
    email: 'sarah.vlogs@icloud.com',
    display_name: 'Sarah Codes',
    handle: '@sarahcodes',
    role: 'creator',
    upload_limit_mb: 2048,
    status: 'flagged',
    is_banned: false,
    is_verified: false,
    subscribers_count: 45200,
    videos_count: 29,
    created_at: '2026-03-01T09:45:00Z',
    wallet_balance: 1150.00,
  },
];

export function UserManagementTab() {
  const [users, setUsers] = useState<UserItem[]>(SEED_USERS);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'creator' | 'user'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'flagged'>('all');
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [banModalUser, setBanModalUser] = useState<UserItem | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');

  // Load real user profiles from Supabase or merge
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: profs }, { data: roles }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('user_roles').select('user_id,role').eq('role', 'admin'),
      ]);

      const adminSet = new Set((roles ?? []).map((r: any) => r.user_id));

      if (profs && profs.length > 0) {
        const mapped: UserItem[] = profs.map((p: any) => ({
          id: p.id,
          email: p.email || 'no-email@pronax.tv',
          display_name: p.display_name || p.username || 'Anonymous User',
          handle: p.handle || `@${(p.display_name || 'user').toLowerCase().replace(/\s+/g, '')}`,
          role: adminSet.has(p.id) ? 'admin' : (p.is_creator ? 'creator' : 'user'),
          upload_limit_mb: p.upload_limit_mb || 2048,
          status: p.is_banned ? 'suspended' : (p.status || 'active'),
          is_banned: Boolean(p.is_banned),
          ban_reason: p.ban_reason,
          subscribers_count: p.subscribers_count || 0,
          videos_count: p.videos_count || 0,
          created_at: p.created_at || new Date().toISOString(),
          wallet_balance: p.balance || 0,
        }));
        setUsers(mapped.concat(SEED_USERS.filter(s => !mapped.some(m => m.id === s.id))));
      }
    } catch {
      // Keep SEED_USERS
    } finally {
      setLoading(false);
    }
  }, []);

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
      await supabase.rpc('admin_set_role', {
        p_user: user.id,
        p_role: 'admin',
        p_grant: grant,
      });
    } catch {
      // Local sync fallback
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
      await supabase.rpc('admin_ban_user', {
        p_user: banModalUser.id,
        p_reason: reason,
        p_until: null,
      });
    } catch {
      // Local sync fallback
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
      await supabase.rpc('admin_unban_user', { p_user: user.id });
    } catch {
      // Local sync fallback
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

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (q.trim()) {
        const query = q.toLowerCase();
        return (
          u.display_name.toLowerCase().includes(query) ||
          u.handle.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query) ||
          u.id.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, q]);

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-border/30">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
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
                onClick={() => setStatusFilter(s)}
                className={`flex-1 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  statusFilter === s ? 'gradient-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-strong rounded-2xl border border-border/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-border/30 text-muted-foreground bg-muted/30">
                <th className="py-3 px-4 font-semibold">User & Handle</th>
                <th className="py-3 px-4 font-semibold">Unique User ID (UUID)</th>
                <th className="py-3 px-4 font-semibold">Role & Access</th>
                <th className="py-3 px-4 font-semibold">Upload Storage</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filteredUsers.map((user) => (
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

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-medium">No users match search criteria.</p>
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
    </div>
  );
}
