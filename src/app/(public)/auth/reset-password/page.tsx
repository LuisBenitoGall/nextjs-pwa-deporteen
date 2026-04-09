'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useT } from '@/i18n/I18nProvider';
import Input from '@/components/Input';
import Submit from '@/components/Submit';
import TitleH1 from '@/components/TitleH1';

export default function ResetPasswordPage() {
  const t = useT();
  const router = useRouter();
  const search = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');

  useEffect(() => {
    setMounted(true);
    (async () => {
      // Si viene con ?code=..., intentamos intercambio explícito por si el SDK no lo hace solo
      const code = search.get('code');
      if (code) {
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch { /* si ya hay sesión o no aplica, no pasa nada */ }
      }
    })();
  }, [search]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(null);

    try {
      if (password.length < 8) throw new Error(t('pwd_min_8') || 'La contraseña debe tener al menos 8 caracteres.');
      if (password !== password2) throw new Error(t('pwd_no_coinciden') || 'Las contraseñas no coinciden.');

      // Debe existir una sesión de recuperación válida (la trae el enlace)
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error(t('session_invalida') || 'Enlace caducado o inválido. Repite la solicitud.');

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setOk(t('pwd_actualizada') || 'Contraseña actualizada. Accediendo…');

      // Redirige a login y refresca
      setTimeout(() => {
        router.replace('/login');
        router.refresh();
      }, 800);
    } catch (e: any) {
      setErr(e.message ?? (t('error_generico') || 'No se pudo actualizar la contraseña.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <TitleH1>{t('establecer_contrasena') || 'Establecer nueva contraseña'}</TitleH1>

      {mounted && err && <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{err}</div>}
      {mounted && ok &&  <div className="mb-3 rounded border border-green-300 bg-green-50 p-2 text-sm text-green-800">{ok}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="password"
          name="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('contrasena') || 'Contraseña'}
          label={t('contrasena') || 'Contraseña'}
          required
        />
        <Input
          type="password"
          name="password2"
          value={password2}
          onChange={e => setPassword2(e.target.value)}
          placeholder={t('contrasena_confirmar') || 'Confirmar contraseña'}
          label={t('contrasena_confirmar') || 'Confirmar contraseña'}
          required
        />
        <Submit
          loading={busy}
          text={t('guardar') || 'Guardar'}
          loadingText={t('procesando') || 'Procesando…'}
        />
      </form>
    </div>
  );
}
