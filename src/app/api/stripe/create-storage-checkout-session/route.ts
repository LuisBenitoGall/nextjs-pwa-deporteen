// /api/stripe/create-storage-checkout-session
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { LOCAL_STORAGE_PLANS } from '@/lib/storage-plans';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const secret = process.env.STRIPE_SECRET_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
    if (!secret) return NextResponse.json({ error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
    if (!siteUrl) return NextResponse.json({ error: 'Missing site URL env var' }, { status: 500 });

    const stripe = new Stripe(secret, { apiVersion: '2025-08-27.basil' });
    const supabase = await createSupabaseServerClient();

    const { planId } = await req.json();
    if (!planId) return NextResponse.json({ error: 'Missing planId' }, { status: 400 });

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Intentar obtener plan desde la base de datos; si no existe, usar fallback local
    let plan: {
        id: string;
        name: string;
        gb_amount: number;
        amount_cents: number;
        currency: string;
        stripe_price_id: string | null;
        days: number;
    } | null = null;

    const { data: dbPlan } = await supabase
        .from('storage_plans')
        .select('id, name, gb_amount, amount_cents, currency, stripe_price_id')
        .eq('id', planId)
        .eq('active', true)
        .maybeSingle();

    if (dbPlan) {
        plan = { ...dbPlan, days: 365 };
    } else {
        // Fallback local
        const local = LOCAL_STORAGE_PLANS.find((p) => p.id === planId);
        if (local) {
            plan = {
                id: local.id,
                name: local.nameKey,
                gb_amount: local.gb_amount,
                amount_cents: local.amount_cents,
                currency: local.currency,
                stripe_price_id: local.stripe_price_id ?? null,
                days: local.days,
            };
        }
    }

    if (!plan) {
        return NextResponse.json({ error: 'Plan de almacenamiento no encontrado' }, { status: 400 });
    }

    // Resolver o crear el cliente Stripe
    let stripeCustomerId: string | undefined;
    const { data: existingCust } = await supabase
        .from('storage_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', user.id)
        .not('stripe_customer_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (existingCust?.stripe_customer_id) {
        stripeCustomerId = existingCust.stripe_customer_id;
    } else {
        // También buscar en subscriptions regulares (mismo cliente)
        const { data: regCust } = await supabase
            .from('subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .not('stripe_customer_id', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (regCust?.stripe_customer_id) {
            stripeCustomerId = regCust.stripe_customer_id;
        } else {
            const customers = await stripe.customers.list({ email: user.email || undefined, limit: 1 });
            const existing = customers.data.find(
                (c) => !('deleted' in c) && (c.metadata as any)?.supabase_user_id === user.id
            ) || customers.data.find((c) => !('deleted' in c));
            if (existing) {
                stripeCustomerId = existing.id;
            } else {
                const created = await stripe.customers.create({
                    email: user.email || undefined,
                    metadata: { supabase_user_id: user.id },
                });
                stripeCustomerId = created.id;
            }
        }
    }

    const successUrl = `${siteUrl}/subscription/storage?status=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl  = `${siteUrl}/subscription/storage?status=cancel`;

    // Si hay stripe_price_id configurado, usarlo directamente
    if (plan.stripe_price_id) {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer: stripeCustomerId,
            success_url: successUrl,
            cancel_url: cancelUrl,
            line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
            metadata: {
                user_id: user.id,
                plan_id: plan.id,
                gb_amount: String(plan.gb_amount),
                type: 'storage',
            },
            allow_promotion_codes: true,
        });
        return NextResponse.json({ url: session.url });
    }

    // Sin stripe_price_id: crear precio ad-hoc (modo desarrollo / configuración pendiente)
    const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer: stripeCustomerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [
            {
                price_data: {
                    currency: (plan.currency || 'EUR').toLowerCase(),
                    unit_amount: plan.amount_cents,
                    product_data: {
                        name: `Almacenamiento Deporteen — ${plan.gb_amount} GB / año`,
                        description: `Plan de almacenamiento en la nube (Cloudflare R2). ${plan.gb_amount} GB durante 365 días.`,
                    },
                },
                quantity: 1,
            },
        ],
        metadata: {
            user_id: user.id,
            plan_id: plan.id,
            gb_amount: String(plan.gb_amount),
            type: 'storage',
        },
        allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
}
