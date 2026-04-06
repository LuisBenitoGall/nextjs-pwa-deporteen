'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EditSubscriptionDialog from './EditSubscriptionDialog';

export interface AdminSubscription {
  id: string;
  user_id: string;
  plan_id: string | null;
  gb_amount: number;
  amount_cents: number;
  currency: string;
  status: 'active' | 'expired' | 'cancelled';
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  plan: { id: string; name: string; gb_amount: number; amount_cents: number; currency: string } | null;
  profile: { id: string; username: string | null; full_name: string | null } | null;
}

export interface StoragePlan {
  id: string;
  name: string;
  gb_amount: number;
  amount_cents: number;
  currency: string;
}

const STATUS_BADGE: Record<string, 'default' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'default',
  expired: 'warning',
  cancelled: 'destructive',
};

export default function SubscriptionsTable({
  subscriptions,
  plans,
}: {
  subscriptions: AdminSubscription[];
  plans: StoragePlan[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmSub, setConfirmSub] = useState<AdminSubscription | null>(null);
  const [editSub, setEditSub] = useState<AdminSubscription | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subscriptions.filter((s) => {
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchQuery =
        !q ||
        s.profile?.full_name?.toLowerCase().includes(q) ||
        s.profile?.username?.toLowerCase().includes(q) ||
        s.user_id.toLowerCase().includes(q);
      return matchStatus && matchQuery;
    });
  }, [subscriptions, query, statusFilter]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/suscripciones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Suscripción eliminada', variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setConfirmSub(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar usuario…"
          className="h-10 w-full max-w-xs rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <option value="all">Todos los estados</option>
          <option value="active">Activo</option>
          <option value="expired">Expirado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div className="text-xs text-slate-400">
        {filtered.length} de {subscriptions.length} suscripciones
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Plan</th>
              <th className="px-4 py-3 text-left">Almacenamiento</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Vence</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron suscripciones
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">
                      {s.profile?.full_name || '—'}
                    </div>
                    <div className="text-xs text-slate-400">@{s.profile?.username || 'sin usuario'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{s.plan?.name || 'Sin plan'}</td>
                  <td className="px-4 py-3 text-slate-300">{s.gb_amount} GB</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[s.status] ?? 'secondary'}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(s.current_period_end).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-slate-600 text-xs text-slate-300 hover:text-white"
                        onClick={() => setEditSub(s)}
                      >
                        Modificar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => setConfirmSub(s)}
                        disabled={deletingId !== null}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmSub}
        onOpenChange={(open) => !open && setConfirmSub(null)}
        title="Eliminar suscripción"
        description={`¿Eliminar permanentemente la suscripción de ${confirmSub?.profile?.full_name || confirmSub?.user_id}?`}
        loading={deletingId !== null}
        onConfirm={() => confirmSub && handleDelete(confirmSub.id)}
      />

      {editSub && (
        <EditSubscriptionDialog
          subscription={editSub}
          plans={plans}
          onClose={() => setEditSub(null)}
          onSaved={() => {
            setEditSub(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
