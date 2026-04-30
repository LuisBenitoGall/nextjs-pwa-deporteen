'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStorageProvider, type StorageProvider } from '@/hooks/useStorageProvider';
import { useT } from '@/i18n/I18nProvider';
import Link from 'next/link';
import { StorageIcon } from '@/components/StorageIcon';

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
    const t = useT();
    const searchParams = useSearchParams();
    const { provider, driveStatus, r2Active, r2ExpiresAt, loading, setProvider } = useStorageProvider();
    const [driveReady, setDriveReady] = useState(driveStatus === 'connected');
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);

    const driveParam = searchParams.get('drive');
    const driveBanner: { type: 'success' | 'error'; message: string } | null =
        driveParam === 'connected'
            ? { type: 'success', message: t('storage_settings_drive_connected_ok') || 'Google Drive conectado correctamente.' }
            : driveParam === 'no-refresh-token'
            ? { type: 'error', message: t('storage_settings_drive_no_refresh_token') || 'Google no devolvió un token de acceso duradero. Intenta desconectar y volver a conectar.' }
            : driveParam === 'csrf-error'
            ? { type: 'error', message: t('storage_settings_drive_csrf_error') || 'Error de seguridad en el proceso de conexión. Inténtalo de nuevo.' }
            : driveParam === 'error'
            ? { type: 'error', message: searchParams.get('msg') || t('storage_settings_drive_generic_error') || 'Error al conectar Google Drive.' }
            : null;

    useEffect(() => {
        setDriveReady(driveStatus === 'connected');
    }, [driveStatus]);

    function handleConnectDrive() {
        setConnecting(true);
        window.location.href = '/api/google/drive/connect';
    }

    async function handleDisconnectDrive() {
        setDisconnecting(true);
        try {
            const res = await fetch('/api/google/drive/disconnect', { method: 'POST' });
            if (!res.ok) throw new Error('disconnect failed');
            setDriveReady(false);
            if (provider === 'drive') {
                await setProvider('local');
            }
        } catch {
            // El servidor no pudo desconectar; no actualizamos el estado local
        } finally {
            setDisconnecting(false);
        }
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
                <h2 className="text-base font-semibold text-gray-800">{t('storage_settings_title')}</h2>
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
            title: t('storage_settings_local_title'),
            description: t('storage_settings_local_description'),
            available: true,
            badge: t('storage_settings_local_badge'),
        },
        {
            key: 'drive',
            title: t('storage_settings_drive_title'),
            description: t('storage_settings_drive_description'),
            available: driveReady,
            unavailableReason: t('storage_settings_drive_unavailable_reason'),
            badge: driveStatus === 'reconnect-required'
                ? (t('storage_settings_drive_badge_disconnected') || 'Reconexión requerida')
                : driveReady
                    ? t('storage_settings_drive_badge_connected')
                    : t('storage_settings_drive_badge_disconnected'),
            cta: !driveReady || driveStatus === 'reconnect-required' ? (
                <button
                    onClick={handleConnectDrive}
                    disabled={connecting}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                >
                    {connecting ? t('storage_settings_drive_connecting') : t('storage_settings_drive_connect_cta')}
                </button>
            ) : (
                <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs text-green-600 font-medium">{t('storage_settings_drive_connected_session')}</p>
                    <button
                        onClick={handleDisconnectDrive}
                        disabled={disconnecting}
                        className="inline-flex items-center rounded-lg border border-red-300 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                        {disconnecting ? (t('guardando') || 'Procesando...') : (t('desconectar') || 'Desconectar')}
                    </button>
                </div>
            ),
        },
        {
            key: 'r2',
            title: t('storage_settings_r2_title'),
            description: r2Active
                ? (r2ExpiresAt
                    ? t('storage_settings_r2_description_active', { DATE: formatDate(r2ExpiresAt) })
                    : t('storage_settings_r2_description_active_no_date'))
                : t('storage_settings_r2_description_inactive'),
            available: r2Active,
            unavailableReason: t('storage_settings_r2_unavailable_reason'),
            badge: r2Active ? t('storage_settings_r2_badge_active') : t('storage_settings_r2_badge_inactive'),
            cta: !r2Active ? (
                <Link
                    href="/subscription/storage"
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                >
                    {t('storage_settings_r2_cta')}
                </Link>
            ) : null,
        },
    ];

    return (
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-800">{t('storage_settings_title')}</h2>
            <p className="mt-1 text-sm text-gray-500">
                {t('storage_settings_subtitle')}
            </p>

            {driveBanner && (
                <div className={`mt-3 rounded-xl border px-4 py-2.5 text-sm font-medium ${driveBanner.type === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
                    {driveBanner.message}
                </div>
            )}

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
                                        <StorageIcon kind={card.key} size={16} />
                                        <span className="text-sm font-semibold text-gray-900">{card.title}</span>
                                        <Badge active={card.available} label={card.badge} />
                                        {isSelected && (
                                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-700">
                                                {t('storage_settings_selected')}
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
                                        {t('storage_settings_use_this')}
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
