'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';
import { supabase } from '@/lib/supabase/client';

//Components:
import TitleH1 from '../../../components/TitleH1';

export default function AuthCallbackPage() {
    const t = useT();
    const router = useRouter();
    const search = useSearchParams();
    
    const [mounted, setMounted] = useState(false);      // evita hydration mismatch
    const [err, setErr] = useState<string | null>(null);
    const [noVerifier, setNoVerifier] = useState(false); // solo para aviso UX, después de montar

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
    (async () => {
      try {
        const errorDesc = search.get('error_description');
        if (errorDesc) throw new Error(decodeURIComponent(errorDesc));

        // Si ya hay sesión, seguimos
        let { data: { session } } = await supabase.auth.getSession();

        // Intercambio PKCE si no hay sesión
        if (!session) {
          const code = search.get('code');
          if (!code) throw new Error('Falta el parámetro "code" en el callback');

          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            // Si falta el code_verifier, relanzamos OAuth a esta misma URL
            if (/code verifier/i.test(error.message)) {
              try {
                // flag solo para mostrar aviso tras montar (no en SSR)
                setNoVerifier(true);
              } catch {}
              await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: { redirectTo: window.location.href }
              });
              return; // el navegador será redirigido
            }
            throw error;
          }

          ({ data: { session } } = await supabase.auth.getSession());
        }

        if (!session) throw new Error('No se pudo iniciar la sesión');

        // Aplica locale preferido si existe; tu default es 'es'
        try {
          const preferred = localStorage.getItem('preferred_locale');
          if (preferred) {
            await supabase.auth.updateUser({
              data: { locale: preferred.toLowerCase().slice(0, 2) || 'es' }
            });
            localStorage.removeItem('preferred_locale');
          }
        } catch {
          /* no pasa nada si storage está bloqueado */
        }

        const next = search.get('next') || '/dashboard';
        router.replace(next);
        router.refresh();
      } catch (e: any) {
        setErr(e.message ?? 'Error al completar el inicio de sesión');
      }
    })();
    }, [router, search]);

    return (
        <div className="max-w-xl mx-auto">
            <TitleH1>{t('conectando')}</TitleH1>

            <p className="text-sm text-gray-600">{t('callback_text1')}.</p>

            {/* Todo lo que depende del cliente se pinta solo tras montar */}
            {mounted && noVerifier && (
                <p className="mt-3 text-xs text-amber-700">
                    {t('callback_text2')}
                </p>
            )}

            {mounted && err && (
                <p className="mt-4 text-sm text-red-600">{err}</p>
            )}
        </div>
    );
}
