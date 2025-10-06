// =============================================
// Vista LIVE del partido (marcador + stats)
// =============================================
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '../../../../lib/supabase/client';
import { useParams } from 'next/navigation';
import { getCurrentSeasonId } from '@/lib/seasons';
import { useT } from '@/i18n/I18nProvider';

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

    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState<string | null>(null);

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

  // Define the backToListUrl variable to point to the competition page
  const backToListUrl = `/players/${match?.player_id}/competitions/${match?.competition_id}/matches`;

  // Early returns
  if (loading) return <div className="p-6">{t('cargando') || 'Cargando…'}</div>;
  if (error)   return <div className="p-6 text-red-600">{error}</div>;
  if (!match)  return <div className="p-6">{t('no_encontrado') || 'No encontrado'}</div>;

  // Labels & layout
  const myTeamName = myTeam?.name || (t('mi_equipo') || 'Mi equipo');
  const leftLabel  = leftIsHome ? myTeamName : (match.rival_team_name || t('equipo_rival') || 'Equipo rival');
  const rightLabel = leftIsHome ? (match.rival_team_name || t('equipo_rival') || 'Equipo rival') : myTeamName;

  const seasonLabel =
    season?.year_start && season?.year_end
      ? `${season.year_start}-${season.year_end}`
      : (t('temporada') || 'Temporada');

  const leftScore  = leftIsHome ? myScore    : rivalScore;
  const rightScore = leftIsHome ? rivalScore : myScore;

  // Campos de stats dinámicos
  const statDefs: Array<{ key: string; label: string; type: 'number' | 'text' | 'boolean' }> = (() => {
    const raw = sport?.stats;
    if (!raw) return [];

    const normalizeType = (value: unknown): 'number' | 'text' | 'boolean' => {
      const text = String(value ?? '').toLowerCase();
      if (text.includes('bool')) return 'boolean';
      if (text.includes('int') || text.includes('num') || text.includes('float')) return 'number';
      return 'text';
    };

    const pushField = (acc: Array<{ key: string; label: string; type: 'number' | 'text' | 'boolean' }>, field: any) => {
      const key = field?.key ?? field?.name ?? field?.id;
      if (!key || typeof key !== 'string') return acc;
      const label = typeof field?.label === 'string' && field.label.trim().length > 0 ? field.label : key;
      acc.push({ key, label, type: normalizeType(field?.type) });
      return acc;
    };

    const fields: Array<{ key: string; label: string; type: 'number' | 'text' | 'boolean' }> = [];

    if (Array.isArray((raw as any)?.fields)) {
      for (const field of (raw as any).fields) pushField(fields, field);
    } else if (Array.isArray(raw)) {
      for (const field of raw) pushField(fields, field);
    } else if (raw && typeof raw === 'object') {
      for (const value of Object.values(raw as Record<string, any>)) pushField(fields, value);
    }

    return fields;
  })();

  function setStat(key: string, type: 'number' | 'text' | 'boolean', value: any) {
    setStats(prev => {
      const next = { ...(prev || {}) };
      let casted: any = value;

      if (type === 'number') {
        casted = value === '' ? null : Number(value);
        if (Number.isNaN(casted)) casted = null;
      } else if (type === 'boolean') {
        casted = !!value;
      }

      if (casted === null || casted === undefined || (type === 'text' && casted === '')) {
        delete next[key];
      } else {
        next[key] = casted;
      }

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
        <div className="max-w-4xl mx-auto pb-28">
            {/* Ocultar el footer global SOLO en esta página */}
            <style jsx global>{`footer{display:none !important}`}</style>

            {/* Correct placement of <style jsx> */}
            <style jsx>{`
                @media (max-width: 500px) {
                    .responsive-button {
                        width: 46px;
                        height: 46px;
                    }
                }
            `}</style>

            <TitleH1>
                <span className="block md:inline">{leftLabel}</span>
                <span className="block md:inline md:px-2 text-base md:text-inherit text-gray-700">vs</span>
                <span className="block md:inline">{rightLabel}</span>
            </TitleH1>

            <div className="flex items-center gap-2 mb-4">
                <a href={backToListUrl} className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span>{t('competicion_volver') || 'Partidos de la competición'}</span>
                </a>
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

            {/* Stats individuales */}
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

            {/* Barra inferior: tiles cuadrados + botón Editar + Guardar */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur p-3">
                <div className="max-w-4xl mx-auto grid grid-cols-5 gap-3 items-stretch">
                    {/* Foto */}
                    <label className="block responsive-button">
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={()=>{/* TODO */}} />
                        <span className="grid place-content-center gap-1 border border-gray-300 rounded-lg text-xs">
                        <div className="text-base text-center">📷</div>
                        <div className="font-medium">{t('foto') || 'Foto'}</div>
                        </span>
                    </label>

                    {/* Vídeo */}
                    <label className="block responsive-button">
                        <input type="file" accept="video/*" capture className="hidden" onChange={()=>{/* TODO */}} />
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

                    {/* Editar */}
                    <Link href={`/matches/${matchId}/edit`}>
                        <Submit
                            text={t('editar') || 'Editar'}
                            className="w-full responsive-submit-button"
                        />
                    </Link>

                    {/* Guardar */}
                    <div className="col-span-1">
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
        </div>
    );
}
