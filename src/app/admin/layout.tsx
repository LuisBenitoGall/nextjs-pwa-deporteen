import { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerUser } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/roles';
import { tServer } from '@/i18n/server';

export const metadata = {
  title: 'Administración Stripe',
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { user } = await getServerUser();
  if (!user) {
    redirect('/login?next=/admin/stripe');
  }

  if (!isAdminUser(user)) {
    const { t } = await tServer(user.user_metadata?.locale || undefined);
    return (
      <section className="mx-auto flex min-h-[50vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
        <h1 className="text-2xl font-semibold text-red-600">
          {t('admin_access_denied_title') || 'Acceso restringido'}
        </h1>
        <p className="mt-4 text-sm text-slate-600">
          {t('admin_access_denied_message') || 'Tu cuenta no tiene permisos de administración. Contacta con el responsable del proyecto si crees que es un error.'}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          {t('admin_access_denied_link') || 'Volver al inicio'}
        </Link>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      {children}
    </div>
  );
}
