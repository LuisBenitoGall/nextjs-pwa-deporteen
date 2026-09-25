import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import TitleH1 from '@/components/TitleH1';

type PageParams = { id: string; seasonId: string };

export default async function PlayerSeasonMatchesPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id: playerId, seasonId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: me } = await supabase.from('users').select('locale').eq('id', user.id).maybeSingle();
  const { t } = await tServer(me?.locale || undefined);

  const { data: player } = await supabase
    .from('players')
    .select('id, full_name')
    .eq('id', playerId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!player) notFound();

  const { data: season } = await supabase
    .from('seasons')
    .select('id, year_start, year_end')
    .eq('id', seasonId)
    .maybeSingle();

  if (!season) notFound();

  const { data: matches } = await supabase
    .from('matches')
    .select('id, date_at, rival_team_name, my_score, rival_score, competition_id')
    .eq('player_id', playerId)
    .eq('season_id', seasonId)
    .order('date_at', { ascending: false });

  const seasonLabel = `${season.year_start}-${season.year_end}`;

  return (
    <div className="max-w-3xl mx-auto">
      <TitleH1>
        {t('partidos') || 'Partidos'} — {player.full_name} ({seasonLabel})
      </TitleH1>

      <div className="mb-4">
        <Link href={`/players/${playerId}`} className="text-sm text-green-700 underline">
          {t('perfil_ver') || 'Ver perfil'}
        </Link>
      </div>

      {!matches?.length ? (
        <p className="text-sm text-gray-500">{t('sin_partidos') || 'No hay partidos en esta temporada.'}</p>
      ) : (
        <ul className="space-y-2">
          {matches.map((m) => (
            <li key={m.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex justify-between gap-4">
              <div>
                <div className="font-medium">{m.rival_team_name || '—'}</div>
                <div className="text-xs text-gray-500">
                  {m.date_at ? new Date(m.date_at).toLocaleString() : '—'}
                </div>
              </div>
              <div className="text-sm tabular-nums">
                {m.my_score ?? 0} – {m.rival_score ?? 0}
              </div>
              <Link href={`/matches/${m.id}/live`} className="text-sm text-green-700 underline self-center">
                {t('ver') || 'Ver'}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
