import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClientReadOnly, getServerUser } from '@/lib/supabase/server';
import { userCanAccessAdminPanel } from '@/lib/auth/adminAccess';
import AdminSidebar from '@/components/admin/AdminSidebar';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Administración — DeporTeen',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await getServerUser();
  if (!user) {
    redirect('/login?next=/admin');
  }

  const supabase = await createSupabaseServerClientReadOnly();
  const allowed = await userCanAccessAdminPanel(supabase, user);
  if (!allowed) {
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
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-slate-950 text-slate-100 lg:flex-row">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-3 backdrop-blur lg:px-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">DeporTeen</p>
            <p className="text-sm font-semibold text-slate-100">Entorno Admin</p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 transition-colors hover:border-slate-600 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Frontend
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
