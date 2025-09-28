import { NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe/server';
import { z } from 'zod';

const bodySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  amount_off: z.number().nonnegative().optional(),
  percent_off: z.number().min(0).max(100).optional(),
  currency: z.string().length(3).optional(),
  duration: z.enum(['once', 'repeating', 'forever']),
  duration_in_months: z.number().int().positive().nullable().optional(),
  max_redemptions: z.number().int().positive().nullable().optional(),
  redeem_by: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const stripe = getStripe();

  try {
    const json = await request.json();
    const body = bodySchema.parse(json);

    if (!body.amount_off && !body.percent_off) {
      return NextResponse.json(
        { error: 'Either amount_off or percent_off must be provided.' },
        { status: 400 },
      );
    }

    if (body.amount_off && !body.currency) {
      return NextResponse.json(
        { error: 'currency is required when amount_off is provided.' },
        { status: 400 },
      );
    }

    const coupon = await stripe.coupons.create({
      name: body.name,
      amount_off: body.amount_off ? Math.round(body.amount_off * 100) : undefined,
      percent_off: body.percent_off,
      currency: body.currency,
      duration: body.duration,
      duration_in_months:
        body.duration === 'repeating' ? body.duration_in_months ?? undefined : undefined,
      max_redemptions: body.max_redemptions ?? undefined,
      redeem_by: body.redeem_by ? Math.floor(new Date(body.redeem_by).getTime() / 1000) : undefined,
      metadata: body.description ? { description: body.description } : undefined,
    });

    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }

    console.error('[api/stripe/coupons] error creating coupon', error);
    return NextResponse.json({ error: 'stripe_coupons_create_error' }, { status: 500 });
  }
}
