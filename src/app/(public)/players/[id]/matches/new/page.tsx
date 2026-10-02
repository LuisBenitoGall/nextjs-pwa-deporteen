// =============================================
// 1) FASE 1: METADATOS DEL PARTIDO (CREAR)
// Ruta: src/app/players/[id]/matches/new/page.tsx
// =============================================

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import TitleH1 from '@/components/TitleH1';
import NewMatchMetaForm, { type NewMatchCompetition } from './NewMatchMetaForm';

type PageParams = { id: string };
type Search = { competition?: string; competition_id?: string };

function pickInitialCompetition(
  competitions: NewMatchCompetition[],
  preCompetition: string
): NewMatchCompetition | null {
  if (!competitions.length) return null;
  if (preCompetition) {
    const fromQuery = competitions.find((c) => c.id === preCompetition);
    if (fromQuery) return fromQuery;
  }
  if (competitions.length === 1) return competitions[0];
  return null;
}

export default async function NewMatchMetaPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<Search>;
}) {
  const { id: playerId } = await params;
  const sp = await searchParams;
  const preCompetition = sp?.competition || sp?.competition_id || '';

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/players/${playerId}/matches/new`);

  const { data: me } = await supabase.from('users').select('locale').eq('id', user.id).maybeSingle();
  const { t } = await tServer(me?.locale || undefined);

  const [{ data: player, error: playerErr }, { data: competitionsRaw, error: compsErr }] =
    await Promise.all([
      supabase
        .from('players')
        .select('id, full_name, user_id')
        .eq('id', playerId)
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase
        .from('competitions')
        .select('id, name, sport_id, season_id, team_id')
        .eq('player_id', playerId)
        .order('name', { ascending: true }),
    ]);

  if (playerErr) {
    return (
      <div className="max-w-xl mx-auto">
        <TitleH1>{t('partido_nuevo') || 'Nuevo partido'}</TitleH1>
        <div className="mt-4 rounded-xl border p-4 bg-red-50 text-red-800">
          {t('player_error_cargar') ?? 'No se pudo cargar el deportista.'}
        </div>
        <div className="mt-4">
          <Link href="/dashboard" className="text-green-700 underline">
            {t('volver_panel') || 'Volver al panel'}
          </Link>
        </div>
      </div>
    );
  }

  if (!player) {
    redirect('/dashboard');
  }

  if (compsErr) {
    return (
      <div className="max-w-xl mx-auto">
        <TitleH1>
          {t('partido_nuevo') || 'Nuevo partido'} <i>{player.full_name}</i>
        </TitleH1>
        <div className="mt-4 rounded-xl border p-4 bg-red-50 text-red-800">
          {compsErr.message || t('competicion_error_cargar') || 'No se pudieron cargar las competiciones.'}
        </div>
      </div>
    );
  }

  const competitions = (competitionsRaw || []) as NewMatchCompetition[];
  const initial = pickInitialCompetition(competitions, preCompetition);

  return (
    <div className="max-w-3xl mx-auto">
      <TitleH1>
        {t('partido_nuevo') || 'Nuevo partido'} <i>{player.full_name}</i>
      </TitleH1>

      {!competitions.length ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <p className="text-sm">
            {t('competicion_crear_primero') ||
              'Crea al menos una competición para este deportista antes de registrar un partido.'}
          </p>
          <Link
            href={`/players/${player.id}/competitions/new`}
            className="mt-3 inline-block text-sm font-semibold text-green-700 underline"
          >
            {t('competicion_nueva') || 'Nueva competición'}
          </Link>
        </div>
      ) : (
        <NewMatchMetaForm
          playerId={player.id}
          competitions={competitions}
          initialCompetitionId={initial?.id ?? ''}
          initialSportId={initial?.sport_id ?? ''}
          initialSeasonId={initial?.season_id ?? ''}
          initialTeamId={initial?.team_id ?? ''}
        />
      )}
    </div>
  );
}
