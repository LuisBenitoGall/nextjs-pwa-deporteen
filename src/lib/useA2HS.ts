'use client';
import { useEffect, useRef, useState } from 'react';

type DeferredEvt = any; // BeforeInstallPromptEvent (no tipado oficial en TS)

export function useA2HS() {
  const deferredRef = useRef<DeferredEvt | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    function onBIP(e: Event) {
      e.preventDefault();
      deferredRef.current = e as DeferredEvt;
      setCanPrompt(true);
    }
    function onInstalled() {
      setInstalled(true);
      deferredRef.current = null;
      setCanPrompt(false);
      localStorage.removeItem('a2hs:dismissed');
    }
    window.addEventListener('beforeinstallprompt', onBIP);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function promptInstall() {
    const evt = deferredRef.current;
    if (!evt) return { outcome: 'dismissed' as const };
    evt.prompt();
    const { outcome } = await evt.userChoice; // 'accepted' | 'dismissed'
    if (outcome === 'accepted') {
      deferredRef.current = null;
      setCanPrompt(false);
    }
    return { outcome };
  }

  return { canPrompt, promptInstall, installed };
}
