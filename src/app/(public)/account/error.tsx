'use client';

import { useEffect } from 'react';
import AppErrorScreen from '@/components/AppErrorScreen';

export default function AccountSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AccountError]', error);
  }, [error]);

  return (
    <AppErrorScreen
      error={error}
      reset={reset}
      homeHref="/account"
      homeLabelKey="volver_a_cuenta"
    />
  );
}
