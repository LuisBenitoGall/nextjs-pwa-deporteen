// src/app/dashboard/media-test/page.tsx
'use client';

import { useMemo, useEffect, useState } from 'react';
import Image from 'next/image';
import { FormProvider, useForm } from 'react-hook-form';
import { MediaCaptureButton } from '@/components/MediaCaptureButton';
import { getAllMedia, deleteMedia, clearMedia } from '@/lib/indexeddb';

type FormValues = { media: File | null; media_localId?: string | null };

export default function MediaTestPage() {
  const methods = useForm<FormValues>({ defaultValues: { media: null, media_localId: null } });
  const { handleSubmit, watch } = methods;

  const media = watch('media');
  const mediaLocalId = watch('media_localId');
  const [saved, setSaved] = useState<Array<{ id: string; blob: Blob; mimeType: string; createdAt: number; name?: string }>>([]);

  useEffect(() => {
    (async () => {
      const items = await getAllMedia();
      setSaved(items.sort((a, b) => b.createdAt - a.createdAt));
    })();
  }, []);

  const refreshSaved = async () => {
    const items = await getAllMedia();
    setSaved(items.sort((a, b) => b.createdAt - a.createdAt));
  };

  const fileInfo = useMemo(() => {
    if (!media) return null;
    const sizeKB = Math.round(media.size / 1024);
    return `${media.name} · ${media.type} · ${sizeKB} KB`;
  }, [media]);

  const onSubmit = (data: FormValues) => {
    // Solo demostración: mostramos en consola el File listo para subir
    // La subida real ya la haces con tus utilidades en otra página/flow
    // Aquí solo probamos nuestro componente
    console.log('Form submit with media:', data.media);
    console.log('Local ID (IndexedDB):', data.media_localId);
    alert(
      data.media
        ? `Archivo listo para subir (ver consola). local_id=${data.media_localId ?? 'N/A'}`
        : 'No seleccionaste/capturaste nada'
    );
  };

  return (
    <main className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-bold">Prueba del componente MediaCaptureButton</h1>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <MediaCaptureButton
            name="media"
            label="Selecciona o captura media"
            accept="image/*,video/*"
            maxSizeMB={20}
          />

          {fileInfo && (
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{fileInfo}</p>
              {mediaLocalId && <p>local_id: <span className="font-mono">{mediaLocalId}</span></p>}
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
          >
            Enviar (solo prueba)
          </button>
        </form>
      </FormProvider>

      <div className="text-sm text-gray-500">
        Nota: Para que la cámara funcione, prueba en localhost o en HTTPS y concede permisos al navegador.
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Guardado en este dispositivo (IndexedDB)</h2>
          <button
            type="button"
            onClick={async () => { await clearMedia(); await refreshSaved(); }}
            className="text-sm rounded-md border border-input px-3 py-1 hover:bg-accent hover:text-accent-foreground"
          >
            Vaciar
          </button>
        </div>

        <div className="grid gap-3">
          {saved.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay elementos guardados.</p>
          )}
          {saved.map((item) => {
            const url = URL.createObjectURL(item.blob);
            return (
              <div key={item.id} className="rounded-md border p-3 space-y-2">
                <div className="text-xs text-muted-foreground">
                  {item.name ?? 'sin-nombre'} · {item.mimeType} · {Math.round(item.blob.size / 1024)} KB
                </div>
                {item.mimeType.startsWith('image/') ? (
                  <Image
                    src={url}
                    alt={item.name ?? 'imagen'}
                    width={480}
                    height={360}
                    className="max-h-48 w-auto rounded"
                    unoptimized
                  />
                ) : item.mimeType.startsWith('video/') ? (
                  <video src={url} controls className="max-h-48 w-auto rounded" />
                ) : (
                  <p className="text-sm">Archivo no visualizable</p>
                )}
                <div>
                  <button
                    type="button"
                    onClick={async () => { await deleteMedia(item.id); await refreshSaved(); }}
                    className="text-xs rounded-md border border-input px-2 py-1 hover:bg-accent hover:text-accent-foreground"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
