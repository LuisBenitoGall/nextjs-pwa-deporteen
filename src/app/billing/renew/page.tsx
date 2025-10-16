// app/billing/renew/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import TitleH1 from '@/components/TitleH1';
import Submit from '@/components/Submit';

import {
    LOCAL_PAID_PLANS,
    applyI18nToPlans,
    euros,
    yearsFromDays,
    isLifetime,
    type PlanChoice,
    } from '@/lib/subscription-plans';

export const runtime = 'nodejs';

export default async function RenewPage() {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // idioma
    const { t } = await tServer();

    // 1) Trae suscripciones del usuario (solo lo necesario)
    type RawSub = {
        id: string;
        status: boolean | string | null;
        current_period_end: string | null;
        seats?: number | null;
    };

    const { data: subsRaw } = await supabase
        .from('subscriptions')
        .select('id, status, current_period_end, seats')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }) as unknown as { data: RawSub[] | null };

    // 2) Cuenta asientos renovables: vencidos o que vencen antes de 'horizon'
    const now = new Date();
    const WINDOW_DAYS = 15; // <-- cambia aquí si quieres otra ventana
    const horizon = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

    const renewableSeats = (subsRaw || []).reduce((acc, s) => {
        const end = s.current_period_end ? new Date(s.current_period_end) : null;
        const statusBool = s?.status === true || String(s?.status || '').toLowerCase() === 'active';

        // Renovable si:
        // - No está "activa" (status no activo)  O
        // - Su fin es <= horizonte (ya vencida o a punto de vencer)
        const isRenewable = !statusBool || (end ? end <= horizon : false);

        if (isRenewable) {
        const seats = Number(s.seats ?? 1);
        return acc + (Number.isFinite(seats) ? seats : 1);
        }
        return acc;
    }, 0);

    // 3) Si no hay asientos renovables ⇒ nada que renovar
    if (!renewableSeats) {
        return (
        <div className="max-w-3xl mx-auto">
            <TitleH1>{t('renovar_suscripcion')}</TitleH1>
            <p className="mt-4 text-gray-700">
            {t('no_hay_deportistas_renovables')}
            </p>
            <p className="mt-1 text-sm text-gray-500">
            {t('renovar_ventana_aviso', { dias: WINDOW_DAYS.toString() })}
            </p>
            <p className="mt-3">
            <Link href="/account" className="underline">{t('volver_a_cuenta')}</Link>
            </p>
        </div>
        );
    }

    // 4) Jugadores del usuario (para el caso de N>1)
    type RawPlayer = { id: string; full_name: string | null };
    const { data: playersRaw } = await supabase
        .from('players')
        .select('id, full_name')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }) as unknown as { data: RawPlayer[] | null };

    const players = (playersRaw || []).map(p => ({
        id: p.id,
        display: p.full_name?.trim() || t('sin_nombre'),
    }));

    // 5) Planes (fallback local si la tabla falla/no hay)
    const plans: PlanChoice[] = applyI18nToPlans(LOCAL_PAID_PLANS, t);

    // 6) Branch UX
    const singleSeat = renewableSeats === 1;

    return (
        <div className="max-w-3xl mx-auto">
            <TitleH1>{t('suscripcion_renovar')}</TitleH1>

            <div className="mb-6 flex gap-2">
                <Link href="/account" className="underline">
                    <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        {t('cuenta_mi_volver')}
                    </button>
                </Link>
            </div>

            {singleSeat ? (
                <>
                <p className="mt-4 text-gray-700">
                    {t('suscripcion_renovar_texto')}
                </p>

                {/* Cards de planes (idéntico estilo al de /subscription) */}
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
                    {plans.map((p) => {
                        const yrs = yearsFromDays(p.days);
                        const total = euros(p.price_cents);
                        const perYear = (p.price_cents / 100 / (yrs || 1)).toFixed(2);
                        const lifetime = isLifetime(p);
                        return (
                            <form
                                key={p.id}
                                action="/api/stripe/create-checkout-session"
                                method="POST"
                                className="h-full rounded-xl border border-green-600 p-5 hover:bg-green-50 transition flex flex-col"
                            >
                                <input type="hidden" name="planId" value={p.id} />
                                <input type="hidden" name="units" value="1" />

                                <div className="text-sm text-gray-700">{p.name}</div>
                                <div className="mt-2 text-3xl font-extrabold">
                                    {total}€
                                    <span className="text-sm ml-2 font-normal text-gray-600">x {t('jugador')}</span>
                                </div>
                                <div className="mt-1 text-xs text-gray-600">
                                    {lifetime
                                    ? t('plan_siempre')
                                    : <>≈ {perYear} € / {t('any')} · {t('duracion')}: {p.days} {t('dias')} {yrs >= 1 ? `(≈${yrs} ${t('años')})` : null}</>
                                    }
                                </div>

                                <div className="mt-auto pt-4">
                                    <Submit text={t('continuar')} loadingText={t('enviando') ?? t('continuar')} />
                                </div>
                            </form>
                        );
                    })}
                </div>
                </>
            ) : (
                <>
                <p className="mt-4 text-gray-700">
                    {t('elige_deportistas_a_renovar')} ({renewableSeats})
                </p>

                {/* Lista simple con checkboxes (máx. renewableSeats). */}
                <form action="/api/billing/renew" method="POST" className="mt-4 space-y-4">
                    <input type="hidden" name="maxSeats" value={renewableSeats} />

                    <div className="rounded-xl border p-4 bg-white">
                    {players.length === 0 ? (
                        <p className="text-sm text-gray-500">{t('sin_deportistas')}</p>
                    ) : (
                        <ul className="space-y-2">
                        {players.map((p) => (
                            <li key={p.id} className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                className="h-4 w-4"
                                name="playerIds"
                                value={p.id}
                                id={`p-${p.id}`}
                            />
                            <label htmlFor={`p-${p.id}`} className="text-sm text-gray-800">
                                {p.display}
                            </label>
                            </li>
                        ))}
                        </ul>
                    )}
                    </div>

                    <div className="mt-6">
                    <div className="mb-3 text-sm text-gray-600">{t('elige_plan_para_seleccion')}</div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {plans.map((p) => {
                        const yrs = yearsFromDays(p.days);
                        const total = euros(p.price_cents);
                        const perYear = (p.price_cents / 100 / (yrs || 1)).toFixed(2);
                        const lifetime = isLifetime(p);
                        return (
                            <label key={p.id} className="rounded-xl border border-green-600 p-5 hover:bg-green-50 transition cursor-pointer">
                            <input type="radio" name="planId" value={p.id} className="mr-2 align-middle" required />
                            <span className="text-sm text-gray-700">{p.name}</span>
                            <div className="mt-2 text-2xl font-extrabold">
                                {total}€
                                <span className="text-xs ml-2 font-normal text-gray-600">x {t('jugador')}</span>
                            </div>
                            <div className="mt-1 text-xs text-gray-600">
                                {lifetime
                                ? t('acceso_vida')
                                : <>≈ {perYear} € / {t('any')} · {t('duracion')}: {p.days} {t('dias')} {yrs >= 1 ? `(≈${yrs} ${t('años')})` : null}</>
                                }
                            </div>
                            </label>
                        );
                        })}
                    </div>
                    </div>

                    <div className="mt-6">
                    <Submit text={t('continuar')} loadingText={t('enviando') ?? t('continuar')} />
                    </div>
                </form>
                </>
            )}
        </div>
    );
}
