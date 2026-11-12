import { notFound } from 'next/navigation';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseServerClientReadOnly, getServerUser } from '@/lib/supabase/server';
import { userCanAccessAdminPanel, userIsSuperadminInDb } from '@/lib/auth/adminAccess';
import { loadUserAdminDetail } from '@/lib/admin/userAdminDetail';
import UserDetailClient from '@/components/admin/usuarios/UserDetailClient';

type PageProps = { params: Promise<{ userId: string }> };

export const dynamic = 'force-dynamic';

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const { user } = await getServerUser();
  if (!user) notFound();

  const sessionClient = await createSupabaseServerClientReadOnly();
  const allowed = await userCanAccessAdminPanel(sessionClient, user);
  if (!allowed) notFound();

  const canMutate = await userIsSuperadminInDb(sessionClient, user.id);
  const supabase = getSupabaseAdmin();
  const detail = await loadUserAdminDetail(supabase, userId, canMutate);
  if (!detail) notFound();

  return <UserDetailClient initial={detail} />;
}
