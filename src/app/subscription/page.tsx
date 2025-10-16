'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import {
  applyI18nToPlans,
  LOCAL_PAID_PLANS,
  LOCAL_FREE_PLAN,
  type Plan,
  type PlanChoice,
  euros,
  yearsFromDays,
  isLifetime,
} from '@/lib/subscription-plans';
import { useT } from '@/i18n/I18nProvider';

// Components
import Input from '../../components/Input';
import Submit from '../../components/Submit';
import TitleH1 from '../../components/TitleH1';

const FAKE_MODE = process.env.NEXT_PUBLIC_FAKE_PLANS === '1';

export default function SubscriptionPage() {
  const t = useT();
  const router = useRouter();
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [error, setError] = useState<string | null>(null);

  // Cantidad de deportistas
  const [units, setUnits] = useState<number>(1);

  // Código (solo visible si units === 1)
  const [code, setCode] = useState('');

  // Planes de pago (ya traducidos)
  const [paidPlans, setPaidPlans] = useState<PlanChoice[]>(
    () => applyI18nToPlans(LOCAL_PAID_PLANS, t)
  );
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loadingPlans, setLoadingPlans] = useState(true);

  // Estado de suscripción actual (para deshabilitar CTA si ya está activa)
  const [subActive, setSubActive] = useState(false);
  const [subPlanId, setSubPlanId] = useState<string>('');
  const [subEndsAt, setSubEndsAt] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusBanner, setStatusBanner] = useState<'success' | 'cancel' | ''>('');

  // Carga de planes + estado de suscripción
  useEffect(() => {
    let alive = true;

    (async () => {
      // fallback optimista mientras carga
      setPaidPlans(applyI18nToPlans(LOCAL_PAID_PLANS, t));

      const { data: userRes } = await supabase.auth.getUser();
      if (!alive) return;

      if (!userRes?.user) {
        setError(t('sesion_iniciar_aviso'));
        setLoadingPlans(false);
        return;
      }

      if (FAKE_MODE) {
        const localTranslated = applyI18nToPlans(LOCAL_PAID_PLANS, t);
        setPaidPlans(localTranslated);
        if (localTranslated.length === 1) setSelectedPlanId(localTranslated[0].id);
        setLoadingPlans(false);
        return;
      }

      setLoadingPlans(true);

      // ⬇️ CAPTURAMOS data correctamente
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, days, price_cents, currency, active, free')
        .eq('active', true)
        .eq('free', false)
        .order('days', { ascending: true });

      if (error) {
        const localTranslated = applyI18nToPlans(LOCAL_PAID_PLANS, t);
        setPaidPlans(localTranslated);
        if (localTranslated.length === 1) setSelectedPlanId(localTranslated[0].id);
        setLoadingPlans(false);
        return;
      }

      const plans = (data || []) as Plan[];
      const visibles = plans.filter((p) => p.active && !p.free);
      const translated = applyI18nToPlans(
        visibles.length ? visibles : LOCAL_PAID_PLANS,
        t
      );

      setPaidPlans(translated);
      if (translated.length === 1) setSelectedPlanId(translated[0].id);

      // Suscripción más reciente del usuario
      const { data: latest, error: subErr } = await supabase
        .from('subscriptions')
        .select('plan_id, current_period_end, status, user_id')
        .eq('user_id', userRes.user.id) // ⬅️ user.id → userRes.user.id
        .order('current_period_end', { ascending: false })
        .limit(1);

      if (subErr) {
        console.error('[SubscriptionPage] Error fetching subscription:', subErr);
      }

      const s = Array.isArray(latest) ? latest[0] : null;
      if (s) {
        const end = s.current_period_end ? new Date(s.current_period_end) : null;
        const statusBool =
          s.status === true || String(s.status || '').toLowerCase() === 'active';
        const isActive = Boolean(end && end.getTime() > Date.now() && statusBool);
        setSubActive(isActive);
        if (isActive) {
          if (s.plan_id) {
            setSubPlanId(s.plan_id);
            setSelectedPlanId(s.plan_id);
          }
          setSubEndsAt(end ? end.toISOString() : '');
        }
      }

      setLoadingPlans(false);
    })();

    return () => {
      alive = false;
    };
  }, [supabase, t, refreshKey]);

  // Confirmar sesión de Stripe al volver de Checkout (?status=success&session_id=...)
  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : ''
    );
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
        } catch {}
      })();
    }
  }, []);

  // Checkout Stripe
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
        router.replace('/players/bulk-new?units=' + units);
        return;
      }

      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, units }),
      });
      const { url, error } = await res.json();
      if (error) {
        setError(error);
        return;
      }
      if (url) window.location.href = url;
      else router.replace('/players/bulk-new?units=' + units);
    } catch (e: any) {
      setError(e?.message ?? 'No se pudo iniciar el checkout.');
    }
  };

  // Suscripción con código (solo units === 1)
  const useCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setError(t('codigo_introduce_valido'));
      return;
    }
    if (units !== 1) {
      setError(t('codigo_solo_un_deportista'));
      return;
    }

    try {
      let planIdForCode: string | null = null;

      if (!FAKE_MODE) {
        const { data: plan, error: planErr } = await supabase
          .from('subscription_plans_view')
          .select('id')
          .eq('free', true)
          .eq('active', true)
          .limit(1)
          .maybeSingle();

        if (!planErr && plan?.id) planIdForCode = plan.id;
      }

      if (!planIdForCode) planIdForCode = LOCAL_FREE_PLAN.id;

      if (FAKE_MODE) {
        try {
          localStorage.setItem('pending_access_code', trimmed);
          sessionStorage.setItem('pending_access_code', trimmed);
        } catch {}
        router.replace(`/players/new?via=code&code=${encodeURIComponent(trimmed)}`);
        return;
      }

      const { data, error: rpcErr } = await supabase.rpc('create_code_subscription', {
        p_code: trimmed,
        p_plan_id: planIdForCode,
      });
      if (rpcErr) throw rpcErr;

      const res = Array.isArray(data) ? data[0] : data;
      if (!res?.ok) {
        setError(res?.message || t('suscripcion_codigo_error'));
        return;
      }

      try {
        localStorage.setItem('pending_access_code', trimmed);
        sessionStorage.setItem('pending_access_code', trimmed);
      } catch {}
      router.replace(`/players/new?via=code&code=${encodeURIComponent(trimmed)}`);
    } catch (e: any) {
      setError(e?.message ?? t('suscripcion_codigo_error'));
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
        {/* Estado de suscripción */}
        {subActive && (
          <div className="rounded-lg border border-green-600 bg-green-50 px-4 py-3 text-green-800">
            {t('suscripcion')} activa. Fin del periodo: {formatDate(subEndsAt)}
          </div>
        )}

        <p>{t('suscripcion_texto1')}</p>

        {/* Cantidad de deportistas */}
        <div className="space-y-2">
          <Input
            label={t('deportistas_num')}
            type="number"
            min={1}
            value={units}
            onChange={(e: any) =>
              setUnits(Math.max(1, parseInt(e.target.value || '1', 10)))
            }
            noSpinner
            containerClassName="w-1/2"
          />
          <p dangerouslySetInnerHTML={{ __html: t('suscripcion_texto2') }} />
        </div>

        {/* Si solo 1 deportista, opción de código */}
        {units === 1 && (
          <>
            <form onSubmit={useCode} className="flex gap-2" suppressHydrationWarning>
              <Input
                value={code}
                onChange={(e: any) => setCode(e.target.value)}
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

        {/* Cards de planes si hay > 1 activo */}
        {isMultiPlan && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loadingPlans
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse h-44 rounded-xl border border-green-600 bg-gray-100"
                  />
                ))
              : paidPlans.map((p) => {
                  const selected = selectedPlanId === p.id;
                  const yrs = yearsFromDays(p.days);
                  const total = euros(p.price_cents);
                  const perYear = (p.price_cents / 100 / (yrs || 1)).toFixed(2);
                  const lifetime = isLifetime({ days: p.days });

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlanId(p.id)}
                      aria-pressed={selected}
                      className={[
                        'relative text-left rounded-xl border p-5 transition flex flex-col justify-start',
                        'border-green-600',
                        'hover:bg-green-50',
                        selected ? 'ring-2 ring-green-700 bg-green-50' : '',
                      ].join(' ')}
                    >
                      <div className="text-sm text-gray-700">{p.name}</div>
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

        {/* Botón Stripe */}
        <div>
          <Submit
            onClick={goStripe}
            text={t('suscripcion_stripe')}
            loadingText={t('enviando') ?? t('suscripcion_stripe')}
            disabled={subActive || (isMultiPlan && !selectedPlanId)}
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
          <div className="rounded border p-3 bg-green-50 text-green-800">
            Pago completado. Tu suscripción se ha activado.
          </div>
        )}
        {statusBanner === 'cancel' && (
          <div className="rounded border p-3 bg-yellow-50 text-yellow-800">
            Pago cancelado.
          </div>
        )}
        {error && <div className="rounded border p-3 bg-red-50 text-red-700">{error}</div>}
      </div>
    </div>
  );
}
