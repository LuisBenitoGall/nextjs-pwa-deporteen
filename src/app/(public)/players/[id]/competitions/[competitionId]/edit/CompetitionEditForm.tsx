'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useT } from '@/i18n/I18nProvider';
import Input from '@/components/Input';
import Select from '@/components/Select';
import Submit from '@/components/Submit';

type Sport = { id: string; name: string };

type Props = {
  playerId: string;
  competitionId: string;
  initial: {
    name: string | null;
    sportId: string;
    clubName: string;
    teamName: string;
  };
};

export default function CompetitionEditForm({ playerId, competitionId, initial }: Props) {
  const t = useT();
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [competitionName, setCompetitionName] = useState(initial.name ?? '');
  const [sportId, setSportId] = useState(initial.sportId);
  const [clubName, setClubName] = useState(initial.clubName);
  const [teamName, setTeamName] = useState(initial.teamName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('sports').select('id, name').order('name');
      setSports(data ?? []);
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!clubName.trim() || !teamName.trim()) {
      setErr(t('equipo_nombre_info') || 'Club y equipo son necesarios para crear partidos.');
      return;
    }

    setBusy(true);
    try {
      const { data: club, error: clubErr } = await supabase
        .from('clubs')
        .upsert({ name: clubName.trim(), player_id: playerId }, { onConflict: 'player_id,name' })
        .select('id')
        .single();
      if (clubErr) throw clubErr;

      const { data: team, error: teamErr } = await supabase
        .from('teams')
        .upsert(
          {
            name: teamName.trim(),
            club_id: club.id,
            sport_id: sportId,
            player_id: playerId,
          },
          { onConflict: 'player_id,club_id,sport_id,name' }
        )
        .select('id')
        .single();
      if (teamErr) throw teamErr;

      const { error: updErr } = await supabase
        .from('competitions')
        .update({
          name: competitionName.trim() || null,
          sport_id: sportId,
          club_id: club.id,
          team_id: team.id,
        })
        .eq('id', competitionId)
        .eq('player_id', playerId);

      if (updErr) throw updErr;
      router.replace(`/players/${playerId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t('error_generico') || 'Error al guardar.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {err && <div className="rounded border p-3 bg-red-50 text-red-700">{err}</div>}
      <Select
        name="sport"
        value={sportId}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => setSportId(e.target.value)}
        options={sports.map((s) => ({ value: s.id, label: s.name }))}
        placeholder={t('deporte_selec')}
        fontSize="sm"
      />
      <Input
        value={competitionName}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setCompetitionName(e.target.value)}
        label={t('competicion')}
        placeholder={t('competicion_nombre')}
      />
      <Input
        value={clubName}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setClubName(e.target.value)}
        label="Club"
        placeholder={t('club_nombre')}
      />
      <Input
        value={teamName}
        onChange={(e: ChangeEvent<HTMLInputElement>) => setTeamName(e.target.value)}
        label={t('equipo')}
        placeholder={t('equipo_nombre')}
      />
      <Submit text={t('guardar')} loadingText={t('procesando') ?? t('guardar')} disabled={busy} className="h-12 w-full" />
    </form>
  );
}
