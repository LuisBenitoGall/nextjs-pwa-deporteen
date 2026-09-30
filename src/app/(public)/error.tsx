'use client';

import { useEffect } from 'react';
import AppErrorScreen from '@/components/AppErrorScreen';

export default function PublicSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[PublicError]', error);
  }, [error]);

  return (
    <AppErrorScreen error={error} reset={reset} homeHref="/dashboard" homeLabelKey="mi_panel_volver" />
  );
}
