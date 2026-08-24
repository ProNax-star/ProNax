/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { Download, MonitorSmartphone, X } from 'lucide-react';
import { toast } from 'sonner';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';

export function InstallPrompt() {
  const { canInstall, install, dismiss } = useInstallPrompt();

  if (!canInstall) return null;

  const onInstall = async () => {
    const ok = await install();
    if (ok) toast.success('Pro Nax installed', { description: 'Open it from your device like a native app.' });
  };

  return (
    <div className="fixed bottom-16 lg:bottom-5 left-3 right-3 lg:left-auto lg:right-5 z-[70] lg:w-[360px]">
      <div className="glass-strong rounded-2xl border border-primary/40 p-3 shadow-2xl glow-primary">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center shrink-0">
            <MonitorSmartphone className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Install Pro Nax</p>
            <p className="text-xs text-muted-foreground mt-0.5">Use it smoothly on laptop, tablet, or mobile from your home screen.</p>
            <div className="flex gap-2 mt-3">
              <button onClick={onInstall} className="px-3 py-1.5 rounded-lg gradient-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Install
              </button>
              <button onClick={dismiss} className="px-3 py-1.5 rounded-lg glass border border-border/40 text-xs font-semibold text-muted-foreground hover:text-foreground">
                Later
              </button>
            </div>
          </div>
          <button onClick={dismiss} aria-label="Dismiss install prompt" className="p-1 rounded-md hover:bg-muted/40 text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function InstallButton({ compact = false }: { compact?: boolean }) {
  const { canInstall, install } = useInstallPrompt();
  if (!canInstall) return null;

  const onInstall = async () => {
    const ok = await install();
    if (ok) toast.success('Installed successfully');
  };

  return (
    <button
      type="button"
      onClick={onInstall}
      className="h-9 px-3 rounded-full glass-strong border border-primary/35 text-xs font-semibold text-primary hover:border-primary/70 hover:bg-primary/10 transition inline-flex items-center gap-2 shrink-0"
      aria-label="Install Pro Nax"
    >
      <Download className="w-4 h-4" />
      {!compact && <span>Install</span>}
    </button>
  );
}