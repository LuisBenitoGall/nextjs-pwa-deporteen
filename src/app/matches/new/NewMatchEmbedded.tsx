'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';

// Components de tu proyecto
import Input from '@/components/Input';
import Submit from '@/components/Submit';
import Textarea from '@/components/Textarea';
import TitleH1 from '@/components/TitleH1';

type Sport = {
    id: string;
    name?: string | null;
    stats?: any; // jsonb: array u objeto
};

type Competition = {
    id: string;
    name: string;
    sport_id: string;
    season_id: string | null;
};

type Player = { 
    id: string; 
    full_name?: string | null; 
};

type Props = {
    /** Si viene del wrapper /players/[id]/matches/new, será el id del jugador */
    playerId?: string;
};

export default function NewMatchEmbedded({ playerId }: Props) {
    const t = useT();
    const router = useRouter();
    const searchParams = useSearchParams();

    const supabase = useMemo(
        () =>
            createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            ),
        []
    );

    // Estado UI
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Catálogos
    const [sports, setSports] = useState<Sport[]>([]);
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [player, setPlayer] = useState<Player | null>(null);

    // Form (matches)
    const [seasonId, setSeasonId] = useState<string>('');
    const [sportId, setSportId] = useState<string>('');
    const [competitionId, setCompetitionId] = useState<string>('');
    const [dateAt, setDateAt] = useState<string>(''); // datetime-local
    const [place, setPlace] = useState<string>('');
    const [status, setStatus] = useState<string>('');

    const [homeTeamId, setHomeTeamId] = useState<string>('');
    const [homeTeamName, setHomeTeamName] = useState<string>('');
    const [awayTeamId, setAwayTeamId] = useState<string>('');
    const [awayTeamName, setAwayTeamName] = useState<string>('');

    const [isHome, setIsHome] = useState<boolean>(true);
    const [homeScore, setHomeScore] = useState<number | ''>('');
    const [awayScore, setAwayScore] = useState<number | ''>('');
    const [notes, setNotes] = useState<string>('');

    // Soporte a ?competition_id=... por si se usa el componente fuera
    const preCompetition = searchParams.get('competition_id') || '';

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            setError(null);

            const { data: auth } = await supabase.auth.getUser();
            if (!mounted) return;
            if (!auth?.user) {
                setError(t('sesion_iniciar_aviso'));
                setLoading(false);
                return;
            }

            // Jugador para el título
            const { data: playerRow } = await supabase
            .from('players')
            .select('id, full_name')
            .eq('id', playerId)
            .maybeSingle();
            if (!mounted) return;
            setPlayer(playerRow || null);

            // Catálogos
            const [{ data: sportsData }, { data: comps }] = await Promise.all([
                supabase.from('sports').select('id, name, stats').order('name', { ascending: true }),
                supabase.from('competitions').select('id, name, sport_id, season_id').order('name', { ascending: true }),
            ]);
            if (!mounted) return;

            setSports(sportsData || []);
            setCompetitions(comps || []);

            // Preselección por query
            if (preCompetition && comps?.length) {
                const current = comps.find(c => c.id === preCompetition);
                if (current) {
                    setCompetitionId(current.id);
                    setSportId(current.sport_id);
                    setSeasonId(current.season_id || '');
                }
            }
      
            setLoading(false);
        })();

        return () => {
            mounted = false;
        };
    }, [supabase, preCompetition, playerId, t]);

    // actualiza esquema stats cuando cambie sportId
    // opciones de competición
    const compOptions = competitions.map(c => ({ value: c.id, label: c.name }));

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
          if (!playerId) {
            setError(t('jugador_obligatorio') || 'Jugador obligatorio.');
            setSaving(false);
            return;
          }
          if (!competitionId) {
            setError(t('competicion_selecciona') || 'Selecciona competición.');
            setSaving(false);
            return;
          }
          if (!sportId) {
            setError(t('deporte_selecciona') || 'Selecciona deporte.');
            setSaving(false);
            return;
          }
          if (!dateAt) {
            setError(t('fecha_requerida') || 'La fecha es obligatoria.');
            setSaving(false);
            return;
          }

          const payload: any = {
            season_id: seasonId || null,
            sport_id: sportId,
            competition_id: competitionId,
            date_at: new Date(dateAt).toISOString(),
            place: place || null,
            status: status || null,
            home_team_id: homeTeamId || null,
            home_team_name: homeTeamName || null,
            away_team_id: awayTeamId || null,
            away_team_name: awayTeamName || null,
            is_home: !!isHome,
            home_score: homeScore === '' ? null : Number(homeScore),
            away_score: awayScore === '' ? null : Number(awayScore),
            notes: notes || null,
            player_id: playerId, // fijo y obligatorio
            stats: null,
          };

          const { data, error: iErr } = await supabase
            .from('matches')
            .insert(payload)
            .select('id')
            .single();

          if (iErr) {
            setError(iErr.message || 'No se pudo guardar el partido.');
            setSaving(false);
            return;
          }

            router.replace(`/matches/${data.id}`);
        }catch (e: any) {
            setError(e?.message ?? 'Error inesperado guardando el partido.');
            setSaving(false);
        }
    }

    if (loading) {
        return <div className="p-6">{t('cargando') || 'Cargando…'}</div>;
    }

    const playerName =
    player?.full_name ||
    [player?.full_name].filter(Boolean).join(' ') ||
    playerId;

  











    return (
        <div>
            <TitleH1>{t('partido_nuevo') || 'Nuevo partido'} <i>{playerName}</i></TitleH1>

            <form onSubmit={handleSubmit} className="space-y-6 p-1">
                {/* Competición (obligatorio) */}
                <div className="space-y-2">
                    <label className="block text-sm font-medium">
                        {t('competicion') || 'Competición'}
                    </label>
                    <select
                        className="w-full rounded-lg border px-3 py-2"
                        value={competitionId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCompetitionId(val);
                          const comp = competitions.find(c => c.id === val);
                          if (comp) {
                            setSportId(comp.sport_id);          // deporte fijado por competición
                            setSeasonId(comp.season_id || '');   // temporada tomada de la competición
                          }
                        }}
                    >
                        <option value="">{t('seleccionar') || 'Selecciona…'}</option>
                        {compOptions.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500">
                        {t('competicion_hint') || 'Primero elige la competición.'}
                    </p>
                </div>

                {/* Deporte: solo visual, definido por competición */}
                {sportId && (
                    <div className="text-sm">
                        <span className="inline-block rounded-full border px-3 py-1">
                            {(sports.find(s => s.id === sportId)?.name ?? sportId)}
                        </span>
                    </div>
                )}




                

        {/* Deporte + Temporada */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">
              {t('deporte') || 'Deporte'}
            </label>
            <select
              className="w-full rounded-lg border px-3 py-2"
              value={sportId}
              onChange={(e) => setSportId(e.target.value)}
            >
              <option value="">{t('seleccionar') || 'Selecciona…'}</option>
              {sports.map(s => (
                <option key={s.id} value={s.id}>{s.name ?? s.id}</option>
              ))}
            </select>
          </div>

          <Input
            label={t('temporada_id') || 'Temporada (opcional)'}
            value={seasonId}
            onChange={(e:any) => setSeasonId(e.target.value)}
            placeholder="uuid"
          />
        </div>

        {/* Datos básicos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('fecha') || 'Fecha'}
            type="datetime-local"
            value={dateAt}
            onChange={(e:any) => setDateAt(e.target.value)}
          />
          <Input
            label={t('lugar') || 'Lugar'}
            value={place}
            onChange={(e:any) => setPlace(e.target.value)}
          />
          <Input
            label={t('estado') || 'Estado'}
            value={status}
            onChange={(e:any) => setStatus(e.target.value)}
            placeholder={t('estado_ej') || 'p.ej. “Jugado”, “Aplazado”…'}
          />
        </div>

        {/* Equipos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('equipo_local_id') || 'ID Equipo local (opcional)'}
            value={homeTeamId}
            onChange={(e:any) => setHomeTeamId(e.target.value)}
            placeholder="uuid"
          />
          <Input
            label={t('equipo_local_nombre') || 'Nombre Equipo local'}
            value={homeTeamName}
            onChange={(e:any) => setHomeTeamName(e.target.value)}
          />
          <Input
            label={t('equipo_visitante_id') || 'ID Equipo visitante (opcional)'}
            value={awayTeamId}
            onChange={(e:any) => setAwayTeamId(e.target.value)}
            placeholder="uuid"
          />
          <Input
            label={t('equipo_visitante_nombre') || 'Nombre Equipo visitante'}
            value={awayTeamName}
            onChange={(e:any) => setAwayTeamName(e.target.value)}
          />
        </div>

        {/* Local / Visitante + Marcador */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="flex items-center gap-2">
            <input
              id="isHome"
              type="checkbox"
              className="h-4 w-4"
              checked={isHome}
              onChange={(e) => setIsHome(e.target.checked)}
            />
            <label htmlFor="isHome" className="text-sm">
              {t('soy_local') || 'Mi equipo juega en casa'}
            </label>
          </div>

          <Input
            label={t('marcador_local') || 'Goles/Puntos local'}
            type="number"
            noSpinner
            value={homeScore}
            onChange={(e:any) => setHomeScore(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          />
          <Input
            label={t('marcador_visitante') || 'Goles/Puntos visitante'}
            type="number"
            noSpinner
            value={awayScore}
            onChange={(e:any) => setAwayScore(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          />
        </div>

        

                {/* Observaciones */}
                <Textarea
                    value={notes}
                    onChange={(e:any) => setNotes(e.target.value)}
                />

                {error && (
                    <div className="rounded border p-3 bg-red-50 text-red-700">{error}</div>
                )}

                <Submit
                    text={t('guardar') || 'Guardar'}
                    loadingText={t('guardando') || 'Guardando…'}
                    disabled={!competitionId || !sportId || !dateAt || saving}
                />
            </form>
        </div>
    );
}
