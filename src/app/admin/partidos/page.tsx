import { getSupabaseAdmin } from '@/lib/supabase/admin';
import MatchesTable from '@/components/admin/partidos/MatchesTable';
import type { AdminMatch } from '@/components/admin/partidos/MatchesTable';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Partidos — Admin' };

export default async function AdminPartidosPage() {
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from('matches')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);

  const matches: AdminMatch[] = data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Partidos</h1>
        <p className="mt-1 text-sm text-slate-400">
          {matches.length} partidos{matches.length === 500 ? ' (límite 500, usa filtros para más)' : ' registrados'}
        </p>
      </div>
      <MatchesTable matches={matches} />
    </div>
  );
}
