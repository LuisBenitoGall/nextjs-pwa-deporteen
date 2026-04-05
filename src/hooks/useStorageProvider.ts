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

            // Proveedor por defecto del perfil
            const { data: profile } = await supabase
                .from('profiles')
                .select('media_provider')
                .eq('id', user.id)
                .maybeSingle();

            // Estado suscripción R2
            const { data: r2Sub } = await supabase
                .from('storage_subscriptions')
                .select('status, current_period_end')
                .eq('user_id', user.id)
                .maybeSingle();

            if (!mounted) return;

            const prov = (profile?.media_provider as StorageProvider) || 'local';
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
        await supabase
            .from('profiles')
            .update({ media_provider: p })
            .eq('id', user.id);
    }, []);

    return { provider, driveConnected, r2Active, r2ExpiresAt, loading, setProvider };
}
