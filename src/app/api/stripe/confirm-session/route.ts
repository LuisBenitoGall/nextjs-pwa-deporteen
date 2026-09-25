import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { fulfillCheckoutSession } from '@/lib/stripe/fulfill-checkout-session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({ ok: false, error: 'Missing STRIPE_SECRET_KEY' }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr || !user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
  }

  let body: { session_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const sessionId = body.session_id?.trim();
  if (!sessionId) {
    return NextResponse.json({ ok: false, error: 'Missing session_id' }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: '2025-08-27.basil' });
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const metaUserId = session.metadata?.user_id?.trim();
  if (metaUserId && metaUserId !== user.id) {
    return NextResponse.json({ ok: false, error: 'Session does not belong to user' }, { status: 403 });
  }

  const admin = getSupabaseAdmin();
  const result = await fulfillCheckoutSession(admin, stripe, sessionId);

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.retryable ? 503 : 400 });
  }

  return NextResponse.json({
    ok: true,
    subscriptionId: result.subscriptionId,
    already: result.alreadyFulfilled,
    skipped: result.skipped,
  });
}
