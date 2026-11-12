import { NextResponse } from 'next/server';
import { requireSuperadmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { parseIsoDateStrict } from '@/lib/admin/storageSubscriptions';
import { validateSeatReduction } from '@/lib/admin/seatReduction';
import { writeAdminAuditLog } from '@/lib/admin/adminAuditLog';
import { isLegacySubscriptionStatus } from '@/lib/admin/legacySubscriptionStatuses';

type RouteContext = { params: Promise<{ id: string }> };

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json({ error: message, code, message }, { status });
}

export async function POST(req: Request, context: RouteContext) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { id: userId } = await context.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonError(400, 'invalid_payload', 'Payload inválido');
  }

  const seats = Number((body as any).seats);
  if (!Number.isFinite(seats) || seats < 1) {
    return jsonError(400, 'invalid_seats', 'seats debe ser un entero >= 1');
  }

  const statusRaw = (body as any).status;
  const status = typeof statusRaw === 'string' ? statusRaw : 'active';
  if (!isLegacySubscriptionStatus(status)) {
    return jsonError(400, 'invalid_status', 'Estado de suscripción inválido');
  }

  const periodEndRaw = (body as any).current_period_end;
  const periodEnd = periodEndRaw ? parseIsoDateStrict(periodEndRaw) : null;
  if (periodEndRaw && !periodEnd) {
    return jsonError(400, 'invalid_current_period_end', 'Fecha de fin inválida');
  }

  const planId = (body as any).plan_id;
  const supabase = getSupabaseAdmin();

  if (planId) {
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('id', planId)
      .maybeSingle();
    if (!plan) return jsonError(400, 'plan_not_found', 'Plan no encontrado');
  }

  const insert = {
    user_id: userId,
    seats: Math.floor(seats),
    status,
    plan_id: planId ?? null,
    current_period_end: periodEnd,
    currency: 'EUR',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('subscriptions').insert(insert).select('*').maybeSingle();
  if (error || !data) {
    return jsonError(400, 'create_failed', error?.message ?? 'No se pudo crear la suscripción');
  }

  await writeAdminAuditLog(supabase, {
    actor_user_id: guard.user.id,
    target_user_id: userId,
    action: 'subscription_create',
    payload: { subscription_id: data.id, seats: data.seats, status: data.status },
  });

  return NextResponse.json({ ok: true, subscription: data });
}

export async function PATCH(req: Request, context: RouteContext) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { id: userId } = await context.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return jsonError(400, 'invalid_payload', 'Payload inválido');
  }

  const subscriptionId = typeof (body as any).subscription_id === 'string' ? (body as any).subscription_id : '';
  if (!subscriptionId) return jsonError(400, 'missing_subscription_id', 'subscription_id requerido');

  const supabase = getSupabaseAdmin();
  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .select('id, user_id, seats, status, current_period_end, plan_id')
    .eq('id', subscriptionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (subError || !sub) {
    return jsonError(404, 'subscription_not_found', 'Suscripción no encontrada para este usuario');
  }

  const { data: activeLinks } = await supabase
    .from('subscription_players')
    .select('player_id')
    .eq('subscription_id', subscriptionId)
    .is('unlinked_at', null);

  const linkedPlayerIds = (activeLinks ?? []).map((r) => r.player_id);
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const auditPayload: Record<string, unknown> = { subscription_id: subscriptionId, before: { ...sub } };

  let unlinkPlayerIds: string[] = [];
  if (Array.isArray((body as any).unlink_player_ids)) {
    unlinkPlayerIds = (body as any).unlink_player_ids.filter((x: unknown) => typeof x === 'string');
  }

  if ((body as any).seats !== undefined) {
    const newSeats = Math.floor(Number((body as any).seats));
    if (!Number.isFinite(newSeats) || newSeats < 0) {
      return jsonError(400, 'invalid_seats', 'seats inválido');
    }
    const validation = validateSeatReduction({
      currentSeats: Number(sub.seats),
      newSeats,
      linkedPlayerIds,
      unlinkPlayerIds,
    });
    if (!validation.ok) {
      return jsonError(400, validation.code, validation.message);
    }
    update.seats = newSeats;
    auditPayload.seats = { from: sub.seats, to: newSeats, unlink_player_ids: unlinkPlayerIds };
  }

  if ((body as any).current_period_end !== undefined) {
    const parsed = parseIsoDateStrict((body as any).current_period_end);
    if (!parsed) return jsonError(400, 'invalid_current_period_end', 'Fecha de fin inválida');
    update.current_period_end = parsed;
    auditPayload.current_period_end = { from: sub.current_period_end, to: parsed };
  }

  if ((body as any).status !== undefined) {
    if (!isLegacySubscriptionStatus((body as any).status)) {
      return jsonError(400, 'invalid_status', 'Estado inválido');
    }
    update.status = (body as any).status;
    auditPayload.status = { from: sub.status, to: (body as any).status };
  }

  if ((body as any).plan_id !== undefined) {
    const planId = (body as any).plan_id;
    if (planId !== null) {
      const { data: plan } = await supabase.from('subscription_plans').select('id').eq('id', planId).maybeSingle();
      if (!plan) return jsonError(400, 'plan_not_found', 'Plan no encontrado');
    }
    update.plan_id = planId;
    auditPayload.plan_id = { from: sub.plan_id, to: planId };
  }

  if (unlinkPlayerIds.length > 0) {
    const now = new Date().toISOString();
    const { error: unlinkError } = await supabase
      .from('subscription_players')
      .update({ unlinked_at: now })
      .eq('subscription_id', subscriptionId)
      .in('player_id', unlinkPlayerIds)
      .is('unlinked_at', null);
    if (unlinkError) {
      return jsonError(400, 'unlink_failed', unlinkError.message);
    }
  }

  if (Object.keys(update).length <= 1 && unlinkPlayerIds.length === 0) {
    return jsonError(400, 'empty_update', 'Sin cambios');
  }

  const { data: updated, error: updError } = await supabase
    .from('subscriptions')
    .update(update)
    .eq('id', subscriptionId)
    .select('id, seats, status, current_period_end, plan_id, updated_at')
    .maybeSingle();

  if (updError || !updated) {
    return jsonError(400, 'update_failed', updError?.message ?? 'Actualización fallida');
  }

  await writeAdminAuditLog(supabase, {
    actor_user_id: guard.user.id,
    target_user_id: userId,
    action: 'subscription_patch',
    payload: auditPayload,
  });

  return NextResponse.json({ ok: true, subscription: updated });
}
