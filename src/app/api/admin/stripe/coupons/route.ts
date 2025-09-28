import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/roles';
import { getStripe } from '@/lib/stripe/server';
import type { Stripe } from '@/lib/stripe/server';

async function ensureAdmin() {
  const { user } = await getServerUser();
  if (!user || !isAdminUser(user)) {
    return null;
  }
  return user;
}

function parseDateToUnix(dateString?: string | null): number | undefined {
  if (!dateString) return undefined;
  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }
  return Math.floor(timestamp / 1000);
}

export async function POST(req: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      id,
      name,
      type,
      value,
      currency,
      duration,
      durationInMonths,
      redeemBy,
      maxRedemptions,
    } = body ?? {};

    if (type !== 'percent' && type !== 'amount') {
      return NextResponse.json({ error: 'type must be "percent" or "amount"' }, { status: 400 });
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return NextResponse.json({ error: 'value must be greater than 0' }, { status: 400 });
    }

    if (!duration || !['forever', 'once', 'repeating'].includes(duration)) {
      return NextResponse.json({ error: 'duration must be forever, once, or repeating' }, { status: 400 });
    }

    const stripe = getStripe();
    const params: Stripe.CouponCreateParams = {};

    if (typeof id === 'string' && id.trim().length > 0) {
      params.id = id.trim();
    }

    if (typeof name === 'string' && name.trim().length > 0) {
      params.name = name.trim();
    }

    if (type === 'percent') {
      if (numericValue > 100) {
        return NextResponse.json({ error: 'percent value cannot exceed 100' }, { status: 400 });
      }
      params.percent_off = numericValue;
    } else {
      if (!currency || typeof currency !== 'string') {
        return NextResponse.json({ error: 'currency is required for amount coupons' }, { status: 400 });
      }
      params.amount_off = Math.round(numericValue * 100);
      params.currency = currency.toLowerCase();
    }

    params.duration = duration as Stripe.CouponCreateParams.Duration;

    if (duration === 'repeating') {
      const months = Number(durationInMonths);
      if (!Number.isFinite(months) || months <= 0) {
        return NextResponse.json({ error: 'durationInMonths must be greater than 0 for repeating coupons' }, { status: 400 });
      }
      params.duration_in_months = Math.floor(months);
    }

    const redeemByUnix = parseDateToUnix(redeemBy);
    if (redeemBy && redeemByUnix === undefined) {
      return NextResponse.json({ error: 'redeemBy must be a valid date' }, { status: 400 });
    }
    if (redeemByUnix) {
      params.redeem_by = redeemByUnix;
    }

    const maxRedeemNumber = Number(maxRedemptions);
    if (maxRedemptions !== undefined) {
      if (!Number.isFinite(maxRedeemNumber) || maxRedeemNumber <= 0) {
        return NextResponse.json({ error: 'maxRedemptions must be a positive number' }, { status: 400 });
      }
      params.max_redemptions = Math.floor(maxRedeemNumber);
    }

    const coupon = await stripe.coupons.create(params);
    return NextResponse.json({ data: coupon }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Stripe error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const couponId: string | undefined = body?.couponId;
    if (!couponId) {
      return NextResponse.json({ error: 'couponId is required' }, { status: 400 });
    }

    const params: Stripe.CouponUpdateParams & Record<string, any> = {};

    if (body?.name !== undefined) {
      params.name = typeof body.name === 'string' && body.name.trim() !== '' ? body.name.trim() : null;
    }

    if (body?.metadata !== undefined) {
      if (body.metadata === null || body.metadata === '') {
        params.metadata = {};
      } else if (typeof body.metadata === 'object') {
        params.metadata = body.metadata;
      } else if (typeof body.metadata === 'string') {
        try {
          const parsed = JSON.parse(body.metadata);
          params.metadata = parsed;
        } catch {
          return NextResponse.json({ error: 'metadata must be valid JSON' }, { status: 400 });
        }
      }
    }

    if (Object.keys(params).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const stripe = getStripe();
    const coupon = await stripe.coupons.update(couponId, params);
    return NextResponse.json({ data: coupon });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Stripe error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await ensureAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const couponId: string | undefined = body?.couponId;

    if (!couponId) {
      return NextResponse.json({ error: 'couponId is required' }, { status: 400 });
    }

    const stripe = getStripe();
    await stripe.coupons.del(couponId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Stripe error' }, { status: 500 });
  }
}
