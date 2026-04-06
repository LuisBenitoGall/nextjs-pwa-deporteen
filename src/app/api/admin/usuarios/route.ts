import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/adminGuard';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET — lista todos los usuarios (auth + profiles)
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();

  // Listar usuarios desde auth.admin
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  });
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  // Perfiles para enriquecer
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username, full_name, avatar_url');

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const users = authData.users.map((u) => {
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed_at: u.confirmed_at,
      banned_until: u.banned_until,
      username: profile?.username ?? null,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  });

  return NextResponse.json({ users });
}

// PATCH — actualizar perfil de un usuario
export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await req.json();
  const { id, full_name, username, email, ban } = body;

  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const updates: Record<string, unknown> = {};

  if (email !== undefined) {
    const { error } = await supabase.auth.admin.updateUserById(id, { email });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (ban !== undefined) {
    const { error } = await supabase.auth.admin.updateUserById(id, {
      ban_duration: ban ? '87600h' : 'none',
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (full_name !== undefined) updates.full_name = full_name;
  if (username !== undefined) updates.username = username;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — eliminar usuario permanentemente
export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
