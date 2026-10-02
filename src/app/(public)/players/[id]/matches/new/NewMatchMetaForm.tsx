'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import { dateAtInputToIso } from '@/lib/matches/parseDateAtInput';

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

const API_ERROR_FALLBACK: Record<string, string> = {
  date_required: 'La fecha es obligatoria.',
  date_invalid: 'Revisa la fecha y la hora (formato válido).',
  team_required:
    'Esta competición no tiene equipo asignado. Edítala y añade club y equipo antes de crear partidos.',
  competition_required: 'Selecciona competición.',
  sport_required: 'Selecciona deporte.',
  player_not_found: 'No se pudo verificar el deportista.',
  competition_not_found: 'Competición no válida para este deportista.',
  Unauthorized: 'Inicia sesión de nuevo para continuar.',
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateFieldError, setDateFieldError] = useState<string | null>(null);

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
  const needsCompetitionPick = competitions.length > 1 && !competitionId;
  const missingTeam = Boolean(competitionId && !teamId);

  function resolveApiError(code: string, serverMessage?: string) {
    const i18nKey = `match_create_${code}`;
    const fromKey = t(i18nKey);
    if (fromKey !== i18nKey) return fromKey;
    if (serverMessage && serverMessage !== code) return serverMessage;
    return API_ERROR_FALLBACK[code] || tr('error_guardar', 'No se pudo crear el partido.');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setDateFieldError(null);

    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      const dateFromForm = String(formData.get('date_at') || '').trim();
      const effectiveDateAt = (dateAt || dateFromForm).trim();
      if (effectiveDateAt && effectiveDateAt !== dateAt) {
        setDateAt(effectiveDateAt);
      }

      if (!playerId) {
        setError(tr('jugador_obligatorio', 'Jugador obligatorio.'));
        return;
      }
      if (!competitionId) {
        setError(tr('competicion_selecciona', 'Selecciona competición.'));
        return;
      }
      if (!sportId) {
        setError(tr('deporte_selecciona', 'Selecciona deporte.'));
        return;
      }
      if (!effectiveDateAt) {
        const msg = tr('fecha_requerida', 'La fecha es obligatoria.');
        setError(msg);
        setDateFieldError(msg);
        return;
      }

      const dateIso = dateAtInputToIso(effectiveDateAt);
      if (!dateIso) {
        const msg = tr('fecha_invalida', 'Revisa la fecha y la hora (formato válido).');
        setError(msg);
        setDateFieldError(msg);
        return;
      }

      if (!teamId) {
        setError(
          tr(
            'equipo_asignado_requerido',
            'Esta competición no tiene equipo asignado. Edítala y añade club y equipo antes de crear partidos.'
          )
        );
        return;
      }

      const res = await fetch(`/api/players/${playerId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competition_id: competitionId,
          sport_id: sportId,
          season_id: seasonId || null,
          date_at: effectiveDateAt,
          place: place || null,
          is_home: !!isHome,
          team_id: teamId,
          rival_team_name: opponentName || null,
        }),
      });

      const json = (await res.json().catch(() => ({}))) as { id?: string; error?: string };

      if (!res.ok) {
        setError(resolveApiError(json.error || 'unknown', json.error));
        return;
      }

      if (!json.id) {
        setError(tr('error_guardar', 'No se pudo crear el partido.'));
        return;
      }

      router.replace(`/matches/${json.id}/live`);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : tr('error_guardar', 'No se pudo crear el partido. Inténtalo de nuevo.')
      );
    } finally {
      setSaving(false);
    }
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

      {missingTeam && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p>
            {tr(
              'equipo_asignado_requerido',
              'Esta competición no tiene equipo asignado. Edítala y añade club y equipo antes de crear partidos.'
            )}
          </p>
          <Link
            href={`/players/${playerId}/competitions/${competitionId}/edit`}
            className="mt-2 inline-block font-semibold text-green-700 underline"
          >
            {tr('competicion_editar', 'Editar competición')}
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label={t('fecha') || 'Fecha'}
          id="date_at"
          name="date_at"
          type="datetime-local"
          value={dateAt}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setDateAt(e.target.value);
            if (dateFieldError) setDateFieldError(null);
          }}
          onInput={(e: React.FormEvent<HTMLInputElement>) => {
            setDateAt(e.currentTarget.value);
            if (dateFieldError) setDateFieldError(null);
          }}
          onClick={(e: React.MouseEvent<HTMLInputElement>) => e.currentTarget?.showPicker?.()}
          error={dateFieldError || undefined}
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

      {needsCompetitionPick && (
        <p className="text-sm text-gray-600">
          {tr('competicion_selecciona_hint', 'Elige una competición para poder continuar.')}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push(panelUrl)}
          disabled={saving}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {t('cancelar') || 'Cancelar'}
        </button>
        <Submit
          text={t('continuar') || 'Continuar'}
          loadingText={t('guardando') || 'Guardando…'}
          loading={saving}
          disabled={saving}
          className="w-full"
        />
      </div>
    </form>
  );
}
