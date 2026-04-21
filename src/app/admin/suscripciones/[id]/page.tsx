import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClientReadOnly, getServerUser } from '@/lib/supabase/server';
import { userCanAccessAdminPanel } from '@/lib/auth/adminAccess';
import { fetchUserPayments } from '@/lib/stripe-payments';
import type { StoragePlan } from '@/components/admin/suscripciones/SubscriptionsTable';
import EditSubscriptionForm from './EditSubscriptionForm';

type PageProps = {
  params: Promise<{ id: string }>;
};

export const dynamic = 'force-dynamic';

export default async function AdminSubscriptionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { user } = await getServerUser();
  if (!user) redirect('/login?next=/admin/suscripciones');

  const readonlyClient = await createSupabaseServerClientReadOnly();
  const allowed = await userCanAccessAdminPanel(readonlyClient, user);
  if (!allowed) {
    return (
      <section className="mx-auto max-w-3xl rounded-2xl border border-red-800/40 bg-red-950/20 p-6">
        <h1 className="text-2xl font-semibold text-red-300">Acceso denegado</h1>
        <p className="mt-2 text-sm text-red-200/80">
          Tu cuenta no tiene permisos para editar suscripciones administrativas.
        </p>
        <Link
          href="/admin/suscripciones"
          className="mt-5 inline-flex items-center rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-100 hover:bg-slate-700"
        >
          Volver al listado
        </Link>
      </section>
    );
  }

  const supabase = getSupabaseAdmin();

  const [{ data: sub }, { data: plans }] = await Promise.all([
    supabase
      .from('storage_subscriptions')
      .select('id, user_id, plan_id, gb_amount, amount_cents, currency, status, current_period_start, current_period_end, updated_at, created_at')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('storage_plans')
      .select('id, name, gb_amount, amount_cents, currency')
      .order('gb_amount'),
  ]);

  if (!sub) notFound();

  const [{ data: profile }, { data: appUser }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, full_name')
      .eq('id', sub.user_id)
      .maybeSingle(),
    supabase
      .from('users')
      .select('id, email')
      .eq('id', sub.user_id)
      .maybeSingle(),
  ]);

  const directPayments = await fetchUserPayments({
    supabase,
    userId: sub.user_id,
    userEmail: appUser?.email ?? null,
    stripeSecret: process.env.STRIPE_SECRET_KEY ?? null,
    limit: 25,
    subscriptionId: sub.id,
    includeSupabase: true,
    includeStripe: false,
  });

  let paymentScope: 'subscription' | 'user_fallback' = 'subscription';
  let payments = directPayments.payments;
  if (directPayments.total === 0) {
    paymentScope = 'user_fallback';
    const fallbackPayments = await fetchUserPayments({
      supabase,
      userId: sub.user_id,
      userEmail: appUser?.email ?? null,
      stripeSecret: process.env.STRIPE_SECRET_KEY ?? null,
      limit: 25,
      includeSupabase: true,
      includeStripe: true,
    });
    payments = fallbackPayments.payments;
  }

  const userLabel = profile?.full_name || profile?.username || sub.user_id;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-100">Editar suscripción</h1>
        <p className="text-sm text-slate-400">
          Usuario: <span className="text-slate-200">{userLabel}</span>
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-500">
          <span>ID suscripción: {sub.id}</span>
          <span>Actualizada: {new Date(sub.updated_at).toLocaleString('es-ES')}</span>
        </div>
      </header>

      <EditSubscriptionForm
        subscription={{
          id: sub.id,
          status: sub.status,
          current_period_end: sub.current_period_end,
          plan_id: sub.plan_id,
          gb_amount: sub.gb_amount,
        }}
        plans={(plans ?? []) as StoragePlan[]}
      />

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold text-slate-100">Histórico de pagos</h2>
        <p className="mt-1 text-xs text-slate-400">
          {paymentScope === 'subscription'
            ? 'Fuente: pagos asociados directamente a esta suscripción (payments.subscription_id).'
            : 'Sin pagos vinculados por subscription_id. Mostrando fallback por usuario.'}
        </p>

        {payments.length === 0 ? (
          <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
            Esta suscripción no tiene pagos registrados.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-slate-400">
                  <th className="px-3 py-2">Fecha</th>
                  <th className="px-3 py-2">Importe</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Origen</th>
                  <th className="px-3 py-2">Descripción</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={`${payment.source}-${payment.id}`} className="border-b border-slate-900/70 text-slate-200">
                    <td className="px-3 py-2">
                      {payment.paidAt ? new Date(payment.paidAt).toLocaleString('es-ES') : '—'}
                    </td>
                    <td className="px-3 py-2">
                      {typeof payment.amount === 'number'
                        ? `${(payment.amount / 100).toFixed(2)} ${(payment.currency ?? 'EUR').toUpperCase()}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2">{payment.status ?? '—'}</td>
                    <td className="px-3 py-2">{payment.source}</td>
                    <td className="px-3 py-2">
                      {payment.receiptUrl ? (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:text-emerald-300"
                        >
                          {payment.description || 'Ver recibo'}
                        </a>
                      ) : (
                        payment.description || '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div>
        <Link
          href="/admin/suscripciones"
          className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Volver al listado de suscripciones
        </Link>
      </div>
    </div>
  );
}
