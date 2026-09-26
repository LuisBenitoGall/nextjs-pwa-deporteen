'use client';
import { useEffect, useMemo, useState } from 'react';
import { useA2HS } from '@/lib/useA2HS';
import { useT } from '@/i18n/I18nProvider';

function isiOS() {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (window as any).navigator?.standalone);
}

export default function InstallBanner() {
  const { canPrompt, promptInstall } = useA2HS();
  const t = useT();
  const [show, setShow] = useState(false);
  const ios = useMemo(isiOS, []);
  const standalone = useMemo(isStandalone, []);

  useEffect(() => {
    const dismissed = localStorage.getItem('a2hs:dismissed') === '1';
    setShow(!dismissed && ((canPrompt && !standalone) || (ios && !standalone)));
  }, [canPrompt, ios, standalone]);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[92vw] rounded-2xl shadow-xl bg-white/95 backdrop-blur p-3 border border-black/5">
      {!ios ? (
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <b>{t('pwa_install_title') || 'Instala DeporTeen'}</b><br />
            {t('pwa_install_subtitle') || 'Tendrás acceso rápido desde el escritorio.'}
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
              {t('pwa_install_cta') || 'Instalar'}
            </button>
            <button
              className="px-3 py-1 rounded-lg bg-neutral-200 text-sm"
              onClick={() => { localStorage.setItem('a2hs:dismissed','1'); setShow(false); }}
            >
              {t('pwa_install_dismiss') || 'No ahora'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <b>{t('pwa_install_ios_title') || 'Añadir a pantalla de inicio'}</b><br />
            <span
              dangerouslySetInnerHTML={{
                __html: t('pwa_install_ios_body') ||
                  'Abre <i>Compartir</i> y toca <b>Añadir a pantalla de inicio</b>.',
              }}
            />
          </div>
          <button
            className="ml-auto px-3 py-1 rounded-lg bg-neutral-200 text-sm"
            onClick={() => { localStorage.setItem('a2hs:dismissed','1'); setShow(false); }}
          >
            {t('pwa_install_ios_ok') || 'Entendido'}
          </button>
        </div>
      )}
    </div>
  );
}
