// =============================================
// Vista LIVE del partido (marcador + stats)
// =============================================
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '../../../../lib/supabase/client';
import { useParams } from 'next/navigation';
import { getCurrentSeasonId } from '@/lib/seasons';
import { getSportIconPath } from '@/lib/sports';
import { useT } from '@/i18n/I18nProvider';
import Image from 'next/image';

import Input from '@/components/Input';
import Link from 'next/link';
import Textarea from '@/components/Textarea';
import TitleH1 from '@/components/TitleH1';
import Submit from '@/components/Submit';

type MatchRow = {
  id: string;
  competition_id: string;
  sport_id: string;
  season_id: string | null;
  date_at: string;
  place: string | null;
  is_home: boolean;
  rival_team_name: string | null;
  my_score: number | null;
  rival_score: number | null;
  notes: string | null;
  stats: Record<string, any> | null;
  player_id: string;
  status?: string | null;
  updated_at?: string | null;
};

type Competition = {
  id: string;
  name: string;
  sport_id: string;
  season_id: string | null;
  team_id: string | null;
};
type Season = { id: string; year_start?: number | null; year_end?: number | null };
type Sport  = { id: string; name: string | null; stats: any };
type Team   = { id: string; name: string | null };

export default function LiveMatchPage() {
  const t = useT();
  const { id: matchId } = useParams() as { id: string };
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [isSaving, setIsSaving]   = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const [match, setMatch]             = useState<MatchRow | null>(null);
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [sport, setSport]             = useState<Sport | null>(null);
  const [myTeam, setMyTeam]           = useState<Team | null>(null);
  const [season, setSeason]           = useState<Season | null>(null);

  // Estado editable
  const [myScore, setMyScore]       = useState<number>(0);
  const [rivalScore, setRivalScore] = useState<number>(0);
  const [notes, setNotes]           = useState<string>('');
  const [stats, setStats]           = useState<Record<string, any>>({});

  // Debounce SOLO para notas/stats
  const savingRef = useRef<NodeJS.Timeout | null>(null);
  const scheduleSave = useCallback(() => {
    if (savingRef.current) clearTimeout(savingRef.current);

    const payload = {
      my_score: myScore,
      rival_score: rivalScore,
      notes,
      stats: Object.keys(stats || {}).length ? stats : null,
    };

    savingRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/matches/${matchId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
          setError(errMsg || 'No se pudo guardar');
        }
      } catch (e: any) {
        setError(e?.message || 'No se pudo guardar');
      }
    }, 600);
  }, [matchId, myScore, rivalScore, notes, stats]);

  useEffect(() => () => { if (savingRef.current) clearTimeout(savingRef.current); }, []);

  // Carga inicial
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);

      const { data: m, error: mErr } = await supabase
        .from('matches')
        .select('id, competition_id, sport_id, season_id, date_at, place, is_home, rival_team_name, my_score, rival_score, notes, stats, player_id, status, updated_at')
        .eq('id', matchId)
        .single();

      if (!mounted) return;
      if (mErr) { setError(mErr.message); setLoading(false); return; }

      const matchRow = m as MatchRow;
      setMatch(matchRow);

      const [{ data: comp }, { data: sp }] = await Promise.all([
        supabase.from('competitions').select('id, name, sport_id, season_id, team_id').eq('id', matchRow.competition_id).single(),
        supabase.from('sports').select('id, name, stats').eq('id', matchRow.sport_id).single(),
      ]);
      if (!mounted) return;
      setCompetition(comp as Competition);
      setSport(sp as Sport);

      let seasonId = matchRow.season_id ?? (comp as Competition)?.season_id;
      if (!seasonId) seasonId = await getCurrentSeasonId(supabase, new Date(matchRow.date_at));
      if (seasonId) {
        const { data: seasonRow } = await supabase
          .from('seasons')
          .select('id, year_start, year_end')
          .eq('id', seasonId)
          .maybeSingle();
        if (!mounted) return;
        setSeason((seasonRow as Season) || null);
      }

      if ((comp as Competition)?.team_id) {
        const { data: teamRow } = await supabase
          .from('teams')
          .select('id, name')
          .eq('id', (comp as Competition).team_id!)
          .maybeSingle();
        if (!mounted) return;
        setMyTeam((teamRow as Team) || null);
      }

      setMyScore(Number.isFinite(Number(matchRow.my_score)) ? Number(matchRow.my_score) : 0);
      setRivalScore(Number.isFinite(Number(matchRow.rival_score)) ? Number(matchRow.rival_score) : 0);
      setNotes(matchRow.notes || '');
      setStats((matchRow.stats as any) || {});

      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [supabase, matchId]);

  // Lado local
  const leftIsHome = !!match?.is_home;

  // Guardado inmediato del marcador
  const updateScores = useCallback(async (deltaLeft: number, side: 'left' | 'right') => {
    let nextMy = myScore;
    let nextRival = rivalScore;

    if (leftIsHome) {
      if (side === 'left') nextMy = Math.max(0, myScore + deltaLeft);
      else                 nextRival = Math.max(0, rivalScore + deltaLeft);
    } else {
      if (side === 'left') nextRival = Math.max(0, rivalScore + deltaLeft);
      else                 nextMy = Math.max(0, myScore + deltaLeft);
    }

    // Optimistic UI
    setMyScore(nextMy);
    setRivalScore(nextRival);

    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ my_score: nextMy, rival_score: nextRival }),
      });
      if (!res.ok) {
        const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
        setMyScore(myScore); setRivalScore(rivalScore);
        setError(errMsg || 'No se pudo actualizar el marcador');
      }
    } catch (e: any) {
      setMyScore(myScore); setRivalScore(rivalScore);
      setError(e?.message || 'No se pudo actualizar el marcador');
    }
  }, [leftIsHome, myScore, rivalScore, matchId]);

  // Handlers ±
  const incLeft  = () => void updateScores(+1, 'left');
  const decLeft  = () => void updateScores(-1, 'left');
  const incRight = () => void updateScores(+1, 'right');
  const decRight = () => void updateScores(-1, 'right');

  const backToListUrl = `/players/${match?.player_id}/competitions/${match?.competition_id}/matches`;

  async function handleDeleteConfirm() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
      if (!res.ok) {
        const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
        setError(errMsg || 'No se pudo eliminar');
        setIsDeleting(false);
        return;
      }
      window.location.href = backToListUrl;
    } catch (e: any) {
      setError(e?.message || 'No se pudo eliminar');
      setIsDeleting(false);
    }
  }

  if (loading) return <div className="p-6">{t('cargando') || 'Cargando…'}</div>;
  if (error)   return <div className="p-6 text-red-600">{error}</div>;
  if (!match)  return <div className="p-6">{t('no_encontrado') || 'No encontrado'}</div>;

  const myTeamName = myTeam?.name || (t('mi_equipo') || 'Mi equipo');
  const leftLabel  = leftIsHome ? myTeamName : (match.rival_team_name || t('equipo_rival') || 'Equipo rival');
  const rightLabel = leftIsHome ? (match.rival_team_name || t('equipo_rival') || 'Equipo rival') : myTeamName;

  const seasonLabel =
    season?.year_start && season?.year_end
      ? `${season.year_start}-${season.year_end}`
      : (t('temporada') || 'Temporada');

  const leftScore  = leftIsHome ? myScore    : rivalScore;
  const rightScore = leftIsHome ? rivalScore : myScore;

  const statDefs: Array<{ key: string; label: string; type: 'number' | 'text' | 'boolean' }> = (() => {
    const raw = sport?.stats;
    if (!raw) return [];
    const normalizeType = (value: unknown): 'number' | 'text' | 'boolean' => {
      const text = String(value ?? '').toLowerCase();
      if (text.includes('bool')) return 'boolean';
      if (text.includes('int') || text.includes('num') || text.includes('float')) return 'number';
      return 'text';
    };
    const fields: Array<{ key: string; label: string; type: 'number' | 'text' | 'boolean' }> = [];
    const pushField = (f: any) => {
      const key = f?.key ?? f?.name ?? f?.id;
      if (!key) return;
      const label = f?.label && String(f.label).trim().length ? f.label : key;
      fields.push({ key, label, type: normalizeType(f?.type) });
    };
    if (Array.isArray((raw as any)?.fields)) (raw as any).fields.forEach(pushField);
    else if (Array.isArray(raw)) (raw as any[]).forEach(pushField);
    else if (raw && typeof raw === 'object') Object.values(raw as Record<string, any>).forEach(pushField);
    return fields;
  })();

  function setStat(key: string, type: 'number' | 'text' | 'boolean', value: any) {
    setStats(prev => {
      const next = { ...(prev || {}) };
      let casted: any = value;
      if (type === 'number') { casted = value === '' ? null : Number(value); if (Number.isNaN(casted)) casted = null; }
      else if (type === 'boolean') { casted = !!value; }
      if (casted === null || casted === undefined || (type === 'text' && casted === '')) delete next[key];
      else next[key] = casted;
      return next;
    });
    scheduleSave();
  }

  async function flushNow() {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          my_score: myScore,
          rival_score: rivalScore,
          notes,
          stats: Object.keys(stats || {}).length ? stats : null,
        }),
      });
      if (!res.ok) {
        const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
        setError(errMsg || 'No se pudo guardar');
      }
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <div className="max-w-4xl mx-auto pb-28">
        {/* Ocultar el footer global SOLO en esta página */}
        <style jsx global>{`footer{display:none !important}`}</style>
        <style jsx>{`
          @media (max-width: 500px) {
            .responsive-button { width: 46px; height: 46px; }
          }
        `}</style>

        <div className="relative">
            <TitleH1>
                <span className="block md:inline">{leftLabel}</span>
                <span className="block md:inline md:px-2 text-base md:text-inherit text-gray-700">vs</span>
                <span className="block md:inline">{rightLabel}</span>
            </TitleH1>

            {/* Icono a la derecha, con margen máximo 15px */}
            {sport?.name && getSportIconPath(sport.name) && (
                <Image
                src={getSportIconPath(sport.name)!}
                alt={sport.name || 'deporte'}
                width={60}
                height={60}
                className="absolute top-1/2 -translate-y-1/2 right-0 select-none"
                style={{ objectFit: 'contain' }}
                priority
                />
            )}
        </div>

        <div className="flex items-center gap-2 mb-4">
          <a href={backToListUrl} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{t('competicion_volver') || 'Partidos de la competición'}</span>
          </a>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            aria-label={t('eliminar') || 'Eliminar'}
            title={t('eliminar') || 'Eliminar'}
            className="ml-auto inline-flex items-center justify-center rounded-lg bg-red-100 p-2 text-red-700 hover:bg-red-200"
          >
            {/* Trash icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>

        {/* Cabecera */}
        <div className="text-sm text-gray-700 mb-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
            <div>{t('temporada')}: <b>{seasonLabel}</b></div>
            <div>{t('competicion')}: <b>{sport?.name} - {competition?.name}</b></div>
            <div>{t('fecha')}: <b>{new Date(match.date_at).toLocaleString()}</b></div>
            <div>{t('lugar')}: <b>{match.place}</b></div>
        </div>

        {/* Marcador */}
        <div className="grid grid-cols-2 gap-6 items-center my-6">
            {/* Izquierda */}
            <div className="text-center">
                <div className="text-sm mb-2 text-green-700 font-bold text-center" style={{ fontSize: '1.1rem' }}>
                    <span className="bg-green-700 text-white rounded-md px-3 py-1">{leftLabel}</span>
                </div>
                <div className="flex items-center justify-center gap-4">
                    <div className="flex flex-col gap-2">
                        <button type="button" aria-label="+1" className="rounded-md px-3 py-2 border" onClick={incLeft}>+</button>
                        <button type="button" aria-label="-1" className="rounded-md px-3 py-2 border" onClick={decLeft}>-</button>
                    </div>
                    <div className="grid place-content-center border rounded-md w-24 sm:w-28 md:w-32 lg:w-40 aspect-square text-5xl md:text-6xl font-bold select-none">
                        {leftScore}
                    </div>
                </div>
            </div>

            {/* Derecha */}
            <div className="text-center">
                <div className="text-sm mb-2 text-green-700 font-bold text-center" style={{ fontSize: '1.1rem' }}>
                    <span className="bg-green-700 text-white rounded-md px-3 py-1">{rightLabel}</span>
                </div>
                <div className="flex items-center justify-center gap-4">
                    <div className="grid place-content-center border rounded-md w-24 sm:w-28 md:w-32 lg:w-40 aspect-square text-5xl md:text-6xl font-bold select-none">
                    {rightScore}
                    </div>
                    <div className="flex flex-col gap-2">
                        <button type="button" aria-label="+1" className="rounded-md px-3 py-2 border" onClick={incRight}>+</button>
                        <button type="button" aria-label="-1" className="rounded-md px-3 py-2 border" onClick={decRight}>-</button>
                    </div>
                </div>
            </div>
        </div>

        <p className="text-center text-gray-500 font-bold underline">{t('recuerda_guardar_cambios')}</p>

        {/* Stats */}
        {statDefs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-3">{t('estadisticas_individuales') || 'Estadísticas individuales'}</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-2 gap-y-0">
              {statDefs.map((f) =>
                f.type === 'boolean' ? (
                  <label key={f.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!stats[f.key]} onChange={(e)=>setStat(f.key, 'boolean', e.target.checked)} /> {f.label}
                  </label>
                ) : (
                  <Input
                    key={f.key}
                    label={f.label}
                    type={f.type==='number' ? 'number' : 'text'}
                    noSpinner={f.type==='number'}
                    value={stats[f.key] ?? ''}
                    onChange={(e:any)=>setStat(f.key, f.type, e.target.value)}
                  />
                )
              )}
            </div>
          </div>
        )}

        <div className="mt-0">
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="notes">
            {t('comentarios') || 'Comentarios'}
          </label>
          <Textarea value={notes} onChange={(e:any)=>{ setNotes(e.target.value); scheduleSave(); }} />
        </div>

        {/* Barra inferior */}
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur p-3">
          <div className="max-w-4xl mx-auto grid grid-cols-5 gap-3 items-stretch">
            {/* Foto */}
            <label className="block responsive-button">
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={() => {/* TODO */}} />
              <span className="grid place-content-center gap-1 border border-gray-300 rounded-lg text-xs">
                <div className="text-base text-center">📷</div>
                <div className="font-medium">{t('foto') || 'Foto'}</div>
              </span>
            </label>

            {/* Vídeo */}
            <label className="block responsive-button">
              <input type="file" accept="video/*" capture className="hidden" onChange={() => {/* TODO */}} />
              <span className="grid place-content-center gap-1 border border-gray-300 rounded-lg text-xs">
                <div className="text-base text-center">🎥</div>
                <div className="font-medium">{t('video') || 'Vídeo'}</div>
              </span>
            </label>

            {/* Galería */}
            <Link
              href={`/matches/${matchId}/gallery`}
              className="grid place-content-center gap-1 border border-gray-300 rounded-lg text-xs responsive-button"
            >
              <div className="text-base text-center">🖼️</div>
              <div className="font-medium">{t('galeria') || 'Galería'}</div>
            </Link>

            {/* Editar (Link estilizado como botón) */}
            <Link
              href={`/matches/${matchId}/edit`}
              className="w-full responsive-submit-button inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              {t('editar') || 'Editar'}
            </Link>

            {/* Guardar manual */}
            <Submit
              onClick={flushNow as any}
              text={t('guardar') || 'Guardar'}
              loadingText={t('guardando') || 'Guardando…'}
              loading={isSaving}
              className="responsive-submit-button"
            />
          </div>
        </div>
      </div>

            {/* Modal eliminar */}
            {deleteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
                    <div className="absolute inset-0 bg-black/40" onClick={() => !isDeleting && setDeleteOpen(false)} aria-hidden="true"></div>
                    
                    <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="px-6 pt-5">
                            <h3 className="text-base font-semibold text-gray-900">{t('partido_eliminar_confirmar') || 'Confirmar eliminación'}</h3>
                            <p className="mt-2 text-sm text-gray-600">{t('partido_eliminar_texto_modal') || 'Si eliminas este partido, se borrarán todos sus datos. Esta acción es irreversible.'}</p>
                        </div>
                        <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={() => setDeleteOpen(false)}
                                disabled={isDeleting}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                {t('volver_atras')}
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white ${isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                            >
                                {isDeleting ? (t('eliminando') || 'Eliminando…') : (t('partido_eliminar_confirmar') || 'Confirmar eliminación')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
