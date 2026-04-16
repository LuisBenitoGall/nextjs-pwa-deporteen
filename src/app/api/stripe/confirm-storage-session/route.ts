// /api/stripe/confirm-storage-session
import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { LOCAL_STORAGE_PLANS } from '@/lib/storage-plans';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!stripeSecret) return NextResponse.json({ ok: false, error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
    if (!supabaseUrl || !serviceKey) return NextResponse.json({ ok: false, error: 'Missing Supabase env vars' }, { status: 500 });

    const { session_id } = await req.json();
    if (!session_id) return NextResponse.json({ ok: false, error: 'Missing session_id' }, { status: 400 });

    const stripe   = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });
    const supabase = createClient(supabaseUrl, serviceKey);

    const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['line_items.data.price'],
    });

    if (session.payment_status !== 'paid') {
        return NextResponse.json({ ok: false, error: 'Unpaid session' }, { status: 400 });
    }

    // Verificar que es una sesión de almacenamiento
    if (session.metadata?.type !== 'storage') {
        return NextResponse.json({ ok: false, error: 'Not a storage session' }, { status: 400 });
    }

    const user_id   = String(session.metadata?.user_id   || '');
    const plan_id   = String(session.metadata?.plan_id   || '');
    const gb_amount = parseInt(String(session.metadata?.gb_amount || '0'), 10);

    if (!user_id || !plan_id) {
        return NextResponse.json({ ok: false, error: 'Missing metadata' }, { status: 400 });
    }

    const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : (session.payment_intent as any)?.id ?? null;

    // Buscar el plan para obtener días, precio, etc.
    let days = 365;
    let amount_cents = gb_amount > 0 ? 0 : 0;
    let currency = 'EUR';

    const { data: dbPlan } = await supabase
        .from('storage_plans')
        .select('gb_amount, amount_cents, currency')
        .eq('id', plan_id)
        .maybeSingle();

    if (dbPlan) {
        amount_cents = dbPlan.amount_cents;
        currency     = dbPlan.currency || 'EUR';
    } else {
        const local = LOCAL_STORAGE_PLANS.find((p) => p.id === plan_id);
        if (local) {
            days         = local.days;
            amount_cents = local.amount_cents;
            currency     = local.currency;
        }
    }

    // Calcular periodo de acceso, apilando sobre suscripción activa si la hay
    const now = new Date();
    const addedMs = days * 24 * 60 * 60 * 1000;

    const { data: existing } = await supabase
        .from('storage_subscriptions')
        .select('id, current_period_end, stripe_payment_intent_id')
        .eq('user_id', user_id)
        .order('current_period_end', { ascending: false })
        .limit(1)
        .maybeSingle();

    // Idempotencia: si ya procesamos este payment intent, devolver ok
    if (existing?.stripe_payment_intent_id === paymentIntentId && paymentIntentId) {
        return NextResponse.json({ ok: true, idempotent: true });
    }

    const existingEnd = existing?.current_period_end ? new Date(existing.current_period_end) : null;
    const baseDate    = existingEnd && existingEnd > now ? existingEnd : now;
    const periodEnd   = new Date(baseDate.getTime() + addedMs);

    const total_cents = session.amount_total ?? amount_cents;
    const finalCurrency = (session.currency || currency || 'EUR').toUpperCase();

    const payload = {
        user_id,
        plan_id,
        gb_amount: gb_amount || 10,
        amount_cents: total_cents,
        currency: finalCurrency,
        status: 'active' as const,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        stripe_customer_id: session.customer ? String(session.customer) : null,
        stripe_payment_intent_id: paymentIntentId ?? session_id,
        updated_at: now.toISOString(),
    };

    if (existing?.id) {
        // Actualizar periodo existente (renovación / upgrade)
        const { error: updateErr } = await supabase
            .from('storage_subscriptions')
            .update(payload)
            .eq('id', existing.id);

        if (updateErr) return NextResponse.json({ ok: false, error: updateErr.message }, { status: 500 });
        return NextResponse.json({ ok: true, id: existing.id, renewed: true });
    }

    // Crear nueva suscripción de almacenamiento
    const { data: inserted, error: insErr } = await supabase
        .from('storage_subscriptions')
        .insert(payload)
        .select('id')
        .single();

    if (insErr) {
        if ((insErr as any).code === '23505') {
            return NextResponse.json({ ok: true, idempotent: true });
        }
        return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: inserted?.id });
}
