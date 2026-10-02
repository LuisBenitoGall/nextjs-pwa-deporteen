// src/hooks/useStorageProvider.ts
// Hook cliente: lee/escribe el proveedor de almacenamiento preferido del usuario
'use client';

import { useEffect, useState, useCallback } from 'react';
import { withAuthLockRetry } from '@/lib/supabase/authClientErrors';

export type StorageProvider = 'local' | 'supabase' | 'drive' | 'r2';

export type StorageProviderStatus = {
    provider: StorageProvider;
    /** Preferencia persistida en backend (puede ser `drive` aunque el proveedor efectivo sea `local`). */
    storedProvider: StorageProvider;
    driveStatus: 'connected' | 'reconnect-required' | 'disconnected';
    r2Active: boolean;         // suscripción R2 activa
    r2ExpiresAt: Date | null;
    loading: boolean;
    setProvider: (p: StorageProvider) => Promise<void>;
    /** Tras fallo OAuth Drive: proveedor efectivo local + estado reconnect-required. */
    applyDriveReconnectFallback: () => void;
};

export function useStorageProvider(): StorageProviderStatus {
    const [provider, setProviderState] = useState<StorageProvider>('local');
    const [storedProvider, setStoredProvider] = useState<StorageProvider>('local');
    const [driveStatus, setDriveStatus] = useState<'connected' | 'reconnect-required' | 'disconnected'>('disconnected');
    const [r2Active, setR2Active] = useState(false);
    const [r2ExpiresAt, setR2ExpiresAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                await withAuthLockRetry(async () => {
                    const prefRes = await fetch('/api/storage/provider', { cache: 'no-store' });
                    if (prefRes.status === 401) {
                        if (mounted) setLoading(false);
                        return;
                    }
                    const prefJson = (await prefRes.json().catch(() => ({}))) as {
                        provider?: StorageProvider;
                        driveStatus?: 'connected' | 'reconnect-required' | 'disconnected';
                        r2Active?: boolean;
                        r2ExpiresAt?: string | null;
                    };
                    if (!mounted) return;

                    const prov = prefJson.provider ?? 'local';
                    setStoredProvider(prov);
                    const driveConnected = prefJson.driveStatus === 'connected';
                    if (prov === 'drive' && !driveConnected) {
                        fetch('/api/storage/provider', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ provider: 'local' }),
                        }).catch(() => {});
                        setStoredProvider('local');
                        setProviderState('local');
                    } else {
                        setProviderState(prov);
                    }
                    setDriveStatus(prefJson.driveStatus ?? 'disconnected');
                    setR2Active(Boolean(prefJson.r2Active));
                    setR2ExpiresAt(prefJson.r2ExpiresAt ? new Date(prefJson.r2ExpiresAt) : null);
                });
            } catch {
                // Proveedor local por defecto si la API falla
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const setProvider = useCallback(async (p: StorageProvider) => {
        const res = await fetch('/api/storage/provider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider: p }),
        });
        if (!res.ok) {
            const payload = (await res.json().catch(() => ({}))) as { code?: string };
            if (p === 'drive' && payload.code === 'reconnect-required') {
                setDriveStatus('reconnect-required');
            }
            return;
        }
        setProviderState(p);
        setStoredProvider(p);
    }, []);

    const applyDriveReconnectFallback = useCallback(() => {
        setProviderState('local');
        setStoredProvider('local');
        setDriveStatus('reconnect-required');
    }, []);

    return {
        provider,
        storedProvider,
        driveStatus,
        r2Active,
        r2ExpiresAt,
        loading,
        setProvider,
        applyDriveReconnectFallback,
    };
}
