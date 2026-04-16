// src/app/players/[id]/media/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getDictionary, makeT } from '@/i18n/dictionary';
import TitleH1 from '@/components/TitleH1';
import AvatarUploadForm from './AvatarUploadForm';

type PageParams = { id: string };

async function clearAvatarAction(formData: FormData) {
    'use server';
    const playerId = String(formData.get('player_id') || '');
    const seasonId = String(formData.get('season_id') || '');
    if (!playerId || !seasonId) return;

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Verificar pertenencia
    const { data: owns } = await supabase
        .from('players')
        .select('id')
        .eq('id', playerId)
        .eq('user_id', user.id)
        .maybeSingle();
    if (!owns) return;

    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
    const admin = getSupabaseAdmin();

    await admin
        .from('player_seasons')
        .update({ avatar: null })
        .eq('player_id', playerId)
        .eq('season_id', seasonId);

    redirect(`/players/${playerId}/media`);
}

function canUseNextImage(u: string | null | undefined) {
    return !!u && (/^https?:\/\//i.test(u) || u.startsWith('/'));
}

export default async function PlayerMediaPage({
    params,
}: {
    params: Promise<PageParams>;
}) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const { data: me } = await supabase
        .from('users')
        .select('locale')
        .eq('id', user.id)
        .maybeSingle();
    const { dict } = await getDictionary(me?.locale || undefined);
    const t = makeT(dict);

    const { data: player, error: pErr } = await supabase
        .from('players')
        .select('id, full_name, user_id')
        .eq('id', id)
        .eq('user_id', user.id)
        .maybeSingle();

    if (pErr) {
        return (
            <div className="max-w-xl mx-auto">
                <TitleH1>{t('avatares')}</TitleH1>
                <div className="mt-4 rounded-xl border p-4 bg-red-50 text-red-800">
                    {t('player_error_cargar')}
                </div>
                <div className="mt-4">
                    <Link href="/dashboard" className="text-green-700 underline">{t('volver_panel')}</Link>
                </div>
            </div>
        );
    }
    if (!player) notFound();

    // Temporada vigente
    const now = new Date();
    const y = now.getFullYear();
    const aug1 = new Date(y, 7, 1);
    const startYear = now >= aug1 ? y : y - 1;
    const endYear = startYear + 1;

    const { data: currentSeason } = await supabase
        .from('seasons')
        .select('id, year_start, year_end')
        .eq('year_start', startYear)
        .eq('year_end', endYear)
        .maybeSingle();

    const currentSeasonId = currentSeason?.id ?? null;

    // Todas las player_seasons del jugador con join a seasons, desc
    const { data: allPlayerSeasons } = await supabase
        .from('player_seasons')
        .select('season_id, avatar, s:seasons(year_start, year_end)')
        .eq('player_id', player.id)
        .order('created_at', { ascending: false });

    const rows = allPlayerSeasons ?? [];

    const currentRow = rows.find(r => r.season_id === currentSeasonId) ?? null;
    const pastRows = rows.filter(r => r.season_id !== currentSeasonId);

    const seasonLabel = (row: any) =>
        row?.s ? `${row.s.year_start}-${row.s.year_end}` : String(row?.season_id ?? '—');

    return (
        <div className="max-w-xl mx-auto">
            <TitleH1>{t('avatares')} · <i>{player.full_name}</i></TitleH1>

            {/* Botón volver */}
            <div className="mb-6">
                <Link
                    href={`/players/${player.id}`}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white font-semibold hover:bg-green-700"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {t('avatar_volver_deportista')}
                </Link>
            </div>

            {/* Temporada actual */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-800 mb-1">
                    {t('temporada_actual')}
                    {currentSeason ? (
                        <>
                            {' '}
                            <span className="text-gray-500 font-normal">
                                {currentSeason.year_start}-{currentSeason.year_end}
                            </span>
                        </>
                    ) : null}
                </h2>
                <p className="text-xs text-gray-500 mb-4">{t('avatar_temporada')}</p>

                {currentSeasonId ? (
                    <AvatarUploadForm
                        playerId={player.id}
                        seasonId={currentSeasonId}
                        currentAvatarPath={currentRow?.avatar ?? null}
                    />
                ) : (
                    <p className="text-sm text-gray-500">{t('temporada_no_definida')}</p>
                )}
            </section>

            {/* Temporadas anteriores */}
            {pastRows.length > 0 && (
                <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">{t('temporadas')}</h2>

                    <ul className="divide-y divide-gray-100">
                        {pastRows.map((row: any) => (
                            <li key={row.season_id} className="flex items-center gap-4 py-3">
                                {/* Avatar */}
                                <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100 flex-shrink-0">
                                    {canUseNextImage(row.avatar) ? (
                                        <Image
                                            src={row.avatar}
                                            alt={t('avatar')}
                                            width={48}
                                            height={48}
                                            unoptimized
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="grid h-full w-full place-content-center text-xl text-gray-400">
                                            🏃
                                        </div>
                                    )}
                                </div>

                                {/* Etiqueta temporada */}
                                <span className="flex-1 text-sm font-medium text-gray-700">
                                    {seasonLabel(row)}
                                </span>

                                {/* Eliminar (solo si hay avatar) */}
                                {row.avatar ? (
                                    <form action={clearAvatarAction}>
                                        <input type="hidden" name="player_id" value={player.id} />
                                        <input type="hidden" name="season_id" value={row.season_id} />
                                        <button
                                            type="submit"
                                            className="inline-flex items-center rounded-xl bg-red-100 border border-red-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-red-50"
                                        >
                                            {t('eliminar')}
                                        </button>
                                    </form>
                                ) : (
                                    <span className="text-xs text-gray-400">{t('avatar_sin')}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
