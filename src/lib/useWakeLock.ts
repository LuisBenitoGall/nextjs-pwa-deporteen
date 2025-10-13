// src/lib/useWakeLock.ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Mantiene la pantalla encendida durante la sesión.
 * - Usa Screen Wake Lock API si está disponible.
 * - Fallback: reproduce un vídeo 1x1 en bucle (técnica NoSleep.js) tras un gesto del usuario.
 *
 * API:
 *   const { active, supported, requesting, error, request, release } = useWakeLock();
 */
export function useWakeLock() {
  const wakeRef = useRef<any>(null);            // WakeLockSentinel
  const wasRequestedRef = useRef(false);        // para re-solicitar al volver a visible
  const fallbackVideoRef = useRef<HTMLVideoElement | null>(null);

  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState<boolean>(false);
  const [requesting, setRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupported(!!(navigator as any)?.wakeLock);
  }, []);

  // --- Fallback: vídeo 1x1 en bucle (silencioso) ---
  const ensureFallbackVideo = () => {
    if (fallbackVideoRef.current) return fallbackVideoRef.current;
    const v = document.createElement('video');
    // MP4 minúsculo de 1px en base64 (similar a NoSleep)
    v.src =
      'data:video/mp4;base64,AAAAHGZ0eXBtcDQyAAAAAG1wNDFtcDQxaXNvbWF2YzEAAAAAAAAAAAAAAABpc28yYXZjMQAAAAhmcmVlAAAAFG1kYXQAAAAAAAABAAABAAAAAAABAAAAAA==';
    v.setAttribute('playsinline', 'true');
    v.setAttribute('muted', 'true');
    v.muted = true;
    v.loop = true;
    v.style.width = '1px';
    v.style.height = '1px';
    v.style.position = 'fixed';
    v.style.opacity = '0';
    v.style.bottom = '0';
    v.style.right = '0';
    document.body.appendChild(v);
    fallbackVideoRef.current = v;
    return v;
  };

  const requestFallback = async () => {
    const v = ensureFallbackVideo();
    try {
      await v.play();
      setActive(true);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'No se pudo activar el modo pantalla activa (fallback).');
      setActive(false);
    }
  };

  const stopFallback = () => {
    const v = fallbackVideoRef.current;
    if (v) {
      try { v.pause(); } catch {}
      try { v.remove(); } catch {}
      fallbackVideoRef.current = null;
    }
  };

  const request = useCallback(async () => {
    setRequesting(true);
    setError(null);
    wasRequestedRef.current = true;

    if ((navigator as any)?.wakeLock?.request) {
      try {
        // @ts-ignore
        const sentinel = await (navigator as any).wakeLock.request('screen');
        wakeRef.current = sentinel;
        setActive(true);
        sentinel.addEventListener?.('release', () => {
          // El sistema puede liberar el lock; mantenemos "active" acorde
          setActive(false);
        });
        setRequesting(false);
        return;
      } catch (e: any) {
        // Si falla (política de energía, etc.), intentamos fallback
        setError(e?.message || 'No se pudo activar Wake Lock. Intentando fallback…');
      }
    }

    // Fallback si no soporta o falló
    await requestFallback();
    setRequesting(false);
  }, []);

  const release = useCallback(async () => {
    setError(null);
    wasRequestedRef.current = false;

    stopFallback();

    try {
      if (wakeRef.current?.release) {
        await wakeRef.current.release();
      }
    } catch {}
    wakeRef.current = null;
    setActive(false);
  }, []);

  // Re-solicita si el doc vuelve a ser visible y ya se había pedido antes
  useEffect(() => {
    const onVisibility = async () => {
      if (document.visibilityState === 'visible' && wasRequestedRef.current && !active) {
        await request();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [active, request]);

  // Limpieza en unmount
  useEffect(() => {
    return () => {
      stopFallback();
      try { wakeRef.current?.release?.(); } catch {}
      wakeRef.current = null;
    };
  }, []);

  return { active, supported, requesting, error, request, release };
}
