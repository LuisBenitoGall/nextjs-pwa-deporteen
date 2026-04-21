import { getSupabaseAdmin } from '@/lib/supabase/admin';
import SubscriptionsTable from '@/components/admin/suscripciones/SubscriptionsTable';
import type { AdminSubscription } from '@/components/admin/suscripciones/SubscriptionsTable';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Suscripciones — Admin' };

export default async function AdminSuscripcionesPage() {
  const supabase = getSupabaseAdmin();

  const { data: subsData } = await supabase
    .from('storage_subscriptions')
    .select('*, plan:storage_plans(id, name, gb_amount, amount_cents, currency)')
    .order('created_at', { ascending: false });

  const userIds = [...new Set(subsData?.map((s) => s.user_id) ?? [])];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', userIds)
    : { data: [] };

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const subscriptions: AdminSubscription[] = (subsData ?? []).map((s) => ({
    ...s,
    profile: profileMap.get(s.user_id) ?? null,
  }));

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
