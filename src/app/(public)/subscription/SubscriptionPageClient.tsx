'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import {
    applyI18nToPlans,
    LOCAL_PAID_PLANS,
    LOCAL_FREE_PLAN,
    normalizeSubscriptionPlansFromDb,
    type PlanChoice,
    type SubscriptionPlanDbRow,
    euros,
    yearsFromDays,
    isLifetime,
} from '@/lib/subscription-plans';
import { isSubscriptionActive } from '@/lib/subscriptions/shared';
import { useT } from '@/i18n/I18nProvider';
import { LIMITS } from '@/config/constants';

import Input from '@/components/Input';
import Submit from '@/components/Submit';
import TitleH1 from '@/components/TitleH1';

const FAKE_MODE = process.env.NEXT_PUBLIC_FAKE_PLANS === '1';

const PLAN_SELECT =
    'id, name, days, amount_cents, currency, active, free, metadata, stripe_price_id';

type RedeemRpcPayload = {
  ok?: boolean;
  message?: string;
  subscription_id?: string;
};

function asRedeemPayload(data: unknown): RedeemRpcPayload | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === 'object' ? (row as RedeemRpcPayload) : null;
}

type Props = {
  /** Planes ya resueltos en servidor (i18n aplicado). Vacío = recargar en cliente. */
  initialPaidPlans?: PlanChoice[];
  initialPlansError?: string | null;
  /** Si false, el usuario no está autenticado (mensaje en servidor/cliente). */
  authenticated?: boolean;
};

export default function SubscriptionPageClient({
  initialPaidPlans,
  initialPlansError = null,
  authenticated = true,
}: Props) {
    const t = useT();
    const router = useRouter();
    const supabase = useMemo(() => supabaseBrowser(), []);

    const [error, setError] = useState<string | null>(initialPlansError);
    const [units, setUnits] = useState<number>(1);
    const [code, setCode] = useState('');

    const hasInitialPlans = initialPaidPlans !== undefined;

    const [paidPlans, setPaidPlans] = useState<PlanChoice[]>(() => {
        if (hasInitialPlans && initialPaidPlans!.length > 0) return initialPaidPlans!;
        if (FAKE_MODE) return applyI18nToPlans(LOCAL_PAID_PLANS, t);
        return [];
    });
    const [selectedPlanId, setSelectedPlanId] = useState<string>(() => {
        const seed = hasInitialPlans ? initialPaidPlans! : applyI18nToPlans(LOCAL_PAID_PLANS, t);
        return seed.length === 1 ? seed[0].id : '';
    });
    const [loadingPlans, setLoadingPlans] = useState(!hasInitialPlans && !FAKE_MODE);

    const [subActive, setSubActive] = useState<boolean>(false);
    const [subPlanId, setSubPlanId] = useState<string>('');
    const [subEndsAt, setSubEndsAt] = useState<string>('');
    const [refreshKey, setRefreshKey] = useState(0);
    const [statusBanner, setStatusBanner] = useState<'success' | 'cancel' | ''>('');

    useEffect(() => {
        let alive = true;

        (async () => {
        if (!authenticated) {
            setError(t('sesion_iniciar_aviso'));
            setLoadingPlans(false);
            return;
        }

        const { data: userRes } = await supabase.auth.getUser();
        if (!alive) return;

        if (!userRes?.user) {
            setError(t('sesion_iniciar_aviso'));
            setLoadingPlans(false);
            return;
        }

        if (FAKE_MODE) {
            const translated = applyI18nToPlans(LOCAL_PAID_PLANS, t);
            setPaidPlans(translated);
            if (translated.length === 1) setSelectedPlanId(translated[0].id);
            setLoadingPlans(false);
            return;
        }

        const shouldReloadPlans = refreshKey > 0 || !hasInitialPlans;

        if (shouldReloadPlans) {
            setLoadingPlans(true);
            const { data: plansData, error: plansErr } = await supabase
                .from('subscription_plans')
                .select(PLAN_SELECT)
                .eq('active', true)
                .eq('free', false)
                .order('days', { ascending: true });

            if (!alive) return;

            if (plansErr) {
                console.warn('[subscription] could not load plans from DB:', plansErr);
                setPaidPlans([]);
                setError(t('no_planes_activos'));
            } else {
                const visibles = normalizeSubscriptionPlansFromDb(
                    (plansData || []) as SubscriptionPlanDbRow[],
                );
                const translated = applyI18nToPlans(visibles, t);
                setPaidPlans(translated);
                if (translated.length === 1) setSelectedPlanId(translated[0].id);
                if (!translated.length) setError(t('no_planes_activos'));
                else setError((prev) => (prev === t('no_planes_activos') ? null : prev));
            }
            setLoadingPlans(false);
        }

        const { data: latest } = await supabase
            .from('subscriptions')
            .select('plan_id, current_period_end, status, user_id, created_at')
            .eq('user_id', userRes.user.id)
            .order('current_period_end', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1);

        if (!alive) return;

        const s = Array.isArray(latest) ? latest[0] : null;
        if (s) {
            const isActive = isSubscriptionActive(s);
            const end = s.current_period_end ? new Date(s.current_period_end) : null;
            setSubActive(isActive);
            if (isActive) {
            if (s.plan_id) {
                setSubPlanId(s.plan_id);
                setSelectedPlanId(s.plan_id);
            }
            setSubEndsAt(end ? end.toISOString() : '');
            }
        } else {
            setSubActive(false);
            setSubPlanId('');
            setSubEndsAt('');
        }
        })();

        return () => {
        alive = false;
        };
    }, [supabase, t, refreshKey, authenticated, hasInitialPlans]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const sessionId = params.get('session_id');

        if (status === 'success') setStatusBanner('success');
        else if (status === 'cancel') setStatusBanner('cancel');

        if (status === 'success' && sessionId) {
        (async () => {
            try {
            await fetch('/api/stripe/confirm-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId }),
            });
            setRefreshKey((x) => x + 1);
            } catch (e) {
            console.error('[confirm-session] POST failed:', e);
            }
        })();
        }
    }, []);

    const goStripe = async () => {
        try {
        setError(null);

        const multi = paidPlans.length > 1;
        if (multi && !selectedPlanId) {
            setError(t('selecciona_plan'));
            return;
        }
        const planId = selectedPlanId || paidPlans[0]?.id || '';
        if (!planId) {
            setError(t('no_planes_activos'));
            return;
        }

        if (FAKE_MODE) {
            router.replace(`/players/new?units=${units}`);
            return;
        }

        const res = await fetch('/api/stripe/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ planId, units }),
        });
        const { url, error: checkoutError } = await res.json();
        if (checkoutError) {
            setError(checkoutError);
            return;
        }
        if (url) {
            window.location.href = url;
        } else {
            router.replace(`/players/new?units=${units}`);
        }
        } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'No se pudo iniciar el checkout.');
        }
    };

    const useCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const trimmed = code.trim();
        if (!trimmed) { setError(t('codigo_introduce_valido')); return; }
        if (units !== 1) { setError(t('codigo_solo_un_deportista')); return; }

        try {
            const { error: ensureErr } = await supabase.rpc('ensure_profile_server');
            if (ensureErr) { setError('No se pudo preparar tu perfil.'); return; }

            let planIdForCode: string | null = null;
            {
            const { data: plan, error: planLookupErr } = await supabase
                .from('subscription_plans')
                .select('id')
                .eq('free', true)
                .eq('active', true)
                .limit(1)
                .maybeSingle();
            if (!planLookupErr && plan?.id) planIdForCode = plan.id;
            }

            if (!planIdForCode) planIdForCode = LOCAL_FREE_PLAN.id;

            const { data, error: rpcErr } = await supabase.rpc('create_code_subscription', {
            p_code: trimmed,
            p_plan_id: planIdForCode,
            });
            if (rpcErr) {
                if (rpcErr.message?.includes('subscriptions_status_check') ||
                    rpcErr.message?.includes('violates check constraint')) {
                    console.error('[create_code_subscription] Constraint error:', rpcErr);
                    setError('Error al crear la suscripción. El código introducido no es válido o hubo un problema con la configuración del sistema.');
                } else {
                    setError(rpcErr.message || t('suscripcion_codigo_error'));
                }
                return;
            }

            const res = asRedeemPayload(data);
            if (!res?.ok || !res?.subscription_id) {
            setError(res?.message || t('suscripcion_codigo_error'));
            return;
            }

            try {
            localStorage.setItem('pending_access_code', trimmed);
            sessionStorage.setItem('pending_access_code', trimmed);
            } catch { /* ignore */ }
            router.replace(`/players/new?via=code&code=${encodeURIComponent(trimmed)}`);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : t('suscripcion_codigo_error'));
        }
    };

    const isMultiPlan = paidPlans.length > 1;

    const formatDate = (iso?: string) => {
        if (!iso) return '';
        try {
        const d = new Date(iso);
        return d.toLocaleDateString();
        } catch {
        return iso || '';
        }
    };

    return (
        <div>
            <TitleH1>{t('suscripcion')}</TitleH1>

            <div className="p-4 space-y-4">
                {subActive && (
                <div className="rounded-lg border border-green-600 bg-green-50 px-4 py-3 text-green-800">
                    {t('suscripcion')} activa. {subEndsAt ? `Fin del periodo: ${formatDate(subEndsAt)}` : ''}
                </div>
                )}

                <p>{t('suscripcion_texto1')}</p>

                <div className="space-y-2">
                <Input
                    label={t('deportistas_num')}
                    type="number"
                    min={1}
                    max={LIMITS.CHECKOUT_MAX_UNITS}
                    value={units}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUnits(Math.min(Math.max(1, parseInt(e.target.value || '1', 10)), LIMITS.CHECKOUT_MAX_UNITS))
                    }
                    noSpinner
                    containerClassName="w-1/2"
                />
                <p dangerouslySetInnerHTML={{ __html: t('suscripcion_texto2') }} />
                </div>

                {units === 1 && (
                <>
                    <form onSubmit={useCode} className="flex gap-2">
                    <Input
                        value={code}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCode(e.target.value)}
                        placeholder={t('codigo_tengo')}
                        containerClassName="w-1/2 mb-0"
                    />
                    <button
                        type="submit"
                        className="w-1/2 h-[40.5px] rounded-lg bg-gray-600 text-white flex items-center justify-center hover:bg-gray-700"
                    >
                        {t('codigo_usar')}
                    </button>
                    </form>

                    <div className="text-center">{t('o')}</div>
                </>
                )}

                {(isMultiPlan || (paidPlans.length === 1 && !loadingPlans)) && paidPlans.length > 0 && (
                    <div className={`grid gap-4 ${paidPlans.length > 1 ? 'sm:grid-cols-2 lg:grid-cols-3' : 'max-w-sm'}`}>
                        {loadingPlans
                        ? Array.from({ length: Math.max(paidPlans.length, 3) }).map((_, i) => (
                            <div
                                key={i}
                                className="animate-pulse h-44 rounded-xl border border-green-600 bg-gray-100"
                            />
                            ))
                        : paidPlans.map((p) => {
                            const selected = selectedPlanId === p.id;
                            const yrs = yearsFromDays(p.days);
                            const total = euros(p.amount_cents);
                            const perYear = p.days > 0
                              ? (p.amount_cents / 100 / (yrs || 1)).toFixed(2)
                              : '0.00';
                            const lifetime = isLifetime({ days: p.days });

                            return (
                                <button
                                key={p.id}
                                type="button"
                                onClick={() => setSelectedPlanId(p.id)}
                                aria-pressed={selected}
                                disabled={paidPlans.length === 1}
                                className={[
                                    'relative text-left rounded-xl border p-5 transition flex flex-col justify-start',
                                    'border-green-600',
                                    paidPlans.length > 1 ? 'hover:bg-green-50 cursor-pointer' : 'cursor-default',
                                    selected ? 'ring-2 ring-green-700 bg-green-50' : '',
                                ].join(' ')}
                                >
                                    <div className="text-sm font-medium text-gray-800">{p.name || p.nameKey}</div>
                                    {subPlanId === p.id && (
                                        <span className="absolute top-3 right-3 inline-flex items-center rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">
                                        Activo
                                        </span>
                                    )}

                                    <div className="mt-2 text-3xl font-extrabold">
                                        {total}€
                                        <span className="text-sm ml-2 font-normal text-gray-600">
                                        x {t('jugador')}
                                        </span>
                                    </div>

                                    <div className="mt-1 text-xs text-gray-600">
                                        {lifetime ? (
                                        <>{t('acceso_vida')}</>
                                        ) : (
                                        <>
                                            ≈ {perYear} € / {t('any')} · {t('duracion')}: {p.days} {t('dias')}{' '}
                                            {yrs >= 1 ? `(≈${yrs} ${t('años')})` : null}
                                        </>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}

                <div>
                    <Submit
                        onClick={goStripe}
                        text={subActive ? (t('ampliar_suscripcion') || t('suscripcion_stripe')) : t('suscripcion_stripe')}
                        loadingText={t('enviando') ?? t('suscripcion_stripe')}
                        disabled={loadingPlans || paidPlans.length === 0 || (isMultiPlan && !selectedPlanId)}
                    />

                    <div className="mt-4 px-4 py-6 rounded-lg bg-gray-200 text-gray-700">
                        <span className="inline-flex h-5 w-5 mr-2 items-center justify-center rounded bg-[#635BFF] text-white font-bold">
                        S
                        </span>
                        <span className="font-bold">{t('stripe_pago_seguro')}</span>
                        <br />
                        <br />
                        <p dangerouslySetInnerHTML={{ __html: t('suscripcion_planes_texto') }} />
                    </div>
                </div>

                {statusBanner === 'success' && (
                    <div className="rounded border p-3 bg-green-50 text-green-800 space-y-2">
                        <p>{t('pago_completado')}</p>
                        <Link
                            href="/players/new"
                            className="inline-block font-medium underline text-green-900"
                        >
                            {t('deportista_agregar') || 'Añadir deportista'}
                        </Link>
                    </div>
                )}
                {statusBanner === 'cancel' && (
                    <div className="rounded border p-3 bg-yellow-50 text-yellow-800">
                        {t('pago_cancelado')}
                    </div>
                )}
                {error && <div className="rounded border p-3 bg-red-50 text-red-700">{error}</div>}
            </div>
        </div>
    );
}
