import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';

//Components
import TitleH1 from '@/components/TitleH1';

type ReceiptRow = {
  id: string;
  subscription_id: string | null;
  amount?: number | string | null;    // int8 -> puede venir string
  amount_cents?: number | string | null; // por si usas este nombre
  currency?: string | null;           // si no existe, asumimos EUR
  paid_at?: string | null;
  receipt_url?: string | null;
  provider?: string | null;           // 'stripe' | 'code' | etc. opcional
  description?: string | null;
};

function formatAmountCents(
    cents: number | string | null | undefined,
    currency: string | null | undefined,
    locale = 'es-ES'
) {
    if (cents == null) return '—';
    const n = typeof cents === 'string' ? Number(cents) : cents;
    if (!Number.isFinite(n)) return '—';
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency || 'EUR',
    }).format(n / 100);
}

function formatDateISO(d?: string | null, locale = 'es-ES') {
    if (!d) return '—';
    const dt = new Date(d);
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(dt);
}

export const runtime = 'nodejs';

export default async function ReceiptsPage({
    searchParams,
}: {
    searchParams?: Promise<{ sid?: string }>;
}) {
    const supabase = await createSupabaseServerClient();

    // Usuario autenticado (validado por el servidor de Auth)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');
    const userId = user.id;

    // locale del usuario (si no tiene, 'es')
    const { data: me } = await supabase
    .from('users')
    .select('locale, status')
    .eq('id', userId)
    .maybeSingle();

    const { t } = await tServer(me?.locale || undefined);

    const resolvedSearchParams = await searchParams;
    const sid = resolvedSearchParams?.sid || null;

    // Traer recibos del usuario (opcionalmente filtrados por suscripción)
    const q = supabase
    .from('payments')
    .select(
      [
        'id',
        'subscription_id',
        'amount_cents',
        'currency',
        'paid_at',
        'receipt_url',
        'provider',
        'description',
      ].join(',')
    )
    .eq('user_id', user.id)
    .order('paid_at', { ascending: false });

    if (sid) q.eq('subscription_id', sid);
    const { data: receipts, error } = (await q) as unknown as { data: ReceiptRow[] | null; error: any };

    if (error) {
        // No rompemos la página; mostramos un estado de error amable
        console.error('payments select error', error);
    }

    const rows = (receipts || []);
    const hasRows = rows.length > 0;

    return (
        <div>
            <TitleH1>{t('recibos')}</TitleH1>

            <div className="mb-6 flex gap-2">
                <Link href="/account">
                    <button className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 rounded-lg shadow transition">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M15 18L9 12L15 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{t('cuenta_mi_volver')}</span>
                    </button>
                </Link>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-4 sm:p-6 shadow-sm">
                {!hasRows ? (
                    <div className="text-sm text-gray-600">
                        {sid ? (
                            <p>{t('suscripcion_sin_recibos')}</p>
                        ) : (
                            <p>{t('cuenta_sin_recibos')}</p>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead>
                                <tr className="text-left text-gray-500">
                                    <th className="py-2 pr-4">{t('fecha')}</th>
                                    <th className="py-2 pr-4">{t('importe')}</th>
                                    <th className="py-2 pr-4">{t('proveedor')}</th>
                                    <th className="py-2 pr-4">{t('descripcion')}</th>
                                    <th className="py-2 pr-4">{t('suscripcion')}</th>
                                    <th className="py-2 pr-4">{t('acciones')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((r) => {
                                    const cents = r.amount_cents ?? r.amount ?? null;
                                    const currency = r.currency || 'EUR';
                                    return (
                                        <tr key={r.id} className="border-t border-gray-100">
                                            <td className="py-3 pr-4">{formatDateISO(r.paid_at)}</td>
                                            <td className="py-3 pr-4">{formatAmountCents(cents, currency)}</td>
                                            <td className="py-3 pr-4 capitalize">{r.provider || 'stripe'}</td>
                                            <td className="py-3 pr-4">{r.description || '—'}</td>
                                            <td className="py-3 pr-4 text-xs text-gray-500">{r.subscription_id || '—'}</td>
                                            <td className="py-3 pr-4">
                                                {r.receipt_url ? (
                                                  <a
                                                    href={r.receipt_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                  >
                                                    {t('recibo_ver')}
                                                  </a>
                                                ) : (
                                                  <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
