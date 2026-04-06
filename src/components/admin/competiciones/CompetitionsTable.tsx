'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export interface AdminCompetition {
  id: string;
  player_id: string;
  season_id: string;
  sport_id: string;
  club_id: string | null;
  team_id: string | null;
  category_id: string | null;
  name: string | null;
  player: { id: string; name: string; user_id: string } | null;
}

export default function CompetitionsTable({ competitions }: { competitions: AdminCompetition[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmComp, setConfirmComp] = useState<AdminCompetition | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return competitions;
    return competitions.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.player?.name?.toLowerCase().includes(q) ||
        c.sport_id.toLowerCase().includes(q)
    );
  }, [competitions, query]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/competiciones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Competición eliminada', variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setConfirmComp(null);
    }
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nombre, jugador o deporte…"
        className="h-10 w-full max-w-sm rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      />

      <div className="text-xs text-slate-400">
        {filtered.length} de {competitions.length} competiciones
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Nombre</th>
              <th className="px-4 py-3 text-left">Jugador</th>
              <th className="px-4 py-3 text-left">Deporte</th>
              <th className="px-4 py-3 text-left">Temporada</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron competiciones
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{c.name || 'Sin nombre'}</div>
                    <div className="text-xs text-slate-500 font-mono">{c.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{c.player?.name || '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs font-mono">{c.sport_id.slice(0, 12)}</td>
                  <td className="px-4 py-3 text-xs text-slate-400 font-mono">
                    {c.season_id.slice(0, 8)}…
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => setConfirmComp(c)}
                      disabled={deletingId !== null}
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={!!confirmComp}
        onOpenChange={(open) => !open && setConfirmComp(null)}
        title="Eliminar competición"
        description={`¿Eliminar permanentemente "${confirmComp?.name || 'esta competición'}"? Se perderán todos los partidos asociados.`}
        loading={deletingId !== null}
        onConfirm={() => confirmComp && handleDelete(confirmComp.id)}
      />
    </div>
  );
}
