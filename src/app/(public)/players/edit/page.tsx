'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useT } from '@/i18n/I18nProvider';
import Input from '@/components/Input';
import Submit from '@/components/Submit';
import TitleH1 from '@/components/TitleH1';
import Link from 'next/link';

function EditPlayerFormInner() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerId = searchParams.get('id') || searchParams.get('playerId') || '';

  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/login?next=/players/edit?id=${playerId}`);
        return;
      }
      const { data, error } = await supabase
        .from('players')
        .select('id, full_name')
        .eq('id', playerId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (error || !data) {
        setErr(t('player_error_cargar') || 'No se pudo cargar el deportista.');
      } else {
        setName(data.full_name || '');
      }
      setLoading(false);
    })();
  }, [playerId, router, t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setErr(t('nombre_introduce') || 'Introduce un nombre.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/players/update-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, fullName: trimmed }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.message || 'Error');
      router.replace(`/players/${playerId}`);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : t('nombre_guardar_error') || 'No se pudo guardar.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6">{t('cargando')}</div>;

  if (!playerId) {
    return (
      <div className="max-w-xl mx-auto">
        <TitleH1>{t('editar')}</TitleH1>
        <p className="text-sm text-gray-600 mt-4">
          {t('deportista_selecciona_panel') || 'Abre el deportista desde el panel y usa «Editar nombre», o añade ?id= al enlace.'}
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-green-700 underline">
          {t('mi_panel') || 'Mi panel'}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <TitleH1>{t('editar')}</TitleH1>
      {err && <div className="rounded border p-3 bg-red-50 text-red-700 mb-4">{err}</div>}
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          label={t('deportista_nombre')}
          placeholder={t('nombre')}
        />
        <Submit text={t('guardar')} loadingText={t('procesando') ?? t('guardar')} disabled={busy} />
      </form>
    </div>
  );
}

export default function EditPlayerPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="p-6">{t('cargando')}</div>}>
      <EditPlayerFormInner />
    </Suspense>
  );
}
