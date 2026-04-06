import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import ReportDownloadButton from '@/components/admin/reportes/ReportDownloadButton';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Reportes — Admin' };

async function getSummary() {
  const supabase = getSupabaseAdmin();
  const [
    { data: users },
    { data: subs },
  ] = await Promise.all([
    supabase.from('profiles').select('id, username, full_name').limit(5).order('id', { ascending: false }),
    supabase
      .from('storage_subscriptions')
      .select('status, gb_amount, amount_cents, currency, current_period_end, user_id')
      .eq('status', 'active')
      .order('current_period_end', { ascending: true })
      .limit(5),
  ]);
  return { recentUsers: users ?? [], expiringSubs: subs ?? [] };
}

export default async function AdminReportesPage() {
  const { recentUsers, expiringSubs } = await getSummary();

  const reports = [
    {
      id: 'usuarios',
      title: 'Exportar usuarios',
      description: 'CSV con todos los usuarios registrados (email, nombre, fecha de alta)',
      endpoint: '/api/admin/reportes/usuarios',
    },
    {
      id: 'suscripciones',
      title: 'Exportar suscripciones',
      description: 'CSV con todas las suscripciones (estado, plan, vencimiento, usuario)',
      endpoint: '/api/admin/reportes/suscripciones',
    },
    {
      id: 'jugadores',
      title: 'Exportar jugadores',
      description: 'CSV con todos los jugadores y su propietario',
      endpoint: '/api/admin/reportes/jugadores',
    },
    {
      id: 'partidos',
      title: 'Exportar partidos',
      description: 'CSV con todos los partidos (rival, resultado, fecha, lugar)',
      endpoint: '/api/admin/reportes/partidos',
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Reportes</h1>
        <p className="mt-1 text-sm text-slate-400">Exporta datos de la plataforma en formato CSV</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.id}>
            <CardHeader>
              <CardTitle className="text-base">{r.title}</CardTitle>
              <CardDescription>{r.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ReportDownloadButton endpoint={r.endpoint} label="Descargar CSV" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Últimos usuarios registrados</CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <p className="text-sm text-slate-500">Sin datos</p>
            ) : (
              <ul className="space-y-2">
                {recentUsers.map((u) => (
                  <li key={u.id} className="text-sm text-slate-300">
                    <span className="font-medium">{u.full_name || '—'}</span>
                    <span className="ml-1 text-xs text-slate-500">@{u.username || 'sin usuario'}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Suscripciones próximas a vencer</CardTitle>
          </CardHeader>
          <CardContent>
            {expiringSubs.length === 0 ? (
              <p className="text-sm text-slate-500">Sin datos</p>
            ) : (
              <ul className="space-y-2">
                {expiringSubs.map((s) => (
                  <li key={s.user_id} className="flex justify-between text-sm">
                    <span className="text-slate-400 font-mono text-xs">{s.user_id.slice(0, 8)}…</span>
                    <span className="text-amber-400 text-xs">
                      {new Date(s.current_period_end).toLocaleDateString('es-ES')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
