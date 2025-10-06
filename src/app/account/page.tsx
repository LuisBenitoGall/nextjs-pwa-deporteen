import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import { getSeatStatus } from '@/lib/seats';

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

    //Asientos pendientes:
    const { remaining: pendingPlayers } = await getSeatStatus(userId);

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
        full_name?: string | null;
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
        display: p.full_name?.trim() || 'Sin nombre',
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
        status: boolean | string | null;
        amount?: string | number | null;   // <- puede venir string si es int8. En céntimos.
        currency?: string | null;
        start_date?: string | null;
        end_date?: string | null;
        current_period_start?: string | null;
        current_period_end?: string | null;
        created_at?: string | null;
        canceled_at?: string | null;
        cancel_at_period_end?: boolean | null;
        seats?: number | null;
    };

    const { data: subsRaw, error: subsErr } = await supabase
    .from('subscriptions')
    .select(
      [
        'id',
        'status',
        'amount', // céntimos
        'currency',
        'current_period_end',
        'created_at',
        'cancel_at_period_end',
        'seats'
      ].join(',')
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false }) as unknown as { data: RawSub[] | null; error: any };

    if (subsErr) {
        console.error('subscriptions error', subsErr);
    }

    // if (subsErr) {
    //     // No rompemos la página por un error de suscripciones
    //     console.error('subscriptions error', subsErr);
    // }
    const now = new Date();
    const subs = (subsRaw || []).map((s) => {
        const start = s.created_at || null;
        const end = s.current_period_end || null;

        // status activo si: status === true (o "active") y no ha pasado la fecha de fin
        const statusBool = s?.status === true || String(s?.status || '').toLowerCase() === 'active';
        const activeByDate = end ? new Date(end) >= now : true;
        const active = statusBool && activeByDate;

        // amount en céntimos -> number
        const amountCents = s.amount == null
        ? null
        : Number(typeof s.amount === 'string' ? s.amount : s.amount);

        return {
            id: s.id,
            status: active ? t('activo') : t('inactivo'),     // para la píldora de estado
            amount: amountCents,                         // en céntimos
            currency: 'EUR',                             // tu tabla no tiene currency; forzamos EUR
            start,
            end,
            active,
            cancelAtPeriodEnd: (s as any).cancel_at_period_end === true
        };
    });

    const locale = me?.locale || 'es-ES';

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

    return (
        <div>
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
                </div>

                {/* Scroll horizontal en móvil, suave en desktop, inercia iOS */}
                <div
                    className="relative -mx-4 sm:mx-0 mt-4 overflow-x-auto md:overflow-visible px-4 sm:px-0 md:scroll-smooth"
                    style={{
                        WebkitOverflowScrolling: 'touch',
                        WebkitMaskImage:
                        'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)'
                    }}
                >
                    {subs.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('suscripciones_no_registradas')}</p>
                    ) : (
                        <table className="min-w-[720px] md:min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    {/* Columna pegajosa */}
                                    <th className="py-2 pr-4 sticky left-0 z-10 bg-white">{t('estado')}</th>
                                    <th className="py-2 pr-4 text-center">{t('importe')}</th>
                                    <th className="py-2 pr-4 text-center">{t('inicio')}</th>
                                    <th className="py-2 pr-4 text-center">{t('fin')}</th>
                                    <th className="py-2 pr-4 text-center">{t('acciones')}</th>
                                </tr>
                            </thead>

                            <tbody>
                                {subs.map((s) => (
                                    <tr key={s.id} className="border-t border-gray-100">
                                        {/* celda pegajosa con sombra lateral sutil */}
                                        <td
                                            className="py-3 pr-4 sticky left-0 z-10 bg-white"
                                            style={{ boxShadow: 'inset -8px 0 8px -8px rgba(0,0,0,0.08)' }}
                                        >
                                            <span
                                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                                s.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}
                                            >
                                                {s.active ? t('activo') : t('inactivo')}
                                            </span>
                                        </td>

                                        <td className="py-3 pr-4 text-center">
                                            {s.amount == null || s.amount === 0 ? (
                                              <span className="text-gray-900 font-medium">Free</span>
                                            ) : (
                                              <>
                                                {formatAmount(s.amount, s.currency || 'EUR', locale)}{' '}
                                                <span className="text-gray-400">(IVA incl.)</span>
                                              </>
                                            )}
                                        </td>

                                        <td className="py-3 pr-4 text-right">{formatDate(s.start, locale)}</td>
                                        <td className="py-3 pr-4 text-right">{formatDate(s.end, locale)}</td>

                                        <td className="py-3 pr-4 text-right">
                                            {/* Mantengo tus clases del botón tal cual */}
                                            <form action={renewSubscription}>
                                              <input type="hidden" name="subId" value={s.id} />
                                              <button
                                                type="submit"
                                                className="rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                              >
                                                {t('renovar')}
                                              </button>
                                            </form>
                                        </td>
                                    </tr>
                                 ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <p className="mt-3 text-xs text-gray-500">
                    {t('recibos_ver_question')}{' '}
                    <Link href="/billing/receipts" className="underline">{t('historial_completo_ver')}</Link>.
                </p>
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

  <div
    className="relative -mx-4 sm:mx-0 mt-4 overflow-x-auto md:overflow-visible px-4 sm:px-0 md:scroll-smooth"
    style={{
      WebkitOverflowScrolling: 'touch',
      WebkitMaskImage:
        'linear-gradient(to right, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)'
    }}
  >
                    {players.length === 0 ? (
                        <div className="text-sm">
                            {!pendingPlayers && (
                                <p className="text-sm text-gray-500">
                                    {t('sin_deportistas') || 'Todavía no has registrado deportistas.'}
                                </p>
                            )}
                            {pendingPlayers > 0 && (
                                <p className="text-gray-700">
                                    {t('tienes')}{' '}
                                    <span className="font-semibold text-gray-900">{pendingPlayers}</span>{' '}
                                    {pendingPlayers === 1 ? t('deportista_pendiente') : t('deportistas_pendientes')}{' '}
                                    {t('pendientes_alta')}.
                                </p>
                            )}
                        </div>
                    ) : (
                        <table className="min-w-[560px] md:min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-500">
                                {/* Columna pegajosa */}
                                <th className="py-2 pr-4 sticky left-0 z-10 bg-white">{t('nombre') || 'Nombre'}</th>
                                <th className="py-2 pr-4 text-center">{t('fecha_alta') || 'Fecha de alta'}</th>
                                <th className="py-2 pr-4 text-center">{t('acciones') || 'Acciones'}</th>
                              </tr>
                            </thead>

                            <tbody>
                                {players.map((p) => (
                                    <tr key={p.id} className="border-t border-gray-100">
                                      <td
                                        className="py-3 pr-4 sticky left-0 z-10 bg-white"
                                        style={{ boxShadow: 'inset -8px 0 8px -8px rgba(0,0,0,0.08)' }}
                                      >
                                        <span className="font-medium text-gray-900 break-words">{p.display}</span>
                                      </td>
                                      <td className="py-3 pr-4 text-right">
                                        {formatDate(p.created_at, me?.locale || 'es-ES')}
                                      </td>
                                      <td className="py-3 pr-4 text-right">
                                        {/* Botón con las mismas clases que ya tenías */}
                                        <Link
                                          href={`/players/${p.id}`}
                                          className="rounded-xl border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 whitespace-nowrap"
                                        >
                                          {t('detalle_ver') || 'Ver detalle'}
                                        </Link>
                                      </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
