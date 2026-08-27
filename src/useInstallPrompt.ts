/* Copyright (c) 2026 ProNax. All rights reserved. Proprietary and Confidential. Unauthorized copying or redistribution is strictly prohibited. */
import { useCallback, useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function getDismissed() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('pronax_install_dismissed') === '1';
  } catch {
    return false;
  }
}

function setDismissed(value: boolean) {
  if (typeof window === 'undefined') return;
  try {
    if (value) {
      localStorage.setItem('pronax_install_dismissed', '1');
    } else {
      localStorage.removeItem('pronax_install_dismissed');
    }
  } catch {
    // Ignore localStorage errors
  }
}

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [dismissed, setDismissedState] = useState(getDismissed());

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setDismissedState(false);
      setDismissed(false);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      setDismissed(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

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
    setDismissedState(true);
    setDismissed(true);
  }, []);

  return { canInstall, installed, install, dismiss };
}