'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useT } from '@/i18n/I18nProvider';

// Components
import Input from '@/components/Input';
import Submit from '../../components/Submit';
import TitleH1 from '@/components/TitleH1';

export default function LoginPage() {
    const t = useT();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            try {
              const bc = new BroadcastChannel('auth');
              bc.postMessage({ type: 'SIGNED_IN', user: data.user });
              bc.close();
            } catch {}
            router.replace('/dashboard');
            router.refresh();
        } catch (e: any) {
            setErr(e.message ?? 'Error al iniciar sesión');
        } finally {
            setBusy(false);
        }
    }

    async function handleGoogle() {
        try {
            // Guarda el idioma preferido actual (o 'es' por defecto) para aplicarlo en /auth/callback
            const providerLocale =
            (typeof window !== 'undefined'
              ? (localStorage.getItem('locale') || 'es')
              : 'es')
              .toLowerCase()
              .slice(0, 2);

            localStorage.setItem('preferred_locale', providerLocale);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    // tras el intercambio en Supabase, regresar a nuestra página de callback
                    redirectTo: `${location.origin}/auth/callback?next=/dashboard`,
                },
            });
            if (error) throw error;
        } catch (e: any) {
            setErr(e.message ?? 'No se pudo iniciar sesión con Google');
        }
    }

    return (
        <div>
            <TitleH1>{t('login')}</TitleH1>

            {err && (
                <div className="mb-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
                    {err}
                </div>
            )}

            <div className="mb-6 text-center text-sm text-gray-500">
                <a href="/registro" className="underline transition hover:text-green-600">
                    {t('cuenta_no_tengo')}
                 </a>
            </div>

            {/* Botón de Google */}
            <button
                type="button"
                onClick={handleGoogle}
                className="mb-6 flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
                <img src="/icons/icon-google.svg" alt="Google" className="h-5 w-5" />
                <span>{t('login')} Google</span>
            </button>

            <form onSubmit={handleLogin} className="space-y-4">
                <Input
                  type="email"
                  name="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('email')}
                  label={t('email')}
                  required
                />

                <Input
                  type="password"
                  name="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('contrasena')}
                  label={t('contrasena')}
                  required
                />
                <br/>

                <Submit
                    loading={busy}
                    text={t('login')}
                    loadingText={t('entrando') ?? t('procesando') ?? 'Entrando…'}
                />

                {/*<button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                >
                  {busy ? t('entrando') : t('login')}
                </button>*/}
            </form>
        </div>
    );
}
