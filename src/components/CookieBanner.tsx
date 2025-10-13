
'use client';
import { useEffect, useState } from 'react';
import { getConsentFromCookie, setConsentCookie, CONSENT_COOKIE } from '@/lib/consent';
import CookiePreferences from './CookiePreferences';
import { useT } from '@/i18n/I18nProvider';

export default function CookieBanner() {
    const t = useT();
    const [open, setOpen] = useState(false);
    const [show, setShow] = useState(false);

    useEffect(() => {
        const existing = getConsentFromCookie();
        setShow(!existing);
    }, []);

    if (!show) return null;

    function acceptAll() {
        const choices = { necesarias: true, analitica: true, funcionales: true, marketing: true };
        setConsentCookie(choices);
        fetch('/api/cookies/consent', { method: 'POST', body: JSON.stringify({ consent_version: 'v1', choices }), headers: { 'Content-Type': 'application/json' }});
        setShow(false);
    }
    function rejectAll() {
        const choices = { necesarias: true, analitica: false, funcionales: false, marketing: false };
        setConsentCookie(choices);
        fetch('/api/cookies/consent', { method: 'POST', body: JSON.stringify({ consent_version: 'v1', choices }), headers: { 'Content-Type': 'application/json' }});
        setShow(false);
    }

    return (
        <div className="fixed inset-x-0 bottom-0 z-[60] p-4">
            <div className="mx-auto max-w-3xl rounded-xl border bg-white shadow-lg p-4">
                <p className="text-sm">
                    {t('cookies_aceptacion_texto')}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={rejectAll} className="flex-1 rounded-xl border px-3 py-2">{t('rechazar_todo')}</button>
                <button onClick={() => setOpen(true)} className="flex-1 rounded-xl border px-3 py-2">{t('configurar')}</button>
                <button onClick={acceptAll} className="flex-1 rounded-xl bg-green-500 text-white px-3 py-2">{t('aceptar_todo')}</button>
                </div>
            </div>
            {open && <CookiePreferences onClose={() => setOpen(false)} onSaved={() => setShow(false)} />}
        </div>
    );
}
