'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useT } from '@/i18n/I18nProvider';

import Input from '@/components/Input';
import Select from '@/components/Select';
import Submit from '@/components/Submit';
import Radio from '@/components/Radio';

export type NewMatchCompetition = {
  id: string;
  name: string;
  sport_id: string;
  season_id: string | null;
  team_id: string | null;
};

type Props = {
  playerId: string;
  competitions: NewMatchCompetition[];
  initialCompetitionId: string;
  initialSportId: string;
  initialSeasonId: string;
  initialTeamId: string;
};

export default function NewMatchMetaForm({
  playerId,
  competitions,
  initialCompetitionId,
  initialSportId,
  initialSeasonId,
  initialTeamId,
}: Props) {
  const t = useT();
  const router = useRouter();
  const supabase = useMemo(() => supabaseBrowser(), []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [competitionId, setCompetitionId] = useState(initialCompetitionId);
  const [seasonId, setSeasonId] = useState(initialSeasonId);
  const [sportId, setSportId] = useState(initialSportId);
  const [teamId, setTeamId] = useState(initialTeamId);
  const [dateAt, setDateAt] = useState('');
  const [place, setPlace] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [opponentName, setOpponentName] = useState('');

  const tr = (key: string, fallback: string) => {
    const value = t(key);
    return value === key ? fallback : value;
  };

  const panelUrl = `/players/${playerId}`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const dateFromForm = String(formData.get('date_at') || '').trim();
    const effectiveDateAt = (dateAt || dateFromForm).trim();
    if (effectiveDateAt && effectiveDateAt !== dateAt) {
      setDateAt(effectiveDateAt);
    }

    if (!playerId) {
      setError(tr('jugador_obligatorio', 'Jugador obligatorio.'));
      setSaving(false);
      return;
    }
    if (!competitionId) {
      setError(tr('competicion_selecciona', 'Selecciona competición.'));
      setSaving(false);
      return;
    }
    if (!sportId) {
      setError(tr('deporte_selecciona', 'Selecciona deporte.'));
      setSaving(false);
      return;
    }
    if (!effectiveDateAt) {
      setError(tr('fecha_requerida', 'La fecha es obligatoria.'));
      setSaving(false);
      return;
    }
    if (!teamId) {
      setError(
        tr(
          'equipo_asignado_requerido',
          'Esta competición no tiene equipo asignado. Edítala y añade club y equipo antes de crear partidos.'
        )
      );
      setSaving(false);
      return;
    }

    const payload = {
      competition_id: competitionId,
      sport_id: sportId,
      season_id: seasonId || null,
      date_at: new Date(effectiveDateAt).toISOString(),
      place: place || null,
      is_home: !!isHome,
      player_id: playerId,
      team_id: teamId,
      rival_team_name: opponentName || null,
      my_score: 0,
      rival_score: 0,
      status: 'scheduled',
      notes: null,
      stats: null,
    };

    const insertRes = await supabase.from('matches').insert(payload).select('id').single();
    if (insertRes.error) {
      setError(insertRes.error.message || 'No se pudo crear el partido.');
      setSaving(false);
      return;
    }

    router.replace(`/matches/${insertRes.data.id}/live`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-1">
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
              const comp = competitions.find((c) => c.id === val);
              if (comp) {
                setSportId(comp.sport_id);
                setSeasonId(comp.season_id || '');
                setTeamId(comp.team_id || '');
              }
            }}
            options={competitions.map((c) => ({ value: c.id, label: c.name }))}
            placeholder={t('competicion_selec') || 'Selecciona…'}
          />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={t('fecha') || 'Fecha'}
          id="date_at"
          name="date_at"
          type="datetime-local"
          defaultValue={dateAt}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateAt(e.target.value)}
          onInput={(e: React.FormEvent<HTMLInputElement>) => setDateAt(e.currentTarget.value)}
          onClick={(e: React.MouseEvent<HTMLInputElement>) => e.currentTarget?.showPicker?.()}
        />
        <Input
          label={t('lugar') || 'Lugar'}
          id="place"
          name="place"
          value={place}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlace(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1">
        <Input
          label={t('equipo_rival') || 'Nombre equipo rival'}
          id="opponent_name"
          name="opponent_name"
          value={opponentName}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOpponentName(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-8">
        <Radio
          name="venue"
          value="home"
          checked={isHome}
          onChange={() => setIsHome(true)}
          label={t('juego_local') || 'soy local'}
        />
        <Radio
          name="venue"
          value="away"
          checked={!isHome}
          onChange={() => setIsHome(false)}
          label={t('juego_visitante') || 'soy visitante'}
        />
      </div>

      {error && <div className="rounded border p-3 bg-red-50 text-red-700">{error}</div>}

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
          disabled={!competitionId || saving}
          className="w-full"
        />
      </div>
    </form>
  );
}
