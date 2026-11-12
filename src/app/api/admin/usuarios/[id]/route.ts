import { NextResponse } from 'next/server';
import { requireAdmin, requireSuperadmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClientReadOnly } from '@/lib/supabase/server';
import { userIsSuperadminInDb } from '@/lib/auth/adminAccess';
import { loadUserAdminDetail } from '@/lib/admin/userAdminDetail';

type RouteContext = { params: Promise<{ id: string }> };

function splitFullName(fullName: string): { name: string; surname: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { name: '', surname: '' };
  if (parts.length === 1) return { name: parts[0], surname: '' };
  return { name: parts[0], surname: parts.slice(1).join(' ') };
}

export async function GET(_req: Request, context: RouteContext) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id: userId } = await context.params;
  const supabase = getSupabaseAdmin();
  const sessionClient = await createSupabaseServerClientReadOnly();
  const canMutate = await userIsSuperadminInDb(sessionClient, guard.user.id);

  const detail = await loadUserAdminDetail(supabase, userId, canMutate);
  if (!detail) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  return NextResponse.json(detail);
}

export async function PATCH(req: Request, context: RouteContext) {
  const guard = await requireSuperadmin();
  if (!guard.ok) return guard.response;

  const { id: userId } = await context.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const {
    email,
    full_name,
    ban,
    locale,
    role,
    status,
    admin_notes,
  } = body as Record<string, unknown>;

  if (email !== undefined && typeof email === 'string') {
    const { error } = await supabase.auth.admin.updateUserById(userId, { email });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (ban !== undefined) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      ban_duration: ban ? '87600h' : 'none',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof full_name === 'string') {
    const { name, surname } = splitFullName(full_name);
    updates.name = name;
    updates.surname = surname;
  }
  if (locale !== undefined) updates.locale = locale;
  if (role !== undefined) updates.role = role;
  if (status !== undefined) updates.status = status;
  if (admin_notes !== undefined) updates.admin_notes = admin_notes;

  if (Object.keys(updates).length > 1) {
    const { error } = await supabase.from('users').update(updates).eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
