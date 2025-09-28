import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { isAdminUser } from '@/lib/auth/roles';
import { getStripe } from '@/lib/stripe/server';
import type { Stripe } from '@/lib/stripe/server';

export const runtime = 'nodejs';

export async function GET() {
  const { user } = await getServerUser();
  if (!user || !isAdminUser(user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const stripe = getStripe();
  try {
    const products = await stripe.products.list({ limit: 100 });
    return NextResponse.json({ data: products.data });
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
    const name: string | undefined = body?.name;
    const description: string | undefined = body?.description;
    const createPrice: boolean = Boolean(body?.createPrice);
    const priceAmountRaw = body?.priceAmount;
    const priceCurrency: string = (body?.priceCurrency || 'eur').toLowerCase();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    let unitAmount: number | undefined;
    if (createPrice) {
      const amountNumber = Number(priceAmountRaw);
      if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
        return NextResponse.json({ error: 'priceAmount must be greater than 0' }, { status: 400 });
      }
      if (priceCurrency.length !== 3) {
        return NextResponse.json({ error: 'priceCurrency must be a 3-letter ISO code' }, { status: 400 });
      }
      unitAmount = Math.round(amountNumber * 100);
    }

    const stripe = getStripe();
    const product = await stripe.products.create({
      name: name.trim(),
      description: description?.trim() || undefined,
      active: body?.active ?? true,
    });

    if (createPrice && unitAmount && priceCurrency) {
      const params: Stripe.PriceCreateParams = {
        product: product.id,
        currency: priceCurrency,
        unit_amount: unitAmount,
        active: true,
      };

      const price = await stripe.prices.create(params);
      await stripe.products.update(product.id, { default_price: price.id });
      return NextResponse.json({ data: { ...product, default_price: price } }, { status: 201 });
    }

    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Stripe error' }, { status: 500 });
  }
}
