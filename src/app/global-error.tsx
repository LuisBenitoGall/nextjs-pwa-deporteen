'use client';

import { useEffect } from 'react';
import AppErrorScreen from '@/components/AppErrorScreen';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  return (
    <html lang="es">
      <body className="flex min-h-screen items-center justify-center bg-white text-gray-900">
        <AppErrorScreen error={error} reset={reset} homeHref="/" />
      </body>
    </html>
  );
}
