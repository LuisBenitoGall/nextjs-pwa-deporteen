// src/hooks/useStorageProvider.ts
// Hook cliente: lee/escribe el proveedor de almacenamiento preferido del usuario
'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export type StorageProvider = 'local' | 'supabase' | 'drive' | 'r2';

export type StorageProviderStatus = {
    provider: StorageProvider;
    driveConnected: boolean;   // token Google disponible en esta sesión
    r2Active: boolean;         // suscripción R2 activa
    r2ExpiresAt: Date | null;
    loading: boolean;
    setProvider: (p: StorageProvider) => Promise<void>;
};

const PROVIDER_KEY_PREFIX = 'deporteen_media_provider:';

function readStoredProvider(userId: string): StorageProvider {
    if (typeof localStorage === 'undefined') return 'local';
    const value = localStorage.getItem(`${PROVIDER_KEY_PREFIX}${userId}`);
    return value === 'drive' || value === 'r2' || value === 'supabase' || value === 'local'
        ? value
        : 'local';
}

function writeStoredProvider(userId: string, provider: StorageProvider) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(`${PROVIDER_KEY_PREFIX}${userId}`, provider);
}

export function useStorageProvider(): StorageProviderStatus {
    const [provider, setProviderState] = useState<StorageProvider>('local');
    const [driveConnected, setDriveConnected] = useState(false);
    const [r2Active, setR2Active] = useState(false);
    const [r2ExpiresAt, setR2ExpiresAt] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!mounted || !user) { setLoading(false); return; }

            // Proveedor por defecto: el esquema actual no tiene profiles/media_provider.
            // Persistimos la preferencia por usuario en localStorage para conservarla entre vistas.
            const prov = readStoredProvider(user.id);

            // Estado suscripción R2. En el esquema actual la tabla activa es subscriptions.
            const { data: r2Sub } = await supabase
                .from('subscriptions')
                .select('status, current_period_end')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .order('current_period_end', { ascending: false })
                .maybeSingle();

            if (!mounted) return;

            setProviderState(prov);

            if (r2Sub?.status === 'active' && r2Sub.current_period_end) {
                const exp = new Date(r2Sub.current_period_end);
                const active = exp > new Date();
                setR2Active(active);
                setR2ExpiresAt(exp);
            }

            // Drive: token disponible si Google inicializó y devolvió access_token
            const token = typeof sessionStorage !== 'undefined'
                ? sessionStorage.getItem('google_access_token')
                : null;
            setDriveConnected(!!token);

            setLoading(false);
        })();
        return () => { mounted = false; };
    }, []);

    const setProvider = useCallback(async (p: StorageProvider) => {
        setProviderState(p);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        writeStoredProvider(user.id, p);
    }, []);

    return { provider, driveConnected, r2Active, r2ExpiresAt, loading, setProvider };
}
