'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';

// Components
import Input from '../../components/Input';
import Submit from '../../components/Submit';
import TitleH1 from '../../components/TitleH1';

type Plan = {
  id: string;
  name: string;
  days: number;
  price_cents: number;
  currency: 'EUR';
  active: boolean;
  free: boolean;
};

const FAKE_MODE = process.env.NEXT_PUBLIC_FAKE_PLANS === '1';

// Plan oculto para códigos (gratis, 1 año)
const LOCAL_FREE_PLAN: Plan = {
  id: 'free-code-hidden',
  name: 'Plan código (oculto)',
  days: 365,
  price_cents: 0,
  currency: 'EUR' as const,
  active: true,
  free: true,
};

// Planes de pago locales (incluye lifetime)
const LOCAL_PAID_PLANS: Plan[] = [
  { id: 'plan-1y', name: 'Plan 1 año',  days: 365,   price_cents: 300,  currency: 'EUR' as const, active: true, free: false },
  { id: 'plan-3y', name: 'Plan 3 años', days: 1095,  price_cents: 750,  currency: 'EUR' as const, active: true, free: false },
  { id: 'plan-lt', name: 'Plan Para Siempre', days: 100000, price_cents: 2790, currency: 'EUR' as const, active: true, free: false },
].filter(p => p.active);

// Helpers
const euros = (cents: number) => (cents / 100).toFixed(2);
const yearsFromDays = (days: number) => Math.round((days / 365) * 10) / 10;
const isLifetime = (p: Plan) =>
  p.days >= 36500 || p.name.toLowerCase().includes('siempre');

export default function SubscriptionPage() {
    const t = useT();
    const router = useRouter();
    const supabase = useMemo(
        () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
        []
    );

  const [error, setError] = useState<string | null>(null);

  // Cantidad de deportistas
  const [units, setUnits] = useState<number>(1);

  // Código (solo visible si units === 1)
  const [code, setCode] = useState('');

  // Planes de pago
  const [paidPlans, setPaidPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [subActive, setSubActive] = useState(false);
  const [subPlanId, setSubPlanId] = useState<string>('');
  const [subEndsAt, setSubEndsAt] = useState<string>('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusBanner, setStatusBanner] = useState<'success' | 'cancel' | ''>('');

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!alive) return;
      if (!user) { setError(t('sesion_iniciar_aviso')); return; }

      if (FAKE_MODE) {
        setPaidPlans(LOCAL_PAID_PLANS);
        // si hay 1, autoselección; si hay varios, ninguno seleccionado
        if (LOCAL_PAID_PLANS.length === 1) setSelectedPlanId(LOCAL_PAID_PLANS[0].id);
        setLoadingPlans(false);
        return;
      }

      setLoadingPlans(true);
      const { data, error } = await supabase
        .from('subscription_plans_view')
        .select('id, name, days, price_cents, currency, active, free')
        .eq('active', true)
        .eq('free', false)
        .order('days', { ascending: true });

      if (error) {
        setPaidPlans(LOCAL_PAID_PLANS);
        if (LOCAL_PAID_PLANS.length === 1) setSelectedPlanId(LOCAL_PAID_PLANS[0].id);
        setLoadingPlans(false);
        return;
      }

      const plans = (data || []) as Plan[];
      const visibles = plans.filter(p => p.active && !p.free);
      setPaidPlans(visibles);

      if (visibles.length === 1) setSelectedPlanId(visibles[0].id);

      const { data: latest, error: subErr } = await supabase
        .from('subscriptions')
        .select('plan_id, current_period_end, status, user_id')
        .eq('user_id', user.id)
        .order('current_period_end', { ascending: false })
        .limit(1);
      
      if (subErr) {
        console.error('[SubscriptionPage] Error fetching subscription:', subErr);
      }
      const s = Array.isArray(latest) ? latest[0] : null;
      if (s) {
        const end = s.current_period_end ? new Date(s.current_period_end) : null;
        const statusBool = s.status === true || String(s.status || '').toLowerCase() === 'active';
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
    return () => { alive = false; };
  }, [supabase, t, refreshKey]);

  // Confirmar sesión de Stripe al volver de Checkout (?status=success&session_id=...)
  useEffect(() => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
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
            body: JSON.stringify({ session_id: sessionId })
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
      if (multi && !selectedPlanId) { setError('Selecciona un plan de suscripción.'); return; }
      const planId = selectedPlanId || paidPlans[0]?.id || '';
      if (!planId) { setError('No hay planes activos.'); return; }

      if (FAKE_MODE) {
        router.replace('/players/bulk-new?units=' + units);
        return;
      }

      // Iniciar Checkout con el plan seleccionado
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, units })
      });
      const { url, error } = await res.json();
      if (error) { setError(error); return; }
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
    if (!trimmed) { setError('Introduce un código válido.'); return; }
    if (units !== 1) { setError('El código solo aplica a 1 deportista.'); return; }

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
        p_plan_id: planIdForCode
      });
      if (rpcErr) throw rpcErr;

      const res = Array.isArray(data) ? data[0] : data;
      if (!res?.ok) { setError(res?.message || 'No se pudo registrar la suscripción con código.'); return; }

      try {
        localStorage.setItem('pending_access_code', trimmed);
        sessionStorage.setItem('pending_access_code', trimmed);
      } catch {}
      router.replace(`/players/new?via=code&code=${encodeURIComponent(trimmed)}`);
    } catch (e: any) {
      setError(e?.message ?? 'Error al registrar la suscripción con código.');
    }
    };

    const isMultiPlan = paidPlans.length > 1;
    //const stripeDisabled = isMultiPlan && !selectedPlanId;

    const formatDate = (iso?: string) => {
      if (!iso) return '';
      try { const d = new Date(iso); return d.toLocaleDateString(); } catch { return iso; }
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
                    onChange={(e: any) => setUnits(Math.max(1, parseInt(e.target.value || '1', 10)))}
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
                        <div key={i} className="animate-pulse h-44 rounded-xl border border-green-600 bg-gray-100" />
                        ))
                    : paidPlans.map((p) => {
                        const selected = selectedPlanId === p.id;
                        const yrs = yearsFromDays(p.days);
                        const total = euros(p.price_cents);
                        const perYear = (p.price_cents / 100 / (yrs || 1)).toFixed(2);
                        const lifetime = isLifetime(p);

                        return (
                            <button
                            key={p.id}
                            type="button"
                            onClick={() => setSelectedPlanId(p.id)}
                            aria-pressed={selected}
                            className={[
                              'relative text-left rounded-xl border p-5 transition flex flex-col justify-start',
                              // borde verde SIEMPRE
                              'border-green-600',
                              // hover: solo cambia el fondo
                              'hover:bg-green-50',
                              // seleccionado: refuerzo visual
                              selected ? 'ring-2 ring-green-700 bg-green-50' : ''
                            ].join(' ')}
                            >
                            <div className="text-sm text-gray-700">{p.name}</div>
                            {subPlanId === p.id && (
                              <span className="absolute top-3 right-3 inline-flex items-center rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white">Activo</span>
                            )}

                            {/* Precio TOTAL grande */}
                            <div className="mt-2 text-3xl font-extrabold">
                                {total}€ 
                                <span className="text-sm ml-2 font-normal text-gray-600">
                                    x {t('jugador')}
                                </span>
                            </div>

                            {/* Línea secundaria: per-year + duración, excepto lifetime */}
                            <div className="mt-1 text-xs text-gray-600">
                                {lifetime
                                ? 'Acceso de por vida'
                                : <>≈ {perYear} € / {t('any')} · {t('duracion')}: {p.days} {t('dias')} {yrs >= 1 ? `(≈${yrs} ${t('años')})` : null}</>
                                }
                            </div>
                            </button>
                        );
                        })}
                </div>
                )}

                {/* Botón Stripe: desactivado si hay múltiples y no hay selección */}
                <div>
                    <Submit
                    onClick={goStripe}
                    text={t('suscripcion_stripe')}
                    loadingText={t('enviando') ?? t('suscripcion_stripe')}
                    disabled={subActive || (isMultiPlan && !selectedPlanId)}
                    />

                    <div className="mt-4 px-4 py-6 rounded-lg bg-gray-200 text-gray-700">
                        <span className="inline-flex h-5 w-5 mr-2 items-center justify-center rounded bg-[#635BFF] text-white font-bold">S</span>
                        <span className="font-bold">{t('stripe_pago_seguro')}</span>
                        <br /><br />

                        <p dangerouslySetInnerHTML={{ __html: t('suscripcion_planes_texto') }} />
                    </div>
                </div>

                {statusBanner === 'success' && (
                  <div className="rounded border p-3 bg-green-50 text-green-800">Pago completado. Tu suscripción se ha activado.</div>
                )}
                {statusBanner === 'cancel' && (
                  <div className="rounded border p-3 bg-yellow-50 text-yellow-800">Pago cancelado.</div>
                )}
                {error && <div className="rounded border p-3 bg-red-50 text-red-700">{error}</div>}
            </div>
        </div>
    );
}
