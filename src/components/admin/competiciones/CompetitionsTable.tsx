'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import type { ColumnDefinition } from 'tabulator-tables';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import AdminTabulatorTable from '@/components/admin/shared/AdminTabulatorTable';
import {
  makeDeleteBtn,
  makeActionsContainer,
  dispatchAction,
} from '@/components/admin/shared/tabulatorUtils';

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

export default function CompetitionsTable({
  competitions,
}: {
  competitions: AdminCompetition[];
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmComp, setConfirmComp] = useState<AdminCompetition | null>(null);

  // Bridge: listen for Tabulator action events bubbling up
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { action, row } = (e as CustomEvent<{ action: string; row: AdminCompetition }>).detail;
      if (action === 'delete') setConfirmComp(row);
    };
    el.addEventListener('tabulator-action', handler);
    return () => el.removeEventListener('tabulator-action', handler);
  }, []);

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

  async function handleBulkDelete(rows: AdminCompetition[]) {
    for (const row of rows) {
      await fetch('/api/admin/competiciones', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
    }
    showToast({ title: `${rows.length} competiciones eliminadas`, variant: 'success' });
    router.refresh();
  }

  const columns: ColumnDefinition[] = [
    {
      title: 'Nombre',
      field: 'name',
      minWidth: 160,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const c = cell.getData() as AdminCompetition;
        const div = document.createElement('div');
        div.innerHTML =
          `<div class="font-medium text-slate-100">${c.name ?? 'Sin nombre'}</div>` +
          `<div class="text-xs text-slate-500 font-mono">${c.id.slice(0, 8)}…</div>`;
        return div;
      },
    },
    {
      title: 'Jugador',
      field: 'player',
      minWidth: 120,
      headerFilter: 'input' as const,
      headerFilterFunc: (filterVal: unknown, rowVal: unknown) => {
        const name = (rowVal as AdminCompetition['player'])?.name ?? '';
        return name.toLowerCase().includes((filterVal as string).toLowerCase());
      },
      sorter: (a: unknown, b: unknown) =>
        ((a as AdminCompetition['player'])?.name ?? '').localeCompare(
          (b as AdminCompetition['player'])?.name ?? ''
        ),
      formatter: (cell) => {
        const p = cell.getValue() as AdminCompetition['player'];
        return p?.name ?? '—';
      },
    },
    {
      title: 'Deporte',
      field: 'sport_id',
      minWidth: 100,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const span = document.createElement('span');
        span.className = 'text-xs text-slate-400 font-mono';
        span.textContent = ((cell.getValue() as string) ?? '').slice(0, 14);
        return span;
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
      title: 'Acciones',
      field: '_actions',
      headerSort: false,
      minWidth: 100,
      hozAlign: 'right',
      formatter: (cell) => {
        const c = cell.getData() as AdminCompetition;
        const delBtn = makeDeleteBtn();
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'delete', c);
        });
        return makeActionsContainer(delBtn);
      },
    },
  ];

  return (
    <div ref={wrapperRef} className="space-y-4">
      <AdminTabulatorTable<AdminCompetition>
        data={competitions}
        columns={columns}
        exportFileName="competiciones"
        selectable
        onBulkAction={handleBulkDelete}
        bulkActionLabel="Eliminar seleccionadas"
      />

      <ConfirmDialog
        open={!!confirmComp}
        onOpenChange={(open) => !open && setConfirmComp(null)}
        title="Eliminar competición"
        description={`¿Eliminar permanentemente "${confirmComp?.name ?? 'esta competición'}"? Se perderán todos los partidos asociados.`}
        loading={deletingId !== null}
        onConfirm={() => confirmComp && handleDelete(confirmComp.id)}
      />
    </div>
  );
}
