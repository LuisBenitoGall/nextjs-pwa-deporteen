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
import type { AdminPlayer } from './PlayersTable';

export default function EditPlayerDialog({
  player,
  onClose,
  onSaved,
}: {
  player: AdminPlayer;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(player.name);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/jugadores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: player.id, name }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast({ title: 'Jugador actualizado', variant: 'success' });
      onSaved();
    } catch {
      showToast({ title: 'Error al guardar', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-slate-900 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar jugador</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-slate-300">Nombre</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-slate-700 bg-slate-950/70 text-slate-100"
            />
          </div>
          <div className="rounded-lg border border-slate-700 p-3 text-xs text-slate-400 space-y-1">
            <div><span className="text-slate-500">ID:</span> {player.id}</div>
            <div><span className="text-slate-500">Propietario:</span> {player.profile?.full_name || player.user_id}</div>
            <div><span className="text-slate-500">Temporada:</span> {player.season_id}</div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving} className="text-slate-300">
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
