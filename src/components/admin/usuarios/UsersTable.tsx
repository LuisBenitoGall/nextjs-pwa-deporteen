'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/admin/ConfirmDialog';
import EditUserDialog from './EditUserDialog';

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

export default function UsersTable({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<AdminUser | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
    );
  }, [users, query]);

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

  return (
    <div className="space-y-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por email, nombre o usuario…"
        className="h-10 w-full max-w-sm rounded-md border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      />

      <div className="text-xs text-slate-400">
        {filtered.length} de {users.length} usuarios
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-800/70 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">Usuario</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Último acceso</th>
              <th className="px-4 py-3 text-left">Alta</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              filtered.map((u) => {
                const isBanned = u.banned_until && new Date(u.banned_until) > new Date();
                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{u.full_name || '—'}</div>
                      <div className="text-xs text-slate-400">@{u.username || 'sin usuario'}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{u.email || '—'}</td>
                    <td className="px-4 py-3">
                      {isBanned ? (
                        <Badge variant="destructive">Baneado</Badge>
                      ) : u.confirmed_at ? (
                        <Badge variant="default">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Sin confirmar</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {u.last_sign_in_at
                        ? new Date(u.last_sign_in_at).toLocaleString('es-ES')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString('es-ES')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-slate-600 text-xs text-slate-300 hover:text-white"
                          onClick={() => setEditUser(u)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs"
                          onClick={() => setConfirmUser(u)}
                          disabled={deletingId !== null}
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

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
