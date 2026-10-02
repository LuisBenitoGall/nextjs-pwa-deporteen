'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useT } from '@/i18n/I18nProvider';
import Image from 'next/image';
import { useWakeLock } from '@/lib/useWakeLock';
import { useStorageProvider } from '@/hooks/useStorageProvider';
import CloudUsageStatus from '@/components/cloud/CloudUsageStatus';
import {
  isSupabaseStoragePath,
  resolveMatchMediaSources,
} from '@/lib/matchMedia/resolveSources';

//Componentes
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import TitleH1 from '@/components/TitleH1';
import PageLoadError from '@/components/PageLoadError';
import InlineFlashBanner from '@/components/InlineFlashBanner';
import { StorageBadge } from '@/components/StorageIcon';

type MatchRow = {
  id: string;
  competition_id: string;
  player_id: string;
};

type MediaRow = {
  id: string;
  kind: 'image' | 'video';
  storage_path: string | null;
  google_drive_file_id: string | null;
  device_uri: string | null;
  mime_type: string | null;
  taken_at: string | null;
  created_at: string | null;
};

export default function MatchGalleryPage() {
  const t = useT();
  const { provider } = useStorageProvider();
  const { id: matchId } = useParams() as { id: string };
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [selected, setSelected] = useState<MediaRow | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{ variant: 'success' | 'error'; message: string } | null>(null);
  const [unavailable, setUnavailable] = useState<Record<string, string>>({});
  //const [deletingId, setDeletingId] = useState<string | null>(null);
    const [urls, setUrls] = useState<Record<string, string>>({}); // id -> src usable
    const blobUrlsRef = useRef<string[]>([]);
    const resolvedIdsRef = useRef<Set<string>>(new Set());
    const mediaRef = useRef<MediaRow[]>([]);

  // --- Mantener pantalla encendida (Wake Lock) ---
  const {
    active: wakeActive,
    requesting: wakeRequesting,
    request: wakeRequest,
    release: wakeRelease,
  } = useWakeLock();

  


  // Auto-activar en el primer gesto del usuario
  useEffect(() => {
    const onFirst = async () => { try { await wakeRequest(); } catch {} };
    window.addEventListener('pointerdown', onFirst, { once: true, passive: true });
    window.addEventListener('keydown', onFirst, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onFirst);
      window.removeEventListener('keydown', onFirst);
    };
  }, [wakeRequest]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);

      const { data: matchRow, error: matchError } = await supabase
        .from('matches')
        .select('id, competition_id, player_id')
        .eq('id', matchId)
        .single();

      if (!mounted) return;
      if (matchError) {
        setError(matchError.message);
        setLoading(false);
        return;
      }

      setMatch(matchRow as MatchRow);

      const { data: mediaRows, error: mediaError } = await supabase
        .from('match_media')
        .select('id, kind, storage_path, google_drive_file_id, device_uri, mime_type, taken_at, created_at')
        .eq('match_id', matchId)
        .order('taken_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!mounted) return;
      if (mediaError) {
        setError(mediaError.message);
        setLoading(false);
        return;
      }

      const rows = (mediaRows as MediaRow[]) || [];
      resolvedIdsRef.current = new Set();
      setMedia(rows);
      mediaRef.current = rows;
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, matchId]);

  const backToMatchUrl = matchId ? `/matches/${matchId}/live` : '/gallery';
  const backToListUrl =
    match?.player_id && match?.competition_id
      ? `/players/${match.player_id}/competitions/${match.competition_id}/matches`
      : '/dashboard';



  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  // Resolver URLs en paralelo; solo ítems nuevos (evita re-leer IDB al recuperar foco).
  useEffect(() => {
    let cancelled = false;
    const newMedia = media.filter(m => !resolvedIdsRef.current.has(m.id));
    if (newMedia.length === 0) return;

    for (const m of newMedia) resolvedIdsRef.current.add(m.id);

    const unavailableLabel = t('media_no_disponible') || t('sin_preview') || 'No disponible';

    void resolveMatchMediaSources(newMedia, supabase, unavailableLabel, {
      onItem: ({ id, src, blobUrl }) => {
        if (cancelled) return;
        if (blobUrl) blobUrlsRef.current.push(blobUrl);
        setUrls(prev => (prev[id] === src ? prev : { ...prev, [id]: src }));
      },
    }).then(({ unavailable: batchUnavailable }) => {
      if (cancelled) return;
      if (Object.keys(batchUnavailable).length) {
        setUnavailable(prev => ({ ...prev, ...batchUnavailable }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [media, supabase, t]);

  // Re-firma solo Supabase Storage al recuperar foco (sin re-resolver IDB/Drive/R2).
  useEffect(() => {
    const onFocus = () => {
      const rows = mediaRef.current.filter(m => isSupabaseStoragePath(m.storage_path));
      if (rows.length === 0) return;
      const unavailableLabel = t('media_no_disponible') || t('sin_preview') || 'No disponible';
      void resolveMatchMediaSources(rows, supabase, unavailableLabel, {
        supabaseSignedUrlsOnly: true,
        onItem: ({ id, src }) => {
          setUrls(prev => (prev[id] === src ? prev : { ...prev, [id]: src }));
        },
      });
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [supabase, t]);

  useEffect(() => {
    const urlsToRevoke = blobUrlsRef.current;
    return () => {
      for (const u of urlsToRevoke) {
        if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
      }
    };
  }, []);
  

    async function handleDelete(id: string) {
        try {
            const res = await fetch(`/api/match-media/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
                setDeleteFeedback({
                  variant: 'error',
                  message: errMsg || t('media_delete_error') || 'No se pudo eliminar el archivo.',
                });
                return;
            }
            setMedia(prev => prev.filter(item => item.id !== id));
            if (selected?.id === id) {
                setSelected(null);
            }
            setDeleteFeedback({
              variant: 'success',
              message: t('media_delete_ok') || 'Archivo eliminado.',
            });
            window.dispatchEvent(new CustomEvent('cloud-usage-refresh'));
        } finally {
        //setDeletingId(null);
        }
    }

    function renderThumb(item: MediaRow) {
        const src = urls[item.id];
        if (!src) {
            return (
                <div className="w-full h-28 bg-gray-100 p-3 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500">
                {unavailable[item.id] || t('sin_preview') || 'Sin vista previa'}
                </div>
            );
        }

        if (item.kind === 'video') {
            return <video src={src} className="w-full h-full object-cover rounded-lg bg-black" muted loop playsInline />;
        }
        // el contenedor del thumbnail ya es `relative w-full h-40`
        return (
            <Image
            src={src}
            alt={item.mime_type ?? 'media'}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 33vw"
            className="object-cover rounded-lg"
        />
        );
    }

    if (loading) {
        const msg = t('cargando');
        return <div className="p-6">{msg === 'cargando' ? 'Cargando…' : msg}</div>;
    }
    if (error) {
        return (
            <PageLoadError
                message={error}
                backHref={backToMatchUrl}
                backLabelKey="partido_volver"
            />
        );
    }

    return (
        <div>
            {/* Ocultar footer en esta pantalla */}
            <style jsx global>{`footer{display:none !important}`}</style>

            <TitleH1>{t('galeria') || 'Galería del partido'}</TitleH1>

            {deleteFeedback && (
              <InlineFlashBanner
                variant={deleteFeedback.variant}
                message={deleteFeedback.message}
                onDismiss={() => setDeleteFeedback(null)}
              />
            )}

            <div className="flex flex-wrap items-center gap-2 mb-6">
                <Link
                href={backToMatchUrl}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition"
                >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{t('partido_volver') || 'Volver al partido'}</span>
                </Link>

                <Link
                href={backToListUrl}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition"
                >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{t('competicion_volver') || 'Partidos de la competición'}</span>
                </Link>

                {/* Toggle Wake Lock */}
                <button
                type="button"
                onClick={() => (wakeActive ? wakeRelease() : wakeRequest())}
                disabled={wakeRequesting}
                className={`ml-auto inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold
                            ${wakeActive ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700'}
                            border ${wakeActive ? 'border-emerald-600' : 'border-gray-300'}`}
                title={wakeActive ? (t('pantalla_activa') || 'Pantalla activa') : (t('mantener_pantalla') || 'Mantener pantalla encendida')}
                >
                <span aria-hidden>🔆</span>
                {/* <span>{wakeActive ? (t('pantalla_activa') || 'Pantalla activa') : (t('mantener_pantalla') || 'Mantener pantalla')}</span> */}
                </button>
            </div>

            <div className="bg-gray-200 rounded-xl p-3 mb-4">
                <p className="font-xs">{t('galeria_aviso')}</p>
            </div>

            <div className="mb-4">
              <CloudUsageStatus enabled={provider === 'r2'} />
            </div>

            {media.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
                {t('galeria_vacia') || 'Todavía no hay fotos ni vídeos en este partido.'}
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {media.map(item => (
                        <div key={item.id} className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 bg-white shadow-sm">
                            <button
                                type="button"
                                onClick={() => setSelected(item)}
                                className="relative w-full h-40 overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                            >
                                {renderThumb(item)}
                                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-1 text-xs text-white uppercase">
                                {item.kind === 'video' ? (t('video') || 'Vídeo') : (t('foto') || 'Foto')}
                                </span>
                                <span className="absolute right-2 top-2">
                                  <StorageBadge storagePath={item.storage_path} />
                                </span>
                            </button>

                            <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>
                                    {item.taken_at
                                    ? new Date(item.taken_at).toLocaleString()
                                    : new Date(item.created_at ?? '').toLocaleString()}
                                </span>

                                <ConfirmDeleteButton
                                    onConfirm={() => handleDelete(item.id)}
                                    ariaLabel={t('eliminar') || 'Eliminar'}
                                    confirmTitle={t('media_eliminar_confirmar') || 'Confirmar eliminación'}
                                    confirmMessage={
                                    t('media_eliminar_confirmar_texto') ||
                                    'Si eliminas este archivo, se borrará definitivamente. Esta acción es irreversible.'
                                    }
                                    confirmCta={t('borrado_confirmar') || 'Confirmar borrado'}
                                    cancelCta={t('cancelar') || 'Cancelar'}
                                    className="inline-flex items-center rounded-xl bg-red-100 border border-red-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-red-50 whitespace-nowrap"
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal para vista previa de medios */}
            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setSelected(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-label={t('galeria_detalle') || 'Detalle de la galería'}
                    tabIndex={-1}
                    onKeyDown={(e) => { if (e.key === 'Escape') setSelected(null); }}
                >
                    <div
                    className="relative max-h-full max-w-4xl w-full"
                    onClick={e => e.stopPropagation()}
                    role="document"
                    >
                    {/* Botón cerrar: z-index alto y pointer-events habilitados */}
                    <button
                        type="button"
                        onClick={() => setSelected(null)}
                        aria-label={t('cerrar') || 'Cerrar'}
                        className="absolute right-2 top-2 z-20 pointer-events-auto rounded-full bg-black/70 px-3 py-1 text-sm text-white hover:bg-black focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        ✕
                    </button>

                    <div className="relative rounded-lg bg-black">
                        {selected.kind === 'video' ? (
                        <video
                            src={urls[selected.id]}
                            className="max-h-[80vh] w-full rounded-lg bg-black"
                            controls
                            playsInline
                        />
                        ) : (
                        <div className="relative w-full h-[70vh]">
                            <Image
                            src={urls[selected.id]}
                            alt={selected.mime_type ?? 'media'}
                            fill
                            unoptimized
                            sizes="100vw"
                            className="object-contain rounded-lg"
                            />
                        </div>
                        )}
                    </div>

                    <div className="mt-3 text-sm text-gray-200">
                        {selected.taken_at
                        ? new Date(selected.taken_at).toLocaleString()
                        : selected.created_at
                        ? new Date(selected.created_at).toLocaleString()
                        : ''}
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
}
