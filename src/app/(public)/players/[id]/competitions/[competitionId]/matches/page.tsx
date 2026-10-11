import { notFound, redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadCompetitionMatchesInitialData } from '@/lib/competitions/loadCompetitionMatchesInitialData';
import { getSubscriptionState } from '@/lib/subscriptions';
import { tServer } from '@/i18n/server';
import PageLoadError from '@/components/PageLoadError';
import MatchesByCompetitionView from './MatchesByCompetitionView';

type PageParams = { id: string; competitionId: string };

export default async function MatchesByCompetitionPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id: playerId, competitionId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/players/${playerId}/competitions/${competitionId}/matches`);
  }

  const { data: me } = await supabase.from('users').select('locale').eq('id', user.id).maybeSingle();
  const { t } = await tServer(me?.locale || undefined);

  const [loaded, subscription] = await Promise.all([
    loadCompetitionMatchesInitialData(supabase, user.id, playerId, competitionId),
    getSubscriptionState(user.id),
  ]);

  if (!loaded.ok) {
    if (loaded.reason === 'forbidden') {
      redirect('/dashboard');
    }
    if (loaded.reason === 'not_found') {
      notFound();
    }
    return (
      <PageLoadError
        message={loaded.message || t('error_carga_generica') || 'No se pudo cargar los partidos.'}
        backHref={`/players/${playerId}`}
        backLabelKey="volver_panel"
      />
    );
  }

  return (
    <MatchesByCompetitionView
      playerId={playerId}
      initial={loaded.data}
      isActiveSubscription={subscription.isActiveSubscription}
    />
  );
}
