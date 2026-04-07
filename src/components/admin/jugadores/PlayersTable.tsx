'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import type { ColumnDefinition } from 'tabulator-tables';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EditPlayerDialog from './EditPlayerDialog';
import AdminTabulatorTable from '@/components/admin/shared/AdminTabulatorTable';
import {
  makeEditBtn,
  makeDeleteBtn,
  makeActionsContainer,
  dispatchAction,
} from '@/components/admin/shared/tabulatorUtils';

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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmPlayer, setConfirmPlayer] = useState<AdminPlayer | null>(null);
  const [editPlayer, setEditPlayer] = useState<AdminPlayer | null>(null);

  // Bridge: listen for Tabulator action events
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { action, row } = (e as CustomEvent<{ action: string; row: AdminPlayer }>).detail;
      if (action === 'edit') setEditPlayer(row);
      if (action === 'delete') setConfirmPlayer(row);
    };
    el.addEventListener('tabulator-action', handler);
    return () => el.removeEventListener('tabulator-action', handler);
  }, []);

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

  async function handleBulkDelete(rows: AdminPlayer[]) {
    for (const row of rows) {
      await fetch('/api/admin/jugadores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
    }
    showToast({ title: `${rows.length} jugadores eliminados`, variant: 'success' });
    router.refresh();
  }

  const columns: ColumnDefinition[] = [
    {
      title: 'Nombre',
      field: 'name',
      minWidth: 160,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const p = cell.getData() as AdminPlayer;
        const div = document.createElement('div');
        div.innerHTML =
          `<div class="font-medium text-slate-100">${p.name}</div>` +
          `<div class="text-xs text-slate-500 font-mono">${p.id.slice(0, 8)}…</div>`;
        return div;
      },
    },
    {
      title: 'Usuario propietario',
      field: 'profile',
      minWidth: 160,
      headerFilter: 'input' as const,
      headerFilterFunc: (filterVal: unknown, rowVal: unknown) => {
        const prof = rowVal as AdminPlayer['profile'];
        const text = `${prof?.full_name ?? ''} ${prof?.username ?? ''}`.toLowerCase();
        return text.includes((filterVal as string).toLowerCase());
      },
      sorter: (a: unknown, b: unknown) =>
        ((a as AdminPlayer['profile'])?.full_name ?? '').localeCompare(
          (b as AdminPlayer['profile'])?.full_name ?? ''
        ),
      formatter: (cell) => {
        const p = cell.getValue() as AdminPlayer['profile'];
        const div = document.createElement('div');
        div.innerHTML =
          `<span class="text-slate-300">${p?.full_name ?? '—'}</span>` +
          (p?.username
            ? ` <span class="text-xs text-slate-500">@${p.username}</span>`
            : '');
        return div;
      },
    },
    {
      title: 'Temporada',
      field: 'season_id',
      minWidth: 100,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const span = document.createElement('span');
        span.className = 'text-xs text-slate-400 font-mono';
        span.textContent = ((cell.getValue() as string) ?? '').slice(0, 8) + '…';
        return span;
      },
    },
    {
      title: 'Alta',
      field: 'created_at',
      minWidth: 100,
      sorter: 'date',
      sorterParams: { format: 'iso' },
      formatter: (cell) =>
        new Date(cell.getValue() as string).toLocaleDateString('es-ES'),
    },
    {
      title: 'Acciones',
      field: '_actions',
      headerSort: false,
      minWidth: 140,
      hozAlign: 'right',
      formatter: (cell) => {
        const p = cell.getData() as AdminPlayer;
        const editBtn = makeEditBtn();
        const delBtn = makeDeleteBtn();
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'edit', p);
        });
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'delete', p);
        });
        return makeActionsContainer(editBtn, delBtn);
      },
    },
  ];

  return (
    <div ref={wrapperRef} className="space-y-4">
      <AdminTabulatorTable<AdminPlayer>
        data={players}
        columns={columns}
        exportFileName="jugadores"
        selectable
        onBulkAction={handleBulkDelete}
        bulkActionLabel="Eliminar seleccionados"
      />

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
