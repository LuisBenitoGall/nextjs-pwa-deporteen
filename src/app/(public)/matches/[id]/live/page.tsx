import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadLiveMatchInitialData } from '@/lib/matches/loadLiveMatchInitialData';
import { tServer } from '@/i18n/server';
import PageLoadError from '@/components/PageLoadError';
import LiveMatchView from './LiveMatchView';

type PageParams = { id: string };

export default async function LiveMatchPage({ params }: { params: Promise<PageParams> }) {
  const { id: matchId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/matches/${matchId}/live`);
  }

  const { data: me } = await supabase.from('users').select('locale').eq('id', user.id).maybeSingle();
  const { t } = await tServer(me?.locale || undefined);

  const loaded = await loadLiveMatchInitialData(supabase, user.id, matchId);

  if (!loaded.ok) {
    if (loaded.reason === 'forbidden') {
      redirect('/dashboard');
    }
    if (loaded.reason === 'not_found') {
      return (
        <PageLoadError
          titleKey="no_encontrado"
          backHref="/dashboard"
          backLabelKey="mi_panel_volver"
        />
      );
    }
    return (
      <PageLoadError
        message={loaded.message || t('error_carga_generica') || 'No se pudo cargar el partido.'}
        backHref="/dashboard"
        backLabelKey="mi_panel_volver"
      />
    );
  }

  return <LiveMatchView matchId={matchId} initial={loaded.data} />;
}
