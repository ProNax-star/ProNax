import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  RefreshCw,
  Crown,
  Sparkles,
  Check,
  Loader2,
  X,
  ChevronRight,
  ShieldCheck,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney, DEFAULT_CURRENCY } from '@/lib/money';

const PREMIUM_PRICE = 4.99;

export interface AdBlockPopupProps {
  visible: boolean;
  onDismiss?: () => void;
  onRecheck: () => Promise<boolean>;
  onActivatePremium?: () => void;
}

export interface PremiumPerk {
  title: string;
  badge: string;
  badgeColor: string;
}

const PREMIUM_PERKS: PremiumPerk[] = [
  {
    title: 'Ad-free uninterrupted 4K Ultra HD & HDR video streaming',
    badge: '4K HDR',
    badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
  {
    title: 'Background audio playback & offline video downloads',
    badge: 'OFFLINE',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  },
  {
    title: 'Directly support creators (55% revenue share pool payout)',
    badge: '55% REV',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  },
  {
    title: 'Zero buffering latency & priority server bandwidth',
    badge: 'ULTRA SPEED',
    badgeColor: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  },
];

export function AdBlockPopup({
  visible,
  onDismiss,
  onRecheck,
  onActivatePremium,
}: AdBlockPopupProps) {
  const [activeTab, setActiveTab] = useState<'premium' | 'whitelist'>('premium');
  const [checking, setChecking] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Diagnostic engine state
  const [probeResults, setProbeResults] = useState<{
    baitHidden: boolean;
    networkBlocked: boolean;
    scriptMissing: boolean;
  }>({
    baitHidden: true,
    networkBlocked: true,
    scriptMissing: true,
  });

  // Dynamic Multi-Layer Detection Probe
  const runDiagnosticProbes = useCallback(async () => {
    let baitHidden = false;
    let networkBlocked = false;
    let scriptMissing = false;

    // 1. Bait element test
    try {
      const bait = document.createElement('div');
      bait.className = 'ad-banner ads adsbox ad-placement google-ad adsbygoogle';
      bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:2px;height:2px;';
      bait.innerHTML = '&nbsp;';
      document.body.appendChild(bait);
      await new Promise((r) => setTimeout(r, 60));
      baitHidden = bait.offsetParent === null || bait.offsetHeight === 0 || bait.clientHeight === 0;
      if (document.body.contains(bait)) {
        document.body.removeChild(bait);
      }
    } catch {
      baitHidden = true;
    }

    // 2. Network script probe simulation
    try {
      await fetch('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-store',
      });
    } catch {
      networkBlocked = true;
    }

    // 3. adsbygoogle global test
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).adsbygoogle === 'undefined') {
      scriptMissing = true;
    }

    setProbeResults({ baitHidden, networkBlocked, scriptMissing });
  }, []);

  useEffect(() => {
    if (visible) {
      runDiagnosticProbes();
    }
  }, [visible, runDiagnosticProbes]);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (cooldown > 0 || checking) return;
    setChecking(true);
    try {
      await runDiagnosticProbes();
      const stillBlocked = await onRecheck();
      if (!stillBlocked) {
        toast.success('AdBlocker Disabled! Enjoy uninterrupted streaming.');
        if (onDismiss) onDismiss();
      } else {
        toast.error('AdBlocker still detected', {
          description: 'Please pause your ad blocker extension or whitelist this site.',
        });
        setCooldown(5); // 5 sec protection delay to prevent spamming
      }
    } catch {
      toast.error('Verification failed. Try refreshing the page.');
    } finally {
      setChecking(false);
    }
  };

  const handleActivatePremiumTrial = () => {
    if (onActivatePremium) {
      onActivatePremium();
    } else {
      localStorage.setItem('pronax_premium', '1');
      if (onDismiss) onDismiss();
    }
    toast.success('Welcome to Pro Nax Premium!', {
      description: '30-day free trial activated. All ads have been removed.',
    });
  };

  if (!visible) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', damping: 24, stiffness: 280 }}
          className="w-full max-w-lg bg-[#0a0e17] border border-white/15 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden font-sans text-zinc-100 backdrop-blur-2xl"
        >
          {/* Top Decorative Warning Ambient Glow */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-48 bg-gradient-to-r from-red-600/30 via-rose-600/20 to-amber-600/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Close Modal Button */}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition cursor-pointer z-10"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Header Icon & Title */}
          <div className="flex items-start gap-4 mb-6">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-red-600 via-rose-500 to-amber-500 p-[1.5px] shadow-xl shadow-red-600/30 shrink-0">
              <div className="w-full h-full bg-[#0a0e17] rounded-[14px] flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-red-500 animate-pulse" />
              </div>
            </div>
            <div className="min-w-0 pr-6">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-extrabold text-white tracking-tight font-display">
                  AdBlocker Shield Detected
                </h2>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500/20 border border-red-500/40 text-red-400 uppercase">
                  ENTERPRISE
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Video ads support creators and keep Pro Nax streaming free.
              </p>
            </div>
          </div>

          {/* Dual Toggle Tabs: [Go Premium] vs [Allow Ads] */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-[#111622] border border-white/10 rounded-2xl mb-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('premium')}
              className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'premium'
                  ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25 border border-red-500/40'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Crown className="w-4 h-4 fill-white/20 text-amber-300" />
              <span>Unlock Premium Ad-Free</span>
            </button>

            <button
              onClick={() => setActiveTab('whitelist')}
              className={`py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'whitelist'
                  ? 'bg-white/10 text-white shadow-md border border-white/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>How to Whitelist Us</span>
            </button>
          </div>

          {/* Tab Content 1: Unlock Premium */}
          {activeTab === 'premium' && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-5"
            >
              <div className="bg-[#10141f]/90 border border-white/10 rounded-2xl p-4 space-y-3.5 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <Sparkles className="w-4 h-4 text-amber-400" /> Pro Nax Premium Pass
                  </span>
                  <div className="text-right">
                    <span className="text-sm font-mono font-extrabold text-white">{formatMoney(PREMIUM_PRICE, { currency: DEFAULT_CURRENCY })}</span>
                    <span className="text-[10px] text-zinc-400"> / mo</span>
                  </div>
                </div>

                {/* Feature Bullets with Glowing Badges */}
                <div className="space-y-2.5">
                  {PREMIUM_PERKS.map((perk, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-start gap-2 text-zinc-200">
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-emerald-400 stroke-[3]" />
                        </div>
                        <span className="leading-tight">{perk.title}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 border ${perk.badgeColor}`}
                      >
                        {perk.badge}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleActivatePremiumTrial}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xl shadow-red-600/30 transition cursor-pointer active:scale-98"
              >
                <Crown className="w-4 h-4 fill-white text-amber-300" />
                <span>START 30-DAY FREE TRIAL</span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </button>
            </motion.div>
          )}

          {/* Tab Content 2: Whitelist & Allow Ads */}
          {activeTab === 'whitelist' && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              <div className="bg-[#10141f]/90 border border-white/10 rounded-2xl p-4 space-y-3 text-xs text-zinc-300">
                <p className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Follow 3 steps to allow ads:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-zinc-400 leading-relaxed">
                  <li>
                    Click your ad-blocker extension icon (uBlock, AdBlock, Brave) in your browser toolbar.
                  </li>
                  <li>
                    Select <strong className="text-white">"Pause on this site"</strong> or <strong className="text-white">"Don't run on pages on this domain"</strong>.
                  </li>
                  <li>
                    Click the re-check button below to restore full playback.
                  </li>
                </ol>
              </div>

              {/* Re-check button with 5-second Cooldown Protection */}
              <button
                onClick={handleVerify}
                disabled={checking || cooldown > 0}
                className="w-full h-12 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-extrabold text-xs flex items-center justify-center gap-2.5 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {checking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                ) : (
                  <RefreshCw className="w-4 h-4 text-zinc-300" />
                )}
                <span>
                  {cooldown > 0
                    ? `PROTECTION TIMEOUT: WAIT ${cooldown}S TO RE-CHECK`
                    : "I'VE DISABLED ADBLOCKER — RE-CHECK CONNECTION"}
                </span>
              </button>
            </motion.div>
          )}

          {/* Expandable Multi-Layer Diagnostic Probes Panel */}
          <div className="mt-5 border-t border-white/10 pt-4">
            <button
              onClick={() => setShowDiagnostics(!showDiagnostics)}
              className="w-full flex items-center justify-between text-[11px] text-zinc-400 hover:text-white transition"
            >
              <span className="flex items-center gap-1.5 font-mono">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                Multi-Layer Detection Diagnostics
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {showDiagnostics ? 'Hide Technical Probes' : 'View Probes'}
              </span>
            </button>

            <AnimatePresence>
              {showDiagnostics && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mt-3 space-y-1.5 text-[10px] font-mono"
                >
                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-zinc-400">1. DOM Bait Element Probe (`.adsbygoogle`)</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        probeResults.baitHidden ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {probeResults.baitHidden ? 'BLOCKED / HIDDEN' : 'PASS'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-zinc-400">2. Network Script Host Probe (`pagead2`)</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        probeResults.networkBlocked ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {probeResults.networkBlocked ? 'NETWORK BLOCKED' : 'PASS'}
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <span className="text-zinc-400">3. Global Window Object Probe (`adsbygoogle`)</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        probeResults.scriptMissing ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {probeResults.scriptMissing ? 'MISSING / INTERCEPTED' : 'PASS'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer note */}
          <div className="mt-4 text-center">
            <p className="text-[10px] text-zinc-500">
              Need help? Refresh your page after disabling your blocker or contact support.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
