'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/admin/ConfirmDialog';

export interface AdminMatch {
  id: string;
  user_id: string;
  competition_id?: string | null;
  player_id?: string | null;
  my_score: number | null;
  rival_score: number | null;
  rival_team_name: string | null;
  place: string | null;
  date_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function MatchesTable({ matches }: { matches: AdminMatch[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmMatch, setConfirmMatch] = useState<AdminMatch | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return matches;
    return matches.filter(
      (m) =>
        m.rival_team_name?.toLowerCase().includes(q) ||
        m.place?.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    );
  }, [matches, query]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/partidos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Partido eliminado', variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: 'Error al eliminar', variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setConfirmMatch(null);
    }
  }

  function resultLabel(m: AdminMatch) {
    if (m.my_score == null && m.rival_score == null) return '—';
    return `${m.my_score ?? '?'} - ${m.rival_score ?? '?'}`;
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por rival, lugar o ID…"
        className="h-10 w-full max-w-sm rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      />

      <div className="text-xs text-slate-400">
        {filtered.length} de {matches.length} partidos
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Rival</th>
              <th className="px-4 py-3 text-left">Resultado</th>
              <th className="px-4 py-3 text-left">Lugar</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Creado</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron partidos
                </td>
              </tr>
            ) : (
              filtered.map((m) => (
                <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{m.rival_team_name || 'Sin rival'}</div>
                    <div className="text-xs text-slate-500 font-mono">{m.id.slice(0, 8)}…</div>
                  </td>
                  <td className="px-4 py-3 text-slate-300 font-mono">{resultLabel(m)}</td>
                  <td className="px-4 py-3 text-slate-400">{m.place || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {m.date_at ? new Date(m.date_at).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(m.created_at).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => setConfirmMatch(m)}
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
        open={!!confirmMatch}
        onOpenChange={(open) => !open && setConfirmMatch(null)}
        title="Eliminar partido"
        description={`¿Eliminar el partido contra "${confirmMatch?.rival_team_name || 'este rival'}"? Se perderán todos los datos y media asociados.`}
        loading={deletingId !== null}
        onConfirm={() => confirmMatch && handleDelete(confirmMatch.id)}
      />
    </div>
  );
}
