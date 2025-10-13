'use client';
import { useState } from 'react';
import CookiePreferences from './CookiePreferences';
import { useT } from '@/i18n/I18nProvider';

export default function FooterPreferencesLink() {
    const t = useT();
    const [open, setOpen] = useState(false);
    return (
        <>
            <button onClick={() => setOpen(true)}>
            {t('cookies_preferencias')}
            </button>
            {open && (
                <CookiePreferences
                onClose={() => setOpen(false)}
                onSaved={() => setOpen(false)}
                />
            )}
        </>
    );
}
