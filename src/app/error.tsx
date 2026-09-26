'use client';

import { useEffect } from 'react';
import Link from 'next/link';

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
      <body className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Algo salió mal</h1>
          <p className="text-sm text-gray-600">
            Ha ocurrido un error inesperado. Puedes reintentar o volver al inicio.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              Reintentar
            </button>
            <Link
              href="/"
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Ir al inicio
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
