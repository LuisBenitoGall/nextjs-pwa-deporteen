'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import { isSubscriptionActive } from '@/lib/subscriptions/shared';

export type UserDetailPayload = {
  can_mutate: boolean;
  user: {
    id: string;
    email: string | undefined;
    created_at: string;
    last_sign_in_at: string | null;
    confirmed_at: string | null;
    banned_until: string | null;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
    locale: string | null;
    role: string | null;
    status: boolean | null;
    admin_notes: string | null;
  };
  subscriptions: Array<{
    id: string;
    status: string | null;
    seats: number;
    current_period_end: string | null;
    plan_id: string | null;
    amount: number | null;
    currency: string;
    is_active: boolean;
    seats_used: number;
    seats_free: number;
    linked_players: Array<{ player_id: string; full_name: string | null; linked_at: string }>;
  }>;
  subscription_history: Array<{
    id: string;
    period_start: string;
    period_end: string | null;
    amount_paid: number | null;
    currency: string;
    status: string | null;
    seats: number;
  }>;
  players: Array<{
    id: string;
    full_name: string;
    status: boolean;
    birthday: string | null;
    created_at: string;
  }>;
  plans: Array<{ id: string; name: string; amount_cents: number; currency: string; active: boolean }>;
};

type TabId = 'general' | 'subscriptions' | 'players';

export default function UserDetailClient({ initial }: { initial: UserDetailPayload }) {
  const t = useT();
  const router = useRouter();
  const { showToast } = useToast();
  const [tab, setTab] = useState<TabId>('general');
  const canMutate = initial.can_mutate;

  const [email, setEmail] = useState(initial.user.email ?? '');
  const [fullName, setFullName] = useState(initial.user.full_name ?? '');
  const [locale, setLocale] = useState(initial.user.locale ?? '');
  const [role, setRole] = useState(initial.user.role ?? '');
  const [adminNotes, setAdminNotes] = useState(initial.user.admin_notes ?? '');
  const [statusActive, setStatusActive] = useState(initial.user.status !== false);
  const [savingGeneral, setSavingGeneral] = useState(false);

  const isBanned =
    initial.user.banned_until && new Date(initial.user.banned_until) > new Date();

  const tabs: { id: TabId; label: string }[] = useMemo(
    () => [
      { id: 'general', label: t('admin_user_tab_general') },
      { id: 'subscriptions', label: t('admin_user_tab_subscriptions') },
      { id: 'players', label: t('admin_user_tab_players') },
    ],
    [t],
  );

  async function saveGeneral() {
    if (!canMutate) return;
    setSavingGeneral(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${initial.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          full_name: fullName,
          locale: locale || null,
          role: role || null,
          status: statusActive,
          admin_notes: adminNotes,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: t('admin_user_saved'), variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: t('admin_user_save_error'), variant: 'destructive' });
    } finally {
      setSavingGeneral(false);
    }
  }

  async function toggleBan() {
    if (!canMutate) return;
    setSavingGeneral(true);
    try {
      const res = await fetch(`/api/admin/usuarios/${initial.user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ban: !isBanned }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({
        title: isBanned ? t('admin_user_unbanned') : t('admin_user_banned'),
        variant: 'success',
      });
      router.refresh();
    } catch {
      showToast({ title: t('admin_user_save_error'), variant: 'destructive' });
    } finally {
      setSavingGeneral(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Link
          href="/admin/usuarios"
          className="text-sm text-emerald-400 hover:text-emerald-300"
        >
          ← {t('admin_user_back_list')}
        </Link>
        <h1 className="text-2xl font-semibold text-slate-100">
          {initial.user.full_name || initial.user.email || initial.user.id}
        </h1>
        <p className="text-sm text-slate-400">{initial.user.email}</p>
      </header>

      {!canMutate && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          {t('admin_user_readonly_banner')}
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.id
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('admin_user_field_email')}>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!canMutate}
                className="border-slate-700 bg-slate-950/70 text-slate-100"
              />
            </Field>
            <Field label={t('admin_user_field_full_name')}>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={!canMutate}
                className="border-slate-700 bg-slate-950/70 text-slate-100"
              />
            </Field>
            <Field label={t('admin_user_field_username')}>
              <Input
                value={initial.user.username ?? '—'}
                disabled
                className="border-slate-700 bg-slate-950/50 text-slate-400"
              />
            </Field>
            <Field label={t('admin_user_field_locale')}>
              <Input
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                disabled={!canMutate}
                className="border-slate-700 bg-slate-950/70 text-slate-100"
              />
            </Field>
            <Field label={t('admin_user_field_role')}>
              <Input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                disabled={!canMutate}
                placeholder="Superadmin"
                className="border-slate-700 bg-slate-950/70 text-slate-100"
              />
            </Field>
            <Field label={t('admin_user_field_status')}>
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={statusActive}
                  onChange={(e) => setStatusActive(e.target.checked)}
                  disabled={!canMutate}
                />
                {t('admin_user_status_active')}
              </label>
            </Field>
          </div>

          <Field label={t('admin_user_field_admin_notes')}>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              disabled={!canMutate}
              rows={4}
              className="border-slate-700 bg-slate-950/70 text-slate-100"
            />
          </Field>

          <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-400 space-y-1">
            <p>
              {t('admin_user_auth_created')}:{' '}
              {new Date(initial.user.created_at).toLocaleString()}
            </p>
            <p>
              {t('admin_user_auth_last_sign_in')}:{' '}
              {initial.user.last_sign_in_at
                ? new Date(initial.user.last_sign_in_at).toLocaleString()
                : '—'}
            </p>
            <p>
              {t('admin_user_auth_confirmed')}:{' '}
              {initial.user.confirmed_at
                ? new Date(initial.user.confirmed_at).toLocaleString()
                : '—'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {canMutate && (
              <>
                <Button type="button" onClick={saveGeneral} disabled={savingGeneral}>
                  {savingGeneral ? t('admin_user_saving') : t('admin_user_save')}
                </Button>
                <Button
                  type="button"
                  variant={isBanned ? 'outline' : 'destructive'}
                  onClick={toggleBan}
                  disabled={savingGeneral}
                >
                  {isBanned ? t('admin_user_unban') : t('admin_user_ban')}
                </Button>
              </>
            )}
          </div>
        </section>
      )}

      {tab === 'subscriptions' && (
        <SubscriptionsTab data={initial} canMutate={canMutate} t={t} onRefresh={() => router.refresh()} />
      )}

      {tab === 'players' && (
        <PlayersTab userId={initial.user.id} players={initial.players} canMutate={canMutate} t={t} onRefresh={() => router.refresh()} />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-slate-300">{label}</Label>
      {children}
    </div>
  );
}

function SubscriptionsTab({
  data,
  canMutate,
  t,
  onRefresh,
}: {
  data: UserDetailPayload;
  canMutate: boolean;
  t: (key: string, vars?: Record<string, unknown>) => string;
  onRefresh: () => void;
}) {
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newSeats, setNewSeats] = useState('1');
  const [newEnd, setNewEnd] = useState('');
  const [newPlan, setNewPlan] = useState('');

  const activeSubs = data.subscriptions.filter((s) => isSubscriptionActive(s));

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">{t('admin_user_subs_active')}</h2>
        {activeSubs.length === 0 ? (
          <p className="text-sm text-slate-400">{t('admin_user_subs_none')}</p>
        ) : (
          activeSubs.map((sub) => (
            <SubscriptionEditor key={sub.id} sub={sub} plans={data.plans} canMutate={canMutate} userId={data.user.id} t={t} onRefresh={onRefresh} />
          ))
        )}

        {canMutate && activeSubs.length === 0 && (
          <div className="mt-4 space-y-3 rounded-xl border border-dashed border-slate-700 p-4">
            <p className="text-sm font-medium text-slate-200">{t('admin_user_subs_create')}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                type="number"
                min={1}
                value={newSeats}
                onChange={(e) => setNewSeats(e.target.value)}
                placeholder={t('admin_user_subs_seats')}
                className="border-slate-700 bg-slate-950/70"
              />
              <Input
                type="datetime-local"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
                className="border-slate-700 bg-slate-950/70"
              />
              <select
                value={newPlan}
                onChange={(e) => setNewPlan(e.target.value)}
                className="rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100"
              >
                <option value="">{t('admin_user_subs_plan_optional')}</option>
                {data.plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              disabled={creating}
              onClick={async () => {
                setCreating(true);
                try {
                  const res = await fetch(`/api/admin/usuarios/${data.user.id}/subscriptions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      seats: Number(newSeats),
                      status: 'active',
                      plan_id: newPlan || null,
                      current_period_end: newEnd ? new Date(newEnd).toISOString() : null,
                    }),
                  });
                  if (!res.ok) throw new Error(await res.text());
                  showToast({ title: t('admin_user_subs_created'), variant: 'success' });
                  onRefresh();
                } catch {
                  showToast({ title: t('admin_user_save_error'), variant: 'destructive' });
                } finally {
                  setCreating(false);
                }
              }}
            >
              {t('admin_user_subs_create_btn')}
            </Button>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="text-lg font-semibold text-slate-100">{t('admin_user_subs_history')}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className="px-2 py-2">{t('admin_user_hist_start')}</th>
                <th className="px-2 py-2">{t('admin_user_hist_end')}</th>
                <th className="px-2 py-2">{t('admin_user_hist_amount')}</th>
                <th className="px-2 py-2">{t('admin_user_hist_status')}</th>
                <th className="px-2 py-2">{t('admin_user_subs_seats')}</th>
              </tr>
            </thead>
            <tbody>
              {data.subscription_history.map((row) => (
                <tr key={row.id} className="border-b border-slate-900/80 text-slate-200">
                  <td className="px-2 py-2">{new Date(row.period_start).toLocaleDateString()}</td>
                  <td className="px-2 py-2">
                    {row.period_end ? new Date(row.period_end).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-2 py-2">
                    {row.amount_paid != null
                      ? `${(row.amount_paid / 100).toFixed(2)} ${row.currency}`
                      : '—'}
                  </td>
                  <td className="px-2 py-2">{row.status ?? '—'}</td>
                  <td className="px-2 py-2">{row.seats}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SubscriptionEditor({
  sub,
  plans,
  canMutate,
  userId,
  t,
  onRefresh,
}: {
  sub: UserDetailPayload['subscriptions'][0];
  plans: UserDetailPayload['plans'];
  canMutate: boolean;
  userId: string;
  t: (key: string, vars?: Record<string, unknown>) => string;
  onRefresh: () => void;
}) {
  const { showToast } = useToast();
  const [seats, setSeats] = useState(String(sub.seats));
  const [periodEnd, setPeriodEnd] = useState(
    sub.current_period_end ? sub.current_period_end.slice(0, 16) : '',
  );
  const [status, setStatus] = useState(sub.status ?? 'active');
  const [planId, setPlanId] = useState(sub.plan_id ?? '');
  const [unlinkIds, setUnlinkIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const seatsNum = Number(seats);
  const needsUnlink =
    Number.isFinite(seatsNum) && seatsNum < sub.seats && sub.linked_players.length > 0;

  function toggleUnlink(playerId: string) {
    setUnlinkIds((prev) =>
      prev.includes(playerId) ? prev.filter((x) => x !== playerId) : [...prev, playerId],
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <p className="text-xs text-slate-500">ID: {sub.id}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-slate-300">
          {t('admin_user_subs_seats')}
          <Input
            type="number"
            min={0}
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            disabled={!canMutate}
            className="mt-1 border-slate-700 bg-slate-950/70"
          />
        </label>
        <label className="text-sm text-slate-300">
          {t('admin_user_hist_end')}
          <Input
            type="datetime-local"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            disabled={!canMutate}
            className="mt-1 border-slate-700 bg-slate-950/70"
          />
        </label>
        <label className="text-sm text-slate-300">
          {t('admin_user_hist_status')}
          <Input
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={!canMutate}
            className="mt-1 border-slate-700 bg-slate-950/70"
          />
        </label>
        <label className="text-sm text-slate-300">
          Plan
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            disabled={!canMutate}
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-xs text-slate-400">
        {t('admin_user_subs_usage', { used: sub.seats_used, free: sub.seats_free })}
      </p>

      {sub.linked_players.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-slate-300">{t('admin_user_subs_linked_players')}</p>
          <ul className="space-y-1 text-sm">
            {sub.linked_players.map((lp) => (
              <li key={lp.player_id} className="flex items-center gap-2 text-slate-200">
                {canMutate && needsUnlink && (
                  <input
                    type="checkbox"
                    checked={unlinkIds.includes(lp.player_id)}
                    onChange={() => toggleUnlink(lp.player_id)}
                  />
                )}
                {lp.full_name ?? lp.player_id}
              </li>
            ))}
          </ul>
          {canMutate && needsUnlink && (
            <p className="text-xs text-amber-300">{t('admin_user_subs_unlink_hint')}</p>
          )}
        </div>
      )}

      {canMutate && (
        <Button
          type="button"
          size="sm"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const res = await fetch(`/api/admin/usuarios/${userId}/subscriptions`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  subscription_id: sub.id,
                  seats: Number(seats),
                  status,
                  plan_id: planId || null,
                  current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
                  unlink_player_ids: unlinkIds,
                }),
              });
              if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message ?? res.statusText);
              }
              showToast({ title: t('admin_user_saved'), variant: 'success' });
              onRefresh();
            } catch (e) {
              showToast({
                title: e instanceof Error ? e.message : t('admin_user_save_error'),
                variant: 'destructive',
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          {t('admin_user_save')}
        </Button>
      )}
    </div>
  );
}

function PlayersTab({
  userId,
  players,
  canMutate,
  t,
  onRefresh,
}: {
  userId: string;
  players: UserDetailPayload['players'];
  canMutate: boolean;
  t: (key: string, vars?: Record<string, unknown>) => string;
  onRefresh: () => void;
}) {
  const { showToast } = useToast();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <h2 className="text-lg font-semibold text-slate-100">{t('admin_user_tab_players')}</h2>
      {players.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">{t('admin_user_players_empty')}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-slate-400">
                <th className="px-2 py-2">{t('admin_user_field_full_name')}</th>
                <th className="px-2 py-2">{t('admin_user_field_status')}</th>
                <th className="px-2 py-2">Alta</th>
                {canMutate && <th className="px-2 py-2" />}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => (
                <tr key={p.id} className="border-b border-slate-900/80 text-slate-200">
                  <td className="px-2 py-2">{p.full_name}</td>
                  <td className="px-2 py-2">{p.status ? t('admin_user_status_active') : '—'}</td>
                  <td className="px-2 py-2">{new Date(p.created_at).toLocaleDateString()}</td>
                  {canMutate && (
                    <td className="px-2 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => setConfirmId(p.id)}
                      >
                        {t('admin_user_player_delete')}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmId}
        onOpenChange={(open) => !open && setConfirmId(null)}
        title={t('admin_user_player_delete')}
        description={t('admin_user_player_delete_confirm')}
        loading={deleting}
        onConfirm={async () => {
          if (!confirmId) return;
          setDeleting(true);
          try {
            const res = await fetch(`/api/admin/usuarios/${userId}/players`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: confirmId }),
            });
            if (!res.ok) throw new Error(await res.text());
            showToast({ title: t('admin_user_player_deleted'), variant: 'success' });
            onRefresh();
          } catch {
            showToast({ title: t('admin_user_save_error'), variant: 'destructive' });
          } finally {
            setDeleting(false);
            setConfirmId(null);
          }
        }}
      />
    </section>
  );
}
