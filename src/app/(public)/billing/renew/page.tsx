// app/billing/renew/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import TitleH1 from '@/components/TitleH1';
import { applyI18nToPlans, type Plan } from '@/lib/subscription-plans';
import { isSubscriptionActive } from '@/lib/subscriptions/shared';
import { RenewMultiCheckoutForm, RenewSinglePlanCard } from '@/components/subscription/RenewCheckoutForms';

export const runtime = 'nodejs';

export default async function RenewPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { t } = await tServer();

  type RawSub = {
    id: string;
    status: boolean | string | null;
    current_period_end: string | null;
    seats?: number | null;
  };

  const { data: subsRaw } = (await supabase
    .from('subscriptions')
    .select('id, status, current_period_end, seats')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })) as unknown as { data: RawSub[] | null };

  const now = new Date();
  const WINDOW_DAYS = 15;
  const horizon = new Date(now.getTime() + WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const renewableSeats = (subsRaw || []).reduce((acc, s) => {
    const end = s.current_period_end ? new Date(s.current_period_end) : null;
    const isActive = isSubscriptionActive(s);
    const isRenewable = !isActive || (end ? end <= horizon : false);
    if (isRenewable) {
      const seats = Number(s.seats ?? 1);
      return acc + (Number.isFinite(seats) ? seats : 1);
    }
    return acc;
  }, 0);

  if (!renewableSeats) {
    return (
      <div className="max-w-3xl mx-auto">
        <TitleH1>{t('renovar_suscripcion')}</TitleH1>
        <p className="mt-4 text-gray-700">{t('no_hay_deportistas_renovables')}</p>
        <p className="mt-1 text-sm text-gray-500">{t('renovar_ventana_aviso', { dias: WINDOW_DAYS.toString() })}</p>
        <p className="mt-3">
          <Link href="/account" className="underline">
            {t('volver_a_cuenta')}
          </Link>
        </p>
      </div>
    );
  }

  type RawPlayer = { id: string; full_name: string | null };
  const { data: playersRaw } = (await supabase
    .from('players')
    .select('id, full_name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })) as unknown as { data: RawPlayer[] | null };

  const players = (playersRaw || []).map((p) => ({
    id: p.id,
    display: p.full_name?.trim() || t('sin_nombre'),
  }));

  const { data: plansData, error: plansErr } = await supabase
    .from('subscription_plans')
    .select('id, name, days, amount_cents, currency, active, free')
    .eq('active', true)
    .eq('free', false)
    .order('days', { ascending: true });

  if (plansErr || !plansData?.length) {
    return (
      <div className="max-w-3xl mx-auto">
        <TitleH1>{t('suscripcion_renovar')}</TitleH1>
        <p className="mt-4 text-red-700">{t('no_planes_activos') ?? 'No hay planes disponibles en este momento.'}</p>
        <Link href="/account" className="mt-3 inline-block underline">
          {t('volver_a_cuenta')}
        </Link>
      </div>
    );
  }

  const plans = applyI18nToPlans(plansData as Plan[], t);
  const singleSeat = renewableSeats === 1;

  return (
    <div className="max-w-3xl mx-auto">
      <TitleH1>{t('suscripcion_renovar')}</TitleH1>

      <div className="mb-6 flex gap-2">
        <Link href="/account" className="underline">
          <button
            type="button"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition"
          >
            {t('cuenta_mi_volver')}
          </button>
        </Link>
      </div>

      {singleSeat ? (
        <>
          <p className="mt-4 text-gray-700">{t('suscripcion_renovar_texto')}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            {plans.map((p) => (
              <RenewSinglePlanCard
                key={p.id}
                plan={{ id: p.id, name: p.name, days: p.days, amount_cents: p.amount_cents }}
                labels={{
                  continue: t('continuar'),
                  sending: t('enviando') ?? t('continuar'),
                  player: t('jugador'),
                }}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <p className="mt-4 text-gray-700">
            {t('elige_deportistas_a_renovar')} ({renewableSeats})
          </p>
          <RenewMultiCheckoutForm
            plans={plans.map((p) => ({
              id: p.id,
              name: p.name,
              days: p.days,
              amount_cents: p.amount_cents,
            }))}
            players={players}
            maxSeats={renewableSeats}
            labels={{
              choosePlan: t('elige_plan_para_seleccion'),
              continue: t('continuar'),
              sending: t('enviando') ?? t('continuar'),
              player: t('jugador'),
              lifetime: t('acceso_vida'),
              duration: t('duracion'),
              days: t('dias'),
              years: t('años'),
              perYear: t('any'),
            }}
          />
        </>
      )}
    </div>
  );
}
