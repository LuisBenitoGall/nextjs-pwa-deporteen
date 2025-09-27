'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/i18n/I18nProvider';

// Components
import Input from '@/components/Input';

export default function EditPlayerNameModal({
    playerId,
    currentName,
    buttonLabel: buttonLabelProp,
}: {
    playerId: string;
    currentName: string;
    buttonLabel?: string;
}) {
    const t = useT();
    const router = useRouter();

    const [open, setOpen] = useState(false);
    const [name, setName] = useState(currentName || '');
    const [busy, setBusy] = useState(false);  
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (open) setName(currentName || '');
    }, [open, currentName]);

    const onSubmit = async (e: React.FormEvent) => {
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
            if (!res.ok || !json?.ok) {
                throw new Error(json?.message || 'No se pudo guardar el nombre.');
            }

            setOpen(false);
            router.refresh(); // refresca el Server Component con el nombre nuevo
        } catch (e: any) {
            setErr(e?.message ?? t('nombre_guardar_error') ?? 'No se pudo guardar el nombre.');
            console.error('edit name failed', e);
        } finally {
            setBusy(false);
        }
    };

    const btnText = buttonLabelProp ?? t('editar');

    return (
        <>
            {/* Botón que abre el modal */}
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M14.06 6.19l3.75 3.75" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
                <span>{btnText}</span>
            </button>

            {/* Modal minimalista */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/30" onClick={() => !busy && setOpen(false)} />
                    
                    {/* Diálogo */}
                    <div className="relative z-10 w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-lg">
                        <h3 className="text-base font-semibold text-gray-900">
                            {t('jugador_nombre_editar')}
                        </h3>
                        {err && (
                            <div className="mb-3 rounded border p-2 text-sm bg-red-50 text-red-700">
                                {err}
                            </div>
                        )}

                        <form onSubmit={onSubmit} className="space-y-3 mt-4">
                            <Input
                                type="text"
                                placeholder={t('nombre')}
                                label={t('nombre')}
                                maxLength={100}
                                value={name}                 
                                onChange={(e: any) => setName(e.target.value)} 
                                required
                                autoFocus
                                disabled={busy}
                            />

                            <div className="mt-2 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    disabled={busy}
                                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
                                >
                                    {t('cancelar')}
                                </button>

                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    {busy ? t('guardando') : t('guardar')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
