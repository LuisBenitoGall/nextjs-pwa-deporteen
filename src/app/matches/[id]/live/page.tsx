// =============================================
// 2) FASE 2: LIVE (MARCADOR + ESTADÍSTICAS)
// Ruta: src/app/matches/[id]/live/page.tsx
// Carga el partido y permite editar marcador y stats con AUTOGUARDADO debounce.
// Si offline: guarda en localStorage y ofrece botón "Guardar ahora" para volcar.
// =============================================

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '../../../../lib/supabase/client';
import { useParams } from 'next/navigation';
import { getCurrentSeasonId } from '@/lib/seasons';
import { useT } from '@/i18n/I18nProvider';

import Input from '@/components/Input';
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
};

type Competition = { id: string; name: string; sport_id: string; season_id: string | null ; team_id: string | null};
type Season = { id: string; year_start?: number | null; year_end?: number | null };
type Sport = { id: string; name: string | null; stats: any };
type Team = { id: string; name: string | null };

export default function LiveMatchPage() {
    const t = useT();
    const params = useParams();
    const matchId = params?.id as string;

    const supabase = useMemo(() => supabaseBrowser(), []);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [match, setMatch] = useState<MatchRow | null>(null);
    const [competition, setCompetition] = useState<Competition | null>(null);
    const [sport, setSport] = useState<Sport | null>(null);
    const [myTeam, setMyTeam] = useState<Team | null>(null);
    const [season, setSeason] = useState<Season | null>(null);

    // Estado editable (modelo nuevo)
    const [myScore, setMyScore] = useState<number>(0);
    const [rivalScore, setRivalScore] = useState<number>(0);
    const [notes, setNotes] = useState<string>('');
    const [stats, setStats] = useState<Record<string, any>>({});

    const draftKey = useMemo(() => `match:${matchId}:draft`, [matchId]);
    const savingRef = useRef<NodeJS.Timeout | null>(null);

    const scheduleSave = useCallback(() => {
        const draft = { my_score: myScore, rival_score: rivalScore, notes, stats };
        try { localStorage.setItem(draftKey, JSON.stringify(draft)); } catch {}

        if (!navigator.onLine) return;
        if (savingRef.current) clearTimeout(savingRef.current);
        savingRef.current = setTimeout(async () => {
            await supabase
            .from('matches')
            .update({
              my_score: myScore,
              rival_score: rivalScore,
              notes,
              stats: Object.keys(stats || {}).length ? stats : null,
            })
            .eq('id', matchId);
        }, 800);
    }, [draftKey, matchId, myScore, notes, rivalScore, stats, supabase]);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setError(null);

            const { data: m, error: mErr } = await supabase
            .from('matches')
            .select('*')
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

            // Temporada (usa el season_id si existe; si no, calcula id a partir de la fecha del partido)
            let seasonId = matchRow.season_id ?? (comp as Competition)?.season_id;

            if (!seasonId) {
                // getCurrentSeasonId espera una Date; pásale la fecha del partido
                seasonId = await getCurrentSeasonId(supabase, new Date(matchRow.date_at));
            }

            if (seasonId) {
                const { data: seasonRow } = await supabase
                .from('seasons')
                .select('id, year_start, year_end')
                .eq('id', seasonId)
                .maybeSingle();
                if (!mounted) return;
                setSeason((seasonRow as Season) || null);
            }

            // Cargar el nombre del equipo del jugador
            if ((comp as Competition)?.team_id) {
                const { data: teamRow } = await supabase
                .from('teams')
                .select('id, name')
                .eq('id', (comp as Competition).team_id!)
                .maybeSingle();
                if (!mounted) return;
                setMyTeam(teamRow as Team || null);
            }

            // Estado desde servidor
            const ms = Number(matchRow.my_score ?? 0);
            const rs = Number(matchRow.rival_score ?? 0);
            setMyScore(Number.isFinite(ms) ? ms : 0);
            setRivalScore(Number.isFinite(rs) ? rs : 0);
            setNotes(matchRow.notes || '');
            setStats((matchRow.stats as any) || {});

            // Merge desde draft local (si existe)
            try {
                const draft = localStorage.getItem(draftKey);
                if (draft) {
                    const d = JSON.parse(draft);
                    if (typeof d.my_score === 'number') {
                        setMyScore(d.my_score);
                    }
                    if (typeof d.rival_score === 'number') {
                        setRivalScore(d.rival_score);
                    }
                    if (typeof d.notes === 'string') {
                        setNotes(d.notes);
                    }
                    if (d.stats && typeof d.stats === 'object') {
                        setStats(d.stats);
                    }
                }
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                }
            }

            setLoading(false);
        })();

        return () => { mounted = false; };
    }, [draftKey, matchId, supabase]);

    // Autosave en cambios
    useEffect(() => {
        if (loading) return;
        scheduleSave();
        return () => {
            if (savingRef.current) {
                clearTimeout(savingRef.current);
            }
        };
    }, [loading, myScore, notes, rivalScore, scheduleSave, stats]);

    if (loading) return <div className="p-6">{t('cargando') || 'Cargando…'}</div>;
    if (error) {
        return (
            <div className="p-6 text-red-600">
                {error}
            </div>
        );
    }
    if (!match) return <div className="p-6">{t('no_encontrado') || 'No encontrado'}</div>;

    // Local SIEMPRE a la izquierda, visitante a la derecha
    const myTeamName = myTeam?.name || (t('mi_equipo') || 'Mi equipo');
    const leftIsHome = !!match.is_home;

    const leftLabel  = leftIsHome
      ? myTeamName
      : (match.rival_team_name || t('equipo_rival') || 'Equipo rival');

    const rightLabel = leftIsHome
      ? (match.rival_team_name || t('equipo_rival') || 'Equipo rival')
      : myTeamName;

    // 👇 paréntesis para no enfadar al parser
    const seasonLabel =
    season?.year_start && season?.year_end
    ? `${season.year_start}-${season.year_end}`
    : (t('temporada') || 'Temporada');

    // Los contadores que se muestran a izquierda/derecha
    const leftScore  = leftIsHome ? myScore : rivalScore;
    const rightScore = leftIsHome ? rivalScore : myScore;

    // Handlers para botones ± respetando el mapeo izquierda/local
    function incLeft() {
        if (leftIsHome) {
            setMyScore((prev) => prev + 1);
        } else {
            setRivalScore((prev) => prev + 1);
        }
    }
    function decLeft() {
        if (leftIsHome) {
            setMyScore((prev) => Math.max(0, prev - 1));
        } else {
            setRivalScore((prev) => Math.max(0, prev - 1));
        }
    }
    function incRight() {
        if (leftIsHome) {
            setRivalScore((prev) => prev + 1);
        } else {
            setMyScore((prev) => prev + 1);
        }
    }
    function decRight() {
        if (leftIsHome) {
            setRivalScore((prev) => Math.max(0, prev - 1));
        } else {
            setMyScore((prev) => Math.max(0, prev - 1));
        }
    }

    // Definición de stats dinámicas desde sports.stats
    const statDefs: Array<{ key: string; label: string; type: 'number'|'text'|'boolean' }> = (() => {
        const s = sport?.stats;
        const out: any[] = [];
        if (!s) return out;
        const norm = (x:any) => String(x||'').toLowerCase();
        const typeOf = (t:any)=> norm(t).includes('bool') ? 'boolean'
                               : (norm(t).includes('int')||norm(t).includes('num')||norm(t).includes('float')) ? 'number'
                               : 'text';
        if (Array.isArray(s)) {
            for (const it of s) {
                const key = it?.key ?? it?.name ?? it?.id; if (!key) continue;
                out.push({ key, label: it.label ?? key, type: typeOf(it.type) });
            }
        } else if (typeof s === 'object') {
            for (const k of Object.keys(s)) {
                const it = s[k] || {}; out.push({ key: k, label: it.label ?? k, type: typeOf(it.type) });
            }
        }
        return out;
    })();

    function setStat(key: string, type: string, value: any) {
        setStats(prev => {
            let v:any = value;
            if (type === 'number') {
                v = value === '' ? null : Number(value);
                if (Number.isNaN(v)) v = null;
            } else if (type === 'boolean') {
                v = !!value;
            }
            return { ...(prev||{}), [key]: v };
        });
    }

    async function flushNow() {
        await supabase.from('matches').update({
            my_score: myScore,
            rival_score: rivalScore,
            notes,
            stats: Object.keys(stats || {}).length ? stats : null,
        }).eq('id', matchId);
        try { localStorage.removeItem(draftKey); } catch {}
    }

    return (
        <div className="max-w-4xl mx-auto pb-24">
            <TitleH1>
                <span className="block md:inline">{leftLabel}</span>
                <span className="block md:inline md:px-2 text-base md:text-inherit text-gray-700">vs</span>
                <span className="block md:inline">{rightLabel}</span>
            </TitleH1>

            {/* Cabecera informativa */}
            <div className="text-sm text-gray-700 mb-4 grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1">
                <div>{t('temporada')}: <b>{seasonLabel}</b></div>
                <div>{t('competicion')}: <b>{sport?.name} - {competition?.name}</b></div>
                <div>{t('fecha')}: <b>{new Date(match.date_at).toLocaleString()}</b></div>
                <div>{t('lugar')}: <b>{match.place}</b></div>
            </div>

            {/* Marcador: local (izda) vs visitante (dcha) */}
            <div className="grid grid-cols-2 gap-6 items-center my-6">
                {/* Lado izquierdo (local si is_home) */}
                <div className="text-center">
                    <div className="text-sm mb-2">{leftLabel}</div>
                    <div className="flex items-center justify-center gap-4">
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                aria-label="+1"
                                className="rounded-md px-3 py-2 border"
                                onClick={incLeft}
                            >
                                +
                            </button>
                            <button
                                type="button"
                                aria-label="-1"
                                className="rounded-md px-3 py-2 border"
                                onClick={decLeft}
                            >
                                -
                            </button>
                        </div>
                        <div className="grid place-content-center border rounded-md w-24 sm:w-28 md:w-32 lg:w-40 aspect-square text-5xl md:text-6xl font-bold select-none">
                            {leftScore}
                        </div>
                    </div>
                </div>

                {/* Lado derecho (visitante si is_home) */}
                <div className="text-center">
                    <div className="text-sm mb-2">{rightLabel}</div>
                    <div className="flex items-center justify-center gap-4">
                        <div className="grid place-content-center border rounded-md w-24 sm:w-28 md:w-32 lg:w-40 aspect-square text-5xl md:text-6xl font-bold select-none">
                            {rightScore}
                        </div>
                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                aria-label="+1"
                                className="rounded-md px-3 py-2 border"
                                onClick={incRight}
                            >
                                +
                            </button>
                            <button
                                type="button"
                                aria-label="-1"
                                className="rounded-md px-3 py-2 border"
                                onClick={decRight}
                            >
                                -
                            </button>
                        </div>
                    </div>
                </div>
            </div>

        {/* Estadísticas individuales */}
        {statDefs.length > 0 && (
            <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">{t('estadisticas_individuales') || 'Estadísticas individuales'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {statDefs.map((f) => (
              f.type === 'boolean' ? (
                <label key={f.key} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!stats[f.key]} onChange={(e)=>setStat(f.key, 'boolean', e.target.checked)} /> {f.label}
                </label>
              ) : (
                <Input
                  key={f.key}
                  label={f.label}
                  type={f.type==='number'?'number':'text'}
                  noSpinner={f.type==='number'}
                  value={stats[f.key] ?? ''}
                  onChange={(e:any)=>setStat(f.key, f.type, e.target.value)}
                />
                            )
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6">
                {/*<label className="block text-sm font-medium text-gray-700 mb-1">{t('observaciones')}</div>*/}
                <Textarea value={notes} onChange={(e:any)=>setNotes(e.target.value)} />
            </div>

            {/* Barra inferior acciones cámara/galería */}
            <div className="fixed bottom-0 left-0 right-0 border-t bg-white/90 backdrop-blur p-3">
                {/* Grid responsiva: en mobile 3 columnas (Guardar ocupa 2), en md+ Guardar 1 col y media 2 cols */}
                <div className="max-w-4xl mx-auto grid grid-cols-3 gap-3 items-stretch">
                    {/* Guardar: 2 columnas en móvil, 1 en pantallas mayores */}
                    <div className="col-span-2 md:col-span-1 order-1 md:order-2">
                        <Submit onClick={flushNow as any} text={t('guardar') || 'Guardar ahora'} loadingText={t('guardando') || 'Guardando…'} />
                    </div>

                    {/* Zona media (Foto/Video/Galería): ocupa el resto del espacio */}
                    <div className="col-span-1 md:col-span-2 order-2 md:order-1 grid grid-cols-3 gap-3">
                        <label className="w-full text-xs">
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={()=>{/* TODO: guardar en device + vincular al match */}} />
                            <span className="block w-full text-center border rounded-md px-3 py-2">📷 {t('foto') || 'Foto'}</span>
                        </label>
                        
                        <label className="w-full text-xs">
                            <input type="file" accept="video/*" capture className="hidden" onChange={()=>{/* TODO */}} />
                            <span className="block w-full text-center border rounded-md px-3 py-2">🎥 {t('video') || 'Video'}</span>
                        </label>
                        <button type="button" className="block w-full text-center border rounded-md px-3 py-2 text-xs">🖼️ {t('galeria') || 'Galería'}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

