'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import type { MediaSyncResult } from '@/lib/mediaSync';

type BannerKind = 'pending' | 'failed' | 'success' | null;

export default function MediaSyncStatusBanner() {
  const t = useT();
  const [kind, setKind] = useState<BannerKind>(null);
  const [uploaded, setUploaded] = useState(0);

  const dismiss = useCallback(() => setKind(null), []);

  useEffect(() => {
    let successTimer: ReturnType<typeof setTimeout> | undefined;

    const onSync = (ev: Event) => {
      const detail = (ev as CustomEvent<MediaSyncResult>).detail;
      if (!detail) return;

      if (detail.remaining > 0) {
        setKind('pending');
        return;
      }
      if (detail.failed > 0) {
        setKind('failed');
        return;
      }
      if (detail.uploaded > 0) {
        setUploaded(detail.uploaded);
        setKind('success');
        if (successTimer) clearTimeout(successTimer);
        successTimer = setTimeout(() => setKind(null), 5000);
      }
    };

    window.addEventListener('media-sync-status', onSync);
    return () => {
      window.removeEventListener('media-sync-status', onSync);
      if (successTimer) clearTimeout(successTimer);
    };
  }, []);

  const retry = () => {
    void import('@/lib/mediaSync').then(({ requestBackgroundMediaSync }) => {
      requestBackgroundMediaSync();
    });
  };

  if (!kind) return null;

  const base =
    'fixed bottom-20 left-4 right-4 z-[45] mx-auto max-w-lg rounded-xl border px-4 py-3 text-sm shadow-lg sm:left-auto sm:right-6';

  if (kind === 'success') {
    return (
      <div className={`${base} border-green-200 bg-green-50 text-green-900`} role="status">
        {t('media_sync_success', { n: String(uploaded) })}
        <button type="button" className="ml-3 underline" onClick={dismiss}>
          {t('cerrar') || 'Cerrar'}
        </button>
      </div>
    );
  }

  const isFailed = kind === 'failed';
  return (
    <div
      className={`${base} ${isFailed ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}
      role="alert"
    >
      <p>{isFailed ? t('media_sync_failed') : t('media_sync_pending')}</p>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          className="rounded-lg bg-white/80 px-3 py-1 font-medium underline"
          onClick={retry}
        >
          {t('media_sync_retry')}
        </button>
        <button type="button" className="px-2 py-1 opacity-80" onClick={dismiss}>
          {t('cerrar') || 'Cerrar'}
        </button>
      </div>
    </div>
  );
}
