'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useT, useLocale } from '@/i18n/I18nProvider';

//Components
import Input from '../../components/Input';
import Submit from '../../components/Submit';
import TitleH1 from '../../components/TitleH1';

export default function SubscriptionPage() {
    const t = useT();
    const router = useRouter();
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Estado
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    //const [activeUntil, setActiveUntil] = useState<Date | null>(null);

    // Cantidad de deportistas a suscribir
    const [units, setUnits] = useState<number>(1);

    // Código (solo visible si units === 1)
    const [code, setCode] = useState('');
    
    // Plan (si tienes varios activos, podrías cargarlos; aquí dejamos uno fijo por simplicidad)
    const [planId, setPlanId] = useState<string>('');

    // Plan gratuito
    const [freePlanId, setFreePlanId] = useState<string>('');

    // Carga mínima (usuario y plan opcional)
    useEffect(() => {
        let mounted = true;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!mounted) return;
            if (!user) {
                setError(t('sesion_iniciar_aviso'));
                setLoading(false);
                return;
            }
            // Si quieres, puedes precargar un plan activo; por ahora lo dejamos vacío
            setPlanId(process.env.NEXT_PUBLIC_DEFAULT_PLAN_ID || '');
            setLoading(false);
        })();
        return () => { mounted = false; };
    }, [supabase]);

    // Acción: Stripe
    const goStripe = async () => {
        try {
            setError(null);
            // Si usas el endpoint que te propuse anteriormente:
            // body: { planId, units, hasCode }
            const res = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  planId: planId || undefined,
                  units,
                  hasCode: false
                })
            });
            const { url, error } = await res.json();
            if (error) { setError(error); return; }
            if (url) {
                window.location.href = url;
            } else {
                // Si el endpoint devuelve null (no pago), por coherencia mandamos al Dashboard
                //router.replace('/dashboard');
                router.replace('/players/bulk-new?units=' + units);
            }
        } catch (e: any) {
            setError(e?.message ?? 'No se pudo iniciar el checkout.');
        }
    };

    // Acción: “suscripción” con código (solo units === 1)
    // Aquí NO canjeamos el código todavía porque no existe jugador.
    // Guardamos el código para el siguiente paso (crear jugador) y llevamos a Dashboard.
    const useCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const trimmed = code.trim();
        if (!trimmed) { setError('Introduce un código válido.'); return; }
        if (units !== 1) { setError('El código solo aplica a 1 deportista.'); return; }

        try {
            // Resuelve plan gratuito activo si no está fijado
            let planToUse = planId;
            if (!planToUse) {
                const { data: plan, error: planErr } = await supabase
                  .from('subscription_plans')
                  .select('id, days, active, free')
                  .eq('free', true)
                  .eq('active', true)
                  .limit(1)
                  .maybeSingle();

                if (planErr) { setError(planErr.message); return; }
                if (!plan?.id) { setError('No hay plan gratuito activo configurado.'); return; }
                planToUse = plan.id;
                setFreePlanId(plan.id);
            }

            // 1) valida y registra la suscripción por código en BD
            const { data, error: rpcErr } = await supabase.rpc('create_code_subscription', {
                p_code: trimmed,
                p_plan_id: planToUse
            });
            if (rpcErr) throw rpcErr;

            const res = Array.isArray(data) ? data[0] : data;
            if (!res?.ok) {
                setError(res?.message || 'No se pudo registrar la suscripción con código.');
                return;
            }

            // 2) guarda el código para el canje en el jugador y redirige
            try {
                localStorage.setItem('pending_access_code', trimmed);
                sessionStorage.setItem('pending_access_code', trimmed);
            } catch {}

            router.replace(`/players/new?via=code&code=${encodeURIComponent(trimmed)}`);
        } catch (e: any) {
            setError(e?.message ?? 'Error al registrar la suscripción con código.');
        }
    };

    if (loading) return <div className="p-6">{t('cargando')}</div>;

    return (
        <div className="max-w-xl mx-auto">
            <TitleH1>{t('suscripcion')}</TitleH1>

            <div className="p-4 space-y-4">
                {/*<h2 className="font-semibold">Suscripción para nuevos usuarios</h2>*/}

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

                    <p
                        className="text-xs text-gray-600"
                        dangerouslySetInnerHTML={{ __html: t('suscripcion_texto2') }}
                    />
                </div>

                {/* Si solo 1 deportista, mostrar opción de código */}
                {units === 1 && (
                    <>
                        <form onSubmit={useCode} className="flex gap-2">
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

                        <div className="text-center text-sm text-gray-500">
                            {t('o')}
                        </div>
                    </>
                )}

                {/* Botón Stripe siempre visible, pero si units === 1 y hay código,
                el usuario puede elegir cualquiera de las dos vías.
                Si units > 1, esta es la única vía. */}
                <Submit
                    onClick={goStripe}
                    text={t('suscripcion_stripe')}
                    loadingText={t('enviando') ?? t('suscripcion_stripe')}
                />

                {error && (
                    <div className="rounded border p-3 bg-red-50 text-red-700">{error}</div>
                )}
            </div>

            {/*<p className="px-4 pt-5 text-xs text-gray-500">
                Este flujo es solo para <b>nuevas suscripciones</b>. Las renovaciones se gestionarán
                en otra pantalla y <b>no admiten códigos gratuitos</b>.
            </p>*/}
        </div>
    );
}