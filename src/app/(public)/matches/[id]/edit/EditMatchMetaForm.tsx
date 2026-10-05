'use client';

import { useState } from 'react';
import { useT } from '@/i18n/I18nProvider';
import { dateAtInputToIso } from '@/lib/matches/parseDateAtInput';
import type { MatchEditCompetition, MatchEditRow } from '@/lib/matches/loadMatchEditInitialData';

import Input from '@/components/Input';
import Submit from '@/components/Submit';

function isoToLocal(iso: string | null | undefined) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  matchId: string;
  match: MatchEditRow;
  competition: MatchEditCompetition | null;
};

export default function EditMatchMetaForm({ matchId, match, competition }: Props) {
  const t = useT();

  const [error, setError] = useState<string | null>(null);
  const [dateLocal, setDateLocal] = useState(() => isoToLocal(match.date_at));
  const [place, setPlace] = useState(match.place || '');
  const [rival, setRival] = useState(match.rival_team_name || '');

  const backToMatchUrl = `/matches/${matchId}/live`;
  const backToListUrl = `/players/${match.player_id}/competitions/${match.competition_id}/matches`;

  async function onSave() {
    const isoDate = dateAtInputToIso(dateLocal);
    if (!isoDate) {
      setError(t('fecha_invalida') || 'Fecha inválida');
      return;
    }
    setError(null);

    const payload = {
      date_at: isoDate,
      place: place || null,
      rival_team_name: rival || null,
    };
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const { error: errMsg } = await res.json().catch(() => ({ error: 'Error' }));
      setError(errMsg || 'No se pudo guardar');
      return;
    }
    window.location.href = backToMatchUrl;
  }

  return (
    <div>
      <style jsx global>{`footer{display:none !important}`}</style>

      <div className="flex items-center gap-2 mb-4">
        <a
          href={backToMatchUrl}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18L9 12L15 6"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t('partido_volver') || 'Volver al partido'}</span>
        </a>

        <a
          href={backToListUrl}
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M15 18L9 12L15 6"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{t('competicion_volver') || 'Partidos de la competición'}</span>
        </a>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}

      <div className="mt-4 grid gap-4">
        <div className="text-sm text-gray-600">
          <b>{t('competicion') || 'Competición'}:</b> {competition?.name || match.competition_id}
        </div>

        <div className="grid gap-1">
          <Input
            label={t('fecha') || 'Fecha'}
            type="datetime-local"
            value={dateLocal}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateLocal(e.target.value)}
          />
        </div>

        <Input
          label={t('lugar') || 'Lugar'}
          value={place}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPlace(e.target.value)}
        />

        <Input
          label={t('rival') || 'Rival'}
          value={rival}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRival(e.target.value)}
        />

        <div className="pt-2">
          <Submit
            onClick={onSave as () => void}
            text={t('guardar') || 'Guardar'}
            loadingText={t('guardando') || 'Guardando…'}
          />
        </div>
      </div>
    </div>
  );
}
