import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import { getSeatStatus } from '@/lib/seats';

//Components
import TitleH1 from '../../components/TitleH1';

type Player = {
    id: string;
    full_name: string;
    created_at: string;
    avatar_url: string | null;
};

export default async function DashboardPage() {
    const supabase = await createSupabaseServerClient();

    // Sesión desde el servidor (cookies)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect('/login');
    const userId = session.user.id;

    //Asientos pendientes:
    const { remaining: pendingPlayers } = await getSeatStatus(userId);
    const canAddPlayers = pendingPlayers > 0;

    // Usuario para locale/estado
    const { data: me } = await supabase
    .from('users')
    .select('locale, status')
    .eq('id', userId)
    .maybeSingle();

    // Seguridad: si está desactivado, fuera
    const statusVal = (me as any)?.status;
    const normalized = typeof statusVal === 'string' ? statusVal.toLowerCase() : statusVal;
    const isDisabled = normalized === false || normalized === 'inactive' || normalized === 'false';
    if (me && isDisabled) redirect('/logout');

    const { t } = await tServer(me?.locale || undefined);

    // 1) Suscripciones: varias filas posibles
    // Regla: existe suscripción si hay >= 1 fila; está "activa" si la última no ha vencido aún,
    // independientemente del booleano status.
    const { data: subs } = await supabase
    .from('subscriptions')
    .select('current_period_end, status')
    .eq('user_id', userId)
    .order('current_period_end', { ascending: false });

    const hasAnySubscription = !!subs && subs.length > 0;

    const nowIso = new Date().toISOString();
    const latest = subs?.[0];
    // activa si la última vence en el futuro
    const isActiveByDate = latest ? (latest.current_period_end && latest.current_period_end > nowIso) : false;

    // 2) Seats restantes (para el botón Agregar)
    let seatsErrMsg: string | null = null;
    try {
        // Reutilizamos el RPC que usas en otras vistas
        const { error: seatsErr } = await supabase.rpc('seats_remaining', { p_user_id: userId });
        if (seatsErr) throw seatsErr;
    } catch {
        seatsErrMsg = t('error_asientos_indisponibles'); // añade esta clave
    }

    // 3) Jugadores + avatar de temporada vigente
    // Estrategia: saco jugadores y, para cada uno, su avatar de la season marcada como vigente.
    // Asumo columna booleana `is_current` en player_seasons. Si tu esquema usa otra, ajústalo aquí.
    const { data: playersRaw, error: playersErr } = await supabase
    .from('players')
    .select('id, full_name, created_at')
    .eq('user_id', userId)
    .eq('status', true)
    .order('created_at', { ascending: false });

    // Para evitar N+1 viajes, intentamos una sola query a player_seasons filtrando por jugadores y is_current = true
    let players: Player[] = [];
    if (!playersErr && playersRaw && playersRaw.length) {
        const ids = playersRaw.map(p => p.id);
        const { data: seasons, error: seasonsErr } = await supabase
        .from('player_seasons')
        .select('player_id, avatar')
        .in('player_id', ids)
        .eq('is_current', true);

        const avatarByPlayer = new Map<string, string | null>();
        if (!seasonsErr && seasons) {
            for (const s of seasons) {
                if (!avatarByPlayer.has(s.player_id)) avatarByPlayer.set(s.player_id, s.avatar || null);
            }
        }

        players = playersRaw.map(p => ({
            id: p.id,
            full_name: p.full_name,
            created_at: p.created_at,
            avatar_url: avatarByPlayer.get(p.id) ?? null
        }));
    } else if (!playersRaw) {
        players = [];
    }

    // UI states calculados
    const showSubscribeBanner = !hasAnySubscription; // Solo si no existe ninguna
    const subscribed = isActiveByDate;               // Para bloques de contenido
    //const canAddPlayers = seatsRemaining === null ? false : seatsRemaining > 0;

    // Util: formateo seguro en servidor (igual que en account)
    function formatDate(d: string | Date | null | undefined, locale: string) {
        if (!d) return '—';
        const date = typeof d === 'string' ? new Date(d) : d;
        try {
            return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
        } catch {
            return '—';
        }
    }

    const locale = (me as any)?.locale || 'es-ES';

    return (
        <div>
            <TitleH1>{t('mi_panel')}</TitleH1>

            {/*Banner nuevo jugador*/}
            {/*<CodeRedeemBanner />*/}

            {/* Banner solo si el usuario jamás ha tenido suscripciones */}
            {showSubscribeBanner && (
                <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                    <h3 className="font-bold">{t('suscribete')}</h3>
                    <p className="text-sm">{t('dashboard_suscribete_texto')}</p>
                    <div className="mt-3 text-center">
                        <Link href="/subscription" className="inline-block rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                            {t('suscribirme')}
                        </Link>
                    </div>
                </div>
            )}

            {/* Estado de error para seats */}
            {seatsErrMsg && (
                <div className="mb-4 rounded-2xl border border-red-300 bg-red-50 p-3 text-red-800 text-sm">
                    {seatsErrMsg}
                </div>
            )}

            {/* Contenido del panel: info deportiva */}
            <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-800">{t('deportistas_mis')}</h2>
                    {canAddPlayers ? (
                    <Link
                        href="/players/new"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                        </svg>
                        <span>{t('deportista_agregar') || 'Añadir deportista'}</span>
                    </Link>
                    ) : (
                    <button
                        type="button"
                        className="inline-flex items-center gap-2 cursor-not-allowed rounded-xl border border-gray-300 bg-gray-300 px-2 py-1 text-sm font-medium text-white"
                        title={t('sin_asientos_disponibles')}
                        aria-disabled="true"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                        </svg>
                        <span>{t('deportista_agregar') || 'Añadir deportista'}</span>
                    </button>
                    )}
                </div>

                <div className="mt-4">
                    {(!players || players.length === 0) && (
                    <p className="text-sm text-gray-500">{t('sin_deportistas')}</p>
                    )}

                    {pendingPlayers > 0 && (
                    <p className="text-gray-700">
                        {t('tienes')} <span className="font-semibold text-gray-900">{pendingPlayers}</span>{' '}
                        {pendingPlayers === 1 ? t('deportista_pendiente') : t('deportistas_pendientes')} {t('pendientes_alta')}.
                    </p>
                    )}

                    {players && players.length > 0 && (
                        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {players.map(p => (
                                <li key={p.id} className="rounded-2xl bg-green-50 border border-green-200 p-4 hover:shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                                            {p.avatar_url ? (
                                            <Image src={p.avatar_url} alt={p.full_name} width={48} height={48} />
                                            ) : (
                                            <div className="grid h-full w-full place-content-center text-gray-400">🏃</div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-medium">{p.full_name}</p>
                                            <p className="text-xs text-gray-500">
                                            {t('fecha_alta')}: {formatDate(p.created_at as any, locale)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2">
                                        {/* Ver perfil */}
                                        <Link
                                            href={`/players/${p.id}`}
                                            className="bg-white rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        >
                                            {t('perfil_ver')}
                                        </Link>

                                        {/* Nuevo partido, con suscripción activa */}
                                        {subscribed && (
                                            <Link href={`/players/${p.id}/add-match`} className="bg-white rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                                {t('partido_nuevo')}
                                            </Link>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {/* Aviso: tienes deportistas pero no hay suscripción activa */}
            {!subscribed && hasAnySubscription && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6 text-amber-900 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="font-semibold">{t('suscripcion_inactiva_titulo')}</h3>
                            <p className="text-sm mt-1">
                                {t('suscripcion_inactiva_texto')}
                            </p>
                        </div>
                        <Link
                            href="/subscription"
                            className="inline-flex items-center rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 whitespace-nowrap"
                        >
                            {t('suscripcion_ampliar')}
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
