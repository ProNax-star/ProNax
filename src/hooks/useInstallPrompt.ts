/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getItem, setItem, removeItem } from '@/lib/safeStorage';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDismissed(getItem('pronax_install_dismissed') === '1');
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setDismissed(false);
      removeItem('pronax_install_dismissed');
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setItem('pronax_install_dismissed', '1');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, [mounted]);

  const canInstall = useMemo(() => !!promptEvent && !installed && !dismissed, [promptEvent, installed, dismissed]);

  const install = useCallback(async () => {
    if (!promptEvent) return false;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === 'accepted') {
      setInstalled(true);
      setPromptEvent(null);
      return true;
    }
    return false;
  }, [promptEvent]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setItem('pronax_install_dismissed', '1');
  }, []);

  return { canInstall, installed, install, dismiss };
}