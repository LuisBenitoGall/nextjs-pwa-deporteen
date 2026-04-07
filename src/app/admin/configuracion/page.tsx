import { getSupabaseAdmin } from '@/lib/supabase/admin';
import StoragePlansTable from '@/components/admin/configuracion/StoragePlansTable';
import type { StoragePlan } from '@/components/admin/configuracion/StoragePlansTable';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Configuración — Admin' };

export default async function AdminConfiguracionPage() {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('storage_plans')
    .select('*')
    .order('gb_amount', { ascending: true });

  const plans: StoragePlan[] = data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Configuración</h1>
        <p className="mt-1 text-sm text-slate-400">Gestiona los planes de almacenamiento disponibles</p>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-slate-200">Planes de almacenamiento</h2>
        <StoragePlansTable plans={plans} />
      </div>
    </div>
  );
}
