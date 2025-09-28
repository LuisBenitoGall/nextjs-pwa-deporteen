import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/roles';
import { getStripe } from '@/lib/stripe/server';
import type { Stripe } from '@/lib/stripe/server';

export const runtime = 'nodejs';

const INTERVALS = new Set(['day', 'week', 'month', 'year']);

export async function GET() {
  const { user } = await getServerUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stripe = getStripe();
  try {
    const prices = await stripe.prices.list({ limit: 100, expand: ['data.product'] });
    return NextResponse.json({ data: prices.data });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Stripe error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const { user } = await getServerUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const priceId: string | undefined = body?.priceId;
    const active = body?.active;
    const nicknameRaw = body?.nickname;

    if (!priceId) {
      return NextResponse.json({ error: 'priceId is required' }, { status: 400 });
    }

    if (active !== undefined && typeof active !== 'boolean') {
      return NextResponse.json({ error: 'active must be boolean' }, { status: 400 });
    }

    if (nicknameRaw !== undefined && nicknameRaw !== null && typeof nicknameRaw !== 'string') {
      return NextResponse.json({ error: 'nickname must be a string' }, { status: 400 });
    }

    if (active === undefined && nicknameRaw === undefined) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const stripe = getStripe();
    const updateParams: Stripe.PriceUpdateParams = {};
    if (typeof active === 'boolean') {
      updateParams.active = active;
    }
    if (nicknameRaw !== undefined) {
      const nickname = nicknameRaw === null ? '' : String(nicknameRaw);
      updateParams.nickname = nickname;
    }

    const price = await stripe.prices.update(priceId, updateParams);
    return NextResponse.json({ data: price });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Stripe error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user } = await getServerUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const productId: string | undefined = body?.productId;
    const rawAmount = body?.amount;
    const currency: string = (body?.currency || 'eur').toLowerCase();
    const type: 'one_time' | 'recurring' = body?.type === 'recurring' ? 'recurring' : 'one_time';
    const interval: string | undefined = body?.interval;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const amountNumber = Number(rawAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: 'amount must be greater than 0' }, { status: 400 });
    }

    if (currency.length !== 3) {
      return NextResponse.json({ error: 'currency must be a 3-letter ISO code' }, { status: 400 });
    }

    if (type === 'recurring') {
      if (!interval || !INTERVALS.has(interval)) {
        return NextResponse.json({ error: 'invalid interval for recurring price' }, { status: 400 });
      }
    }

    const stripe = getStripe();
    const unitAmount = Math.round(amountNumber * 100);

    const params: Stripe.PriceCreateParams = {
      product: productId,
      currency,
      unit_amount: unitAmount,
      nickname: body?.nickname,
      active: body?.active ?? true,
    };

    if (type === 'recurring') {
      params.recurring = {
        interval: interval as Stripe.PriceCreateParams.Recurring.Interval,
      };
    }

    const price = await stripe.prices.create(params);
    return NextResponse.json({ data: price }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Stripe error' }, { status: 500 });
  }
}
