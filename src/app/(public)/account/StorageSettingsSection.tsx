'use client';

import { useState, useEffect } from 'react';
import { useStorageProvider, type StorageProvider } from '@/hooks/useStorageProvider';
import { connectGoogleDrive } from '@/hooks/useGooglePicker';
import Link from 'next/link';

interface Props {
    locale?: string;
}

function Badge({ active, label }: { active: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {label}
        </span>
    );
}

export default function StorageSettingsSection({ locale }: Props) {
    const { provider, driveConnected, r2Active, r2ExpiresAt, loading, setProvider } = useStorageProvider();
    const [driveReady, setDriveReady] = useState(driveConnected);
    const [connecting, setConnecting] = useState(false);

    useEffect(() => {
        setDriveReady(driveConnected);
    }, [driveConnected]);

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

    function handleConnectDrive() {
        if (!clientId) return;
        setConnecting(true);
        connectGoogleDrive(clientId, () => {
            setDriveReady(true);
            setConnecting(false);
        });
        // If the popup is dismissed without success we need to reset
        // There's no reliable cancellation event; reset after a delay
        setTimeout(() => setConnecting(false), 60_000);
    }

    function handleSelectProvider(p: StorageProvider) {
        setProvider(p);
    }

    const formatDate = (d: Date | null) => {
        if (!d) return '';
        try {
            return new Intl.DateTimeFormat(locale || 'es-ES', { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
        } catch {
            return d.toLocaleDateString();
        }
    };

    if (loading) {
        return (
            <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                <h2 className="text-base font-semibold text-gray-800">Almacenamiento de medios</h2>
                <div className="mt-4 h-24 animate-pulse rounded-xl bg-gray-100" />
            </section>
        );
    }

    const cards: Array<{
        key: StorageProvider;
        title: string;
        description: string;
        available: boolean;
        unavailableReason?: string;
        badge: string;
        cta?: React.ReactNode;
    }> = [
        {
            key: 'local',
            title: 'Dispositivo local',
            description: 'Las fotos y vídeos se guardan en este dispositivo (IndexedDB). Siempre disponible, sin coste, sin sincronización entre dispositivos.',
            available: true,
            badge: 'Siempre disponible',
        },
        {
            key: 'drive',
            title: 'Google Drive',
            description: 'Guarda archivos en tu propio Google Drive. Gratis con tu cuenta Google. Los archivos quedan accesibles desde cualquier dispositivo.',
            available: driveReady,
            unavailableReason: 'Conecta tu cuenta Google para activar esta opción.',
            badge: driveReady ? 'Conectado' : 'No conectado',
            cta: !driveReady ? (
                <button
                    onClick={handleConnectDrive}
                    disabled={connecting || !clientId}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                    {connecting ? 'Conectando…' : 'Conectar Google Drive'}
                </button>
            ) : (
                <p className="mt-1 text-xs text-green-600 font-medium">Cuenta Google conectada en esta sesión.</p>
            ),
        },
        {
            key: 'r2',
            title: 'Nube Deporteen (R2)',
            description: r2Active
                ? `Almacenamiento en la nube gestionado por Deporteen (Cloudflare R2). Suscripción activa${r2ExpiresAt ? ` hasta el ${formatDate(r2ExpiresAt)}` : ''}.`
                : 'Almacenamiento en la nube gestionado por Deporteen (Cloudflare R2). Requiere suscripción de pago.',
            available: r2Active,
            unavailableReason: 'Suscríbete para guardar medios en la nube de Deporteen.',
            badge: r2Active ? 'Activo' : 'Sin suscripción',
            cta: !r2Active ? (
                <Link
                    href="/subscription/storage"
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                    Ver planes de almacenamiento
                </Link>
            ) : null,
        },
    ];

    return (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800">Almacenamiento de medios</h2>
            <p className="mt-1 text-sm text-gray-500">
                Elige dónde se guardan las fotos y vídeos de los partidos. El proveedor activo se aplica a todas las subidas nuevas.
            </p>

            <div className="mt-4 flex flex-col gap-3">
                {cards.map((card) => {
                    const isSelected = provider === card.key;
                    const canSelect = card.available;

                    return (
                        <div
                            key={card.key}
                            className={`rounded-xl border p-4 transition ${isSelected ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-gray-900">{card.title}</span>
                                        <Badge active={card.available} label={card.badge} />
                                        {isSelected && (
                                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700">
                                                Seleccionado
                                            </span>
                                        )}
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">{card.description}</p>
                                    {!card.available && card.unavailableReason && (
                                        <p className="mt-1 text-xs text-amber-600">{card.unavailableReason}</p>
                                    )}
                                    {card.cta}
                                </div>
                                {canSelect && !isSelected && (
                                    <button
                                        onClick={() => handleSelectProvider(card.key)}
                                        className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Usar este
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
