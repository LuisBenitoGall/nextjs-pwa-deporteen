import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import {
  applyI18nToPlans,
  LOCAL_PAID_PLANS,
  normalizeSubscriptionPlansFromDb,
  type PlanChoice,
  type SubscriptionPlanDbRow,
} from '@/lib/subscription-plans';
import SubscriptionPageClient from './SubscriptionPageClient';

export const runtime = 'nodejs';

const FAKE_MODE = process.env.NEXT_PUBLIC_FAKE_PLANS === '1';

const PLAN_SELECT =
  'id, name, days, amount_cents, currency, active, free, metadata, stripe_price_id';

export default async function SubscriptionPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { t } = await tServer();

  if (!user) {
    return (
      <SubscriptionPageClient authenticated={false} initialPaidPlans={[]} initialPlansError={null} />
    );
  }

  let initialPaidPlans: PlanChoice[] = [];
  let initialPlansError: string | null = null;

  if (FAKE_MODE) {
    initialPaidPlans = applyI18nToPlans(LOCAL_PAID_PLANS, t);
  } else {
    const { data: plansData, error: plansErr } = await supabase
      .from('subscription_plans')
      .select(PLAN_SELECT)
      .eq('active', true)
      .eq('free', false)
      .order('days', { ascending: true });

    if (plansErr) {
      console.warn('[subscription/page] could not load plans:', plansErr.message);
      initialPlansError = t('no_planes_activos') ?? 'No hay planes activos';
    } else {
      const visibles = normalizeSubscriptionPlansFromDb(
        (plansData || []) as SubscriptionPlanDbRow[],
      );
      initialPaidPlans = applyI18nToPlans(visibles, t);
      if (!initialPaidPlans.length) {
        initialPlansError = t('no_planes_activos') ?? 'No hay planes activos';
      }
    }
  }

  return (
    <SubscriptionPageClient
      authenticated
      initialPaidPlans={initialPaidPlans}
      initialPlansError={initialPlansError}
    />
  );
}
