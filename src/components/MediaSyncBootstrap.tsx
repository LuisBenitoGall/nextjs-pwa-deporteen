'use client';

import { useEffect } from 'react';

/**
 * Evita importar mediaSync (y supabase/client) en el grafo del layout durante
 * el prerender de `next build`: el cliente Supabase exige env en tiempo de módulo.
 */
export default function MediaSyncBootstrap() {
  useEffect(() => {
    void import('@/lib/mediaSync').then(({ bindMediaSyncOnOnline }) => {
      bindMediaSyncOnOnline();
    });
  }, []);
  return null;
}
