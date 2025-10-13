'use client';
import { useEffect, useState } from 'react';
import { getConsentFromCookie, setConsentCookie } from '@/lib/consent';
import { useT } from '@/i18n/I18nProvider';

export default function CookiePreferences({ onClose, onSaved }: { onClose: () => void; onSaved: () => void; }) {
    const t = useT();
    const [choices, setChoices] = useState({ necesarias: true, analitica: false, funcionales: false, marketing: false });

    useEffect(() => {
        const existing = getConsentFromCookie();
        if (existing) setChoices(existing);
    }, []);

    function save() {
        setConsentCookie(choices);
        fetch('/api/cookies/consent', { method: 'POST', body: JSON.stringify({ consent_version: 'v1', choices }), headers: { 'Content-Type': 'application/json' }});
        onSaved();
        onClose();
    }

    return (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-xl bg-white p-4">
                <h2 className="text-lg font-semibold mb-2">{t('cookies_preferencias')}</h2>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-center justify-between p-2 border rounded">
                        <div><b>{t('necesarias')}</b><br/><span className="text-gray-600">{t('cookies_necesarias_texto')}</span></div>
                        <input type="checkbox" checked disabled />
                    </li>
                    <li className="flex items-center justify-between p-2 border rounded">
                        <div><b>{t('analitica')}</b><br/><span className="text-gray-600">{t('cookies_analitica_texto')}</span></div>
                        <input type="checkbox" checked={choices.analitica} onChange={e=>setChoices(c=>({ ...c, analitica: e.target.checked }))}/>
                    </li>
                    <li className="flex items-center justify-between p-2 border rounded">
                        <div><b>{t('funcionales')}</b><br/><span className="text-gray-600">{t('cookies_funcionales_texto')}</span></div>
                        <input type="checkbox" checked={choices.funcionales} onChange={e=>setChoices(c=>({ ...c, funcionales: e.target.checked }))}/>
                    </li>
                    <li className="flex items-center justify-between p-2 border rounded">
                        <div><b>{t('marketing')}</b><br/><span className="text-gray-600">{t('cookies_marketing_texto')}</span></div>
                        <input type="checkbox" checked={choices.marketing} onChange={e=>setChoices(c=>({ ...c, marketing: e.target.checked }))}/>
                    </li>
                </ul>
                <div className="mt-3 flex gap-2 justify-end">
                    <button onClick={onClose} className="px-3 py-2 border rounded-xl">{t('cancelar')}</button>
                    <button onClick={save} className="px-3 py-2 rounded-xl bg-green-500 text-white">{t('guardar')}</button>
                </div>
            </div>
        </div>
    );
}
