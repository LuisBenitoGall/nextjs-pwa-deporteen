import Link from 'next/link';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, Trophy, User, Medal, BarChart3 } from 'lucide-react';
import { detectAdminSubscriptionsSource } from '@/lib/admin/subscriptionsAdminSource';

export const dynamic = 'force-dynamic';

async function getStats() {
  const supabase = getSupabaseAdmin();
  const source = await detectAdminSubscriptionsSource(supabase);
  const [
    { count: usersCount },
    { count: playersCount },
    { count: matchesCount },
    { count: competitionsCount },
    { count: activeSubsCount },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('competitions').select('*', { count: 'exact', head: true }),
    source === 'storage'
      ? supabase
          .from('storage_subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active')
      : supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),
  ]);
  return { usersCount, playersCount, matchesCount, competitionsCount, activeSubsCount };
}

const cards = [
  { label: 'Usuarios', icon: Users, href: '/admin/usuarios', key: 'usersCount' },
  { label: 'Suscripciones activas', icon: CreditCard, href: '/admin/suscripciones', key: 'activeSubsCount' },
  { label: 'Partidos', icon: Trophy, href: '/admin/partidos', key: 'matchesCount' },
  { label: 'Jugadores', icon: User, href: '/admin/jugadores', key: 'playersCount' },
  { label: 'Competiciones', icon: Medal, href: '/admin/competiciones', key: 'competitionsCount' },
];

export default async function AdminDashboardPage() {
  const stats = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Panel de administración</h1>
        <p className="mt-1 text-sm text-slate-400">Resumen general de la plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map(({ label, icon: Icon, href, key }) => (
          <Link key={key} href={href}>
            <Card className="cursor-pointer transition-colors hover:border-slate-600">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{label}</CardTitle>
                <Icon className="h-4 w-4 text-emerald-400" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-100">
                  {stats[key as keyof typeof stats] ?? '—'}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { href: '/admin/estadisticas', label: 'Estadísticas', desc: 'Análisis y métricas de uso', icon: BarChart3 },
          { href: '/admin/reportes', label: 'Reportes', desc: 'Exportar datos y generar informes', icon: BarChart3 },
          { href: '/admin/configuracion', label: 'Configuración', desc: 'Planes de almacenamiento y ajustes', icon: BarChart3 },
        ].map(({ href, label, desc, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer transition-colors hover:border-slate-600">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-emerald-400" />
                  <CardTitle className="text-base">{label}</CardTitle>
                </div>
                <p className="text-sm text-slate-400">{desc}</p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
