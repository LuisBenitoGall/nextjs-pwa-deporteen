// src/app/players/[id]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';

//Components
import EditPlayerNameModal from '@/components/EditPlayerNameModal';
import TitleH1 from '@/components/TitleH1';

type PageProps = { params: { id: string } };
type PageParams = { id: string };

export default async function PlayerDetailPage({
    params,
}: {
    params: Promise<PageParams>; // ← en Next 15, params es Promise
}) {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Sesión segura en servidor
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Idioma usuario
    const { data: me } = await supabase
    .from('users')
    .select('locale, status')
    .eq('id', user.id)
    .maybeSingle();
    const { t } = await tServer(me?.locale || undefined);

    // Jugador
    const { data: player, error: pErr } = await supabase
    .from('players')
    .select('id, full_name, created_at, user_id')
    .eq('id', id)
    .eq('user_id', user.id) // RLS amistoso
    .maybeSingle();

    const canUseNextImage = (u: string | null | undefined) =>
    !!u && (/^https?:\/\//i.test(u) || u.startsWith('/'));

    if (pErr) {
        // Estado de error amable
        return (
            <div className="max-w-xl mx-auto">
                <TitleH1>{t('deportista')}</TitleH1>
                <div className="mt-4 rounded-xl border p-4 bg-red-50 text-red-800">
                    {t('player_error_cargar') ?? 'No se pudo cargar el deportista.'}
                </div>
                <div className="mt-4">
                    <Link href="/dashboard" className="text-green-700 underline">{t('volver_panel')}</Link>
                </div>
            </div>
        );
    }
    if (!player) notFound();

    // ---------- Temporada vigente por fecha ----------
    const now = new Date();
    const y = now.getFullYear();
    const aug1 = new Date(y, 7, 1); // 1 agosto
    const startYear = now >= aug1 ? y : y - 1;
    const endYear = startYear + 1;

    const { data: currentSeason } = await supabase
    .from('seasons')
    .select('id, year_start, year_end')
    .eq('year_start', startYear)
    .eq('year_end', endYear)
    .maybeSingle();

    const currentSeasonId = currentSeason?.id ?? null;

    // Avatar de temporada vigente
    const { data: psCurrent } = currentSeasonId
    ? await supabase
        .from('player_seasons')
        .select('avatar, season_id')
        .eq('player_id', player.id)
        .eq('season_id', currentSeasonId)
        .maybeSingle()
    : { data: null as any };

    const avatarUrl = psCurrent?.avatar || null;

    // Competiciones de la temporada vigente (con nombres por FK)
    const competitions = currentSeasonId
    ? (
        await supabase
          .from('competitions')
          .select(`
            id, name, created_at,
            sport:sports(name),
            club:clubs(name),
            team:teams(name)
          `)
          .eq('player_id', player.id)
          .eq('season_id', currentSeasonId)
          .order('created_at', { ascending: false })
      ).data ?? []
    : [];

    // Todas las temporadas del jugador con join a seasons
    const { data: seasonsAll } = await supabase
    .from('player_seasons')
    .select(`
      season_id,
      created_at,
      s:seasons(year_start, year_end)
    `)
    .eq('player_id', player.id)
    .order('created_at', { ascending: false });

    // Temporadas anteriores = todas menos la vigente
    const previousSeasons = (seasonsAll || []).filter(s => s.season_id !== currentSeasonId);

    // Utils
    function formatDate(d: string | Date | null | undefined, locale: string) {
        if (!d) return '—';
        const date = typeof d === 'string' ? new Date(d) : d;
        return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
    }
    const locale = me?.locale || 'es-ES';
    const seasonLabel = (row: any) =>
    row?.s ? `${row.s.year_start}-${row.s.year_end}` : String(row?.season_id ?? '—');

    // Conteo de partidos por competición en la temporada vigente
    let matchesCountByComp = new Map<string, number>();

    if (currentSeasonId && competitions.length > 0) {
        const compIds = competitions.map((c: any) => c.id);

        const { data: matchesData, error: matchesErr } = await supabase
        .from('matches') // ajusta si tu tabla se llama distinto
        .select('competition_id')
        .eq('player_id', player.id)
        .eq('season_id', currentSeasonId)
        .in('competition_id', compIds);

        if (!matchesErr && Array.isArray(matchesData)) {
            for (const m of matchesData as Array<{ competition_id: string }>) {
                const k = m.competition_id;
                matchesCountByComp.set(k, (matchesCountByComp.get(k) || 0) + 1);
            }
        }
    }

    return (
        <div>
            <TitleH1>{t('jugador')} <i>{player.full_name}</i></TitleH1>

            <div className="mb-6 flex gap-2">
                <Link href="/dashboard">
                    <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t('mi_panel_volver')}</span>
                    </button>
                </Link>

                <Link href="/account">
                    <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span>{t('cuenta_mi_volver')}</span>
                    </button>
                </Link>
        
                <Link
                    href={`/players/${player.id}/matches/new`}
                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white font-bold hover:bg-green-700"
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                    </svg>
                    <span>{t('partido_nuevo')}</span>
                </Link>
            </div>

            {/* Info del jugador */}
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-16 w-16 overflow-hidden rounded-full bg-gray-100">
                        {canUseNextImage(avatarUrl) ? (
                            // remoto o estático servible por Next
                            <Image
                                src={avatarUrl!}
                                alt={player.full_name}
                                width={64}
                                height={64}
                                unoptimized // evita que intente pasar por el loader de dominio si ya es servible
                            />
                        ) : (
                            // no servible (local://, fsapi://, etc.) → placeholder
                            <div className="grid h-full w-full place-content-center text-2xl text-gray-400">
                                🏃
                            </div>
                        )}
                    </div>
          
                    <div className="min-w-0">
                        <p className="text-sm text-gray-500">
                            <span className="mr-1">{t('fecha_alta') || 'Fecha de alta'}:</span>
                            <span className="font-medium text-gray-900">
                                {formatDate(player.created_at, locale)}
                            </span>
                        </p>
                        {currentSeasonId ? (
                            <p className="text-sm text-gray-500">
                                {t('temporada_actual')}:{' '}
                                <span className="font-medium text-gray-900">{`${startYear}-${endYear}`}</span>
                            </p>
                        ) : (
                            <p className="text-sm text-gray-900">{t('temporada_no_definida')}</p>
                        )}
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                    {/* Editar datos de jugador */}
                    <EditPlayerNameModal playerId={player.id} currentName={player.full_name} buttonLabel={t('editar')} />
    
                    {/*<Link
                        href={`/players/${player.id}/edit`}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.5"/><path d="M14.06 6.19l3.75 3.75" stroke="currentColor" strokeWidth="1.5"/></svg>
                        <span>{t('editar')}</span>
                    </Link>*/}

                    {/* Multimedia */}
                    <Link
                        href={`/players/${player.id}/media`}
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"> <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/> <circle cx="8" cy="10" r="2" stroke="currentColor" strokeWidth="1.5"/> <path d="M4.5 17l5-5 3 3 2-2 5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/> </svg>
                        {t('multimedia')}
                    </Link>
                </div>
            </section>

            {/* Competiciones actuales */}
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="mb-3 text-lg font-semibold">
                        {t('competiciones')}.
                        <span className="text-gray-500 ml-3">
                            {t('temporada')}{' '}
                            <b>
                                {currentSeason
                                ? `${currentSeason.year_start}-${currentSeason.year_end}`
                                : `${startYear}-${endYear}`}
                            </b>
                        </span>
                    </h2>
                </div>
                
                <div className="mt-4 overflow-x-auto">
                    {competitions.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            {t('sin_competiciones_actuales')}
                        </p>
                    ) : (
                    
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2">{t('nombre') || 'Competición'}</th>
                                    <th className="py-2">{t('deporte') || 'Deporte'}</th>
                                    <th className="py-2">{t('club') || 'Club'}</th>
                                    <th className="py-2">{t('equipo') || 'Equipo'}</th>
                                    <th className="py-2 text-center">{t('partidos') || 'Partidos'}</th>
                                    <th className="py-2 text-center">{t('acciones') || 'Acciones'}</th>
                                </tr>
                            </thead>
                        
                            <tbody>
                                {competitions.map((c: any) => (
                                    <tr key={c.id} className="border-t border-gray-100">
                                        <td className="py-3 pr-4">
                                            <div className="font-medium text-gray-900">{c.name || t('no_definida')}</div>
                                            {/*<div className="text-xs text-gray-500">
                                                {t('creado_el', { date: formatDate(c.created_at, locale) })}
                                            </div>*/}
                                        </td>
                                        <td className="py-3 pr-4">{c?.sport?.name || '—'}</td>
                                        <td className="py-3 pr-4">{c?.club?.name || '—'}</td>
                                        <td className="py-3 pr-4">{c?.team?.name || '—'}</td>
                                        <td className="py-3 pr-4 text-right">
                                            {matchesCountByComp.get(c.id) ?? 0}
                                        </td>
                                        <td className="py-3 pr-4 text-right">
                                            {/* Nuevo partido */}
                                            <Link
                                                href={`/players/${player.id}/matches/new`}

                                                className="rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                {t('partido_nuevo')}
                                            </Link>

                                            {/* Ver partidos */}
                                            <Link
                                                href={`/players/${player.id}/add-match?competition_id=${c.id}`}
                                                className="rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 ml-2"
                                            >
                                                {t('partidos_ver')}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* Historial */}
            {previousSeasons.length > 0 && (
                <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-800">{t('historial') || 'Historial'}</h2>

                    <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2 pr-4">{t('temporada') || 'Temporada'}</th>
                                    <th className="py-2 pr-4 text-center">{t('acciones') || 'Acciones'}</th>
                                </tr>
                            </thead>
                            
                            <tbody>
                                {previousSeasons.map((row: any) => (
                                    <tr key={row.season_id} className="border-t border-gray-100">
                                        <td className="py-3 pr-4">
                                            <span className="font-medium text-gray-900">{seasonLabel(row)}</span>
                                        </td>
                                        <td className="py-3 pr-4 text-center">
                                            <Link
                                                href={`/players/${player.id}/season/${row.season_id}`}
                                                className="rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                {t('ver_partidos') || 'Ver partidos'}
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
}
