import { useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  LayoutDashboard,
  PlaySquare,
  BarChart2,
  MessageSquare,
  DollarSign,
  Palette,
  Settings,
  Music,
  Menu,
  X,
  HelpCircle,
  Bell,
  Plus,
  ExternalLink,
  ChevronDown,
  Play,
  ShieldAlert,
  Video,
  Radio,
  FileText,
  User,
  CheckCircle2,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Layers,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { StudioProfile } from '@/hooks/useStudioData';

export interface StudioNavItem {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  badge?: string | number;
  end?: boolean;
}

export interface ChannelSwitchItem {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  verified: boolean;
  subs: string;
}

export interface StudioShellProps {
  children: ReactNode;
  profile?: StudioProfile | null;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  unreadNotices?: number;
  onNoticesClick?: () => void;
  copyrightClaimsCount?: number;
  followersCount?: number;
  totalViews?: number;
  estimatedRevenue?: string;
  onOpenUploadModal?: () => void;
}

const DEFAULT_NAV_ITEMS: StudioNavItem[] = [
  { id: 'dashboard', to: '/studio', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { id: 'content', to: '/studio/content', label: 'Content', icon: PlaySquare },
  { id: 'analytics', to: '/studio/analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'comments', to: '/studio/comments', label: 'Comments', icon: MessageSquare },
  { id: 'monetization', to: '/studio/monetization', label: 'Monetization', icon: DollarSign },
  { id: 'customization', to: '/studio/customization', label: 'Customization', icon: Palette },
  { id: 'audio', to: '/studio/audio', label: 'Audio Library', icon: Music },
  { id: 'settings', to: '/settings', label: 'Settings', icon: Settings },
];

const CHANNELS_SAMPLE: ChannelSwitchItem[] = [
  {
    id: 'ch_1',
    name: 'ProNax Main Studio',
    handle: '@pronax_official',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
    verified: true,
    subs: '1.24M',
  },
  {
    id: 'ch_2',
    name: 'ProNax Gaming HD',
    handle: '@pronax_gaming',
    avatar: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=120&auto=format&fit=crop&q=80',
    verified: true,
    subs: '450K',
  },
  {
    id: 'ch_3',
    name: 'ProNax Tech & AI Shorts',
    handle: '@pronax_tech',
    avatar: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=120&auto=format&fit=crop&q=80',
    verified: false,
    subs: '98.5K',
  },
];

export function StudioShell({
  children,
  profile,
  activeTab,
  onTabChange,
  unreadNotices = 0,
  onNoticesClick,
  copyrightClaimsCount = 0,
  followersCount,
  totalViews,
  estimatedRevenue = '$4,280.50',
  onOpenUploadModal,
}: StudioShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeChannel, setActiveChannel] = useState<ChannelSwitchItem>(CHANNELS_SAMPLE[0]);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [alertDismissed, setAlertDismissed] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const channelHandle = profile?.username || activeChannel.handle;
  const channelName = profile?.display_name || activeChannel.name;
  const avatarUrl = profile?.avatar_url || activeChannel.avatar;
  const initials = channelName.slice(0, 2).toUpperCase();

  const formattedSubs = followersCount ? followersCount.toLocaleString() : activeChannel.subs;
  const formattedViews = totalViews ? totalViews.toLocaleString() : '1,420,800';

  const handleCreateAction = (action: string) => {
    switch (action) {
      case 'upload':
        if (onOpenUploadModal) {
          onOpenUploadModal();
        } else {
          navigate('/upload');
        }
        toast.success('Opening Video Upload Studio...');
        break;
      case 'short':
        navigate('/upload?type=short');
        toast.success('Short Creator Studio initialized!');
        break;
      case 'stream':
        toast.info('Live Stream Scheduler: Cluster ready for 4K streaming.');
        break;
      case 'post':
        toast.info('Community Post composer ready.');
        break;
      default:
        break;
    }
  };

  const handleSwitchChannel = (ch: ChannelSwitchItem) => {
    setActiveChannel(ch);
    toast.success(`Switched studio context to "${ch.name}"`, {
      description: `Handle: ${ch.handle} • Subscribers: ${ch.subs}`,
    });
  };

  return (
    <div className="min-h-screen bg-[#06080c] text-zinc-100 font-sans flex flex-col selection:bg-cyan-500 selection:text-white relative overflow-x-hidden">
      {/* 3D Glowing Top Ambient Accents */}
      <div className="fixed top-0 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="fixed top-1/3 right-10 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* Top Glassmorphic Creator Header Bar */}
      <header className="sticky top-0 z-40 h-16 bg-[#0b0e14]/90 backdrop-blur-2xl border-b border-white/10 px-4 lg:px-6 flex items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition"
            aria-label="Toggle mobile menu"
          >
            {mobileOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden md:flex p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition cursor-pointer group"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
            ) : (
              <PanelLeftClose className="w-4 h-4 text-zinc-400 group-hover:text-white transition-colors" />
            )}
          </button>

          {/* Logo & Studio Title */}
          <Link to="/studio" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-500 to-purple-500 p-[1px] shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-all">
              <div className="w-full h-full bg-[#0b0e14] rounded-[11px] flex items-center justify-center">
                <Play className="w-4 h-4 text-cyan-400 fill-cyan-400 ml-0.5 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white font-display">
                  PRO CREATOR STUDIO
                </span>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Pro Nax Video & Stream Engine</p>
            </div>
          </Link>
        </div>

        {/* Dynamic Channel Stats Pill (Subs, Views, Monthly Revenue) */}
        <div className="hidden xl:flex items-center gap-4 bg-[#111622]/90 border border-white/10 px-4 py-1.5 rounded-2xl shadow-inner backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs text-zinc-400">Live Subs:</span>
            <span className="text-xs font-mono font-extrabold text-white">{formattedSubs}</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">30d Views:</span>
            <span className="text-xs font-mono font-extrabold text-cyan-400">{formattedViews}</span>
          </div>
          <div className="h-3 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">Est. Revenue:</span>
            <span className="text-xs font-mono font-extrabold text-emerald-400">{estimatedRevenue}</span>
          </div>
        </div>

        {/* Right Action Controls & Multi-Channel Switcher */}
        <div className="flex items-center gap-3">
          {/* Channel Switcher & Verified Badge Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 transition cursor-pointer">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span className="max-w-[130px] truncate">{activeChannel.name}</span>
                {activeChannel.verified && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                )}
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-[#0e121b] border-white/15 text-zinc-200 p-2 space-y-1 shadow-2xl backdrop-blur-2xl">
              <div className="px-2 py-1.5 text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Switch Studio Channel
              </div>
              {CHANNELS_SAMPLE.map((ch) => (
                <DropdownMenuItem
                  key={ch.id}
                  onClick={() => handleSwitchChannel(ch)}
                  className={`cursor-pointer p-2 rounded-xl flex items-center justify-between text-xs transition ${
                    activeChannel.id === ch.id ? 'bg-cyan-500/15 text-white font-bold border border-cyan-500/30' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img src={ch.avatar} alt="" className="w-7 h-7 rounded-lg object-cover border border-white/10" />
                    <div className="min-w-0">
                      <p className="text-xs truncate flex items-center gap-1">
                        <span>{ch.name}</span>
                        {ch.verified && <CheckCircle2 className="w-3 h-3 text-cyan-400 inline" />}
                      </p>
                      <p className="text-[10px] text-zinc-400 font-mono">{ch.handle}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">{ch.subs}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={() => toast.info('Link additional Pro Nax creator accounts')}
                className="cursor-pointer p-2 text-xs text-cyan-400 hover:bg-white/5 flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Channel Account</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick "CREATE" Action Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-9 px-4 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-extrabold inline-flex items-center gap-2 shadow-lg shadow-cyan-600/25 transition cursor-pointer active:scale-95">
                <Plus className="w-4 h-4 stroke-[3]" />
                <span className="hidden sm:inline">CREATE</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-[#0e121b] border-white/15 text-zinc-200 p-2 shadow-2xl backdrop-blur-2xl space-y-1">
              <DropdownMenuItem
                onClick={() => handleCreateAction('upload')}
                className="cursor-pointer flex items-center gap-2.5 text-xs py-2 px-3 rounded-lg hover:bg-white/10 transition"
              >
                <Video className="w-4 h-4 text-cyan-400" />
                <span>Upload Video</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCreateAction('short')}
                className="cursor-pointer flex items-center gap-2.5 text-xs py-2 px-3 rounded-lg hover:bg-white/10 transition"
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Create Short</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCreateAction('stream')}
                className="cursor-pointer flex items-center gap-2.5 text-xs py-2 px-3 rounded-lg hover:bg-white/10 transition"
              >
                <Radio className="w-4 h-4 text-blue-400" />
                <span>Schedule Live Stream</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleCreateAction('post')}
                className="cursor-pointer flex items-center gap-2.5 text-xs py-2 px-3 rounded-lg hover:bg-white/10 transition"
              >
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Write Community Post</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications Bell */}
          <button
            onClick={onNoticesClick}
            className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotices > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-cyan-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse shadow-[0_0_8px_#06b6d4]">
                {unreadNotices > 9 ? '9+' : unreadNotices}
              </span>
            )}
          </button>

          {/* Help Button */}
          <button
            onClick={() => toast.info('Creator Support Center: 24/7 Priority Channel Assistance Active.')}
            className="hidden sm:flex p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 transition cursor-pointer"
            aria-label="Help & Creator Support"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Creator Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 pl-2 rounded-xl hover:bg-white/5 transition border border-white/10 cursor-pointer">
                <Avatar className="w-7 h-7 border border-white/15">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="bg-cyan-600 text-white text-xs font-bold">{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="w-3.5 h-3.5 text-zinc-400 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60 bg-[#0e121b] border-white/15 text-zinc-200 p-2 shadow-2xl backdrop-blur-2xl space-y-2">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{channelName}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                </p>
                <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{channelHandle}</p>
              </div>
              <div className="space-y-1 text-xs">
                <DropdownMenuItem asChild>
                  <Link to={`/channel/${channelHandle}`} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    <span>View Public Channel</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10">
                    <Settings className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Account Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem asChild>
                  <Link to="/" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-400">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Back to Pro Nax Main App</span>
                  </Link>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* System Alerts & Copyright Warning Banner */}
      {(copyrightClaimsCount > 0 || unreadNotices > 0) && !alertDismissed && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-amber-950/90 via-cyan-950/80 to-zinc-950 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-4 relative z-30 text-xs shadow-lg"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-amber-200">System Alert: </span>
              <span className="text-zinc-300">
                {copyrightClaimsCount > 0
                  ? `Attention required: ${copyrightClaimsCount} active Content ID claim(s) flagged on your uploads.`
                  : `You have ${unreadNotices} unread channel notice(s) regarding policies and monetization.`}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onNoticesClick}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition cursor-pointer"
            >
              Review Details
            </button>
            <button
              onClick={() => setAlertDismissed(true)}
              className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Main Body with Animated Collapsible Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Animated Collapsible Navigation Sidebar */}
        <motion.aside
          animate={{
            width: collapsed ? 80 : 250,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className={`fixed md:sticky top-[64px] z-30 h-[calc(100vh-64px)] bg-[#0b0e14]/95 backdrop-blur-2xl border-r border-white/10 flex flex-col shrink-0 transition-transform duration-300 md:translate-x-0 ${
            mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full'
          }`}
        >
          <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1.5 custom-scrollbar">
            {DEFAULT_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isRouteActive = item.end
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);
              const isActive = activeTab ? activeTab === item.id : isRouteActive;

              return (
                <div key={item.id} className="relative group/tooltip">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => {
                      if (onTabChange) onTabChange(item.id);
                      setMobileOpen(false);
                    }}
                    onMouseEnter={() => setActiveTooltip(item.id)}
                    onMouseLeave={() => setActiveTooltip(null)}
                    className={`w-full flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-semibold transition relative group cursor-pointer ${
                      isActive
                        ? 'text-white bg-gradient-to-r from-cyan-600/20 via-blue-600/10 to-transparent border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                        : 'text-zinc-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {/* Glowing 3D Active State Indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="studioActiveBar"
                        className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r-full bg-cyan-500 shadow-[0_0_12px_#06b6d4]"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}

                    <Icon
                      className={`w-4 h-4 shrink-0 transition-all duration-200 ${
                        isActive
                          ? 'text-cyan-400 scale-110 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                          : 'text-zinc-400 group-hover:text-zinc-100 group-hover:scale-105'
                      }`}
                    />

                    {!collapsed && <span className="truncate">{item.label}</span>}

                    {item.badge && !collapsed && (
                      <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>

                  {/* Tooltip on Collapsed Sidebar Hover */}
                  {collapsed && activeTooltip === item.id && (
                    <div className="fixed left-20 z-50 px-3 py-1.5 rounded-xl bg-[#101522] border border-cyan-500/40 text-white text-xs font-bold shadow-2xl pointer-events-none flex items-center gap-2 whitespace-nowrap backdrop-blur-xl">
                      <span>{item.label}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sidebar Footer Partner Status Card */}
          {!collapsed && (
            <div className="p-3 border-t border-white/10 bg-[#07090e]/60">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-cyan-600/20">
                  PN
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-white truncate">Partner Program</div>
                  <div className="text-[10px] text-emerald-400 font-mono truncate flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Monetization Active
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.aside>

        {/* Content Workspace Render Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-[#06080c] custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="max-w-[1600px] mx-auto space-y-6"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
