'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useT } from '@/i18n/I18nProvider';
import TitleH1 from '@/components/TitleH1';
import Submit from '@/components/Submit';
import {
    LOCAL_STORAGE_PLANS,
    applyI18nToStoragePlans,
    storagePriceEuros,
    storageMonthlyEuros,
    type StoragePlanChoice,
} from '@/lib/storage-plans';

// ─── Icono de check ─────────────────────────────────────────────────────────
function CheckIcon() {
    return (
        <svg className="h-4 w-4 shrink-0 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
    );
}

// ─── Card de un plan ─────────────────────────────────────────────────────────
function PlanCard({
    plan,
    selected,
    currentPlanId,
    onSelect,
    t,
}: {
    plan: StoragePlanChoice;
    selected: boolean;
    currentPlanId: string | null;
    onSelect: () => void;
    t: (k: string, v?: Record<string, any>) => string;
}) {
    const isActive  = currentPlanId === plan.id;
    const priceYear = storagePriceEuros(plan.amount_cents);
    const priceMonth = storageMonthlyEuros(plan.amount_cents, plan.days);

    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={[
                'relative text-left rounded-2xl border-2 p-5 flex flex-col transition-all duration-200',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                selected
                    ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-100'
                    : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md',
                plan.popular ? 'ring-2 ring-indigo-200' : '',
            ].join(' ')}
        >
            {/* Badges */}
            <div className="absolute -top-3 right-4 flex gap-1.5">
                {plan.popular && (
                    <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-bold text-white shadow">
                        {t('storage_badge_popular')}
                    </span>
                )}
                {plan.maxCapacity && (
                    <span className="inline-flex items-center rounded-full bg-violet-600 px-3 py-0.5 text-xs font-bold text-white shadow">
                        {t('storage_badge_max')}
                    </span>
                )}
                {isActive && (
                    <span className="inline-flex items-center rounded-full bg-green-600 px-3 py-0.5 text-xs font-bold text-white shadow">
                        {t('storage_badge_activo')}
                    </span>
                )}
            </div>

            {/* Nombre del plan */}
            <div className="mt-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                {plan.name}
            </div>

            {/* Almacenamiento destacado */}
            <div className="mt-1 flex items-end gap-1.5">
                <span className="text-4xl font-extrabold text-gray-900">{plan.gb_amount}</span>
                <span className="mb-1 text-xl font-bold text-gray-500">GB</span>
            </div>

            {/* Precio */}
            <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-indigo-700">{priceYear}€</span>
                <span className="text-sm text-gray-500">{t('storage_por_anio')}</span>
            </div>
            <div className="text-xs text-gray-400">
                ≈ {priceMonth}€ / {t('storage_por_mes')}
            </div>

            {/* Separador */}
            <div className="my-4 h-px bg-gray-100" />

            {/* Features */}
            <ul className="flex flex-col gap-2">
                {plan.featureKeys.map((fk) => {
                    const text = t(fk, { GB: plan.gb_amount });
                    return (
                        <li key={fk} className="flex items-start gap-2 text-xs text-gray-600">
                            <CheckIcon />
                            <span>{text === fk ? fk : text}</span>
                        </li>
                    );
                })}
            </ul>

            {/* Indicator de selección */}
            <div className={[
                'mt-4 h-1 w-full rounded-full transition-all',
                selected ? 'bg-indigo-500' : 'bg-gray-100',
            ].join(' ')} />
        </button>
    );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function StorageSubscriptionPage() {
    const t = useT();

    const supabase = useMemo(
        () =>
            createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
            ),
        []
    );

    const [plans, setPlans] = useState<StoragePlanChoice[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string>('');
    const [loadingPlans, setLoadingPlans]     = useState(true);

    const [activePlanId,    setActivePlanId]    = useState<string | null>(null);
    const [activeUntil,     setActiveUntil]     = useState<string | null>(null);
    const [activeGb,        setActiveGb]        = useState<number>(0);
    const [isStorageActive, setIsStorageActive] = useState(false);

    const [statusBanner, setStatusBanner] = useState<'success' | 'cancel' | ''>('');
    const [error,        setError]        = useState<string | null>(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [refreshKey,   setRefreshKey]   = useState(0);

    // ── Cargar planes y estado actual ─────────────────────────────────────────
    useEffect(() => {
        let alive = true;

        (async () => {
            // 1. Resolver planes (BD o local)
            const translated = applyI18nToStoragePlans(LOCAL_STORAGE_PLANS, t);

            const { data: { user } } = await supabase.auth.getUser();
            if (!alive) return;

            if (!user) {
                setPlans(translated);
                setLoadingPlans(false);
                return;
            }

            // Intentar cargar planes desde BD
            const { data: dbPlans } = await supabase
                .from('storage_plans')
                .select('id, name, name_key, gb_amount, amount_cents, currency, stripe_price_id, active')
                .eq('active', true)
                .order('gb_amount', { ascending: true });

            if (!alive) return;

            if (dbPlans && dbPlans.length > 0) {
                const merged = dbPlans.map((dp) => {
                    const local = LOCAL_STORAGE_PLANS.find((l) => l.id === dp.id || l.gb_amount === dp.gb_amount);
                    return {
                        id: dp.id,
                        nameKey: dp.name_key || (local?.nameKey ?? dp.id),
                        name: t(dp.name_key || (local?.nameKey ?? dp.id)),
                        gb_amount: dp.gb_amount,
                        amount_cents: dp.amount_cents,
                        currency: (dp.currency || 'EUR') as 'EUR',
                        days: 365,
                        active: dp.active,
                        stripe_price_id: dp.stripe_price_id,
                        popular: local?.popular ?? false,
                        maxCapacity: local?.maxCapacity ?? false,
                        featureKeys: local?.featureKeys ?? [
                            'storage_feature_espacio',
                            'storage_feature_dispositivos',
                            'storage_feature_r2',
                            'storage_feature_reembolso',
                        ],
                    } as StoragePlanChoice;
                });
                setPlans(merged);
            } else {
                setPlans(translated);
            }

            // 2. Estado suscripción activa
            const { data: sub } = await supabase
                .from('storage_subscriptions')
                .select('plan_id, gb_amount, status, current_period_end')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('current_period_end', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!alive) return;

            if (sub) {
                const expiry = sub.current_period_end ? new Date(sub.current_period_end) : null;
                const active = expiry ? expiry > new Date() : false;
                setIsStorageActive(active);
                if (active) {
                    setActivePlanId(sub.plan_id ?? null);
                    setActiveUntil(expiry ? expiry.toISOString() : null);
                    setActiveGb(sub.gb_amount ?? 0);
                    if (sub.plan_id) setSelectedPlanId(sub.plan_id);
                }
            }

            setLoadingPlans(false);
        })();

        return () => { alive = false; };
    }, [supabase, t, refreshKey]);

    // ── Manejar retorno de Stripe ─────────────────────────────────────────────
    useEffect(() => {
        const params    = new URLSearchParams(window.location.search);
        const status    = params.get('status');
        const sessionId = params.get('session_id');

        if (status === 'success') setStatusBanner('success');
        else if (status === 'cancel') setStatusBanner('cancel');

        if (status === 'success' && sessionId) {
            (async () => {
                try {
                    await fetch('/api/stripe/confirm-storage-session', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ session_id: sessionId }),
                    });
                    // Limpiar params de la URL sin recargar
                    window.history.replaceState({}, '', window.location.pathname);
                    setRefreshKey((k) => k + 1);
                } catch (e) {
                    console.error('[confirm-storage-session]', e);
                }
            })();
        } else if (status === 'cancel') {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }, []);

    // ── Ir a Stripe checkout ──────────────────────────────────────────────────
    const goStripe = async () => {
        setError(null);
        if (!selectedPlanId) {
            setError(t('storage_selecciona_plan'));
            return;
        }

        try {
            setCheckoutLoading(true);
            const res = await fetch('/api/stripe/create-storage-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId: selectedPlanId }),
            });
            const { url, error: apiErr } = await res.json();
            if (apiErr) { setError(apiErr); return; }
            if (url)    { window.location.href = url; return; }
            setError('No se pudo iniciar el pago. Inténtalo de nuevo.');
        } catch (e: any) {
            setError(e?.message ?? 'Error inesperado al iniciar el pago.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const formatDate = (iso: string | null) => {
        if (!iso) return '';
        try {
            return new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(iso));
        } catch { return iso; }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>
            <TitleH1>{t('storage_cloud_title')}</TitleH1>

            <div className="mx-auto max-w-3xl px-4 pb-12 space-y-6">

                {/* Banner de suscripción activa */}
                {isStorageActive && (
                    <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 px-5 py-4">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500">
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-green-800">
                                {t('storage_ya_activo')} · {activeGb} GB
                            </p>
                            {activeUntil && (
                                <p className="mt-0.5 text-xs text-green-600">
                                    {t('storage_active_until')}: {formatDate(activeUntil)}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {/* Descripción */}
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 px-5 py-4 border border-indigo-100">
                    <p className="text-sm text-indigo-800 leading-relaxed">
                        {t('storage_cloud_subtitle')}
                    </p>
                </div>

                {/* Grid de planes */}
                {loadingPlans ? (
                    <div className="grid gap-4 sm:grid-cols-3">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className="animate-pulse h-64 rounded-2xl bg-gray-100" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-6 pt-2 sm:grid-cols-3">
                        {plans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                selected={selectedPlanId === plan.id}
                                currentPlanId={activePlanId}
                                onSelect={() => setSelectedPlanId(plan.id)}
                                t={t}
                            />
                        ))}
                    </div>
                )}

                {/* CTA */}
                <div className="space-y-3">
                    <Submit
                        onClick={goStripe}
                        text={isStorageActive ? t('storage_renovar') : t('storage_checkout_btn')}
                        loadingText={t('enviando') || 'Procesando…'}
                        loading={checkoutLoading}
                        disabled={!selectedPlanId || checkoutLoading}
                        className="!bg-indigo-600 hover:!bg-indigo-700"
                    />

                    {/* Sello de seguridad Stripe */}
                    <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[#635BFF] text-white font-bold text-xs">
                                S
                            </span>
                            <span className="text-sm font-semibold text-gray-700">{t('stripe_pago_seguro')}</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            {t('storage_stripe_texto')}
                        </p>
                    </div>
                </div>

                {/* Banners de estado de pago */}
                {statusBanner === 'success' && (
                    <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 font-medium">
                        {t('storage_pago_completado')}
                    </div>
                )}
                {statusBanner === 'cancel' && (
                    <div className="rounded-xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                        {t('storage_pago_cancelado')}
                    </div>
                )}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Lo que incluye todo plan */}
                <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">
                        {t('storage_what_includes_title')}
                    </h3>
                    <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                        {[
                            'storage_include_r2',
                            'storage_include_ssl',
                            'storage_include_multi',
                            'storage_include_stack',
                            'storage_include_refund',
                            'storage_include_soporte',
                        ].map((k) => (
                            <li key={k} className="flex items-start gap-2 text-xs text-gray-600">
                                <CheckIcon />
                                <span>{t(k)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
