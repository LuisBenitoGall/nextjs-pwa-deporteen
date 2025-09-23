import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';

//Components
import TitleH1 from '../../components/TitleH1';

type Player = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    sports: string[]; // guardado como jsonb
};

export default async function DashboardPage() {
    const supabase = await createSupabaseServerClient();

    // Sesión desde el servidor (cookies)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect('/login');
    const userId = session.user.id;

    // locale del usuario (si no tiene, 'es')
    const { data: me } = await supabase
    .from('users')
    .select('locale, status')
    .eq('id', userId)
    .maybeSingle();

    // Si el usuario está desactivado, forzar salida
    const statusVal = (me as any)?.status;
    const normalized = typeof statusVal === 'string' ? statusVal.toLowerCase() : statusVal;
    const isDisabled = normalized === false || normalized === 'inactive' || normalized === 'false';
    if (me && isDisabled) {
        redirect('/logout');
    }

    const { t } = await tServer(me?.locale || undefined);
    //const locale = (me?.locale as 'es' | 'en') || 'es';

    const [{ data: players }, { data: sub }] = await Promise.all([
        supabase.from('players')
            .select('id, full_name, avatar_url, sports')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
        supabase.from('user_subscriptions')
            .select('status, current_period_end')
            .eq('user_id', userId)
            .maybeSingle()
    ]);

    const subscribed = (sub?.status ?? 'none') === 'active';

    return (
        <div className="max-w-xl mx-auto">
            <TitleH1>{t('mi_panel')}</TitleH1>

            {/*Banner nuevo jugador*/}
            {/*<CodeRedeemBanner />*/}

            {/*Sin suscripción*/}
            {!subscribed && (
                <div className="mb-8 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900">
                    <h3 className="font-medium font-bold">{t('suscribete')}</h3>
                    <p className="text-sm">Activa la suscripción cuando toque para registrar deportistas sin límites y desbloquear estadísticas.</p>
                    <div className="mt-3">
                        <Link href="/subscription" className="inline-block rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700">
                          {t('suscribirme')}
                        </Link>
                    </div>
                </div>
            )}

            {/* Con suscripción */}
            {subscribed && (
                <>
                    <section className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Mis deportistas</h2>
                        <Link
                        href="/players/new"
                        className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                        >
                            {t('deportista_agregar')}
                        </Link>
                    </section>

                    {(!players || players.length === 0) ? (
                        <div className="rounded-xl border p-8 text-center text-gray-600">
                            <p className="mb-3">Aún no tienes deportistas.</p>
                            <Link href="/players/new" className="text-green-700 underline">Crear el primero</Link>
                        </div>
                    ) : (
                        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {players.map((a: Player) => (
                                <li key={a.id} className="rounded-2xl border p-4 hover:shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="h-12 w-12 overflow-hidden rounded-full bg-gray-100">
                                    {a.avatar_url ? (
                                        <Image src={a.avatar_url} alt={a.full_name} width={48} height={48} />
                                    ) : (
                                        <div className="h-full w-full grid place-content-center text-gray-400">🏃</div>
                                    )}
                                    </div>
                                    <div>
                                    <p className="font-medium">{a.full_name}</p>
                                    <p className="text-xs text-gray-500">{a.sports?.join(' · ') || '—'}</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <Link href={`/players/${a.id}`} className="text-sm underline">Ver perfil</Link>
                                    <span className="text-gray-300">·</span>
                                    <Link href={`/players/${a.id}/add-match`} className="text-sm underline">Nuevo partido</Link>
                                </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
