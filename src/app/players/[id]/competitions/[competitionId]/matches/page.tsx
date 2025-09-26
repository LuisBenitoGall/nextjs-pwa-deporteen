'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '../../../../../../lib/supabase/client';
import { useParams } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import Link from 'next/link';
//Charts
import { ResponsiveContainer, CartesianGrid, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';

//Components
import TitleH1 from '@/components/TitleH1';

type TabKey = 'matches' | 'charts';

type MatchRow = {
    id: string;
    date_at: string;
    place: string | null;
    is_home: boolean;
    rival_team_name: string | null;
    my_score: number | null;
    rival_score: number | null;
    competition_id: string;
    season_id: string | null;
    player_id: string;
    stats?: Record<string, any> | null; 
};
type Competition = {
    id: string;
    name: string;
    sport_id: string;
    season_id: string | null;
    team_id: string | null;
};
type Season = { id: string; year_start: number | null; year_end: number | null };
type Sport = { id: string; name: string | null; stats: any | null };
type Team = { id: string; name: string | null };

export default function MatchesByCompetitionPage() {
    const t = useT();
    const { id: playerId, competitionId } = useParams() as { id?: string; competitionId?: string };
    const [tab, setTab] = useState<TabKey>('matches');

    const supabase = useMemo(() => supabaseBrowser(), []);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [competition, setCompetition] = useState<Competition | null>(null);
    const [team, setTeam] = useState<Team | null>(null);
    const [matches, setMatches] = useState<MatchRow[]>([]);
    const [season, setSeason] = useState<Season | null>(null);
    const [sport, setSport] = useState<Sport | null>(null);

    // Paleta coherente con el marcador
    const WIN_COLOR  = '#16a34a'; // tailwind green-600
    const LOSS_COLOR = '#dc2626'; // tailwind red-600
    const DRAW_COLOR = '#6b7280'; // tailwind gray-500

    const PF_COLOR   = WIN_COLOR;  // PF en verde
    const PC_COLOR   = LOSS_COLOR; // PC en rojo

    // Helpers para colorear por nombre (respetan i18n básico)
    const colorForWLD = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('gan')) return WIN_COLOR;     // Ganados
      if (n.includes('perd')) return LOSS_COLOR;   // Perdidos
      return DRAW_COLOR;                           // Empatados (o lo que venga)
    };

    const colorForPFPC = (name: string) => {
      const n = name.toLowerCase();
      if (n.includes('favor')) return PF_COLOR;      // A favor
      if (n.includes('contra')) return PC_COLOR;     // En contra
      return DRAW_COLOR;
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setError(null);

            // 0) Validación de params
            if (!playerId || !competitionId) {
                if (mounted) {
                    setError('Faltan parámetros de ruta (playerId o competitionId).');
                    setLoading(false);
                }
                return;
            }

            // 1) Competición
            const { data: comp, error: cErr } = await supabase
            .from('competitions')
            .select('id, name, sport_id, season_id, team_id')
            .eq('id', competitionId)
            .single();

            if (!mounted) return;
            if (cErr) { setError(cErr.message); setLoading(false); return; }
            setCompetition(comp as Competition);

            // 2) Equipo del jugador (opcional)
            const teamId = (comp as Competition)?.team_id;
            if (teamId) {
                const { data: teamRow } = await supabase
                .from('teams')
                .select('id, name')
                .eq('id', teamId)
                .maybeSingle();
                if (!mounted) return;
                setTeam((teamRow as Team) || null);
            }

            // 3) Temporada (opcional)
            const compSeasonId = (comp as Competition)?.season_id ?? null;
            if (compSeasonId) {
                const { data: seasonRow } = await supabase
                .from('seasons')
                .select('id, year_start, year_end')
                .eq('id', compSeasonId)
                .maybeSingle();
                if (!mounted) return;
                setSeason((seasonRow as Season) || null);
            }

            // 4) Deporte / schema de stats (opcional)
            const sportId = (comp as Competition)?.sport_id;
            if (sportId) {
                const { data: sportRow } = await supabase
                .from('sports')
                .select('id, name, stats')
                .eq('id', sportId)
                .maybeSingle();
                if (!mounted) return;
                setSport((sportRow as Sport) || null);
            }

            // 5) Partidos del jugador en esta competición (+ temporada si existe)
            let q = supabase
            .from('matches')
            .select('id, date_at, place, is_home, rival_team_name, my_score, rival_score, competition_id, season_id, player_id, stats')
            .eq('player_id', String(playerId))
            .eq('competition_id', String(competitionId));

            if (compSeasonId) {
                q = q.eq('season_id', String(compSeasonId));
            }

            const { data: ms, error: mErr } = await q.order('date_at', { ascending: true });

            if (!mounted) return;
            if (mErr) { setError(mErr.message); setLoading(false); return; }

            setMatches((ms as MatchRow[]) || []);
            setLoading(false);
        })();
        return () => { mounted = false; };
    }, [supabase, playerId, competitionId]);

    if (loading) return <div className="p-6">{t('cargando') || 'Cargando…'}</div>;
    if (error) return <div className="p-6 text-red-600">{error}</div>;

    const myTeamName = team?.name || (t('mi_equipo') || 'Mi equipo');

    const seasonLabel =
    season?.year_start && season?.year_end
    ? `${season.year_start}-${season.year_end}`
    : null;

    // 4.a) Serie de marcador por fecha
    const scoreSeries = matches.map(m => ({
        date: new Date(m.date_at).toLocaleDateString(),
        aFavor: Number(m.my_score ?? 0),
        enContra: Number(m.rival_score ?? 0),
    }));

    // 4.b) Detectar métricas numéricas desde sport.stats y matches.stats
    function normalizeType(t: any): 'number'|'text'|'boolean' {
        const v = String(t||'').toLowerCase();
        if (v.includes('bool')) return 'boolean';
        if (v.includes('int') || v.includes('num') || v.includes('float')) return 'number';
        return 'text';
    }

    const statKeys: string[] = (() => {
        const keys: string[] = [];
        const schema = sport?.stats;
        // 1) Preferimos lo que diga el schema
        if (schema) {
            if (Array.isArray(schema)) {
                for (const it of schema) {
                    const key = it?.key ?? it?.name ?? it?.id;
                    if (key && normalizeType(it?.type) === 'number') keys.push(key);
                }
            } else if (typeof schema === 'object') {
                for (const k of Object.keys(schema)) {
                    const def = schema[k] || {};
                    if (normalizeType(def?.type) === 'number') keys.push(k);
                }
            }
        }
        // 2) Si el schema está vacío, inferimos de los stats reales
        if (keys.length === 0) {
            const seen = new Map<string, number>();
            for (const m of matches) {
                const s = (m.stats as Record<string, any>) || {};
                for (const k of Object.keys(s)) {
                    const v = s[k];
                    if (typeof v === 'number' && Number.isFinite(v)) {
                        seen.set(k, (seen.get(k) || 0) + 1);
                    }
                }
            }
            // Top 3 por presencia
            return Array.from(seen.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);
        }
        // Nos quedamos con 1–3 para no ensuciar
        return keys.slice(0,3);
    })();

    // 4.c) Dataset para barras por partido con esas métricas
    const statSeries = matches.map(m => {
        const row: any = { date: new Date(m.date_at).toLocaleDateString() };
        const s = (m.stats as Record<string, any>) || {};
        for (const k of statKeys) row[k] = typeof s[k] === 'number' ? s[k] : 0;
        return row;
    });

    // Partidos jugados
    const matchesPlayed = matches.length || 0;

// Equipo: totales PF/PC
const pfTotal = matches.reduce((acc, m) => acc + Number(m.my_score ?? 0), 0);
const pcTotal = matches.reduce((acc, m) => acc + Number(m.rival_score ?? 0), 0);
const pfAvg = matchesPlayed ? +(pfTotal / matchesPlayed).toFixed(2) : 0;
const pcAvg = matchesPlayed ? +(pcTotal / matchesPlayed).toFixed(2) : 0;

// Equipo: W / L / D
let wins = 0, losses = 0, draws = 0;
for (const m of matches) {
  const a = Number(m.my_score ?? 0);
  const b = Number(m.rival_score ?? 0);
  if (a > b) wins++;
  else if (a < b) losses++;
  else draws++;
}

// Dataset barras W-L-D
const wldData = [
  { nombre: t('ganados') || 'Ganados',  valor: wins },
  { nombre: t('empatados') || 'Empatados', valor: draws },
  { nombre: t('perdidos') || 'Perdidos', valor: losses },
];

// Dataset barras PF/PC
const pfpcData = [
  { nombre: t('a_favor') || 'A favor', valor: pfTotal },
  { nombre: t('en_contra') || 'En contra', valor: pcTotal },
];

// Jugador: elegir métrica de anotación (prioriza nombres típicos, si no la primera numérica)
const scoringAliases = ['goles','gol','puntos','points','goals','tantos','anotaciones'];
const scoringKey =
  statKeys.find(k => scoringAliases.includes(k.toLowerCase())) || statKeys[0] || null;

// Totales jugador para esa métrica
let playerScoringTotal = 0;
if (scoringKey) {
  for (const m of matches) {
    const s = (m.stats as Record<string, any>) || {};
    const v = s[scoringKey];
    if (typeof v === 'number' && Number.isFinite(v)) playerScoringTotal += v;
  }
}
// Pastel: contribución del jugador vs total del equipo (PF)
const teamTotalForPie = pfTotal || 0;
const otherTeam = Math.max(0, teamTotalForPie - playerScoringTotal);
const pieData = [
  { name: t('jugador') || 'Jugador', value: playerScoringTotal },
  { name: t('resto_equipo') || 'Resto del equipo', value: otherTeam },
];
// Colores (dos, que no vamos a montar un arcoíris)
const PIE_COLORS = ['#22c55e', '#e5e7eb'];








    return (
        <div>
            <TitleH1>
                {t('partidos_competicion') || 'Partidos'}: {competition?.name}
                {seasonLabel ? <span className="text-gray-500"> {seasonLabel}</span> : null}
            </TitleH1>

            {/* Tabs */}
            <div className="mb-6 flex gap-2">
                <Link href={`/players/${playerId}`}>
                    <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t('perfil_ver')}</span>
                    </button>
                </Link>

                {/*<Link href="/account">
                    <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t('cuenta_mi_volver')}</span>
                    </button>
                </Link>*/}

                <button
                    type="button"
                    onClick={() => setTab('matches')}
                    className={`font-semibold px-3 py-2 rounded-lg transition ${
                        tab === 'matches'
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                    }`}
                >
                    {t('partidos')}
                </button>
                
                <button
                    type="button"
                    onClick={() => setTab('charts')}
                    className={`font-semibold px-3 py-2 rounded-lg transition ${
                        tab === 'charts'
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 shadow-sm'
                    }`}
                >
                    {t('estadisticas')}
                </button>
            </div>

            {/* Panels */}
            {tab === 'matches' ? (
                <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 text-gray-700">
                            <tr>
                                <th className="px-3 py-2 text-left">{t('fecha') || 'Fecha'}</th>
                                <th className="px-3 py-2 text-left">{t('lugar') || 'Lugar'}</th>
                                <th className="px-3 py-2 text-left">{t('condicion') || 'Condición'}</th>
                                <th className="px-3 py-2 text-left">{t('rival') || 'Rival'}</th>
                                <th className="px-3 py-2 text-left">{t('marcador') || 'Marcador'}</th>
                                <th className="px-3 py-2 text-left">{t('acciones') || 'Acciones'}</th>
                            </tr>
                        </thead>
                        
                        <tbody>
                            {matches.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                                        {t('sin_partidos') || 'No hay partidos para esta competición y temporada.'}
                                    </td>
                                </tr>
                            )}
                            {matches.map(m => {
                                // Datos básicos
                                const rival = m.rival_team_name || t('equipo_rival') || 'Rival';
                                const myGoals = Number(m.my_score ?? 0);
                                const rivalGoals = Number(m.rival_score ?? 0);

                                // Resultado y estilos
                                const outcome = myGoals > rivalGoals ? 'win' : myGoals < rivalGoals ? 'loss' : 'draw';
                                const score = `${myGoals} - ${rivalGoals}`;
                                const scoreClass =
                                outcome === 'win'  ? 'text-green-600'
                                : outcome === 'loss' ? 'text-red-600'
                                : 'text-gray-600';

                                return (
                                    <tr key={m.id} className="border-t">
                                        <td className="px-3 py-2 whitespace-nowrap">{new Date(m.date_at).toLocaleString()}</td>
                                        <td className="px-3 py-2">{m.place || '—'}</td>

                                        <td className="px-3 py-2">
                                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${m.is_home ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                                              {m.is_home ? (t('local') || 'Local') : (t('visitante') || 'Visitante')}
                                            </span>
                                        </td>

                                        {/* Rival: SIEMPRE el nombre del rival */}
                                        <td className="px-3 py-2">{rival}</td>

                                        {/* Marcador: verde/rojo/gris según resultado */}
                                        <td className="px-3 py-2 font-semibold">
                                            <span className={scoreClass}>{score}</span>
                                        </td>

                                        <td className="px-3 py-2">
                                            <a
                                              href={`/matches/${m.id}/live`}
                                              className="rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 ml-2"
                                            >
                                              {t('partido_ver') || 'Ver partido'}
                                            </a>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </section>

            ) : (
                <div className="mt-8 p-6 bg-white text-sm text-gray-600">
                    {/* ------- Equipo ------- */}
                    <div>
    <h3 className="text-lg font-semibold mb-3">{t('equipo') || 'Equipo'}</h3>

    {/* KPIs rápidos */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="rounded-xl border p-3">
        <div className="text-xs text-gray-600 text-center">{t('pf_total') || 'PF total'}</div>
        <div className="text-2xl font-semibold text-right">{pfTotal}</div>
      </div>
      <div className="rounded-xl border p-3">
        <div className="text-xs text-gray-600 text-center">{t('pc_total') || 'PC total'}</div>
        <div className="text-2xl font-semibold text-right">{pcTotal}</div>
      </div>
      <div className="rounded-xl border p-3">
        <div className="text-xs text-gray-600 text-center">{t('pf_promedio') || 'PF promedio'}</div>
        <div className="text-2xl font-semibold text-right">{pfAvg}</div>
      </div>
      <div className="rounded-xl border p-3">
        <div className="text-xs text-gray-600 text-center">{t('pc_promedio') || 'PC promedio'}</div>
        <div className="text-2xl font-semibold text-right">{pcAvg}</div>
      </div>
    </div>

    {/* Barras W/L/D */}
    <div className="h-60 w-full">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={wldData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="nombre" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Legend />
      <Bar dataKey="valor">
        {wldData.map((d, i) => (
          <Cell key={`wld-${i}`} fill={colorForWLD(d.nombre)} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>

    {/* Barras PF vs PC */}
    <div className="h-60 w-full mt-8">
  <ResponsiveContainer width="100%" height="100%">
    <BarChart data={pfpcData}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="nombre" />
      <YAxis allowDecimals={false} />
      <Tooltip />
      <Legend />
      <Bar dataKey="valor">
        {pfpcData.map((d, i) => (
          <Cell key={`pfpc-${i}`} fill={colorForPFPC(d.nombre)} />
        ))}
      </Bar>
    </BarChart>
  </ResponsiveContainer>
</div>


  {/* ======= Jugador ======= */}
  <div>
    <h3 className="text-lg font-semibold mb-3">{t('jugador') || 'Jugador'}</h3>

    {scoringKey ? (
      <>
        <div className="text-sm mb-2 text-gray-600">
          {(t('métrica') || 'Métrica')}: <b>{scoringKey.replace(/_/g,' ')}</b>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%">
  {pieData.map((_, i) => (
    <Cell key={`slice-${i}`} fill={i === 0 ? WIN_COLOR : '#e5e7eb'} />
  ))}
</Pie>

            </PieChart>
          </ResponsiveContainer>
        </div>
      </>
    ) : (
      <p className="text-sm text-gray-600">{t('sin_estadisticas_detectadas') || 'No hay estadísticas numéricas para mostrar.'}</p>
    )}
  </div>



        </div>
        </div>
            )}
        </div>
    );
}
