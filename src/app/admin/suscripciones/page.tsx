import { getSupabaseAdmin } from '@/lib/supabase/admin';
import SubscriptionsTable from '@/components/admin/suscripciones/SubscriptionsTable';
import type { AdminSubscription } from '@/components/admin/suscripciones/SubscriptionsTable';
import { detectAdminSubscriptionsSource } from '@/lib/admin/subscriptionsAdminSource';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Suscripciones — Admin' };

export default async function AdminSuscripcionesPage() {
  const supabase = getSupabaseAdmin();

  const source = await detectAdminSubscriptionsSource(supabase);

  const subsData =
    source === 'storage'
      ? (
          await supabase
            .from('storage_subscriptions')
            .select('*, plan:storage_plans(id, name, gb_amount, amount_cents, currency)')
            .order('created_at', { ascending: false })
        ).data
      : (
          await supabase
            .from('subscriptions')
            .select('id,user_id,plan_id,status,current_period_end,created_at,updated_at,amount,currency,seats')
            .order('created_at', { ascending: false })
        ).data;

  const plansData =
    source === 'storage'
      ? (
          await supabase
            .from('storage_plans')
            .select('id, name, gb_amount, amount_cents, currency')
            .order('gb_amount')
        ).data
      : (
          await supabase
            .from('subscription_plans')
            .select('id, name, amount_cents, currency')
            .order('amount_cents')
        ).data;

  const userIds = [...new Set(subsData?.map((s) => s.user_id) ?? [])];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', userIds)
    : { data: [] };

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const subscriptions: AdminSubscription[] =
    source === 'storage'
      ? (subsData ?? []).map((s: any) => ({
          ...s,
          profile: profileMap.get(s.user_id) ?? null,
        }))
      : (subsData ?? []).map((s: any) => {
          const plan = (plansData ?? []).find((p: any) => p.id === s.plan_id);
          return {
            id: s.id,
            user_id: s.user_id,
            plan_id: s.plan_id ?? null,
            gb_amount: Number(s.seats ?? 0),
            amount_cents: Number(s.amount ?? 0),
            currency: String(s.currency ?? 'EUR'),
            status: String(s.status ?? 'cancelled') as any,
            current_period_start: s.created_at,
            current_period_end: s.current_period_end,
            created_at: s.created_at,
            updated_at: s.updated_at,
            plan: plan
              ? {
                  id: plan.id,
                  name: plan.name,
                  gb_amount: Number(s.seats ?? 0),
                  amount_cents: Number(plan.amount_cents ?? s.amount ?? 0),
                  currency: String(plan.currency ?? s.currency ?? 'EUR'),
                }
              : null,
            profile: profileMap.get(s.user_id) ?? null,
          } as AdminSubscription;
        });

  const activeCount = subscriptions.filter((s) => s.status === 'active').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-slate-100">Suscripciones</h1>
        <p className="text-sm text-slate-400">
          {subscriptions.length} total · {activeCount} activas
        </p>
      </div>
      <SubscriptionsTable
        subscriptions={subscriptions}
      />
    </div>
  );
}
