// src/hooks/useStorageProvider.ts
// Hook cliente: lee/escribe el proveedor de almacenamiento preferido del usuario
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export type StorageProvider = 'local' | 'supabase' | 'drive' | 'r2';

export type StorageProviderStatus = {
    provider: StorageProvider;
    driveStatus: 'connected' | 'reconnect-required' | 'disconnected';
    r2Active: boolean;         // suscripción R2 activa
    r2ExpiresAt: Date | null;
    loading: boolean;
    setProvider: (p: StorageProvider) => Promise<void>;
};

export function useStorageProvider(): StorageProviderStatus {
    const [provider, setProviderState] = useState<StorageProvider>('local');
    const [driveStatus, setDriveStatus] = useState<'connected' | 'reconnect-required' | 'disconnected'>('disconnected');
    const [r2Active, setR2Active] = useState(false);
    const [r2ExpiresAt, setR2ExpiresAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!mounted || !user) { setLoading(false); return; }

            const prefRes = await fetch('/api/storage/provider', { cache: 'no-store' });
            const prefJson = (await prefRes.json().catch(() => ({}))) as {
                provider?: StorageProvider;
                driveStatus?: 'connected' | 'reconnect-required' | 'disconnected';
            };
            const prov = prefJson.provider ?? 'local';

            // Estado suscripción R2. En el esquema actual la tabla activa es subscriptions.
            const { data: r2Sub } = await supabase
                .from('subscriptions')
                .select('status, current_period_end')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('current_period_end', { ascending: false })
                .maybeSingle();

            if (!mounted) return;

            setProviderState(prov === 'drive' && prefJson.driveStatus !== 'connected' ? 'local' : prov);
            setDriveStatus(prefJson.driveStatus ?? 'disconnected');

            if (r2Sub?.status === 'active' && r2Sub.current_period_end) {
                const exp = new Date(r2Sub.current_period_end);
                const active = exp > new Date();
                setR2Active(active);
                setR2ExpiresAt(exp);
            }

            setLoading(false);
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
    }, []);

    return { provider, driveStatus, r2Active, r2ExpiresAt, loading, setProvider };
}
