'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabaseBrowser } from '../../../../lib/supabase/client';
import { idbGet } from '@/lib/mediaLocal';
import { useT } from '@/i18n/I18nProvider';
import Image from 'next/image';
import { useWakeLock } from '@/lib/useWakeLock';

//Componentes
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import TitleH1 from '@/components/TitleH1';

type MatchRow = {
  id: string;
  competition_id: string;
  player_id: string;
};

type MediaRow = {
  id: string;
  kind: 'image' | 'video';
  storage_path: string | null;
  device_uri: string | null;
  mime_type: string | null;
  taken_at: string | null;
  created_at: string | null;
};

export default function MatchGalleryPage() {
  const t = useT();
  const { id: matchId } = useParams() as { id: string };
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [match, setMatch] = useState<MatchRow | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [selected, setSelected] = useState<MediaRow | null>(null);
  //const [deletingId, setDeletingId] = useState<string | null>(null);
    const [urls, setUrls] = useState<Record<string, string>>({}); // id -> src usable
    const blobUrlsRef = useRef<string[]>([]);

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
        .select('id, kind, storage_path, device_uri, mime_type, taken_at, created_at')
        .eq('match_id', matchId)
        .order('taken_at', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false });

      if (!mounted) return;
      if (mediaError) {
        setError(mediaError.message);
        setLoading(false);
        return;
      }

      setMedia((mediaRows as MediaRow[]) || []);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [supabase, matchId]);

  const backToMatchUrl = matchId ? `/matches/${matchId}/live` : '/matches';
  const backToListUrl =
    match?.player_id && match?.competition_id
      ? `/players/${match.player_id}/competitions/${match.competition_id}/matches`
      : '/dashboard';



      // Resolver URLs: signed URL si hay storage_path; blob: si solo hay device_uri
 useEffect(() => {
   let cancelled = false;
  (async () => {
    const out: Record<string, string> = {};
    const created: string[] = [];
    for (const m of media) {
      try {
        if (m.storage_path) {
          const { data, error } = await supabase
            .storage
            .from('matches')
            .createSignedUrl(m.storage_path, 60 * 60); // 1h
          if (!error && data?.signedUrl) out[m.id] = data.signedUrl;
        } else if (m.device_uri) {
          const blob = await idbGet(m.device_uri);
          if (blob) {
            const u = URL.createObjectURL(blob);
            created.push(u);
            out[m.id] = u;
          }
        }
      } catch {/* silencio administrativo */}
    }
    if (!cancelled) {
      // revoca blobs anteriores y guarda los nuevos
      for (const u of blobUrlsRef.current) if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
      blobUrlsRef.current = created;
      setUrls(out);
    }
  })();
  return () => {
    cancelled = true;
    // revoca solo los creados en esta ejecución
    for (const u of blobUrlsRef.current) if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
    blobUrlsRef.current = [];
  };
}, [media, supabase]);


 // Re-genera signed URLs al recuperar foco (por si caducan)
 useEffect(() => {
   const onFocus = () => {
     // fuerza recálculo provocando cambio de referencia
     setMedia(m => [...m]);
   };
   window.addEventListener('focus', onFocus);
   return () => window.removeEventListener('focus', onFocus);
 }, []);
  

  async function handleDelete(id: string) {
    try {
      //setDeletingId(id);
      const res = await fetch(`/api/match-media/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
        setError(errMsg || t('error_eliminar') || 'No se pudo eliminar');
        return;
      }
      setMedia(prev => prev.filter(item => item.id !== id));
      if (selected?.id === id) {
        setSelected(null);
      }
    } finally {
      //setDeletingId(null);
    }
  }

  function renderThumb(item: MediaRow) {
    const src = urls[item.id];
    if (!src) {
      return (
        <div className="w-full h-28 bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-500">
          {t('sin_preview') || 'Sin vista previa'}
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

    if (loading) return <div className="p-6">{t('cargando') || 'Cargando…'}</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;

    return (
        <div>
            {/* Ocultar footer en esta pantalla */}
            <style jsx global>{`footer{display:none !important}`}</style>

            <TitleH1>{t('galeria') || 'Galería del partido'}</TitleH1>

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

            {selected && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setSelected(null)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="relative max-h-full max-w-4xl w-full"
                        onClick={e => e.stopPropagation()}
                    >
                        <button
                        type="button"
                        onClick={() => setSelected(null)}
                        className="absolute right-2 top-2 rounded-full bg-black/70 px-3 py-1 text-sm text-white hover:bg-black"
                        >
                        ✕
                        </button>
                        <div className="rounded-lg bg-black">
                            {selected.kind === 'video' ? (
   <video src={urls[selected.id]} className="max-h-[80vh] w-full rounded-lg bg-black" controls playsInline />
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
                            {selected.taken_at ? new Date(selected.taken_at).toLocaleString() : selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
