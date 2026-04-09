import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { tServer } from '@/i18n/server';
import { fetchUserPayments } from '@/lib/stripe-payments';

//Components
import TitleH1 from '@/components/TitleH1';

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
    searchParams?: Promise<{ sid?: string; page?: string }>;
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
    const locale = me?.locale || 'es-ES';

    const resolvedSearchParams = await searchParams;
    const sid = resolvedSearchParams?.sid || null;
    const pageParam = resolvedSearchParams?.page;
    const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
    const PER_PAGE = 10;
    const offset = (page - 1) * PER_PAGE;

    const secret = process.env.STRIPE_SECRET_KEY ?? null;
    const { payments, total } = await fetchUserPayments({
        supabase,
        userId,
        userEmail: user.email,
        stripeSecret: secret,
        limit: PER_PAGE,
        offset,
        subscriptionId: sid,
    });

    const hasRows = payments.length > 0;
    const hasPrev = page > 1;
    const hasNext = offset + payments.length < total;
    const showingStart = hasRows ? offset + 1 : 0;
    const showingEnd = offset + payments.length;

    const buildHref = (targetPage: number) => {
        const params = new URLSearchParams();
        if (sid) params.set('sid', sid);
        if (targetPage > 1) params.set('page', String(targetPage));
        const qs = params.toString();
        return qs ? `?${qs}` : '';
    };

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
                                    <th className="py-2 pr-4">{t('estado')}</th>
                                    <th className="py-2 pr-4">{t('descripcion')}</th>
                                    <th className="py-2 pr-4">{t('acciones')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payments.map((payment) => {
                                    const amountCents = payment.amount ?? null;
                                    const currency = payment.currency || 'EUR';
                                    const amountFormatted = amountCents == null
                                        ? '—'
                                        : formatAmountCents(amountCents, currency, locale);
                                    const statusRaw = (payment.status || '').toLowerCase();
                                    const refundCents = payment.refundedAmount ?? 0;
                                    const hasRefund = refundCents > 0 || statusRaw.includes('refund');
                                    const fullRefund = hasRefund && ((amountCents != null && refundCents >= amountCents) || statusRaw === 'refunded');
                                    const partialRefund = hasRefund && !fullRefund;

                                    let badgeClass = 'bg-green-100 text-green-700';
                                    let badgeLabel = t('estado_pagada') || 'Pagada';
                                    if (fullRefund) {
                                        badgeClass = 'bg-red-100 text-red-700';
                                        badgeLabel = t('estado_reembolsada') || 'Reembolsada';
                                    } else if (partialRefund) {
                                        badgeClass = 'bg-amber-100 text-amber-700';
                                        badgeLabel = t('estado_reembolso_parcial') || 'Reembolso parcial';
                                    }

                                    const refundAmountForDisplay = fullRefund
                                        ? (refundCents > 0 ? refundCents : amountCents ?? null)
                                        : partialRefund
                                            ? refundCents
                                            : null;

                                    const refundAmountText = refundAmountForDisplay != null
                                        ? formatAmountCents(refundAmountForDisplay, currency, locale)
                                        : null;

                                    const refundDescription = refundAmountText
                                        ? fullRefund
                                            ? (t('facturas_reembolso_total', { AMOUNT: refundAmountText }) as string) || `Reembolso total de ${refundAmountText}`
                                            : (t('facturas_reembolso_parcial', { AMOUNT: refundAmountText }) as string) || `Reembolso parcial de ${refundAmountText}`
                                        : null;

                                    const providerLabel = payment.provider || (payment.source === 'stripe' ? 'Stripe' : 'App');

                                    return (
                                        <tr key={payment.id} className="border-t border-gray-100 align-top">
                                            <td className="py-3 pr-4">
                                                {formatDateISO(payment.paidAt, locale)}
                                            </td>
                                            <td className="py-3 pr-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium text-gray-900">{amountFormatted}</span>
                                                    {refundDescription && (
                                                        <span className="text-xs text-amber-600">{refundDescription}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
                                                    {badgeLabel}
                                                </span>
                                            </td>
                                            <td className="py-3 pr-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-gray-800">{payment.description || 'Stripe checkout'}</span>
                                                    <span className="text-xs uppercase tracking-wide text-gray-400">{providerLabel}</span>
                                                    {payment.stripePaymentIntentId && (
                                                        <span className="text-[10px] text-gray-400">PI: {payment.stripePaymentIntentId}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-3 pr-4">
                                                {payment.receiptUrl ? (
                                                    <a
                                                        href={payment.receiptUrl}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                                                    >
                                                        {t('recibo_ver')}
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="mt-4 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                            <p>
                                {t('facturas_paginacion_resumen', {
                                    START: String(showingStart),
                                    END: String(showingEnd),
                                    TOTAL: String(total),
                                }) || `Mostrando ${showingStart}-${showingEnd} de ${total} pagos`}
                            </p>
                            <div className="flex gap-2">
                                {hasPrev && (
                                    <Link
                                        href={buildHref(page - 1)}
                                        className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        {t('tabla_anterior') || 'Anterior'}
                                    </Link>
                                )}
                                {hasNext && (
                                    <Link
                                        href={buildHref(page + 1)}
                                        className="rounded-lg border border-gray-300 px-3 py-1.5 font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        {t('tabla_siguiente') || 'Siguiente'}
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
