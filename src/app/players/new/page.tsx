import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import NewPlayerForm from './NewPlayerForm';

export default async function Page({ searchParams }: { searchParams?: Promise<Record<string, string>> }) {
    const supabase = await createSupabaseServerClient();

    // Seguro: en servidor usa getUser(), no getSession()
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    // Seats: una única verdad
    let remaining = 0;
    try {
        const { data } = await supabase.rpc('seats_remaining', { p_user_id: user.id });
        remaining = typeof data === 'number' ? data : (data?.remaining ?? data?.seats ?? 0);
    } catch { /* si peta, remaining=0 y bloqueamos alta */ }

    const resolvedSearchParams = await searchParams;
    const hasCode = !!resolvedSearchParams?.code;
    if (remaining <= 0 && !hasCode) {
        redirect('/dashboard?no-seats=1');
    }

    return (
        <NewPlayerForm
            initialSeats={remaining}
            initialCode={resolvedSearchParams?.code ?? ''}
        />
    );
}
