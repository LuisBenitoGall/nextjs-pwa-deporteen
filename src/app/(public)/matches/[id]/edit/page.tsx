import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { loadMatchEditInitialData } from '@/lib/matches/loadMatchEditInitialData';
import { tServer } from '@/i18n/server';
import TitleH1 from '@/components/TitleH1';
import PageLoadError from '@/components/PageLoadError';
import EditMatchMetaForm from './EditMatchMetaForm';

type PageParams = { id: string };

export default async function EditMatchMetaPage({ params }: { params: Promise<PageParams> }) {
  const { id: matchId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/matches/${matchId}/edit`);
  }

  const { data: me } = await supabase.from('users').select('locale').eq('id', user.id).maybeSingle();
  const { t } = await tServer(me?.locale || undefined);

  const loaded = await loadMatchEditInitialData(supabase, user.id, matchId);

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
        backHref={matchId ? `/matches/${matchId}/live` : '/dashboard'}
        backLabelKey={matchId ? 'partido_volver' : 'mi_panel_volver'}
      />
    );
  }

  return (
    <div>
      <TitleH1>{t('partido_editar') || 'Editar partido'}</TitleH1>
      <EditMatchMetaForm
        matchId={matchId}
        match={loaded.data.match}
        competition={loaded.data.competition}
      />
    </div>
  );
}
