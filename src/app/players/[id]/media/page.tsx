'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { supabaseBrowser } from '@/lib/supabase/client';
import { idbGet, idbPut, idbDelete } from '@/lib/mediaLocal';
import { useT } from '@/i18n/I18nProvider';

import TitleH1 from '@/components/TitleH1';
import Submit from '@/components/Submit';

type SeasonItem = {
  playerSeasonId: string;
  seasonId: string;
  label: string;          // "2025/2026"
  isCurrent: boolean;
  avatar: string | null;  // key local en IndexedDB
};

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function buildAvatarKey(userId: string, playerId: string, seasonId: string) {
  // Misma idea que device_uri: string estable, y reemplazar = sobrescribir blob con misma key
  return `avatar:${userId}:${playerId}:${seasonId}`;
}

export default function PlayerMediaPage() {
  const t = useT();
  const { id: playerId } = useParams() as { id: string };
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [seasons, setSeasons] = useState<SeasonItem[]>([]);
  const [currentSeasonId, setCurrentSeasonId] = useState<string | null>(null);

  const [urls, setUrls] = useState<Record<string, string>>({}); // seasonId -> blob url
  const blobUrlsRef = useRef<string[]>([]);

  const currentSeason =
    seasons.find(s => s.seasonId === currentSeasonId) ??
    seasons.find(s => s.isCurrent) ??
    null;

  const otherSeasons = seasons.filter(s => s.seasonId !== (currentSeason?.seasonId ?? ''));

  const revokeAllBlobs = () => {
    for (const u of blobUrlsRef.current) {
      if (u?.startsWith('blob:')) URL.revokeObjectURL(u);
    }
    blobUrlsRef.current = [];
  };

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/players/${playerId}/media`, { method: 'GET' });
      const json = await res.json();

      if (!res.ok) {
        setError(json?.error ?? 'No se pudo cargar la media del jugador.');
        setLoading(false);
        return;
      }

      const list: SeasonItem[] = json.seasons ?? [];
      setSeasons(list);
      setCurrentSeasonId(json.currentSeasonId ?? null);

      // Resolver URLs locales (solo idb)
      const out: Record<string, string> = {};
      const created: string[] = [];

      for (const s of list) {
        if (!s.avatar) continue;
        try {
          const blob = await idbGet(s.avatar);
          if (blob) {
            const u = URL.createObjectURL(blob);
            created.push(u);
            out[s.seasonId] = u;
          }
        } catch {
          // silencio administrativo
        }
      }

      // revoca anteriores y guarda nuevos
      revokeAllBlobs();
      blobUrlsRef.current = created;
      setUrls(out);
    } catch (e: any) {
      setError(e?.message ?? 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return () => {
      revokeAllBlobs();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  useEffect(() => {
    const onFocus = () => setSeasons(s => [...s]); // fuerza re-render (por si cambió algo y caducó blob url)
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME.has(file.type)) return 'Formato no permitido. Usa jpg/jpeg, png, webp o gif.';
    if (file.size > MAX_BYTES) return 'La imagen supera el tamaño máximo (5 MB).';
    return null;
  };

  async function onPickFile(file: File) {
    setError(null);
    if (!currentSeason) {
      setError('No hay temporada actual definida para este jugador.');
      return;
    }

    const v = validateFile(file);
    if (v) {
      setError(v);
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError(t('sesion_iniciar_aviso') || 'Sesión requerida');
        return;
      }

      const key = buildAvatarKey(user.id, playerId, currentSeason.seasonId);

      // 1) Guardar blob en IDB
      await idbPut(key, file);

      // 2) Guardar puntero en player_seasons.avatar
      const res = await fetch(`/api/players/${playerId}/media/avatar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: currentSeason.seasonId,
          avatar: key,
          mime: file.type,
          bytes: file.size,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        // rollback: borra blob si el server no aceptó
        await idbDelete(key);
        setError(json?.error ?? 'No se pudo guardar el avatar.');
        return;
      }

      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Error guardando el avatar.');
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteCurrent() {
    setError(null);
    if (!currentSeason) return;
    if (!currentSeason.avatar) return;

    setSaving(true);
    try {
      const res = await fetch(
        `/api/players/${playerId}/media/avatar?seasonId=${encodeURIComponent(currentSeason.seasonId)}`,
        { method: 'DELETE' }
      );

      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? 'No se pudo eliminar el avatar.');
        return;
      }

      // borrar blob local
      await idbDelete(currentSeason.avatar);

      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Error eliminando el avatar.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">{t('cargando') || 'Cargando…'}</div>;
  if (!playerId) return <div className="p-6">{t('no_encontrado') || 'No encontrado'}</div>;

  const currentUrl = currentSeason ? urls[currentSeason.seasonId] : null;

  return (
    <div className="max-w-xl mx-auto">
      <TitleH1>{t('jugador_media') || 'Jugador · Media'}</TitleH1>

      <div className="p-4 space-y-6">
        {/* Temporada actual */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Temporada actual:{' '}
            <span className="font-semibold">{currentSeason?.label ?? '-'}</span>
          </div>

          <div className="rounded-xl border bg-white p-4 space-y-4">
            {!currentSeason ? (
              <div className="text-sm text-red-700">
                No se encontró temporada actual para este jugador.
              </div>
            ) : currentUrl ? (
              <>
                <div className="relative w-full aspect-square rounded-xl border overflow-hidden bg-gray-50">
                  <Image
                    src={currentUrl}
                    alt="Avatar temporada actual"
                    fill
                    unoptimized
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>

                <div className="flex gap-2">
                  <label className="flex-1">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      disabled={saving}
                      onChange={(e) => {
                        const f = e.currentTarget.files?.[0];
                        if (f) void onPickFile(f);
                        e.currentTarget.value = '';
                      }}
                    />
                    <div
                      className={`h-[40.5px] rounded-lg bg-gray-600 text-white flex items-center justify-center hover:bg-gray-700 ${
                        saving ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    >
                      {saving ? (t('guardando') || 'Guardando…') : 'Sustituir imagen'}
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => void onDeleteCurrent()}
                    className="w-28 h-[40.5px] rounded-lg border border-gray-300 hover:bg-gray-50"
                    disabled={saving}
                  >
                    Eliminar
                  </button>
                </div>

                <p className="text-xs text-gray-500">
                  Formatos: jpg/jpeg/png/webp/gif. Máximo 5 MB.
                </p>
              </>
            ) : (
              <>
                <div className="text-sm text-gray-700">
                  No hay imagen para la temporada actual.
                </div>

                <label className="block">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={saving}
                    onChange={(e) => {
                      const f = e.currentTarget.files?.[0];
                      if (f) void onPickFile(f);
                      e.currentTarget.value = '';
                    }}
                  />
                  <Submit
                    onClick={() => {}}
                    text={saving ? (t('guardando') || 'Guardando…') : 'Subir imagen'}
                    loadingText={t('guardando') || 'Guardando…'}
                    loading={saving}
                  />
                </label>

                <p className="text-xs text-gray-500">
                  Formatos: jpg/jpeg/png/webp/gif. Máximo 5 MB.
                </p>
              </>
            )}
          </div>
        </div>

        {/* Temporadas anteriores */}
        <div className="space-y-3">
          <div className="text-sm text-gray-700 font-semibold">
            Avatares de temporadas anteriores
          </div>

          {otherSeasons.length === 0 ? (
            <div className="text-sm text-gray-500">No hay temporadas anteriores.</div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {otherSeasons.map((s) => {
                const u = urls[s.seasonId];
                return (
                  <div key={s.seasonId} className="space-y-1">
                    <div className="relative aspect-square rounded-lg border bg-white overflow-hidden">
                      {u ? (
                        <Image
                          src={u}
                          alt={`Avatar ${s.label}`}
                          fill
                          unoptimized
                          sizes="33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    <div className="text-[11px] text-gray-600 text-center">{s.label}</div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-gray-500">
            Las imágenes de temporadas anteriores son solo de consulta.
          </p>
        </div>

        {error && (
          <div className="rounded border p-3 bg-red-50 text-red-700">{error}</div>
        )}
      </div>
    </div>
  );
}
