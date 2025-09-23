import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';

// Components
import ConfirmDeleteButton from '../../components/ConfirmDeleteButton';
import TitleH1 from '../../components/TitleH1';

export const runtime = 'nodejs';

// Util: formateo seguro en servidor
function formatDate(d: string | Date | null | undefined, locale: string) {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date);
}

function formatAmount(cents: number | null | undefined, currency: string | null | undefined, locale: string) {
    if (cents == null) return '—';
    try {
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'EUR' }).format(cents / 100);
    } catch {
        return `${(cents / 100).toFixed(2)} ${currency || 'EUR'}`;
    }
}

// Server Action: lanzar renovación (redirige a tu flujo de pago)
async function renewSubscription(formData: FormData) {
    'use server';
    const subId = String(formData.get('subId') || '');
    // Aquí puedes crear una Checkout Session de Stripe o abrir tu portal de facturación.
    // De momento redirigimos a una ruta que tú implementarás.
    redirect(`/billing/renew?sid=${encodeURIComponent(subId)}`);
}

export default async function AccountPage() {
    const supabase = await createSupabaseServerClient();

    // Usuario autenticado (validado por el servidor de Auth)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const userId = user.id;

    // locale del usuario (si no tiene, 'es')
    const { data: me } = await supabase
    .from('users')
    .select('locale, name, surname, phone, created_at, status')
    .eq('id', userId)
    .maybeSingle();

    const statusVal = (me as any)?.status;
    const normalized = typeof statusVal === 'string' ? statusVal.toLowerCase() : statusVal;
    if (me && (normalized === false || normalized === 'inactive' || normalized === 'false')) {
        redirect('/logout');
    }

    const { t } = await tServer(me?.locale || undefined);

    // --- Jugadores del usuario (listado ligero) ---
    type RawPlayer = {
        id: string;
        name?: string | null;
        surname?: string | null;
        nickname?: string | null;
        sport?: string | null;
        created_at?: string | null;
    };

    const { data: playersRaw, error: playersErr } = await supabase
        .from('players')
        .select('id, full_name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }) as unknown as { data: RawPlayer[] | null; error: any };

    if (playersErr) {
        console.error('players error', playersErr);
    }

    const players = (playersRaw || []).map(p => ({
        id: p.id,
        display: [p.name, p.surname].filter(Boolean).join(' ') || p.nickname || 'Sin nombre',
        sport: p.sport || null,
        created_at: p.created_at || null,
    }));

    // Perfil básico con fallback a metadatos del proveedor
    const first = me?.name || (user.user_metadata as any)?.name || (user.user_metadata as any)?.given_name || '';
    const last = me?.surname || (user.user_metadata as any)?.surname || (user.user_metadata as any)?.family_name || '';
    const email = user.email || (user.user_metadata as any)?.email || '';
    const phone = me?.phone || (user.user_metadata as any)?.phone || '';
    const createdAt = me?.created_at || (user as any)?.created_at || user?.identities?.[0]?.created_at || null;

    // Suscripciones del usuario. Ajusta los campos a tu esquema real.
    type RawSub = {
        id: string;
        status: string | null;
        amount?: string | number | null;   // <- puede venir string si es int8. En céntimos.
        currency?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        current_period_start?: string | null;
        current_period_end?: string | null;
        created_at?: string | null;
        canceled_at?: string | null;
        seats?: number | null;
    };

    const { data: subsRaw } = await supabase
    .from('subscriptions')
    .select(
      [
        'id',
        'status',
        'amount', // céntimos
        'currency',
        'start_date',
        'end_date',
        'current_period_start',
        'current_period_end',
        'created_at',
        'canceled_at',
        'seats'
      ].join(',')
    )
    .eq('user_id', userId)
    .order('start_date', { ascending: false }) as unknown as { data: RawSub[] | null; error: any };

    //Suscripciones activas:
    const hasActiveSubscription = (subsRaw || []).some((s: any) => s?.status === true);

    // if (subsErr) {
    //     // No rompemos la página por un error de suscripciones
    //     console.error('subscriptions error', subsErr);
    // }

    const now = new Date();
    const subs = (subsRaw || []).map((s) => {
        const start = s.start_date || s.current_period_start || s.created_at || null;
        const end = s.end_date || s.current_period_end || s.canceled_at || null;
        const active =
        s.status === 'active' ||
        (start ? new Date(start) <= now : false) && (end ? new Date(end) >= now : true);

        //Convierte céntimos a number
        const amountCents = s.amount == null ? null : Number(typeof s.amount === 'string' ? s.amount : s.amount);

        return {
            id: s.id,
            status: s.status || (active ? 'active' : 'inactive'),
            amount: amountCents,
            currency: s.currency || 'EUR',
            start,
            end,
            active,
        };
    });

    // const nowIso = new Date().toISOString();

    // 2.1) Filtra suscripciones activas POR FECHA y POR STATUS
    const activeSubs = (subsRaw || []).filter((s: any) => {
        const statusTrue = s?.status === true || String(s?.status || '').toLowerCase() === 'active';
        const ends = s?.current_period_end ? new Date(s.current_period_end) : null;
        return statusTrue && ends != null && ends > new Date();
    });

    // si no hay suscripciones activas, no hay plazas ni pendientes
    let pendingPlayers = 0;
    if (activeSubs.length > 0) {
        const activeSubIds = activeSubs.map((s: any) => s.id);
        const totalSeats = activeSubs.reduce((acc: number, s: any) => acc + (Number(s.seats) || 1), 0);

        // 2.2) Cuenta vínculos activos en subscription_players
        const { count: assignedActiveCount, error: spErr } = await supabase
        .from('subscription_players')
        .select('*', { count: 'exact', head: true })
        .in('subscription_id', activeSubIds)
        .is('unlinked_at', null);

        if (spErr) {
            console.error('subscription_players count error', spErr);
        }

        const assigned = Number(assignedActiveCount || 0);
        pendingPlayers = Math.max(0, totalSeats - assigned);
    }
    

    // const hasActiveSeats = activeSubs.reduce((acc, s: any) => acc + (Number(s.seats) || 1), 0) > 0;

    //

    const locale = me?.locale || 'es-ES';
    const currentSubId = subs.find((s) => s.active)?.id || null;

    // Créditos pendientes de usar
    // const activeSeats = subs.filter((s) => s.active).length;
    //const pendingPlayers = Math.max(0, activeSeats - players.length);

    // Server Action: borrado lógico + invalidación global de sesiones + signOut + redirect
    async function deleteAccount() {
        'use server';

        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) redirect('/login');

        const user_id = user.id;

        // Borrado lógico usando admin: actualizamos por id = uid directamente
        const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
        const admin = getSupabaseAdmin();

    const nowIso = new Date().toISOString();
        // Actualiza users por id (uuid de Auth)
        // 1) Desactivar por boolean (si la columna es booleana)
        const { data: updUser, error: uErr } = await admin
            .from('users')
            .update({ deleted_at: nowIso, status: false })
            .eq('id', user_id)
            .select('id, status')
            .maybeSingle();
        if (uErr) {
            console.error('deleteAccount: users boolean status update error', uErr);
        } else {
            console.log('deleteAccount: users updated (bool status try)', updUser);
        }

        // 2) Si status sigue "true" o no cambió, intenta con esquema string 'inactive'
        try {
            const needsString = !updUser || (updUser as any)?.status === true || (updUser as any)?.status === 'active';
            if (needsString) {
                const { data: updStr, error: uErr2 } = await admin
                    .from('users')
                    .update({ status: 'inactive' as any })
                    .eq('id', user_id)
                    .select('id, status')
                    .maybeSingle();
                if (uErr2) {
                    console.error('deleteAccount: users string status update error', uErr2);
                } else {
                    console.log('deleteAccount: users updated (string status try)', updStr);
                }
            }
        } catch (e) {
            console.error('deleteAccount: fallback string status failed', e);
        }

        // 3) Opcional: si existe columna 'active' (boolean), intenta marcarla a false en llamada separada
        try {
            const { error: uActiveErr } = await admin
                .from('users')
                .update({ active: false as any })
                .eq('id', user_id);
            if (uActiveErr) {
                // Puede fallar si la columna no existe; lo ignoramos.
                console.warn('deleteAccount: users active=false optional update error (ignorable)', uActiveErr?.message || uActiveErr);
            }
        } catch {}

        // Actualiza players vinculados al mismo id
        const { error: pErr } = await admin
            .from('players')
            .update({ deleted_at: nowIso, active: false })
            .eq('user_id', user_id);
        if (pErr) console.error('deleteAccount: players update error', pErr);

        // TODO: añade aquí otras tablas relacionadas (teams, subscriptions, media, etc.)

        // Invalidación global de sesiones (Admin API; requiere SERVICE_ROLE)
        // Invalida todas las sesiones si el SDK lo soporta; si no, continúa.
        try {
            await (admin as any)?.auth?.admin?.invalidateRefreshTokens?.(user_id);
        } catch {}

        // Cerrar sesión actual del contexto de esta request
        try {
            await supabase.auth.signOut();
        } catch (e) {
            console.error('deleteAccount: signOut error', e);
        }
        // Redirigir al endpoint de logout para que el servidor borre cookies y redirija a '/'
        redirect('/logout');
    }

    // --- PENDIENTES DE REGISTRAR (códigos sin canjear) ---
    async function countUnredeemedCodes() {
        const tryTables = ['access_codes'] as const;

        for (const table of tryTables) {
            // campos típicos: user_id, redeemed_at, player_id, expires_at, seats opcional
            const { data, error } = await supabase
              .from(table)
              .select('id, code, player_id')
              .eq('user_id', userId)
              .is('redeemed_at', null);

            // si la tabla no existe, Postgres devuelve 42P01; probamos la siguiente
            const tableMissing = (error && (error.code === '42P01' || /relation .* does not exist/i.test(error.message)));
            if (tableMissing) continue;
            if (error) {
                console.error(`${table} error`, error);
                continue;
            }
            // cuenta códigos que realmente no estén ligados a jugador
            const unredeemed = (data || []).filter((r: any) => !r.player_id && !r.redeemed_at).length;
            return unredeemed;
        }
        return null; // no hay tablas de códigos; dejaremos que el plan B se encargue
    }

    // 1) prueba con códigos sin canjear
    const unredeemed = await countUnredeemedCodes();
    if (typeof unredeemed === 'number') {
        pendingPlayers = unredeemed;
    } else {
        // 2) plan B: plazas activas por suscripción menos jugadores creados
        const now = new Date();
        const activeSeats = (subsRaw || []).reduce((acc, s: any) => {
            const status = String(s.status || '').toLowerCase();
            const statusOk = ['active','trialing','past_due'].includes(status);
            const startIso = s.start_date || s.current_period_start || s.created_at;
            const endIso   = s.end_date   || s.current_period_end   || s.canceled_at;
            const startOk = startIso ? new Date(startIso) <= now : true;
            const endOk   = endIso   ? new Date(endIso)   >= now : true;
            if (statusOk && startOk && endOk) {
              const seats = Number.isFinite((s as any).seats) ? Number((s as any).seats) : 1;
              return acc + seats;
            }
            return acc;
        }, 0);

        const usedSeats = (playersRaw || []).length;
        pendingPlayers = Math.max(0, activeSeats - usedSeats);
    }














    return (
        <div className="max-w-xl mx-auto">
            <TitleH1>{t('cuenta_mi')}</TitleH1>

            {/* Tarjeta de datos personales */}
            <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-800">{t('datos_personales')}</h2>

                    <Link
                        href="/account/edit"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        {/* icono lápiz simple */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.5"/><path d="M14.06 6.19l3.75 3.75" stroke="currentColor" strokeWidth="1.5"/></svg>
                        <span>{t('datos_editar')}</span>
                    </Link>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                        <div className="text-gray-500">{t('nombre_apellidos')}</div>
                        <div className="mt-0.5 font-medium text-gray-900">{[first, last].filter(Boolean).join(' ') || '—'}</div>
                    </div>
                    
                    <div>
                        <div className="text-gray-500">Email</div>
                        <div className="mt-0.5 font-medium text-gray-900">{email || '—'}</div>
                    </div>
          
                    <div>
                        <div className="text-gray-500">{t('telf')}</div>
                        <div className="mt-0.5 font-medium text-gray-900">{phone || '—'}</div>
                    </div>
          
                    <div>
                        <div className="text-gray-500">{t('fecha_alta')}</div>
                        <div className="mt-0.5 font-medium text-gray-900">{formatDate(createdAt, locale)}</div>
                    </div>
                </div>
            </section>

            {/* Tabla de suscripciones */}
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-800">{t('suscripciones')}</h2>
          
                    {currentSubId && (
                        <form action={renewSubscription}>
                            <input type="hidden" name="subId" value={currentSubId} />
                            <button
                                type="submit"
                                className="rounded-xl bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
                                title="Renovar la suscripción vigente"
                            >
                                {t('renovar_ahora')}
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-4 overflow-x-auto">
                    {subs.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('suscripciones_no_registradas')}</p>

                    ) : (
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2 pr-4">{t('estado')}</th>
                                    <th className="py-2 pr-4">{t('importe')}</th>
                                    <th className="py-2 pr-4">{t('inicio')}</th>
                                    <th className="py-2 pr-4">{t('fin')}</th>
                                    <th className="py-2 pr-4">{t('acciones')}</th>
                                </tr>
                            </thead>

                            <tbody>
                                {subs.map((s) => (
                                    <tr key={s.id} className="border-t border-gray-100">
                                        <td className="py-3 pr-4">
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.active
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}
                                            >
                                                {s.status}
                                            </span>
                                        </td>

                                        <td className="py-3 pr-4">{formatAmount(s.amount ?? null, s.currency || 'EUR', locale)} <span className="text-gray-400">(IVA incl.)</span></td>
                                        <td className="py-3 pr-4">{formatDate(s.start, locale)}</td>
                                        <td className="py-3 pr-4">{formatDate(s.end, locale)}</td>
                                        <td className="py-3 pr-4">
                                            {s.active ? (
                                                <form action={renewSubscription}>
                                                    <input type="hidden" name="subId" value={s.id} />
                                                    <button
                                                        type="submit"
                                                        className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        {t('renovar')}
                                                    </button>
                                                </form>
                                            ) : (
                                              <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>

            {/* Jugadores registrados */}
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-800">{t('deportistas') || 'Deportistas'}</h2>
                    {pendingPlayers > 0 && (
                        <Link 
                            href="/players/new" 
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" />
                            </svg>
                            <span>{t('deportista_agregar') || 'Añadir deportista'}</span>
                        </Link>
                    )}
                </div>

                <div className="mt-4">
                    {players.length === 0 ? (
                        <div className="text-sm">
                            <p className="text-sm text-gray-500">{t('sin_deportistas') || 'Todavía no has registrado deportistas.'}</p>

                            {pendingPlayers > 0 && (
                                <p className="ml-4 text-gray-700">
                                    {t('tienes')} <span className="font-semibold text-gray-900">{pendingPlayers}</span>{' '}
                                    {pendingPlayers === 1 ? t('deportista') : t('deportistas')} {t('pendientes_alta')}.
                                </p>
                            )}

                            {!hasActiveSubscription && (
                                <div className="mt-6">
                                    <p className="text-amber-700 font-bold">{t('suscripcion_necesaria') || 'Debes contratar un plan de suscripción para crear deportistas.'}</p>
                                    <p className="mt-1">
                                        <Link href="/subscription" className="text-amber-800 underline hover:text-amber-900">
                                            {t('suscribirme') || 'Ir a suscripción'}
                                        </Link>
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-100">
                            {players.map(p => (
                                <li key={p.id} className="py-3 flex items-center justify-between">
                                    <div>
                                        <div className="font-medium text-gray-900">{p.display}</div>
                                        {p.sport && <div className="text-xs text-gray-500">{p.sport}</div>}
                                    </div>
                                    <Link href={`/players/${p.id}`} className="text-sm text-blue-600 hover:underline">{t('ver_detalle') || 'Ver detalle'}</Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            {/* Extras de cuenta, opcional: accesos a facturas, portal de pago, etc. */}
            {/*<section className="mt-8 text-xs text-gray-500">
                <p>
                    ¿Necesitas descargar facturas o cambiar el método de pago? Ir a{' '}
                    <Link href="/billing" className="underline">facturación</Link>.
                </p>
            </section>*/}

            {/* Cancelación de cuenta (borrado lógico) */}
            <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-800">{t('cuenta_cancelar') || 'Cancelar cuenta'}</h2>
                <p className="mt-2 text-sm text-gray-700">
                    {t('cuenta_cancelar_texto') || 'Si cancelas tu cuenta se deshabilitará el acceso y realizaremos un borrado lógico de todos tus datos (se mantendrán ocultos para ti y para otros usuarios, pero seguirán existiendo durante el periodo legal mínimo para auditoría y cumplimiento).'}
                </p>
                <div className="mt-4">
                    <ConfirmDeleteButton onConfirm={deleteAccount} label={t('cancelar') || 'Quiero cancelar mi cuenta'} />
                </div>
            </section>
        </div>
    );
}

// TODO: Re-definir modelo de suscripciones y desglose de IVA una vez cerremos el flujo de pagos.
