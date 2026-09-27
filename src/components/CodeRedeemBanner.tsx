'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

type Player = { id: string; name: string; is_active: boolean; ends_at: string | null };

/** Respuesta JSON de RPCs canje (CLI las tipa como Json). */
type RedeemRpcPayload = {
  ok?: boolean;
  message?: string;
  ends_at?: string;
  subscription_id?: string;
};

function asRedeemPayload(data: unknown): RedeemRpcPayload | null {
  if (data == null) return null;
  const row = Array.isArray(data) ? data[0] : data;
  return row && typeof row === 'object' ? (row as RedeemRpcPayload) : null;
}

export default function CodeRedeemBanner() {
  const router = useRouter();
  const supabase = supabaseBrowser();

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
        .select('id, full_name')
        .eq('user_id', user.id)
        .order('full_name', { ascending: true });

      const { data: access } = await supabase
        .from('player_active_access')
        .select('player_id')
        .eq('user_id', user.id);

      const activeIds = new Set((access ?? []).map((a) => a.player_id).filter(Boolean));
      const merged: Player[] = (rawPlayers ?? []).map((p) => ({
        id: p.id,
        name: p.full_name,
        is_active: activeIds.has(p.id),
        ends_at: null,
      }));

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

      const payload = asRedeemPayload(data);
      if (!payload?.ok) {
        setErr(payload?.message || 'No se pudo canjear el código.');
      } else if (payload.ends_at) {
        localStorage.removeItem('pending_access_code');
        setMsg(`Código aplicado. Vigente hasta ${new Date(payload.ends_at).toLocaleDateString()}.`);
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
