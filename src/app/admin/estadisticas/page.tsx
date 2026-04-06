import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Estadísticas — Admin' };

async function getStats() {
  const supabase = getSupabaseAdmin();

  const [
    { count: totalUsers },
    { count: totalPlayers },
    { count: totalMatches },
    { count: totalCompetitions },
    { count: activeSubs },
    { count: expiredSubs },
    { count: cancelledSubs },
    { count: totalMedia },
    { data: subsData },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('players').select('*', { count: 'exact', head: true }),
    supabase.from('matches').select('*', { count: 'exact', head: true }),
    supabase.from('competitions').select('*', { count: 'exact', head: true }),
    supabase.from('storage_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('storage_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'expired'),
    supabase.from('storage_subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'cancelled'),
    supabase.from('match_media').select('*', { count: 'exact', head: true }),
    supabase.from('storage_subscriptions').select('amount_cents, currency').eq('status', 'active'),
  ]);

  const totalRevenueCents = (subsData ?? []).reduce((sum, s) => sum + (s.amount_cents ?? 0), 0);
  const totalRevenueEur = totalRevenueCents / 100;

  return {
    totalUsers,
    totalPlayers,
    totalMatches,
    totalCompetitions,
    activeSubs,
    expiredSubs,
    cancelledSubs,
    totalMedia,
    totalRevenueEur,
  };
}

export default async function AdminEstadisticasPage() {
  const stats = await getStats();

  const kpis = [
    { label: 'Usuarios registrados', value: stats.totalUsers ?? 0, color: 'text-blue-400' },
    { label: 'Jugadores', value: stats.totalPlayers ?? 0, color: 'text-emerald-400' },
    { label: 'Partidos', value: stats.totalMatches ?? 0, color: 'text-violet-400' },
    { label: 'Competiciones', value: stats.totalCompetitions ?? 0, color: 'text-amber-400' },
    { label: 'Archivos multimedia', value: stats.totalMedia ?? 0, color: 'text-pink-400' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Estadísticas</h1>
        <p className="mt-1 text-sm text-slate-400">Métricas de uso de la plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map(({ label, value, color }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-slate-400">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString('es-ES')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suscripciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Activas', value: stats.activeSubs ?? 0, color: 'bg-emerald-500' },
              { label: 'Expiradas', value: stats.expiredSubs ?? 0, color: 'bg-amber-500' },
              { label: 'Canceladas', value: stats.cancelledSubs ?? 0, color: 'bg-red-500' },
            ].map(({ label, value, color }) => {
              const total = (stats.activeSubs ?? 0) + (stats.expiredSubs ?? 0) + (stats.cancelledSubs ?? 0);
              const pct = total > 0 ? Math.round((value / total) * 100) : 0;
              return (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-slate-300">{label}</span>
                    <span className="text-slate-400">{value} ({pct}%)</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800">
                    <div
                      className={`h-2 rounded-full ${color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ingresos (subs. activas)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-emerald-400">
              {stats.totalRevenueEur.toLocaleString('es-ES', {
                style: 'currency',
                currency: 'EUR',
              })}
            </p>
            <p className="mt-2 text-xs text-slate-500">Suma del importe de todas las suscripciones activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ratio jugadores/usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-violet-400">
              {stats.totalUsers
                ? ((stats.totalPlayers ?? 0) / stats.totalUsers).toFixed(1)
                : '—'}
            </p>
            <p className="mt-2 text-xs text-slate-500">Promedio de jugadores por usuario registrado</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
