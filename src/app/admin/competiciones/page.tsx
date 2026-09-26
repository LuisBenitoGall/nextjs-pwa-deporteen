import { getSupabaseAdmin } from '@/lib/supabase/admin';
import CompetitionsTable from '@/components/admin/competiciones/CompetitionsTable';
import type { AdminCompetition } from '@/components/admin/competiciones/CompetitionsTable';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Competiciones — Admin' };

export default async function AdminCompeticionesPage() {
  const supabase = getSupabaseAdmin();

  const { data: compsData, error: compsErr } = await supabase
    .from('competitions')
    .select('*')
    .order('id', { ascending: false });

  if (compsErr) {
    return (
      <div className="space-y-4 rounded-xl border border-red-800/40 bg-red-950/30 p-6">
        <h1 className="text-xl font-bold text-red-100">Competiciones</h1>
        <p className="text-sm text-red-200">
          No se pudieron cargar las competiciones. {compsErr.message}
        </p>
      </div>
    );
  }

  const playerIds = [...new Set(compsData?.map((c) => c.player_id) ?? [])];
  const { data: players } = playerIds.length
    ? await supabase.from('players').select('id, full_name, user_id').in('id', playerIds)
    : { data: [] };

  const playerMap = new Map(players?.map((p) => [p.id, p]) ?? []);

  const competitions: AdminCompetition[] = (compsData ?? []).map((c) => ({
    ...c,
    player: playerMap.get(c.player_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Competiciones</h1>
        <p className="mt-1 text-sm text-slate-400">{competitions.length} competiciones registradas</p>
      </div>
      <CompetitionsTable competitions={competitions} />
    </div>
  );
}
