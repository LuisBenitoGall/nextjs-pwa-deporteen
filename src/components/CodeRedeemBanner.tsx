'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

type Player = { id: string; name: string; is_active: boolean; ends_at: string | null };

export default function CodeRedeemBanner() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [code, setCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Detecta código pendiente
  useEffect(() => {
    const c = localStorage.getItem('pending_access_code');
    if (c) setCode(c);
  }, []);

  // Carga jugadores y su estado si hay código
  useEffect(() => {
    if (!code) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // jugadores del usuario
      const { data: rawPlayers } = await supabase
        .from('players')
        .select('id,name')
        .order('name', { ascending: true });

      // estado de acceso
      const { data: access } = await supabase
        .from('player_active_access')
        .select('player_id, is_active, ends_at')
        .eq('user_id', user.id);

      const map = new Map(access?.map(a => [a.player_id, a]) ?? []);
      const merged: Player[] = (rawPlayers ?? []).map(p => {
        const a = map.get(p.id);
        return { id: p.id, name: p.name, is_active: !!a?.is_active, ends_at: a?.ends_at ?? null };
      });

      // por UX: jugadores caducados primero
      merged.sort((a, b) => (a.is_active === b.is_active ? a.name.localeCompare(b.name) : a.is_active ? 1 : -1));

      setPlayers(merged);
      if (merged[0]) setSelected(merged[0].id);
    })();
  }, [code, supabase]);

  if (!code) return null;

  const applyToSelected = async () => {
    setErr(null); setMsg(null); setBusy(true);
    try {
      if (!selected) { setErr('Selecciona un jugador.'); setBusy(false); return; }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setErr('No autenticado.'); setBusy(false); return; }

      const { data, error } = await supabase.rpc('redeem_access_code_for_player', {
        p_code: code,
        p_user_id: user.id,
        p_player_id: selected
      });
      if (error) throw error;

      if (!data?.ok) {
        setErr(data?.message || 'No se pudo canjear el código.');
      } else {
        localStorage.removeItem('pending_access_code');
        setMsg(`Código aplicado. Vigente hasta ${new Date(data.ends_at).toLocaleDateString()}.`);
        // refresca la lista brevemente
        setTimeout(() => router.refresh(), 800);
      }
    } catch (e: any) {
      setErr(e?.message ?? 'Error al canjear el código.');
    } finally {
      setBusy(false);
    }
  };

  const goCreatePlayer = () => {
    // te llevamos a “nuevo jugador”; allí, tras crear, lees de localStorage y canjeas al vuelo
    router.push('/players/new');
  };

  return (
    <div className="border rounded p-4 bg-indigo-50 text-indigo-900 space-y-3">
      <div className="font-semibold">Tienes un código pendiente</div>
      <div className="text-sm">Código: <b>{code}</b></div>

      {players.length > 0 ? (
        <div className="space-y-2">
          <label className="text-sm">Aplicar a un jugador existente:</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {players.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} {p.is_active ? '(activo)' : '(caducado)'}
                {p.ends_at ? ` — hasta ${new Date(p.ends_at).toLocaleDateString()}` : ''}
              </option>
            ))}
          </select>
          <button
            disabled={busy}
            onClick={applyToSelected}
            className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
          >
            {busy ? 'Aplicando…' : 'Aplicar código a este jugador'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm">Aún no tienes jugadores.</div>
          <button onClick={goCreatePlayer} className="px-4 py-2 bg-green-600 text-white rounded">
            Crear nuevo jugador
          </button>
        </div>
      )}

      {msg && <div className="rounded border p-2 bg-green-50 text-green-700">{msg}</div>}
      {err && <div className="rounded border p-2 bg-red-50 text-red-700">{err}</div>}
    </div>
  );
}
