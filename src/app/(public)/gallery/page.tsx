'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { idbGet } from '@/lib/mediaLocal';
import { useT } from '@/i18n/I18nProvider';
import Image from 'next/image';
import { resolveDriveMediaSource } from '@/lib/googleDrive/mediaResolution';
import TitleH1 from '@/components/TitleH1';
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import { StorageBadge } from '@/components/StorageIcon';

const MATCHES_PER_PAGE = 5;

type MatchInfo = {
  id: string;
  rival_team_name: string | null;
  date_at: string | null;
  player_id: string | null;
  competition_id: string | null;
};

type MediaRow = {
  id: string;
  kind: 'image' | 'video';
  storage_path: string | null;
  device_uri: string | null;
  mime_type: string | null;
  taken_at: string | null;
  created_at: string | null;
  match_id: string;
};

type MatchGroup = {
  match: MatchInfo;
  media: MediaRow[];
};

export default function MyGalleryPage() {
  const t = useT();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allMatches, setAllMatches] = useState<MatchInfo[]>([]);
  const [groups, setGroups] = useState<MatchGroup[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<MediaRow | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [unavailable, setUnavailable] = useState<Record<string, string>>({});

  const blobUrlsRef = useRef<string[]>([]);
  const resolvedIdsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);
  const loadedCountRef = useRef(0);
  const allMatchesRef = useRef<MatchInfo[]>([]);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Keep refs in sync with state
  useEffect(() => { allMatchesRef.current = allMatches; }, [allMatches]);
  useEffect(() => { hasMoreRef.current = hasMore; }, [hasMore]);
  useEffect(() => { loadingMoreRef.current = loadingMore; }, [loadingMore]);

  const loadMoreGroups = useCallback(async (
    userId: string,
    matches: MatchInfo[],
    currentCount: number,
  ) => {
    const nextBatch = matches.slice(currentCount, currentCount + MATCHES_PER_PAGE);
    if (nextBatch.length === 0) return;

    const matchIds = nextBatch.map(m => m.id);
    const { data: mediaRows, error: mediaErr } = await supabase
      .from('match_media')
      .select('id, kind, storage_path, device_uri, mime_type, taken_at, created_at, match_id')
      .in('match_id', matchIds)
      .eq('user_id', userId)
      .order('taken_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (mediaErr) return;

    const mediaByMatch: Record<string, MediaRow[]> = {};
    for (const row of (mediaRows || []) as MediaRow[]) {
      if (!mediaByMatch[row.match_id]) mediaByMatch[row.match_id] = [];
      mediaByMatch[row.match_id].push(row);
    }

    const newGroups: MatchGroup[] = nextBatch.map(match => ({
      match,
      media: mediaByMatch[match.id] || [],
    }));

    setGroups(prev => [...prev, ...newGroups]);
    loadedCountRef.current = currentCount + nextBatch.length;
    setHasMore(loadedCountRef.current < matches.length);
  }, [supabase]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        window.location.replace('/login');
        return;
      }
      userIdRef.current = user.id;

      // Get all distinct match_ids that have media for this user
      const { data: matchMediaIds, error: err1 } = await supabase
        .from('match_media')
        .select('match_id')
        .eq('user_id', user.id);

      if (!mounted) return;
      if (err1) { setError(err1.message); setLoading(false); return; }

      const uniqueMatchIds = [...new Set((matchMediaIds || []).map((r: any) => r.match_id as string))];

      if (uniqueMatchIds.length === 0) {
        setAllMatches([]);
        setLoading(false);
        return;
      }

      // Get match details ordered by date descending
      const { data: matchesData, error: err2 } = await supabase
        .from('matches')
        .select('id, rival_team_name, date_at, player_id, competition_id')
        .in('id', uniqueMatchIds)
        .order('date_at', { ascending: false, nullsFirst: false });

      if (!mounted) return;
      if (err2) { setError(err2.message); setLoading(false); return; }

      const sortedMatches = (matchesData || []) as MatchInfo[];
      setAllMatches(sortedMatches);
      loadedCountRef.current = 0;

      await loadMoreGroups(user.id, sortedMatches, 0);
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [supabase, loadMoreGroups]);

  // Resolve URLs for new media items only
  useEffect(() => {
    let cancelled = false;
    const allMedia = groups.flatMap(g => g.media);
    const newMedia = allMedia.filter(m => !resolvedIdsRef.current.has(m.id));
    if (newMedia.length === 0) return;

    (async () => {
      const out: Record<string, string> = {};
      const created: string[] = [];
      for (const m of newMedia) {
        resolvedIdsRef.current.add(m.id);
        try {
          const isDrive = m.storage_path?.startsWith('drive:');
          if (!isDrive && m.device_uri) {
            const blob = await idbGet(m.device_uri);
            if (blob) {
              const u = URL.createObjectURL(blob);
              created.push(u);
              out[m.id] = u;
              continue;
            }
          }
          if (m.storage_path?.startsWith('r2:')) {
            const base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL?.replace(/\/$/, '');
            if (base) out[m.id] = `${base}/${m.storage_path.slice(3)}`;
          } else if (isDrive) {
            const fileId = m.storage_path!.slice(6);
            const result = await resolveDriveMediaSource(fileId);
            if (result.available) {
              out[m.id] = result.src;
            } else {
              setUnavailable(prev => ({ ...prev, [m.id]: t('media_no_disponible') || t('sin_preview') || 'No disponible' }));
            }
          } else if (m.storage_path) {
            const { data, error } = await supabase.storage
              .from('matches')
              .createSignedUrl(m.storage_path, 60 * 60);
            if (!error && data?.signedUrl) out[m.id] = data.signedUrl;
          }
        } catch { /* noop */ }
      }
      if (!cancelled) {
        blobUrlsRef.current.push(...created);
        setUrls(prev => ({ ...prev, ...out }));
      }
    })();

    return () => { cancelled = true; };
  }, [groups, supabase, t]);

  // Revoke blob URLs on unmount
  useEffect(() => {
    return () => {
      for (const u of blobUrlsRef.current) {
        if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
      }
    };
  }, []);

  // Infinite scroll via IntersectionObserver (set up once)
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMoreRef.current &&
          !loadingMoreRef.current &&
          userIdRef.current
        ) {
          loadingMoreRef.current = true;
          setLoadingMore(true);
          await loadMoreGroups(userIdRef.current, allMatchesRef.current, loadedCountRef.current);
          loadingMoreRef.current = false;
          setLoadingMore(false);
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadMoreGroups]);

  async function handleDelete(mediaId: string, matchId: string) {
    const res = await fetch(`/api/match-media/${mediaId}`, { method: 'DELETE' });
    if (!res.ok) {
      const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
      setError(errMsg || 'No se pudo eliminar');
      return;
    }
    setGroups(prev =>
      prev.map(g =>
        g.match.id !== matchId
          ? g
          : { ...g, media: g.media.filter(m => m.id !== mediaId) },
      ),
    );
    if (selected?.id === mediaId) setSelected(null);
    window.dispatchEvent(new CustomEvent('cloud-usage-refresh'));
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
      return (
        <video
          src={src}
          className="w-full h-full object-cover rounded-lg bg-black"
          muted
          loop
          playsInline
        />
      );
    }
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
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div>
      <TitleH1>{t('mi_galeria') || 'Mi Galería'}</TitleH1>

      {allMatches.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-sm text-gray-600">
          {t('mi_galeria_vacia') || 'Todavía no has subido fotos ni vídeos.'}
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ match, media }) => (
            <section key={match.id}>
              {/* Group header */}
              <div className="flex flex-wrap items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                    className="shrink-0 text-green-600"
                  >
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M12 8v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <span className="font-semibold text-gray-800 text-base">
                    {match.rival_team_name || (t('partido') || 'Partido')}
                  </span>
                </div>

                {match.date_at && (
                  <span className="text-sm text-gray-500">
                    {new Date(match.date_at).toLocaleDateString()}
                  </span>
                )}

                <Link
                  href={`/matches/${match.id}/live`}
                  className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 shadow transition"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t('partido_ver') || 'Ver partido'}
                </Link>
              </div>

              {/* Media grid */}
              {media.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {media.map(item => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 bg-white shadow-sm"
                    >
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
                          onConfirm={() => handleDelete(item.id, match.id)}
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
              ) : null}
            </section>
          ))}

          {/* Sentinel for infinite scroll */}
          <div ref={sentinelRef} className="h-4" aria-hidden="true" />

          {loadingMore && (
            <div className="py-6 text-center text-sm text-gray-500">
              {t('cargando') || 'Cargando...'}
            </div>
          )}
        </div>
      )}

      {/* Fullscreen media modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          onKeyDown={e => { if (e.key === 'Escape') setSelected(null); }}
        >
          <div
            className="relative max-h-full max-w-4xl w-full"
            onClick={e => e.stopPropagation()}
            role="document"
          >
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
