/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useEffect, useRef, useState } from 'react';
import { Smartphone, Monitor, Tablet, RefreshCw, ExternalLink, Radio, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { AppControlTab } from './AppControlTab';
import { useAppSettings } from '@/hooks/useAppSettings';

type Device = 'mobile' | 'tablet' | 'desktop';

const FRAMES: Record<Device, { w: number; h: number; label: string; icon: any }> = {
  mobile: { w: 390, h: 780, label: 'Mobile', icon: Smartphone },
  tablet: { w: 768, h: 900, label: 'Tablet', icon: Tablet },
  desktop: { w: 1280, h: 780, label: 'Desktop', icon: Monitor },
};

const ROUTES = [
  { path: '/', label: 'Home' },
  { path: '/shorts', label: 'Shorts' },
  { path: '/explore', label: 'Explore' },
  { path: '/subscriptions', label: 'Subs' },
  { path: '/wallet', label: 'Wallet' },
  { path: '/settings', label: 'Settings' },
];

/**
 * Live Preview — admin sees the real web app inside an iframe.
 * Any change made via App Control writes to `app_settings` which is
 * Realtime-subscribed by the running app, so the iframe reflects it instantly.
 */
export function LivePreviewTab() {
  const [device, setDevice] = useState<Device>('mobile');
  const [route, setRoute] = useState('/');
  const [nonce, setNonce] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { settings } = useAppSettings();

  // Bump nonce whenever app_settings changes so the iframe visually "pulses"
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (!settings) return;
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 900);
    return () => clearTimeout(t);
  }, [settings?.updated_at, settings?.accent_hex, settings?.app_name, settings?.logo_url]);

  const frame = FRAMES[device];
  const src = `${route}${route.includes('?') ? '&' : '?'}admin_preview=1&_=${nonce}`;

  return (
    <div className={`grid grid-cols-1 gap-5 ${controlsOpen ? 'xl:grid-cols-[1fr_460px]' : ''}`}>
      {/* Preview column */}
      <div
        className="rounded-2xl border p-4 lg:p-5 relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg,#050912 0%,#0a1220 100%)',
          borderColor: 'rgba(59,130,246,0.22)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-semibold text-emerald-400 tracking-wider uppercase">
              Live · Supabase synced
            </span>
            {pulse && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 animate-pulse">
                Applying changes…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setNonce((n) => n + 1)}
              className="w-8 h-8 grid place-items-center rounded-lg border border-blue-500/25 bg-blue-500/5 text-blue-300 hover:bg-blue-500/15 transition"
              title="Reload preview"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <a
              href={route}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 grid place-items-center rounded-lg border border-blue-500/25 bg-blue-500/5 text-blue-300 hover:bg-blue-500/15 transition"
              title="Open in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => setControlsOpen((v) => !v)}
              className="hidden xl:grid w-8 h-8 place-items-center rounded-lg border border-blue-500/25 bg-blue-500/5 text-blue-300 hover:bg-blue-500/15 transition"
              title={controlsOpen ? 'Hide controls (fullscreen preview)' : 'Show controls'}
            >
              {controlsOpen ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRightOpen className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Device switcher */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {(Object.keys(FRAMES) as Device[]).map((d) => {
            const F = FRAMES[d];
            const Icon = F.icon;
            const active = device === d;
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                className="px-3 h-8 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition"
                style={
                  active
                    ? {
                        background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
                        color: '#fff',
                        borderColor: 'transparent',
                        boxShadow: '0 0 18px -4px #3b82f6',
                      }
                    : {
                        background: 'rgba(15,23,42,0.6)',
                        color: 'rgb(148 163 184)',
                        borderColor: 'rgba(59,130,246,0.2)',
                      }
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {F.label}
              </button>
            );
          })}
        </div>

        {/* Route pills */}
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-thin">
          {ROUTES.map((r) => {
            const active = route === r.path;
            return (
              <button
                key={r.path}
                onClick={() => setRoute(r.path)}
                className="shrink-0 px-2.5 h-7 rounded-full text-[11px] font-medium border transition"
                style={
                  active
                    ? { background: 'rgba(59,130,246,0.2)', color: '#93c5fd', borderColor: 'rgba(59,130,246,0.5)' }
                    : { background: 'rgba(15,23,42,0.5)', color: 'rgb(148 163 184)', borderColor: 'rgba(255,255,255,0.06)' }
                }
              >
                {r.label}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1 text-[10px] text-slate-500 shrink-0">
            <Radio className="w-3 h-3 text-emerald-400" /> {frame.w}×{frame.h}
          </div>
        </div>

        {/* Iframe device frame — scaled to fit container without overflow */}
        <div className="flex items-center justify-center py-4 w-full overflow-hidden">
          <div
            className="relative rounded-[28px] p-2"
            style={{
              background: 'linear-gradient(145deg, #0f172a, #020617)',
              border: '1px solid rgba(59,130,246,0.25)',
              boxShadow:
                '0 0 0 1px rgba(255,255,255,0.02) inset, 0 30px 80px -20px rgba(59,130,246,0.4), 0 0 60px -20px rgba(59,130,246,0.35)',
              width: '100%',
              maxWidth: `${frame.w + 16}px`,
            }}
          >
            {device === 'mobile' && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-4 rounded-full bg-black/80 z-10" />
            )}
            <div
              className="rounded-[20px] overflow-hidden bg-black w-full"
              style={{
                aspectRatio: `${frame.w} / ${frame.h}`,
                maxHeight: 'calc(100vh - 260px)',
              }}
            >
              <iframe
                ref={iframeRef}
                key={`${route}-${nonce}`}
                src={src}
                title="Live app preview"
                className="w-full h-full block"
                style={{ border: 0, background: '#000' }}
              />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 text-center mt-2">
          Yeh preview aapki live web app hai — admin panel se koi bhi setting change karo, Supabase realtime
          ke through iframe mein turant reflect ho jayega.
        </p>
      </div>

      {/* Controls column */}
      {controlsOpen && (
        <div
          className="rounded-2xl border p-4 lg:p-5 overflow-y-auto max-h-[calc(100vh-140px)]"
          style={{
            background: 'linear-gradient(180deg,#0a1220 0%,#050912 100%)',
            borderColor: 'rgba(59,130,246,0.22)',
          }}
        >
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg grid place-items-center bg-blue-500/15 border border-blue-500/30">
                <Radio className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Live Controls</h3>
                <p className="text-[11px] text-slate-500">Har change turant preview mein dikhega</p>
              </div>
            </div>
            <button
              onClick={() => setControlsOpen(false)}
              className="w-8 h-8 grid place-items-center rounded-lg border border-blue-500/25 bg-blue-500/5 text-blue-300 hover:bg-blue-500/15 transition"
              title="Hide controls"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>
          <AppControlTab />
        </div>
      )}
    </div>
  );
}
