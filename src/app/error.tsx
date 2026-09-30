'use client';

import { useEffect } from 'react';
import AppErrorScreen from '@/components/AppErrorScreen';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[RootError]', error);
  }, [error]);

  return <AppErrorScreen error={error} reset={reset} homeHref="/" />;
}
