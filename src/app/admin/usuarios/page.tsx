import { getSupabaseAdmin } from '@/lib/supabase/admin';
import UsersTable from '@/components/admin/usuarios/UsersTable';
import type { AdminUser } from '@/components/admin/usuarios/UsersTable';
import { fetchAllLegacyProfiles, legacyProfileMap } from '@/lib/admin/appUsers';
import { createSupabaseServerClientReadOnly, getServerUser } from '@/lib/supabase/server';
import { userIsSuperadminInDb } from '@/lib/auth/adminAccess';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Usuarios — Admin' };

export default async function AdminUsuariosPage() {
  const { user } = await getServerUser();
  const sessionClient = await createSupabaseServerClientReadOnly();
  const canMutate = user ? await userIsSuperadminInDb(sessionClient, user.id) : false;

  const supabase = getSupabaseAdmin();

  const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const profiles = await fetchAllLegacyProfiles(supabase);
  const profileMap = legacyProfileMap(profiles);

  const users: AdminUser[] = (authData?.users ?? []).map((u) => {
    const profile = profileMap.get(u.id);
    return {
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      confirmed_at: u.confirmed_at ?? null,
      banned_until: u.banned_until ?? null,
      username: profile?.username ?? null,
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Usuarios</h1>
        <p className="mt-1 text-sm text-slate-400">
          {users.length} usuarios registrados en la plataforma
        </p>
      </div>
      <UsersTable users={users} canMutate={canMutate} />
    </div>
  );
}
