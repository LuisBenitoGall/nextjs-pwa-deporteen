'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AdminUser } from './UsersTable';

interface EditUserDialogProps {
  user: AdminUser;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditUserDialog({ user, onClose, onSaved }: EditUserDialogProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState(user.email ?? '');
  const [fullName, setFullName] = useState(user.full_name ?? '');
  const [username, setUsername] = useState(user.username ?? '');

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: user.id,
          email: email !== user.email ? email : undefined,
          full_name: fullName,
          username,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Usuario actualizado', variant: 'success' });
      onSaved();
    } catch {
      showToast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleBan() {
    const isBanned = user.banned_until && new Date(user.banned_until) > new Date();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/usuarios', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, ban: !isBanned }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({
        title: isBanned ? 'Usuario desbaneado' : 'Usuario baneado',
        variant: 'success',
      });
      onSaved();
    } catch {
      showToast({ title: 'Error', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  const isBanned = user.banned_until && new Date(user.banned_until) > new Date();

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-900 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Email</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border-slate-700 bg-slate-950/70 text-slate-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Nombre completo</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="border-slate-700 bg-slate-950/70 text-slate-100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300">Nombre de usuario</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="border-slate-700 bg-slate-950/70 text-slate-100"
            />
          </div>

          <div className="rounded-lg border border-slate-700 p-3">
            <p className="mb-2 text-xs text-slate-400">
              Estado de la cuenta: <strong className={isBanned ? 'text-red-400' : 'text-emerald-400'}>{isBanned ? 'Baneado' : 'Activo'}</strong>
            </p>
            <Button
              type="button"
              size="sm"
              variant={isBanned ? 'outline' : 'destructive'}
              className={isBanned ? 'border-emerald-600 text-emerald-400 hover:bg-emerald-900/20' : ''}
              onClick={handleToggleBan}
              disabled={saving}
            >
              {isBanned ? 'Desbanear usuario' : 'Banear usuario'}
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="text-slate-300"
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
