import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import TitleH1 from '@/components/TitleH1';
import CompetitionEditForm from './CompetitionEditForm';

type PageParams = { id: string; competitionId: string };

export default async function EditCompetitionPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id: playerId, competitionId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('users').select('locale').eq('id', user.id).maybeSingle();
  const { t } = await tServer(me?.locale || undefined);

  const { data: competition } = await supabase
    .from('competitions')
    .select('id, name, sport_id, season_id, club_id, team_id, player_id')
    .eq('id', competitionId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (!competition) notFound();

  const { data: player } = await supabase
    .from('players')
    .select('id, full_name, user_id')
    .eq('id', playerId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!player) notFound();

  const [{ data: club }, { data: team }] = await Promise.all([
    competition.club_id
      ? supabase.from('clubs').select('id, name').eq('id', competition.club_id).maybeSingle()
      : Promise.resolve({ data: null }),
    competition.team_id
      ? supabase.from('teams').select('id, name').eq('id', competition.team_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <TitleH1>
        {t('competicion_editar') || 'Editar competición'} — {player.full_name}
      </TitleH1>
      <div className="mb-4">
        <Link href={`/players/${playerId}`} className="text-sm text-green-700 underline">
          {t('perfil_ver') || 'Ver perfil'}
        </Link>
      </div>
      <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
        <CompetitionEditForm
          playerId={playerId}
          competitionId={competitionId}
          initial={{
            name: competition.name,
            sportId: competition.sport_id,
            clubName: club?.name ?? '',
            teamName: team?.name ?? '',
          }}
        />
      </section>
    </div>
  );
}
