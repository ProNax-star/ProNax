import { useCallback, useEffect, useMemo, useState } from 'react';

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
  const [dismissed, setDismissed] = useState(() => localStorage.getItem('pronax_install_dismissed') === '1');

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
      setDismissed(false);
      localStorage.removeItem('pronax_install_dismissed');
    };
    const onInstalled = () => {
      setInstalled(true);
      setPromptEvent(null);
      localStorage.setItem('pronax_install_dismissed', '1');
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
    setDismissed(true);
    localStorage.setItem('pronax_install_dismissed', '1');
  }, []);

  return { canInstall, installed, install, dismiss };
}