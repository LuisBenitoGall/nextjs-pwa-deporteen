'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useT } from '@/i18n/I18nProvider';
import Input from '@/components/Input';
import Submit from '@/components/Submit';
import TitleH1 from '@/components/TitleH1';

export default function ForgotPasswordPage() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setOk(t('recuperacion_enviada') || 'Si el email existe, te hemos enviado un enlace para restablecer la contraseña.');
    } catch (e: any) {
      setErr(e.message ?? (t('error_generico') || 'No se pudo enviar el email.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <TitleH1>{t('recuperar_contrasena') || 'Recuperar contraseña'}</TitleH1>

      {ok && <div className="mb-3 rounded border border-green-300 bg-green-50 p-2 text-sm text-green-800">{ok}</div>}
      {err && <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{err}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          name="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('email')}
          label={t('email')}
          required
        />
        <Submit
          loading={busy}
          text={t('enviar_enlace') || 'Enviar enlace'}
          loadingText={t('procesando') || 'Procesando…'}
        />
      </form>
    </div>
  );
}
