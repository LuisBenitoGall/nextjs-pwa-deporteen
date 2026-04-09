// src/app/players/[id]/competitions/new/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import TitleH1 from '@/components/TitleH1';
import CompetitionNewForm from './CompetitionNewForm';

type PageParams = { id: string };
type Search = { season?: string };

export default async function NewCompetitionPage({
    params,
    searchParams,
}: {
    params: Promise<PageParams>;            // Next 15: Promise
    searchParams: Promise<Search>;         // Next 15: Promise
}) {
    const { id } = await params;
    const sp = await searchParams;

  const supabase = await createSupabaseServerClient();

  // Auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // i18n
  const { data: me } = await supabase
    .from('users')
    .select('locale')
    .eq('id', user.id)
    .maybeSingle();

  const { t } = await tServer(me?.locale || undefined);

  // Jugador (para mostrar nombre y validar pertenencia)
  const { data: player, error } = await supabase
    .from('players')
    .select('id, full_name, user_id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    return (
      <div className="max-w-xl mx-auto">
        <TitleH1>{t('competicion_nueva') || 'Nueva competición'}</TitleH1>
        <div className="mt-4 rounded-xl border p-4 bg-red-50 text-red-800">
          {t('player_error_cargar') ?? 'No se pudo cargar el deportista.'}
        </div>
        <div className="mt-4">
          <Link href="/dashboard" className="text-green-700 underline">{t('volver_panel')}</Link>
        </div>
      </div>
    );
  }
  if (!player) {
    redirect('/dashboard');
  }

  // seasonId opcional desde query
  const seasonIdFromQuery = sp?.season ? String(sp.season) : null;

    return (
        <div className="max-w-2xl mx-auto">
            <TitleH1>
                {t('competicion_nueva') || 'Nueva competición'} <i>{player.full_name}</i>
            </TitleH1>

            <div className="mb-4">
                <Link
                    href={`/players/${player.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white font-semibold hover:bg-green-700"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {t('perfil_ver') || 'Ver perfil'}
                </Link>
            </div>

            <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                <CompetitionNewForm playerId={player.id} seasonIdFromQuery={seasonIdFromQuery} />
            </section>
        </div>
    );
}
