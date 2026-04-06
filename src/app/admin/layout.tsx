import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/roles';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const metadata = {
  title: 'Administración — DeporTeen',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await getServerUser();
  if (!user) {
    redirect('/login?next=/admin');
  }

  if (!isAdminUser(user)) {
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold text-red-500">Acceso restringido</h1>
        <p className="mt-4 text-sm text-slate-400">
          Tu cuenta no tiene permisos de administración.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          Volver al inicio
        </Link>
      </section>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
