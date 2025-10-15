// src/app/players/[id]/page.tsx
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import { LIMITS } from '@/config/constants';

//Components
import ConfirmDeleteButton from '@/components/ConfirmDeleteButton';
import EditPlayerNameModal from '@/components/EditPlayerNameModal';
import TitleH1 from '@/components/TitleH1';

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

    //Límite competiciones
    const MAX_COMP = LIMITS.COMPETITION_NUM_MAX_BY_SEASON;

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
          .limit(MAX_COMP)
      ).data ?? []
    : [];
    
    const compCount = competitions.length;
    const reachedMax = compCount >= MAX_COMP;

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
    const matchesCountByComp = new Map<string, number>();

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

    // --- Server Action: borrar competición de esta temporada ---
    async function deleteCompetitionAction(bound: { compId: string; playerId: string; seasonId: string | null }) {
        'use server';
        const { compId, playerId } = bound || {};
        if (!compId || !playerId) return;

        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) redirect('/login');

        // 0) Verificación: la competición es del usuario actual
        const { data: owns, error: ownsErr } = await supabase
            .from('competitions')
            .select('id, player_id, p:players(user_id)')
            .eq('id', compId)
            .maybeSingle();

        if (ownsErr || !owns || (owns as any)?.p?.user_id !== user.id || owns.player_id !== playerId) {
            console.error('deleteCompetitionAction: ownership check failed', ownsErr, owns);
            return; // salimos en silencio; si prefieres, lanza un Error
        }

        // 1) Admin client (service role) para bypass RLS
        const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
        const admin = getSupabaseAdmin();

        // 2) Borrar dependientes primero (matches)
        const { error: delMatchesErr } = await admin
            .from('matches')
            .delete()
            .eq('competition_id', compId);
            // .eq('player_id', playerId) // opcional si tu esquema lo tiene siempre

        if (delMatchesErr) {
            console.error('deleteCompetitionAction: matches delete', delMatchesErr);
            // seguimos; puede no haber partidos
        }

        // 3) Borrar la competición
        const { data: deleted, error: delCompErr } = await admin
            .from('competitions')
            .delete()
            .eq('id', compId)
            .select('id')
            .maybeSingle();

        if (delCompErr || !deleted?.id) {
            console.error('deleteCompetitionAction: competition delete', delCompErr);
            return; // si quieres feedback visible, lanza Error aquí
        }

        // 4) Volver al detalle para refrescar
        redirect(`/players/${playerId}`);
    }

    // --- Estado de suscripción del usuario ---
    const { data: subs } = await supabase
    .from('subscriptions')
    .select('current_period_end, status')
    .eq('user_id', user.id)
    .order('current_period_end', { ascending: false });

    let isActiveSubscription = false;
    if (subs?.length) {
        const latest = subs[0];
        const end = latest.current_period_end ? new Date(latest.current_period_end) : null;
        const statusOk = latest.status === true || String(latest.status || '').toLowerCase() === 'active';
        isActiveSubscription = Boolean(end && end.getTime() > Date.now() && statusOk);
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
        
                {/* Nuevo partido */}
                {isActiveSubscription && (
                    <Link
                        href={`/players/${player.id}/matches/new`}
                        className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm text-white font-bold hover:bg-green-700"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                        </svg>
                        <span>{t('partido_nuevo')}</span>
                    </Link>
                )}
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
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-lg font-semibold">
                        {t('competiciones')}.
                        <span className="text-gray-500 ml-3 align-baseline">
                            {t('temporada')}{' '}
                            <b>{currentSeason ? `${currentSeason.year_start}-${currentSeason.year_end}` : `${startYear}-${endYear}`}</b>
                        </span>

                        {/* Contador competiciones */}
                        <span className="ml-3 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                            {compCount}/{MAX_COMP}
                        </span>
                    </h2>

                    {/* CTA: Nueva competición (bloquear si no hay suscripción activa) */}
                    {currentSeasonId ? (
                        isActiveSubscription ? (
                            !reachedMax ? (
                            <Link
                                href={`/players/${player.id}/competitions/new?season=${currentSeasonId}`}
                                className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                                </svg>
                                <span className="whitespace-nowrap">{t('competicion_nueva') || 'Nueva competición'}</span>
                            </Link>
                            ) : (
                            <button
                                type="button"
                                disabled
                                aria-disabled="true"
                                title={t('limite_competiciones_alcanzado') || 'Has alcanzado el límite de competiciones para esta temporada'}
                                className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                                <span className="whitespace-nowrap">{t('competicion_nueva') || 'Nueva competición'}</span>
                            </button>
                            )
                        ) : (
                            <button
                            type="button"
                            disabled
                            aria-disabled="true"
                            title={t('suscripcion_necesaria_para_crear') || 'Necesitas una suscripción activa para crear competiciones'}
                            className="self-start sm:self-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-medium text-gray-400 cursor-not-allowed"
                            >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            <span className="whitespace-nowrap">{t('competicion_nueva') || 'Nueva competición'}</span>
                            </button>
                        )
                    ) : null}
                </div>

                {/* Contenedor con scroll horizontal en móvil, suave en desktop, inercia iOS */}
                <div
                className="relative -mx-4 sm:mx-0 mt-4 overflow-x-auto md:overflow-visible px-4 sm:px-0 md:scroll-smooth"
                aria-label={t('tabla_desplazar_horizontal') || 'Desplaza horizontalmente para ver la tabla completa'}
                style={{
                  WebkitOverflowScrolling: 'touch',
                  WebkitMaskImage:
                    'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)'
                }}
                >
                    {competitions.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('sin_competiciones_actuales')}</p>
                    ) : (
                        <table className="min-w-[760px] md:min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    {/* th pegajoso en móvil */}
                                    <th className="py-2 pr-4 sticky left-0 z-10 bg-white">{t('nombre') || 'Competición'}</th>
                                    <th className="py-2 pr-4">{t('deporte') || 'Deporte'}</th>
                                    <th className="py-2 pr-4">{t('club') || 'Club'}</th>
                                    <th className="py-2 pr-4">{t('equipo') || 'Equipo'}</th>
                                    <th className="py-2 text-center">{t('partidos') || 'Partidos'}</th>
                                    <th className="py-2 text-center">{t('acciones') || 'Acciones'}</th>
                                </tr>
                            </thead>

                            <tbody>
                                {competitions.map((c: any) => (
                                    <tr key={c.id} className="border-t border-gray-100">
                                        {/* td pegajoso en móvil con leve sombra lateral para separar */}
                                        <td
                                            className="py-3 pr-4 sticky left-0 z-10 bg-white"
                                            style={{ boxShadow: 'inset -8px 0 8px -8px rgba(0,0,0,0.08)' }}
                                        >
                                            <div className="font-medium text-gray-900 break-words">
                                              {c.name || t('no_definida')}
                                            </div>
                                        </td>
                                        <td className="py-3 pr-4">{c?.sport?.name || '—'}</td>
                                        <td className="py-3 pr-4">{c?.club?.name || '—'}</td>
                                        <td className="py-3 pr-4">{c?.team?.name || '—'}</td>
                                        <td className="py-3 pr-2 text-center tabular-nums">
                                            {matchesCountByComp.get(c.id) ?? 0}
                                        </td>
                                        <td className="py-3 pr-4">
                                            <div className="flex items-center justify-end gap-2 flex-wrap md:flex-nowrap">
                                                {/* Nuevo partido con competition en query */}
                                                {isActiveSubscription && (
                                                    <Link
                                                        href={`/players/${player.id}/matches/new?competition=${c.id}`}
                                                        className="inline-flex items-center rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                                    >
                                                        + {t('partido')}
                                                    </Link>
                                                )}

                                                {/* Ver partidos de esta competición */}
                                                <Link
                                                    href={`/players/${player.id}/competitions/${c.id}/matches`}
                                                    className="inline-flex items-center rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                                >
                                                    {t('partidos')}
                                                </Link>

                                                {/* Eliminar competición: mismo modal que “eliminar jugador” */}
                                                {/* Eliminar competición: icono de papelera rojo, con etiqueta accesible */}
                                                <ConfirmDeleteButton
                                                    onConfirm={deleteCompetitionAction.bind(null, {
                                                        compId: c.id,
                                                        playerId: player.id,
                                                        seasonId: currentSeasonId,
                                                    })}
                                                    ariaLabel={t('eliminar') || 'Eliminar'}
                                                    confirmTitle={t('competicion_eliminar_confirmar') || 'Confirmar eliminación de competición'}
                                                    confirmMessage={
                                                        t('competicion_eliminar_confirmar_texto') ||
                                                        'Confirma que deseas eliminar esta competición. Se eliminarán los datos asociados. Esta acción es irreversible.'
                                                    }
                                                    confirmCta={t('borrado_confirmar') || 'Confirmar borrado'}
                                                    cancelCta={t('cancelar') || 'Cancelar'}

                                                    className="inline-flex items-center rounded-xl bg-red-100 border border-red-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-red-50 whitespace-nowrap"
                                                />
                                            </div>
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
