'use client';
import { useEffect, useMemo, useState } from 'react';
import { useA2HS } from '@/lib/useA2HS';

function isiOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (window as any).navigator?.standalone);
}

export default function InstallBanner() {
  const { canPrompt, promptInstall } = useA2HS();
  const [show, setShow] = useState(false);
  const ios = useMemo(isiOS, []);
  const standalone = useMemo(isStandalone, []);

  useEffect(() => {
    const dismissed = localStorage.getItem('a2hs:dismissed') === '1';
    // Aparece si: Android con canPrompt, o iOS sin standalone. Y no descartado.
    setShow(!dismissed && ((canPrompt && !standalone) || (ios && !standalone)));
  }, [canPrompt, ios, standalone]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92vw] rounded-2xl shadow-xl bg-white/95 backdrop-blur p-3 border border-black/5">
      {!ios ? (
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <b>Instala DeporTeen</b><br />
            Tendrás acceso rápido desde el escritorio.
          </div>
          <div className="ml-auto flex gap-2">
            <button
              className="px-3 py-1 rounded-lg bg-emerald-600 text-white text-sm"
              onClick={async () => {
                await promptInstall();
                localStorage.setItem('a2hs:dismissed', '1');
                setShow(false);
              }}
            >
              Instalar
            </button>
            <button
              className="px-3 py-1 rounded-lg bg-neutral-200 text-sm"
              onClick={() => { localStorage.setItem('a2hs:dismissed','1'); setShow(false); }}
            >
              No ahora
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <b>Añadir a pantalla de inicio</b><br />
            Abre <i>Compartir</i> y toca <b>Añadir a pantalla de inicio</b>.
          </div>
          <button
            className="ml-auto px-3 py-1 rounded-lg bg-neutral-200 text-sm"
            onClick={() => { localStorage.setItem('a2hs:dismissed','1'); setShow(false); }}
          >
            Entendido
          </button>
        </div>
      )}
    </div>
  );
}
