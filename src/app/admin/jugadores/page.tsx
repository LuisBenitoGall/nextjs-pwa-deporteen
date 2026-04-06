import { getSupabaseAdmin } from '@/lib/supabase/admin';
import PlayersTable from '@/components/admin/jugadores/PlayersTable';
import type { AdminPlayer } from '@/components/admin/jugadores/PlayersTable';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Jugadores — Admin' };

export default async function AdminJugadoresPage() {
  const supabase = getSupabaseAdmin();

  const { data: playersData } = await supabase
    .from('players')
    .select('*')
    .order('created_at', { ascending: false });

  const userIds = [...new Set(playersData?.map((p) => p.user_id) ?? [])];
  const { data: profiles } = userIds.length
    ? await supabase.from('profiles').select('id, username, full_name').in('id', userIds)
    : { data: [] };

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

  const players: AdminPlayer[] = (playersData ?? []).map((p) => ({
    ...p,
    profile: profileMap.get(p.user_id) ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Jugadores</h1>
        <p className="mt-1 text-sm text-slate-400">{players.length} jugadores registrados</p>
      </div>
      <PlayersTable players={players} />
    </div>
  );
}
