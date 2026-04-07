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

function resultLabel(m: AdminMatch) {
  if (m.my_score == null && m.rival_score == null) return '—';
  return `${m.my_score ?? '?'} - ${m.rival_score ?? '?'}`;
}

export default function MatchesTable({ matches }: { matches: AdminMatch[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmMatch, setConfirmMatch] = useState<AdminMatch | null>(null);

  // Bridge: listen for Tabulator action events
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { action, row } = (e as CustomEvent<{ action: string; row: AdminMatch }>).detail;
      if (action === 'delete') setConfirmMatch(row);
    };
    el.addEventListener('tabulator-action', handler);
    return () => el.removeEventListener('tabulator-action', handler);
  }, []);

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

  async function handleBulkDelete(rows: AdminMatch[]) {
    for (const row of rows) {
      await fetch('/api/admin/partidos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
    }
    showToast({ title: `${rows.length} partidos eliminados`, variant: 'success' });
    router.refresh();
  }

  const columns: ColumnDefinition[] = [
    {
      title: 'Rival',
      field: 'rival_team_name',
      minWidth: 160,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const m = cell.getData() as AdminMatch;
        const div = document.createElement('div');
        div.innerHTML =
          `<div class="font-medium text-slate-100">${m.rival_team_name ?? 'Sin rival'}</div>` +
          `<div class="text-xs text-slate-500 font-mono">${m.id.slice(0, 8)}…</div>`;
        return div;
      },
    },
    {
      title: 'Resultado',
      field: 'my_score',
      minWidth: 90,
      hozAlign: 'center',
      formatter: (cell) => {
        const m = cell.getData() as AdminMatch;
        const span = document.createElement('span');
        span.className = 'font-mono text-slate-300';
        span.textContent = resultLabel(m);
        return span;
      },
    },
    {
      title: 'Lugar',
      field: 'place',
      minWidth: 120,
      headerFilter: 'input' as const,
      formatter: (cell) => (cell.getValue() as string | null) ?? '—',
    },
    {
      title: 'Fecha',
      field: 'date_at',
      minWidth: 100,
      sorter: 'date',
      sorterParams: { format: 'iso' },
      formatter: (cell) => {
        const v = cell.getValue() as string | null;
        return v ? new Date(v).toLocaleDateString('es-ES') : '—';
      },
    },
    {
      title: 'Creado',
      field: 'created_at',
      minWidth: 100,
      sorter: 'date',
      sorterParams: { format: 'iso' },
      formatter: (cell) => {
        const v = cell.getValue() as string;
        return new Date(v).toLocaleDateString('es-ES');
      },
    },
    {
      title: 'Acciones',
      field: '_actions',
      headerSort: false,
      minWidth: 100,
      hozAlign: 'right',
      formatter: (cell) => {
        const m = cell.getData() as AdminMatch;
        const delBtn = makeDeleteBtn();
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'delete', m);
        });
        return makeActionsContainer(delBtn);
      },
    },
  ];

  return (
    <div ref={wrapperRef} className="space-y-4">
      <AdminTabulatorTable<AdminMatch>
        data={matches}
        columns={columns}
        exportFileName="partidos"
        selectable
        onBulkAction={handleBulkDelete}
        bulkActionLabel="Eliminar seleccionados"
      />

      <ConfirmDialog
        open={!!confirmMatch}
        onOpenChange={(open) => !open && setConfirmMatch(null)}
        title="Eliminar partido"
        description={`¿Eliminar el partido contra "${confirmMatch?.rival_team_name ?? 'este rival'}"? Se perderán todos los datos y media asociados.`}
        loading={deletingId !== null}
        onConfirm={() => confirmMatch && handleDelete(confirmMatch.id)}
      />
    </div>
  );
}
