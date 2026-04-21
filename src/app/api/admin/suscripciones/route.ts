import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import {
  isStorageSubscriptionStatus,
  parseIsoDateStrict,
} from '@/lib/admin/storageSubscriptions';

function jsonError(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
) {
  return NextResponse.json({ error: message, code, message, details }, { status });
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('storage_subscriptions')
    .select(`
      *,
      plan:storage_plans(id, name, gb_amount, amount_cents, currency)
    `)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with profile info
  const userIds = [...new Set(data?.map((s) => s.user_id) ?? [])];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const subscriptions = (data ?? []).map((s) => ({
    ...s,
    profile: profileMap.get(s.user_id) ?? null,
  }));

  return NextResponse.json({ subscriptions });
}

export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return jsonError(400, 'invalid_payload', 'Payload inválido', { expected: 'object' });
  }

  const allowedFields = new Set(['id', 'status', 'current_period_end', 'gb_amount', 'plan_id']);
  const unknownFields = Object.keys(body).filter((key) => !allowedFields.has(key));
  if (unknownFields.length > 0) {
    return jsonError(400, 'invalid_fields', 'Se enviaron campos no permitidos', {
      fields: unknownFields,
    });
  }

  const id = typeof (body as any).id === 'string' ? (body as any).id.trim() : '';
  if (!id) return jsonError(400, 'missing_id', 'id requerido');

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let hasAnyEditableField = false;

  if ((body as any).status !== undefined) {
    const status = (body as any).status;
    if (!isStorageSubscriptionStatus(status)) {
      return jsonError(400, 'invalid_status', 'Estado inválido', { allowed: ['active', 'expired', 'cancelled'] });
    }
    update.status = status;
    hasAnyEditableField = true;
  }

  if ((body as any).current_period_end !== undefined) {
    const parsedIso = parseIsoDateStrict((body as any).current_period_end);
    if (!parsedIso) {
      return jsonError(400, 'invalid_current_period_end', 'Formato de fecha fin inválido', {
        expected: 'ISO date string',
      });
    }
    update.current_period_end = parsedIso;
    hasAnyEditableField = true;
  }

  if ((body as any).gb_amount !== undefined) {
    const gbAmount = Number((body as any).gb_amount);
    if (!Number.isFinite(gbAmount) || gbAmount < 0) {
      return jsonError(400, 'invalid_gb_amount', 'gb_amount debe ser un número mayor o igual que 0');
    }
    update.gb_amount = gbAmount;
    hasAnyEditableField = true;
  }

  if ((body as any).plan_id !== undefined) {
    const planId = (body as any).plan_id;
    if (planId !== null && typeof planId !== 'string') {
      return jsonError(400, 'invalid_plan_id', 'plan_id debe ser string o null');
    }
    hasAnyEditableField = true;
    update.plan_id = planId;
  }

  if (!hasAnyEditableField) {
    return jsonError(400, 'empty_update', 'No se recibieron campos editables para actualizar');
  }

  const supabase = getSupabaseAdmin();

  if ((body as any).plan_id !== undefined && (body as any).plan_id !== null) {
    const { data: plan, error: planError } = await supabase
      .from('storage_plans')
      .select('id, gb_amount')
      .eq('id', (body as any).plan_id)
      .maybeSingle();
    if (planError || !plan) {
      return jsonError(400, 'plan_not_found', 'El plan indicado no existe');
    }
    if ((body as any).gb_amount !== undefined && Number((body as any).gb_amount) !== plan.gb_amount) {
      return jsonError(
        400,
        'plan_gb_mismatch',
        'gb_amount no coincide con el almacenamiento definido para el plan',
        { expectedGbAmount: plan.gb_amount }
      );
    }
    if ((body as any).gb_amount === undefined) {
      update.gb_amount = plan.gb_amount;
    }
  }

  const { data, error } = await supabase
    .from('storage_subscriptions')
    .update(update)
    .eq('id', id)
    .select('id, status, current_period_end, plan_id, gb_amount, updated_at')
    .maybeSingle();

  if (error) {
    return jsonError(400, 'update_failed', 'No se pudo actualizar la suscripción', {
      reason: error.message,
    });
  }
  if (!data) {
    return jsonError(404, 'subscription_not_found', 'Suscripción no encontrada');
  }
  return NextResponse.json({ ok: true, subscription: data });
}

export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id.trim() : '';
  if (!id) return jsonError(400, 'missing_id', 'id requerido');

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('storage_subscriptions')
    .delete()
    .eq('id', id);

  if (error) return jsonError(400, 'delete_failed', 'No se pudo eliminar la suscripción', { reason: error.message });
  return NextResponse.json({ ok: true });
}
