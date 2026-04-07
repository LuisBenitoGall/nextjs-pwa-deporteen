'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import type { ColumnDefinition } from 'tabulator-tables';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EditUserDialog from './EditUserDialog';
import AdminTabulatorTable from '@/components/admin/shared/AdminTabulatorTable';
import {
  makeEditBtn,
  makeDeleteBtn,
  makeActionsContainer,
  dispatchAction,
} from '@/components/admin/shared/tabulatorUtils';

export interface AdminUser {
  id: string;
  email: string | undefined;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed_at: string | null;
  banned_until: string | null;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

function statusBadge(u: AdminUser): HTMLElement {
  const span = document.createElement('span');
  const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
  if (isBanned) {
    span.className =
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-red-600/20 text-red-400 border border-red-600/30';
    span.textContent = 'Baneado';
  } else if (u.confirmed_at) {
    span.className =
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-600/20 text-emerald-400 border border-emerald-600/30';
    span.textContent = 'Activo';
  } else {
    span.className =
      'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-700 text-slate-400';
    span.textContent = 'Sin confirmar';
  }
  return span;
}

export default function UsersTable({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  // Bridge: listen for Tabulator action events
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const handler = (e: Event) => {
      const { action, row } = (e as CustomEvent<{ action: string; row: AdminUser }>).detail;
      if (action === 'edit') setEditUser(row);
      if (action === 'delete') setConfirmUser(row);
    };
    el.addEventListener('tabulator-action', handler);
    return () => el.removeEventListener('tabulator-action', handler);
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Usuario eliminado', variant: 'success' });
      router.refresh();
    } catch {
      showToast({ title: 'Error al eliminar usuario', variant: 'destructive' });
    } finally {
      setDeletingId(null);
      setConfirmUser(null);
    }
  }

  async function handleBulkDelete(rows: AdminUser[]) {
    for (const row of rows) {
      await fetch('/api/admin/usuarios', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: row.id }),
      });
    }
    showToast({ title: `${rows.length} usuarios eliminados`, variant: 'success' });
    router.refresh();
  }

  const columns: ColumnDefinition[] = [
    {
      title: 'Usuario',
      field: 'full_name',
      minWidth: 160,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const u = cell.getData() as AdminUser;
        const div = document.createElement('div');
        div.innerHTML =
          `<div class="font-medium text-slate-100">${u.full_name ?? '—'}</div>` +
          `<div class="text-xs text-slate-400">@${u.username ?? 'sin usuario'}</div>`;
        return div;
      },
    },
    {
      title: 'Email',
      field: 'email',
      minWidth: 180,
      headerFilter: 'input' as const,
      formatter: (cell) => {
        const span = document.createElement('span');
        span.className = 'text-slate-300';
        span.textContent = (cell.getValue() as string | undefined) ?? '—';
        return span;
      },
    },
    {
      title: 'Estado',
      field: 'confirmed_at',
      minWidth: 110,
      headerFilter: 'list' as const,
      headerFilterParams: {
        values: { '': 'Todos', activo: 'Activo', baneado: 'Baneado', sinconfirmar: 'Sin confirmar' },
        clearable: true,
      },
      headerFilterFunc: (filterVal: unknown, _rowVal: unknown, rowData: unknown) => {
        if (!filterVal) return true;
        const u = rowData as AdminUser;
        const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
        if (filterVal === 'baneado') return !!isBanned;
        if (filterVal === 'activo') return !isBanned && !!u.confirmed_at;
        if (filterVal === 'sinconfirmar') return !isBanned && !u.confirmed_at;
        return true;
      },
      formatter: (cell) => {
        const u = cell.getData() as AdminUser;
        return statusBadge(u);
      },
    },
    {
      title: 'Último acceso',
      field: 'last_sign_in_at',
      minWidth: 140,
      sorter: 'date',
      sorterParams: { format: 'iso' },
      formatter: (cell) => {
        const v = cell.getValue() as string | null;
        const span = document.createElement('span');
        span.className = 'text-xs text-slate-400';
        span.textContent = v ? new Date(v).toLocaleString('es-ES') : '—';
        return span;
      },
    },
    {
      title: 'Alta',
      field: 'created_at',
      minWidth: 100,
      sorter: 'date',
      sorterParams: { format: 'iso' },
      formatter: (cell) => {
        const span = document.createElement('span');
        span.className = 'text-xs text-slate-400';
        span.textContent = new Date(cell.getValue() as string).toLocaleDateString('es-ES');
        return span;
      },
    },
    {
      title: 'Acciones',
      field: '_actions',
      headerSort: false,
      minWidth: 140,
      hozAlign: 'right',
      formatter: (cell) => {
        const u = cell.getData() as AdminUser;
        const editBtn = makeEditBtn();
        const delBtn = makeDeleteBtn();
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'edit', u);
        });
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          dispatchAction(cell.getElement(), 'delete', u);
        });
        return makeActionsContainer(editBtn, delBtn);
      },
    },
  ];

  return (
    <div ref={wrapperRef} className="space-y-4">
      <AdminTabulatorTable<AdminUser>
        data={users}
        columns={columns}
        exportFileName="usuarios"
        selectable
        onBulkAction={handleBulkDelete}
        bulkActionLabel="Eliminar seleccionados"
      />

      <ConfirmDialog
        open={!!confirmUser}
        onOpenChange={(open) => !open && setConfirmUser(null)}
        title="Eliminar usuario"
        description={`¿Eliminar permanentemente a ${confirmUser?.email}? Esta acción no se puede deshacer.`}
        loading={deletingId !== null}
        onConfirm={() => confirmUser && handleDelete(confirmUser.id)}
      />

      {editUser && (
        <EditUserDialog
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => {
            setEditUser(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
