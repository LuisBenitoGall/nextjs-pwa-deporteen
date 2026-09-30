'use client';

import { useEffect } from 'react';
import AppErrorScreen from '@/components/AppErrorScreen';

export default function AdminSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AdminError]', error);
  }, [error]);

  return (
    <AppErrorScreen error={error} reset={reset} homeHref="/admin" homeLabelKey="admin_panel" />
  );
}
