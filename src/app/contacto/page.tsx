'use client';
import * as React from 'react';
import { supabase } from '@/lib/supabase/client';
import { useT } from '@/i18n/I18nProvider';

//Components:
import ContactSupportForm from '../../components/SupportForm';
import TitleH1 from '../../components/TitleH1';

export default function ContactoPage() {
    const t = useT();
    const [sessionUser, setSessionUser] = React.useState<{ id: string; email?: string | null; user_metadata?: Record<string, any> } | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

    React.useEffect(() => {
        let mounted = true;
        async function fetchUser() {
        try {
            const { data } = await supabase.auth.getUser();
            if (!mounted) return;
            setSessionUser(data.user ?? null);
        } finally {
            setLoading(false);
        }
    }
    fetchUser();
    return () => {
      mounted = false;
    };
    }, []);

    if (loading) return <div className="px-4 py-8">{t('cargando')}</div>;

    const displayName = sessionUser?.user_metadata?.full_name
    || sessionUser?.user_metadata?.name
    || (sessionUser?.email ? sessionUser.email.split('@')[0] : undefined);

    return (
        <div>
            <TitleH1>{t('contacto')}</TitleH1>

            {/* Mensaje de éxito bajo el H1 */}
            {successMsg && (
                <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-green-800">
                    {successMsg}
                </div>
            )}

            {sessionUser ? (
                <p className="text-sm text-gray-600 mb-6">{t('hola')} {displayName ?? t('deportista')}, {t('contacto_text1')}</p>
            ) : (
                <p className="text-sm text-gray-600 mb-6">{t('contacto_text2')}</p>
            )}

            <ContactSupportForm sessionUser={sessionUser} onSuccess={() => setSuccessMsg(t('contacto_text3'))} />
        </div>
    );
}