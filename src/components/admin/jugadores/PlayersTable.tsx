'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EditPlayerDialog from './EditPlayerDialog';

export interface AdminPlayer {
  id: string;
  name: string;
  user_id: string;
  season_id: string;
  created_at: string;
  updated_at: string;
  avatar: string | null;
  profile: { id: string; username: string | null; full_name: string | null } | null;
}

export default function PlayersTable({ players }: { players: AdminPlayer[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmPlayer, setConfirmPlayer] = useState<AdminPlayer | null>(null);
  const [editPlayer, setEditPlayer] = useState<AdminPlayer | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.profile?.full_name?.toLowerCase().includes(q) ||
        p.profile?.username?.toLowerCase().includes(q)
    );
  }, [players, query]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/jugadores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Jugador eliminado', variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setConfirmPlayer(null);
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre o usuario…"
        className="h-10 w-full max-w-sm rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      />

      <div className="text-xs text-slate-400">
        {filtered.length} de {players.length} jugadores
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Usuario propietario</th>
              <th className="px-4 py-3 text-left">Temporada</th>
              <th className="px-4 py-3 text-left">Alta</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron jugadores
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{p.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{p.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {p.profile?.full_name || '—'}
                    {p.profile?.username && (
                      <span className="ml-1 text-xs text-slate-500">@{p.profile.username}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                    {p.season_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(p.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-slate-600 text-xs text-slate-300 hover:text-white"
                        onClick={() => setEditPlayer(p)}
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs"
                        onClick={() => setConfirmPlayer(p)}
                        disabled={deletingId !== null}
                      >
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmPlayer}
        onOpenChange={(open) => !open && setConfirmPlayer(null)}
        title="Eliminar jugador"
        description={`¿Eliminar permanentemente a "${confirmPlayer?.name}"? Se perderán todos sus datos.`}
        loading={deletingId !== null}
        onConfirm={() => confirmPlayer && handleDelete(confirmPlayer.id)}
      />

      {editPlayer && (
        <EditPlayerDialog
          player={editPlayer}
          onClose={() => setEditPlayer(null)}
          onSaved={() => {
            setEditPlayer(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
