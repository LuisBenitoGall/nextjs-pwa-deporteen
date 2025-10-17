// Server-only
import { createSupabaseServerClient } from '@/lib/supabase/server';

type SeatStatus = {
    remaining: number;        // asientos que puedes usar ahora mismo
    pendingPlayers: number;   // lo mismo que remaining (pendientes de alta)
};

export async function getSeatStatus(userId?: string): Promise<SeatStatus> {
    const supabase = await createSupabaseServerClient();

    const { data: { session } } = await supabase.auth.getSession();
    const uid = userId ?? session?.user?.id;
    if (!uid) throw new Error('No session');

    const { data, error } = await supabase.rpc('seats_remaining', { p_user_id: uid });

    if (error) {
        // Falla el RPC: bloqueamos altas para no romper reglas de negocio
        if (process.env.NODE_ENV !== 'production') console.error('seats_remaining error', error);
        return { remaining: 0, pendingPlayers: 0 };
    }

    const remaining =
        typeof data === 'number'
        ? data
        : (data?.remaining ?? data?.seats ?? 0);

    return {
        remaining: Math.max(remaining, 0),
        pendingPlayers: Math.max(remaining, 0),
    };
}
