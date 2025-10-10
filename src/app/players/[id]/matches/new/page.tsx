// =============================================
// 1) FASE 1: METADATOS DEL PARTIDO (CREAR)
// Ruta: src/app/players/[id]/matches/new/page.tsx
// =============================================

'use client';

import { useEffect, useMemo, useRef, useState, use as usePromise } from 'react';
import { supabaseBrowser } from '../../../../../lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';

// Components
import Input from '@/components/Input';
import Select from '@/components/Select';
import Submit from '@/components/Submit';
import TitleH1 from '@/components/TitleH1';
import Radio from '@/components/Radio';

// Types
type Competition = { id: string; name: string; sport_id: string; season_id: string | null; team_id: string | null };
type Player = { id: string; full_name: string | null };

type PageProps = { params: Promise<{ id: string }> };

export default function NewMatchMetaPage({ params }: PageProps) {
  const { id: playerId } = usePromise(params);
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(() => supabaseBrowser(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [player, setPlayer]               = useState<Player | null>(null);
  const [competitions, setCompetitions]   = useState<Competition[]>([]);

  // Form state
  const [competitionId, setCompetitionId] = useState('');
  const [seasonId, setSeasonId]           = useState('');
  const [sportId, setSportId]             = useState('');
  const [teamId, setTeamId]               = useState('');
  const [dateAt, setDateAt]               = useState('');
  const [place, setPlace]                 = useState('');
  const [isHome, setIsHome]               = useState(true);
  const [opponentName, setOpponentName]   = useState<string>('');

  // Acepta ?competition=... y ?competition_id=...
  const preCompetition = searchParams.get('competition') || searchParams.get('competition_id') || '';

  const dtRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);

      const [{ data: auth }, { data: playerRow }, { data: comps }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('players').select('id, full_name').eq('id', playerId).maybeSingle(),
        supabase.from('competitions').select('id, name, sport_id, season_id, team_id').order('name', { ascending: true }),
      ]);

      if (!mounted) return;

      if (!auth?.user) { setError(t('sesion_iniciar_aviso')); setLoading(false); return; }

      setPlayer(playerRow || null);
      setCompetitions(comps || []);

      // Preselección si viene por query, pero sin bloquear ni filtrar la lista
      if (preCompetition && comps?.length) {
        const selected = comps.find(c => c.id === preCompetition);
        if (selected) {
          setCompetitionId(selected.id);
          setSportId(selected.sport_id);
          setSeasonId(selected.season_id || '');
          setTeamId(selected.team_id || '');
        }
      } else if (comps && comps.length === 1) {
        // Autoselección si solo hay una
        const c = comps[0];
        setCompetitionId(c.id);
        setSportId(c.sport_id);
        setSeasonId(c.season_id || '');
        setTeamId(c.team_id || '');
      }

      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [supabase, playerId, preCompetition, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!playerId)   { setError(t('jugador_obligatorio') || 'Jugador obligatorio.'); setSaving(false); return; }
    if (!competitionId) { setError(t('competicion_selecciona') || 'Selecciona competición.'); setSaving(false); return; }
    if (!sportId)    { setError(t('deporte_selecciona') || 'Selecciona deporte.'); setSaving(false); return; }
    if (!dateAt)     { setError(t('fecha_requerida') || 'La fecha es obligatoria.'); setSaving(false); return; }
    if (!teamId)     { setError(t('equipo_asignado_requerido') || 'Falta team_id en la competición.'); setSaving(false); return; }

    const payload: any = {
      competition_id: competitionId,
      sport_id:       sportId,
      season_id:      seasonId || null,
      date_at:        new Date(dateAt).toISOString(),
      place:          place || null,
      is_home:        !!isHome,
      player_id:      playerId,
      team_id:        teamId,
      rival_team_name: opponentName || null,
      my_score:       '0',
      rival_score:    '0',
      status:         'scheduled',
      notes:          null,
      stats:          null,
    };

    const insertRes = await supabase.from('matches').insert(payload).select('id').single();
    if (insertRes.error) { setError(insertRes.error.message || 'No se pudo crear el partido.'); setSaving(false); return; }

    router.replace(`/matches/${insertRes.data.id}/live`);
  }

  if (loading) return <div className="p-6">{t('cargando') || 'Cargando…'}</div>;

  const fullName = player?.full_name || playerId;
  const panelUrl = `/players/${playerId}`;

  return (
    <div className="max-w-3xl mx-auto">
      <TitleH1>{t('partido_nuevo') || 'Nuevo partido'} <i>{fullName}</i></TitleH1>

      <form onSubmit={handleSubmit} className="space-y-6 p-1">
        {/* Competición */}
        <div className="grid grid-cols-1">
          {competitions.length === 1 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('competicion') || 'Competición'}</label>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-gray-900">
                {competitions[0].name}
              </div>
              <input type="hidden" name="competition_id" value={competitionId} />
            </div>
          ) : (
            <Select
              name="competition_id"
              label={t('competicion') || 'Competición'}
              value={competitionId}
              onChange={(e) => {
                const val = e.target.value;
                setCompetitionId(val);
                const comp = competitions.find(c => c.id === val);
                if (comp) {
                  setSportId(comp.sport_id);
                  setSeasonId(comp.season_id || '');
                  setTeamId(comp.team_id || '');
                }
              }}
              options={competitions.map(c => ({ value: c.id, label: c.name }))}
              placeholder={t('competicion_selec') || 'Selecciona…'}
            />
          )}
        </div>

        {/* Fecha y lugar */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t('fecha') || 'Fecha'}
            type="datetime-local"
            value={dateAt}
            onChange={(e:any)=>setDateAt(e.target.value)}
            onClick={() => dtRef.current?.showPicker?.()}
          />
          <Input
            label={t('lugar') || 'Lugar'}
            value={place}
            onChange={(e:any)=>setPlace(e.target.value)}
          />
        </div>

        {/* Equipo rival */}
        <div className="grid grid-cols-1">
          <Input
            label={t('equipo_rival') || 'Nombre equipo rival'}
            value={opponentName}
            onChange={(e:any)=>setOpponentName(e.target.value)}
          />
        </div>

        {/* Local/visitante */}
        <div className="flex items-center gap-8">
          <Radio name="venue" value="home" checked={isHome} onChange={() => setIsHome(true)}  label={t('juego_local') || 'soy local'} />
          <Radio name="venue" value="away" checked={!isHome} onChange={() => setIsHome(false)} label={t('juego_visitante') || 'soy visitante'} />
        </div>

        {error && <div className="rounded border p-3 bg-red-50 text-red-700">{error}</div>}

        {/* Acciones: 50/50 Cancelar / Continuar */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.push(panelUrl)}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            {t('cancelar') || 'Cancelar'}
          </button>
          <Submit
            text={t('continuar') || 'Continuar'}
            loadingText={t('guardando') || 'Guardando…'}
            disabled={!competitionId || !dateAt || saving}
            className="w-full"
          />
        </div>
      </form>
    </div>
  );
}
