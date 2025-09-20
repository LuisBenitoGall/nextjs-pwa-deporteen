'use client';

import { useState } from 'react';
import { useFormStatus } from 'react-dom';
import { useT } from '@/i18n/I18nProvider';

type Props = {
    // Acepta server actions que reciban FormData o ninguna entrada
    onConfirm: ((formData: FormData) => Promise<void>) | (() => Promise<void>);
    label?: string;
};

export default function ConfirmDeleteButton({ onConfirm, label = 'Cancelar cuenta' }: Props) {
    const t = useT();
    const [open, setOpen] = useState(false);
    const close = () => setOpen(false);

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center rounded-xl bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
            >
                {label}
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    aria-modal="true"
                    role="dialog"
                >
                    {/* overlay */}
                    <div
                        className="absolute inset-0 bg-black/40"
                        onClick={close}
                        aria-hidden="true"
                    />

                    {/* modal */}
                    <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-xl">
                        <div className="px-6 pt-5">
                            <h3 className="text-base font-semibold text-gray-900">
                                {t('cancelacion_confirmar')}
                            </h3>
                            <p className="mt-2 text-sm text-gray-600">
                                {t('cuenta_cancelar_texto_modal')}
                            </p>
                        </div>

                        <div className="mt-5 flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
                            <button
                                type="button"
                                onClick={close}
                                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                {t('volver_atras')}
                            </button>

                            <form action={onConfirm}>
                                <SubmitDanger onDone={close} label={t('cancelacion_confirmar')} />
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function SubmitDanger({ onDone, label }: { onDone: () => void; label: string }) {
    const { pending } = useFormStatus();
    // No cerramos el modal en onClick; dejamos que la Server Action haga redirect('/').
    // Como fallback, si no hay redirect, cerramos cuando deje de estar pending.
    if (!pending) {
        // noop; no forzamos cierre automático aquí para no generar parpadeos
    }
    return (
        <button
            type="submit"
            disabled={pending}
            aria-disabled={pending}
            className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold text-white ${pending ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
        >
            {pending ? '...' : label}
        </button>
    );
}
